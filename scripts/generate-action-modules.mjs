// Genera server/action-modules.ts a partir de src/lib/actions/*.ts
// Descubre las funciones exportadas de cada módulo para construir el dispatcher.
// Uso: npx tsx scripts/generate-action-modules.mjs

import { readdirSync, writeFileSync } from 'node:fs';
import { join, resolve, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const actionsDir = resolve(__dirname, '../src/lib/actions');
const outFile = resolve(__dirname, '../server/action-modules.ts');

const files = readdirSync(actionsDir).filter((f) => f.endsWith('.ts'));

// Módulos extra fuera de src/lib/actions (p. ej. src/actions/activation.ts).
// Mapeamos el nombre público del módulo -> path relativo.
const extraModules = {
  activation: resolve(__dirname, '../src/actions/activation.ts'),
};

const rel = (absPath) => {
  let p = relative(dirname(outFile), absPath).replace(/\\/g, '/');
  if (!p.startsWith('.')) p = './' + p;
  return p.replace(/\.ts$/, '');
};

const RESERVED = new Set([
  'export', 'import', 'default', 'new', 'delete', 'function', 'class', 'if',
  'else', 'for', 'while', 'do', 'switch', 'case', 'return', 'typeof', 'void',
  'null', 'true', 'false', 'this', 'super', 'yield', 'await', 'in', 'of',
  'var', 'let', 'const', 'static', 'extends', 'implements', 'instanceof',
  'interface', 'package', 'private', 'protected', 'public',
]);

const toIdent = (name) => {
  let ident = name.replace(/[^a-zA-Z0-9_$]/g, '_');
  if (RESERVED.has(ident)) ident = `${ident}_module`;
  if (/^[0-9]/.test(ident)) ident = `m_${ident}`;
  return ident;
};

const lines = [];
lines.push('// GENERADO AUTOMÁTICAMENTE por scripts/generate-action-modules.mjs');
lines.push('// No editar a mano. Regenerar con: npx tsx scripts/generate-action-modules.mjs');
lines.push('//');

for (const file of files) {
  const name = file.replace(/\.ts$/, '');
  const ident = toIdent(name);
  const abs = join(actionsDir, file);
  const moduleSpec = rel(abs);
  lines.push(`import * as ${ident} from '${moduleSpec}';`);
}

for (const [name, abs] of Object.entries(extraModules)) {
  const ident = toIdent(name);
  const moduleSpec = rel(abs);
  lines.push(`import * as ${ident} from '${moduleSpec}';`);
}

lines.push('');
lines.push('export const actionModules = {');
for (const file of files) {
  const name = file.replace(/\.ts$/, '');
  const ident = toIdent(name);
  lines.push(`  '${name}': ${ident},`);
}
for (const name of Object.keys(extraModules)) {
  const ident = toIdent(name);
  lines.push(`  '${name}': ${ident},`);
}
lines.push('} as const;');

lines.push('');
lines.push('export type ActionModuleName = keyof typeof actionModules;');

writeFileSync(outFile, lines.join('\n') + '\n');
console.log(`OK: ${files.length} módulos -> ${outFile}`);