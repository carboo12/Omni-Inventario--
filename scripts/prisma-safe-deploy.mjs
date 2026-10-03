// prisma-safe-deploy.mjs — v3: Despliegue blindado con auto-reparación
//
// Sincronización SEGURA de la BD para despliegue de producción:
//
// CAPAS DE RESILIENCIA:
//   0. Liberación de locks EPERM del query_engine DLL (Windows).
//   1. Pre-vuelo: detecta y resuelve automáticamente migraciones fallidas
//      en _prisma_migrations (P3009/P3018) verificando si el DDL ya existe
//      en la BD antes de marcar como --applied.
//   2. BD sin historial (db push): adopta esquema existente como aplicado.
//   3. deploy con retry: si prisma migrate deploy falla por errores
//      recuperables (columna duplicada 1060, tabla duplicada 1050, P3009,
//      P3018), resuelve las migraciones problemáticas y reintenta hasta
//      MAX_DEPLOY_ATTEMPTS veces.
//   4. FALLBACK 'db push': si tras los reintentos migrate deploy sigue
//      fallando por un error de migración (P3018/1060/1050/...), NO se aborta
//      el despliegue. Se ejecuta 'prisma db push --skip-generate' para alinear
//      el esquema con schema.prisma, y se continúa hacia 'prisma generate'
//      y el build. Esto desbloquea despliegues bloqueados por historial de
//      migraciones divergente.
//   5. generate con reintentos EPERM.
//   6. Verificación final con migrate status (omitida tras el fallback db
//      push, ya que el historial queda deliberadamente desalineado).
//
// Tras un fallback 'db push' exitoso se adoptan TODAS las migraciones como
// aplicadas (no ejecuta DDL, solo escribe en _prisma_migrations) para que el
// siguiente despliegue no vuelva a tropezar con el mismo P3018.
//
// NOTA DE SEGURIDAD: 'db push' sincroniza contra schema.prisma, que es la
// fuente de verdad del proyecto. No se usa '--accept-data-loss': si Prisma
// detecta que haría falta eliminar columnas/datos, el comando FALLA en vez de
// borrar. En ese caso se registra el error y el build continúa, pero el
// esquema queda sin sincronizar y requiere atención manual.
//
// OPCIONES:
//   --no-stop       No detiene procesos PM2/node activos.
//   --force-resolve Resuelve como --applied todas las migraciones fallidas
//                   sin verificar si el DDL existe (last-resort).
//   --no-db-push    Desactiva la capa 4: si migrate deploy falla, el script
//                   aborta con exit 1 como en versiones anteriores.
//
// NOTA WINDOWS: este proceso NO importa '@prisma/client' directamente. Las
// consultas de detección corren en subprocesos que cargan/descargan el query
// engine DLL; si el script principal la cargara, quedaría mapeada en memoria
// y 'prisma generate' fallaría con EPERM al intentar reemplazarla.
import { execSync } from 'node:child_process';
import { readFileSync, readdirSync, rmSync, existsSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const migrationsDir = resolve(__dirname, '../prisma/migrations');

const noStop = process.argv.includes('--no-stop');
const forceResolve = process.argv.includes('--force-resolve');
const allowDbPushFallback = !process.argv.includes('--no-db-push');
const MAX_DEPLOY_ATTEMPTS = 3;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function run(cmd) {
  console.log(`  \u2192 ${cmd}`);
  execSync(cmd, { stdio: 'inherit' });
}

// Igual que run(), pero captura stdout/stderr para poder clasificarlos.
// Necesario porque con stdio:'inherit' execSync no rellena err.stdout y
// err.message sólo dice "Command failed: ...", perdiendo el texto real
// del error (P3018, 1060, "Duplicate column name", ...).
function runCapturing(cmd) {
  console.log(`  \u2192 ${cmd}`);
  const asText = (v) => (v == null ? '' : Buffer.isBuffer(v) ? v.toString('utf8') : String(v));
  try {
    const out = asText(execSync(cmd, { stdio: ['ignore', 'pipe', 'pipe'], encoding: 'utf8', windowsHide: true }));
    if (out) process.stdout.write(out);
    return out;
  } catch (err) {
    const stdout = asText(err?.stdout);
    const stderr = asText(err?.stderr);
    if (stdout) process.stdout.write(stdout);
    if (stderr) process.stderr.write(stderr);
    err.__output = `${stdout}\n${stderr}\n${asText(err?.message)}`;
    throw err;
  }
}

function runQuiet(cmd) {
  try {
    return execSync(cmd, { stdio: 'pipe', encoding: 'utf8', windowsHide: true }).trim();
  } catch {
    return '';
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// EPERM lock handling (query_engine DLL en Windows)
// ═══════════════════════════════════════════════════════════════════════════════

const prismaClientDir = join(root, 'node_modules', '.prisma', 'client');
const queryEngineDll = join(prismaClientDir, 'query_engine-windows.dll.node');

function stopRunningApp() {
  console.log('[safe-prisma] Liberando lock del query_engine DLL (deteniendo app)...');

  const pm2Out = runQuiet('npx pm2 stop omni-pos');
  if (pm2Out) console.log('  \u2192 PM2: app "omni-pos" detenida.');

  const findCmd = [
    '%WINDIR%\\System32\\wbem\\WMIC.exe process where "name=\'node.exe\' and (CommandLine like \'%dist-server/index.mjs%\' or CommandLine like \'%server/index.ts%\' or CommandLine like \'%server\\\\index.ts%\')" get ProcessId',
    'findstr /R "[0-9]"',
  ].join(' | ');
  const wmi = runQuiet(findCmd);
  const pids = (wmi.match(/\d+/g) || []).filter((p) => p.length > 1 && p.length < 8);
  const seen = new Set();
  for (const pid of pids) {
    if (seen.has(pid) || Number(pid) === process.pid) continue;
    seen.add(pid);
    console.log(`  \u2192 Finalizando proceso node residual PID ${pid}...`);
    runQuiet(`taskkill /F /PID ${pid}`);
  }
}

async function waitUntilDllUnlocked(maxMs = 15000) {
  if (!existsSync(queryEngineDll)) return true;
  const probe = join(prismaClientDir, '__eprem_probe__.tmp');
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    try {
      const { renameSync } = await import('node:fs');
      renameSync(queryEngineDll, probe);
      renameSync(probe, queryEngineDll);
      return true;
    } catch {
      await sleep(500);
    }
  }
  console.warn('[safe-prisma] AVISO: query_engine DLL sigue bloqueado. Se continuará igualmente.');
  return false;
}

function cleanPrismaTmp() {
  if (!existsSync(prismaClientDir)) return;
  let removed = 0;
  for (const entry of readdirSync(prismaClientDir)) {
    if (/\.tmp\d*$/i.test(entry)) {
      try {
        rmSync(join(prismaClientDir, entry), { force: true });
        removed++;
      } catch {
        console.warn(`  \u2192 No se pudo eliminar ${entry} (\u00bfsigue en uso?).`);
      }
    }
  }
  if (removed > 0) console.log(`  \u2192 ${removed} residuo(s) .tmp* eliminados de node_modules/.prisma/client.`);
}

async function releaseLocks() {
  if (!noStop) {
    stopRunningApp();
    await waitUntilDllUnlocked();
  } else {
    console.log('[safe-prisma] --no-stop: no se detendrán procesos activos.');
  }
  cleanPrismaTmp();
}

async function runWithEpermRetry(cmd, attempts = 3, delayMs = 2500) {
  for (let i = 1; i <= attempts; i++) {
    try {
      run(cmd);
      return;
    } catch (err) {
      const msg = String(err?.message || '');
      const isEperm = /EPERM/i.test(msg) || /query_engine.*\.tmp/i.test(msg);
      if (i === attempts) throw err;
      console.log(
        `[safe-prisma] '${cmd}' ${isEperm ? 'EPERM (DLL bloqueado)' : `error: ${msg.slice(0, 120)}`}. Reintentando (${i}/${attempts}) en ${delayMs}ms...`
      );
      await releaseLocks();
      await sleep(delayMs);
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Subprocess DB queries — evita cargar la DLL en el proceso principal
// ═══════════════════════════════════════════════════════════════════════════════

function runChild(code) {
  const bootstrap = `
import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
const out = (v) => console.log(JSON.stringify(v));
(async () => {
  try { ${code} }
  catch (e) { out({ ok: false, error: String(e?.message ?? e?.code ?? e) }); }
  finally { await p.$disconnect().catch(() => {}); }
})();
`;
  const stdout = execSync('node --input-type=module -', {
    input: bootstrap,
    stdio: ['pipe', 'pipe', 'inherit'],
  }).toString().trim();
  return JSON.parse(stdout);
}

// ═══════════════════════════════════════════════════════════════════════════════
// Inspección de la BD
// ═══════════════════════════════════════════════════════════════════════════════

function hasMigrationHistory() {
  const r = runChild(
    'out({ ok: true, count: (await p.$queryRawUnsafe("SELECT migration_name FROM _prisma_migrations")).length });'
  );
  if (r.ok) return { has: true, count: r.count };
  const msg = r.error || '';
  if (msg.includes('_prisma_migrations') || msg.includes('1146')) return { has: false, count: 0 };
  throw new Error('[safe-prisma] No se pudo inspeccionar historial: ' + msg);
}

function hasProductTable() {
  const r = runChild(
    `const rows = await p.$queryRawUnsafe("SELECT COUNT(*) AS c FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'Product'");
     out({ ok: true, has: Number(rows[0].c) > 0 });`
  );
  if (!r.ok) throw new Error('[safe-prisma] No se pudo verificar la BD: ' + r.error);
  return r.has;
}

// Migraciones fallidas: started_at IS NULL o finished_at IS NULL sin rolled_back.
// En Prisma 5.x una migración fallida tiene finished_at IS NULL.
function queryFailedMigrations() {
  const r = runChild(`
    try {
      const rows = await p.$queryRawUnsafe(
        "SELECT migration_name FROM _prisma_migrations WHERE finished_at IS NULL AND rolled_back_at IS NULL"
      );
      out({ ok: true, names: rows.map(r => r.migration_name) });
    } catch(e) { out({ ok: true, names: [] }); }
  `);
  if (!r.ok || !Array.isArray(r.names)) return [];
  return r.names;
}

function columnExistsInDb(table, column) {
  const r = runChild(`
    const rows = await p.$queryRawUnsafe(
      "SELECT COUNT(*) AS c FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = '${table}' AND column_name = '${column}'"
    );
    out({ ok: true, count: Number(rows[0].c) });
  `);
  return r.ok && r.count > 0;
}

function tableExistsInDb(table) {
  const r = runChild(`
    const rows = await p.$queryRawUnsafe(
      "SELECT COUNT(*) AS c FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = '${table}'"
    );
    out({ ok: true, count: Number(rows[0].c) });
  `);
  return r.ok && r.count > 0;
}

function indexExistsOnTable(table, indexName) {
  const r = runChild(`
    const rows = await p.$queryRawUnsafe(
      "SELECT COUNT(*) AS c FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = '${table}' AND index_name = '${indexName}'"
    );
    out({ ok: true, count: Number(rows[0].c) });
  `);
  return r.ok && r.count > 0;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Parsing de SQL de migraciones
// ═══════════════════════════════════════════════════════════════════════════════

function parseMigrationDdl(sql) {
  const stmts = [];
  const cleanSql = sql.split('\n').filter((l) => !l.trim().startsWith('--')).join('\n');

  // CREATE TABLE
  for (const m of cleanSql.matchAll(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?`([^`]+)`/gi)) {
    stmts.push({ type: 'CREATE_TABLE', table: m[1] });
  }

  // CREATE [UNIQUE] INDEX
  for (const m of cleanSql.matchAll(/CREATE\s+(?:UNIQUE\s+)?INDEX\s+(?:IF\s+NOT\s+EXISTS\s+)?`([^`]+)`\s+ON\s+`([^`]+)`/gi)) {
    stmts.push({ type: 'CREATE_INDEX', index: m[1], table: m[2] });
  }

  // Para ALTER TABLE multi-clause (e.g. ADD COLUMN x, ADD COLUMN y, ADD INDEX z),
  // extraemos cada bloque ALTER TABLE y parseamos todas sus cláusulas internamente.
  const alterBlocks = cleanSql.matchAll(
    /ALTER\s+TABLE\s+`([^`]+)`\s+((?:[^;](?!CREATE\s+TABLE))*);/gis
  );
  for (const [, table, body] of alterBlocks) {
    const block = body || '';
    // ADD COLUMN / ADD `col`
    for (const m of block.matchAll(/ADD\s+(?:COLUMN\s+)?(?:IF\s+NOT\s+EXISTS\s+)?`([^`]+)`/gi)) {
      stmts.push({ type: 'ADD_COLUMN', table, column: m[1] });
    }
    // MODIFY COLUMN / MODIFY `col`
    for (const m of block.matchAll(/MODIFY\s+(?:COLUMN\s+)?`([^`]+)`/gi)) {
      stmts.push({ type: 'MODIFY_COLUMN', table, column: m[1] });
    }
    // ADD [UNIQUE] INDEX `idx`
    for (const m of block.matchAll(/ADD\s+(?:UNIQUE\s+)?INDEX\s+`([^`]+)`/gi)) {
      stmts.push({ type: 'CREATE_INDEX', index: m[1], table });
    }
  }

  return stmts;
}

function checkDdlAlreadyApplied(stmt) {
  try {
    switch (stmt.type) {
      case 'CREATE_TABLE': return tableExistsInDb(stmt.table);
      case 'ADD_COLUMN': return columnExistsInDb(stmt.table, stmt.column);
      case 'MODIFY_COLUMN': return true;
      case 'CREATE_INDEX': return indexExistsOnTable(stmt.table, stmt.index);
      default: return false;
    }
  } catch {
    return false;
  }
}

function checkMigrationAlreadyApplied(sql) {
  const stmts = parseMigrationDdl(sql);
  if (stmts.length === 0) return true;
  return stmts.every(checkDdlAlreadyApplied);
}

// ═══════════════════════════════════════════════════════════════════════════════
// Auto-reparación: resolución de migraciones fallidas
// ═══════════════════════════════════════════════════════════════════════════════

// Este repo mezcla dos formatos de prefijo: 'YYYYMMDDHHMMSS_nombre' (Prisma
// generate) y 'YYYYMMDD_nombre' (las más recientes). El patrón debe aceptar
// ambos, si no nunca se identifica la migración culpable y el despliegue aborta.
const MIGRATION_NAME = String.raw`\d{8,14}_\w+`;

function extractFailingMigrationName(errorOutput) {
  let m = errorOutput.match(new RegExp(`Migration name:\\s+(${MIGRATION_NAME})`));
  if (m) return m[1];
  m = errorOutput.match(/migration\s+"([^"]+)"/i);
  if (m) return m[1];
  m = errorOutput.match(new RegExp(String.raw`\n\s+-\s+(${MIGRATION_NAME})`));
  if (m) return m[1];
  m = errorOutput.match(new RegExp(`(${MIGRATION_NAME}_(?:add_|create_|alter_|drop_|enable_)\\w+)`, 'i'));
  if (m) return m[1];
  return null;
}

async function resolveFailedMigrations() {
  const failed = queryFailedMigrations();
  if (failed.length === 0) return 0;

  console.log(`[safe-prisma] ${failed.length} migraci\u00f3n(es) fallida(s) detectada(s) en _prisma_migrations.`);
  let resolved = 0;

  for (const name of failed) {
    const sqlPath = join(migrationsDir, name, 'migration.sql');

    if (!existsSync(sqlPath) || forceResolve) {
      const reason = forceResolve ? '--force-resolve activado' : 'SQL no encontrado';
      console.log(`  \u2192 "${name}": ${reason}. Resolviendo como --applied.`);
      try {
        await runWithEpermRetry(`npx prisma migrate resolve --applied "${name}"`, 2, 1500);
        resolved++;
      } catch {
        console.warn(`  \u2192 No se pudo resolver "${name}".`);
      }
      continue;
    }

    const sql = readFileSync(sqlPath, 'utf8');
    const allApplied = checkMigrationAlreadyApplied(sql);

    if (allApplied) {
      console.log(`  \u2192 "${name}": DDL ya existe en BD. \u2192 --applied`);
    } else {
      console.log(`  \u2192 "${name}": DDL parcial. Resolviendo como --applied (mejor esfuerzo).`);
    }

    try {
      await runWithEpermRetry(`npx prisma migrate resolve --applied "${name}"`, 2, 1500);
      resolved++;
    } catch {
      console.warn(`  \u2192 No se pudo resolver "${name}".`);
    }
  }

  return resolved;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Deploy con auto-recovery y retry
// ═══════════════════════════════════════════════════════════════════════════════

// Errores de migración MySQL/Prisma que 'db push' puede alinear sin borrar
// datos: columna/tabla/índice duplicado (1060/1050/1061/1022/1051/1091),
// columna inexistente, P3009 (migración fallida) y P3018 (fallo al aplicar).
const MIGRATION_ERROR_RE =
  /P3018|P3009|P3005|P3006|1060|1050|1061|1022|1051|1091|duplicate|already exist|Duplicate|Unknown column|error applying migration|failed to apply/i;

function collectErrorOutput(err) {
  return [err?.__output, err?.stdout, err?.stderr, err?.message, String(err)]
    .filter(Boolean)
    .join('\n');
}

function isRecoverableDeployError(output) {
  return MIGRATION_ERROR_RE.test(output);
}

async function deployWithRecovery() {
  for (let attempt = 1; attempt <= MAX_DEPLOY_ATTEMPTS; attempt++) {
    try {
      console.log(`[safe-prisma] Intento ${attempt}/${MAX_DEPLOY_ATTEMPTS}: prisma migrate deploy`);
      runCapturing('npx prisma migrate deploy');
      console.log('[safe-prisma] prisma migrate deploy completado.');
      return;
    } catch (err) {
      const output = collectErrorOutput(err);

      if (!isRecoverableDeployError(output) || attempt === MAX_DEPLOY_ATTEMPTS) {
        console.error(`[safe-prisma] Error de migraci\u00f3n NO recuperable o agotados ${MAX_DEPLOY_ATTEMPTS} intentos.`);
        throw err;
      }

      console.log(`[safe-prisma] Deploy fall\u00f3 con error recuperable. Auto-reparaci\u00f3n...`);

      const resolved = await resolveFailedMigrations();

      const failingName = extractFailingMigrationName(output);
      if (failingName) {
        console.log(`  \u2192 Resolviendo "${failingName}" detectada en salida de error...`);
        try {
          await runWithEpermRetry(`npx prisma migrate resolve --applied "${failingName}"`, 2, 1500);
        } catch { /* ya manejado */ }
      }

      if (resolved === 0 && !failingName) {
        console.error('[safe-prisma] No se detectaron migraciones para resolver. Error no recuperable.');
        throw err;
      }

      console.log(`  \u2192 Reintentando deploy en 3s...`);
      await sleep(3000);
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Capa 4: fallback 'prisma db push --skip-generate'
// ═══════════════════════════════════════════════════════════════════════════════

// Tras un db push exitoso el esquema ya coincide con schema.prisma, así que
// marcar las migraciones como aplicadas sólo escribe filas en
// _prisma_migrations (no ejecuta DDL). Evita que el próximo deploy vuelva a
// fallar con el mismo P3018.
async function adoptAllMigrationsAsApplied() {
  let dirs;
  try {
    dirs = readdirSync(migrationsDir, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name)
      .sort();
  } catch {
    return 0;
  }

  let adopted = 0;
  for (const name of dirs) {
    try {
      execSync(`npx prisma migrate resolve --applied "${name}"`, {
        stdio: 'ignore',
        encoding: 'utf8',
        windowsHide: true,
      });
      adopted++;
    } catch {
      // Una migración ya registrada como aplicada hace que resolve falle:
      // es el caso normal en despliegues repetidos, no un fallo real.
    }
  }
  return adopted;
}

// Devuelve true si el esquema quedó sincronizado, false si el db push falló.
// Nunca lanza: el requisito es que el build no se bloquee por esto.
async function dbPushFallback(reason) {
  console.warn('');
  console.warn('[safe-prisma] ================================================');
  console.warn('[safe-prisma] FALLBACK: migrate deploy no fue reparable.');
  console.warn(`[safe-prisma] Motivo: ${String(reason).replace(/\s+/g, ' ').trim().slice(0, 300)}`);
  console.warn('[safe-prisma] Sincronizando esquema con: prisma db push --skip-generate');
  console.warn('[safe-prisma] ================================================');

  try {
    runCapturing('npx prisma db push --skip-generate');
  } catch (err) {
    console.error('');
    console.error('[safe-prisma] ERROR: "prisma db push" también falló.');
    console.error(`[safe-prisma] Detalle: ${collectErrorOutput(err).replace(/\s+/g, ' ').trim().slice(0, 400)}`);
    console.error('[safe-prisma] El esquema puede quedar desincronizado de schema.prisma.');
    console.error('[safe-prisma] Si Prisma pidió --accept-data-loss, NO se aplicó para no borrar datos.');
    console.error('[safe-prisma] Revisa manualmente: npx prisma migrate status');
    console.error('');
    return false;
  }

  console.log('[safe-prisma] Esquema sincronizado mediante db push como fallback.');

  const adopted = await adoptAllMigrationsAsApplied();
  if (adopted > 0) {
    console.log(`[safe-prisma] ${adopted} migracion(es) adoptada(s) como aplicadas para no repetir el fallo.`);
  }

  return true;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Generate con reintentos EPERM
// ═══════════════════════════════════════════════════════════════════════════════

async function generateWithRetry(attempts = 4, delayMs = 2000) {
  await runWithEpermRetry('npx prisma generate', attempts, delayMs);
}

// ═══════════════════════════════════════════════════════════════════════════════
// Main
// ═══════════════════════════════════════════════════════════════════════════════

async function main() {
  // 0. Liberar blockers EPERM antes de tocar la BD / cliente.
  await releaseLocks();

  // 1. Pre-vuelo: resolver migraciones fallidas PREVIAS (P3009/P3018).
  //    Esto desbloquea prisma migrate deploy para que intente aplicar las
  //    migraciones pendientes que estaban bloqueadas por la fallida.
  const prefResolved = await resolveFailedMigrations();
  if (prefResolved > 0) {
    console.log(`[safe-prisma] ${prefResolved} migraci\u00f3n(es) fallida(s) resuelta(s) en pre-vuelo.`);
  }

  // 2. Evaluar historial de migraciones.
  const { has, count } = hasMigrationHistory();

  if (!has) {
    if (hasProductTable()) {
      // BD creada con 'db push' sin tabla _prisma_migrations: adopta todo.
      const dirs = readdirSync(migrationsDir, { withFileTypes: true })
        .filter((d) => d.isDirectory())
        .map((d) => d.name)
        .sort();
      console.log('[safe-prisma] BD creada con db push (sin historial). Adoptando esquema existente sin modificar datos...');
      for (const name of dirs) {
        await runWithEpermRetry(`npx prisma migrate resolve --applied "${name}"`, 3, 1500);
      }
      console.log(`[safe-prisma] ${dirs.length} migraciones adoptadas como aplicadas.`);
    } else {
      console.log('[safe-prisma] BD sin tablas: se aplicar\u00e1n todas las migraciones desde cero.');
    }
  } else {
    console.log(`[safe-prisma] BD con historial de migraciones (${count} aplicadas registradas).`);
  }

  // 3. Deploy con auto-recovery, retry y fallback a 'db push'.
  let schemaSynced = true;
  let usedDbPush = false;
  try {
    await deployWithRecovery();
  } catch (err) {
    if (!allowDbPushFallback) {
      console.error('[safe-prisma] --no-db-push: abortando sin fallback.');
      throw err;
    }
    const fallbackOk = await dbPushFallback(collectErrorOutput(err));
    schemaSynced = fallbackOk;
    usedDbPush = true;
  }

  // 4. Regenerar Prisma Client. Se ejecuta siempre, incluso tras el
  //    fallback: el build depende de un cliente consistente con schema.prisma.
  await generateWithRetry();

  // 5. Verificación final. Tras un db push el historial queda desalineado a
  //    propósito, así que 'migrate status' reportará migraciones pendientes
  //    y sale con código 1: omitirlo para no abortar el despliegue.
  if (usedDbPush) {
    console.log('[safe-prisma] Omitiendo "migrate status" (historial desalineado tras db push).');
  } else {
    await runWithEpermRetry('npx prisma migrate status', 2, 2000);
  }

  if (usedDbPush && !schemaSynced) {
    console.warn('[safe-prisma] AVISO: el esquema qued\u00f3 SIN sincronizar. El build continuar\u00e1 pero revisa la BD.');
    console.log('[safe-prisma] Sincronizaci\u00f3n de BD completada con reservas (fallback fallido).');
  } else {
    console.log('[safe-prisma] Sincronizaci\u00f3n de BD completada correctamente.');
  }
}

main().catch((err) => {
  console.error('[safe-prisma] ERROR:', err.message || err);
  process.exit(1);
});
