// prisma-unlock.mjs
// Utilidad para desbloquear el query_engine DLL de Prisma en Windows antes de
// ejecutar `prisma generate` / `prisma migrate deploy` / `prisma db push`.
//
// Los errores EPERM ("operation not permitted, rename ... query_engine-windows.dll.node.tmp")
// ocurren porque el proceso de Node/API en producción mantiene un File Lock sobre el
// query_engine DLL mientras corre el paso de actualización. Este script:
//   1. Detiene los procesos que sostienen el DLL (app PM2 "omni-pos" y procesos node
//      que cargan dist-server/index.mjs o server/index.ts).
//   2. Espera a que el DLL deje de estar bloqueado.
//   3. Elimina los residuos temporales `.tmp*` acumulados en node_modules/.prisma/client
//      (cada `prisma generate` fallido deja un `.node.tmp<pid>`).
//
// Uso:
//   node scripts/prisma-unlock.mjs            # detiene procesos y limpia temporales
//   node scripts/prisma-unlock.mjs --no-stop  # solo limpia los .tmp* (no detiene nada)
import { execSync } from 'node:child_process';
import { readdirSync, renameSync, rmSync, existsSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

const noStop = process.argv.includes('--no-stop');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function runQuiet(cmd) {
  try {
    return execSync(cmd, { stdio: 'pipe', encoding: 'utf8', windowsHide: true }).trim();
  } catch {
    return '';
  }
}

function stopApp() {
  console.log('[prisma-unlock] Deteniendo la aplicación en ejecución para liberar el query_engine DLL...');

  // 1. Detener la app PM2 "omni-pos" (libera el DLL que carga dist-server/index.mjs).
  const pm2Out = runQuiet('npx pm2 stop omni-pos');
  if (pm2Out) console.log('  → PM2: app "omni-pos" detenida.');

  // 2. Matar procesos node residuales cuyo CLI apunte al servidor de la app/dev.
  //    (taskkill /F /PID por cada PID cuyo command line coincida con los scripts de la app)
  const findCmd = [
    '%WINDIR%\\System32\\wbem\\WMIC.exe process where "name=\'node.exe\' and (CommandLine like \'%dist-server/index.mjs%\' or CommandLine like \'%server/index.ts%\' or CommandLine like \'%server\\\\index.ts%\')" get ProcessId,CommandLine',
    'findstr /R "ProcessId 9003 index.mjs server/index.ts"',
  ].join(' | ');
  const wmi = runQuiet(findCmd);
  const pids = (wmi.match(/\d+/g) || []).filter((p) => p.length > 1 && p.length < 8);
  const seen = new Set();
  for (const pid of pids) {
    if (seen.has(pid)) continue;
    seen.add(pid);
    if (Number(pid) === process.pid) continue;
    console.log(`  → Finalizando proceso node residual PID ${pid}...`);
    runQuiet(`taskkill /F /PID ${pid}`);
  }
}

async function waitUntilUnlocked(maxMs = 15000) {
  const dllPath = join(root, 'node_modules', '.prisma', 'client', 'query_engine-windows.dll.node');
  if (!existsSync(dllPath)) return true;
  const probe = join(root, 'node_modules', '.prisma', 'client', '__eprem_probe__.tmp');
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    // Para detectar el lock, intentamos renombrar el DLL sobre un nombre nuevo
    // (operación atómica que falla con EPERM si el archivo está bloqueado por otro proceso).
    try {
      renameSync(dllPath, probe);
      renameSync(probe, dllPath);
      return true;
    } catch {
      await sleep(500);
    }
  }
  console.warn('[prisma-unlock] AVISO: el query_engine DLL sigue pareciendo bloqueado. Se continuará igualmente.');
  return false;
}

function cleanTmpFiles() {
  const dir = join(root, 'node_modules', '.prisma', 'client');
  if (!existsSync(dir)) return;
  let removed = 0;
  for (const entry of readdirSync(dir)) {
    // Residuos de `prisma generate` fallidos: archivos *.tmp / *.node.tmp<pid>
    if (/\.tmp\d*$/i.test(entry)) {
      try {
        rmSync(join(dir, entry), { force: true });
        removed++;
      } catch {
        console.warn(`  → No se pudo eliminar ${entry} (¿sigue en uso?).`);
      }
    }
  }
  if (removed > 0) console.log(`  → ${removed} residuo(s) temporal(es) .tmp* eliminados de node_modules/.prisma/client.`);
}

async function main() {
  if (!noStop) {
    stopApp();
    await waitUntilUnlocked();
  } else {
    console.log('[prisma-unlock] --no-stop indicado: no se detendrán procesos.');
  }
  cleanTmpFiles();
  console.log('[prisma-unlock] Listo: el query_engine DLL quedó libre para actualizarse.');
}

main().catch((err) => {
  console.error('[prisma-unlock] ERROR:', err.message || err);
  process.exit(1);
});
