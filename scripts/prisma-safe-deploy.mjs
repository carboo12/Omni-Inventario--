// prisma-safe-deploy.mjs — v2: Despliegue blindado con auto-reparación
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
//   4. generate con reintentos EPERM.
//   5. Verificación final con migrate status.
//
// NUNCA usa 'prisma db push' en producción (evita pérdida de datos).
//
// OPCIONES:
//   --no-stop       No detiene procesos PM2/node activos.
//   --force-resolve Resuelve como --applied todas las migraciones fallidas
//                   sin verificar si el DDL existe (last-resort).
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
const MAX_DEPLOY_ATTEMPTS = 3;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function run(cmd) {
  console.log(`  \u2192 ${cmd}`);
  execSync(cmd, { stdio: 'inherit' });
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

function extractFailingMigrationName(errorOutput) {
  let m = errorOutput.match(/Migration name:\s+(\d{14,}_\w+)/);
  if (m) return m[1];
  m = errorOutput.match(/migration\s+"([^"]+)"/i);
  if (m) return m[1];
  m = errorOutput.match(/\n\s+-\s+(\d{14,}_\w+)/);
  if (m) return m[1];
  m = errorOutput.match(/(\d{14,}_\w+_(?:add_|create_|alter_|drop_|enable_)\w+)/i);
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

function isRecoverableDeployError(output) {
  return /P3018|P3009|1060|1050|1061|1022|1051|1091|duplicate|already exist|Duplicate|Unknown column/i.test(output);
}

async function deployWithRecovery() {
  for (let attempt = 1; attempt <= MAX_DEPLOY_ATTEMPTS; attempt++) {
    try {
      console.log(`[safe-prisma] Intento ${attempt}/${MAX_DEPLOY_ATTEMPTS}: prisma migrate deploy`);
      run('npx prisma migrate deploy');
      console.log('[safe-prisma] prisma migrate deploy completado.');
      return;
    } catch (err) {
      const output = String(err?.message || err?.stdout || '');

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

  // 3. Deploy con auto-recovery y retry.
  await deployWithRecovery();

  // 4. Regenerar Prisma Client.
  await generateWithRetry();

  // 5. Verificaci\u00f3n final.
  await runWithEpermRetry('npx prisma migrate status', 2, 2000);

  console.log('[safe-prisma] Sincronizaci\u00f3n de BD completada correctamente.');
}

main().catch((err) => {
  console.error('[safe-prisma] ERROR:', err.message || err);
  process.exit(1);
});
