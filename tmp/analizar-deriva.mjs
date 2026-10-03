// Analiza que tablas/columnas declara schema.prisma vs. que crea el historial de migraciones.
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = 'C:/Users/carlo/OneDrive/Documents/Downloads/react/Omni Inventario +';
const schemaTxt = readFileSync(join(ROOT, 'prisma/schema.prisma'), 'utf8');
const migDir = join(ROOT, 'prisma/migrations');

// 1. Tablas del schema (modelo -> @@map, o nombre del modelo)
const tables = new Map(); // tabla -> modelo
let curModel = null;
for (const raw of schemaTxt.split('\n')) {
  const line = raw.trim();
  const m = line.match(/^model\s+(\w+)\s*\{/);
  if (m) { curModel = m[1]; continue; }
  if (line === '}') { curModel = null; continue; }
  const map = line.match(/@@map\("([^"]+)"\)/);
  if (map && curModel) tables.set(map[1], curModel);
}
// 2. Todo el SQL de migraciones concatenado
let all = '';
const migNames = [];
for (const d of readdirSync(migDir, { withFileTypes: true })) {
  if (!d.isDirectory()) continue;
  const f = join(migDir, d.name, 'migration.sql');
  if (!existsSync(f)) continue;
  migNames.push(d.name);
  all += `\n-- ${d.name}\n` + readFileSync(f, 'utf8');
}

// 3. Tablas CREADAS por migraciones
const created = new Set();
for (const m of all.matchAll(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?`?([A-Za-z0-9_]+)`?/gi)) {
  created.add(m[1]);
}
// 4. Tablas ALTERadas (para detectar "se alteran pero nunca se crean")
const altered = new Map();
for (const m of all.matchAll(/ALTER\s+TABLE\s+`?([A-Za-z0-9_]+)`?/gi)) {
  const t = m[1];
  if (!altered.has(t)) altered.set(t, []);
  altered.get(t).push(migNames.find((n) => all.includes(n)) || '?');
}
// Reasignar migracion real por tabla
const alteredWith = new Map();
let curMig = null;
for (const raw of all.split('\n')) {
  const c = raw.match(/^-- (\S+)$/);
  if (c) { curMig = c[1]; continue; }
  const a = raw.match(/ALTER\s+TABLE\s+`?([A-Za-z0-9_]+)`?/i);
  if (a) {
    const t = a[1];
    if (!alteredWith.has(t)) alteredWith.set(t, new Set());
    alteredWith.get(t).add(curMig);
  }
}

const missingCreate = [...tables.keys()].filter((t) => !created.has(t)).sort();
const alterNoCreate = [...alteredWith.keys()].filter((t) => !created.has(t) && tables.has(t)).sort();

console.log(`Modelos en schema.prisma : ${tables.size}`);
console.log(`Tablas CREATE en migraciones: ${created.size}`);
console.log(`Migraciones en la carpeta  : ${migNames.length}`);
console.log('');
console.log(`--- Tablas del schema que NINGUNA migracion crea (${missingCreate.length}) ---`);
for (const t of missingCreate) {
  const src = alteredWith.has(t) ? ` (ALTERada en: ${[...alteredWith.get(t)].join(', ')})` : ' (nadie la toca)';
  console.log(`  ${t.padEnd(28)} modelo=${tables.get(t)}${src}`);
}
console.log('');
console.log(`--- Tablas ALTERadas pero nunca creadas (rompe DB nueva) (${alterNoCreate.length}) ---`);
for (const t of alterNoCreate) console.log(`  ${t}`);

// 5. Columnas de systemsettings
const sysColsSchema = new Set();
let inSys = false;
for (const raw of schemaTxt.split('\n')) {
  if (/^model\s+SystemSettings\s*\{/.test(raw)) { inSys = true; continue; }
  if (inSys && raw.trim() === '}') { inSys = false; continue; }
  if (!inSys) continue;
  const f = raw.trim().match(/^([A-Za-z_]\w*)\s+\w/);
  if (f) sysColsSchema.add(f[1]);
}
const sysMigs = all.split('\n').filter((l) => /systemsettings/i.test(l) && /ADD\s+COLUMN/i.test(l));
const sysColsMigs = new Set();
for (const l of sysMigs) {
  const c = l.match(/ADD\s+COLUMN\s+`?(\w+)`?/i);
  if (c) sysColsMigs.add(c[1]);
}
// Columnas de systemsettings en la tabla real segun el CREATE original
const sysNotInMigs = [...sysColsSchema].filter((c) => !sysColsMigs.has(c)).sort();
console.log('');
console.log(`--- Columnas de systemsettings SIN migracion ADD COLUMN (${sysNotInMigs.length} de ${sysColsSchema.size}) ---`);
console.log('  ' + sysNotInMigs.join(', '));