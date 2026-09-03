// Genera src/lib/actions-client/*.ts a partir de src/lib/actions/*.ts
// Cada wrapper replica la firma (mismos argumentos) y llama a la API vía callAction.
// Uso: npx tsx scripts/generate-client-actions.mjs

import { readdirSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const actionsDir = resolve(__dirname, '../src/lib/actions');
const extraActionsDir = resolve(__dirname, '../src/actions');
const outDir = resolve(__dirname, '../src/lib/actions-client');

const files = readdirSync(actionsDir).filter((f) => f.endsWith('.ts'));
// También procesar src/actions/*.ts (extra actions de activación).
let extraFiles = [];
try {
  extraFiles = readdirSync(extraActionsDir)
    .filter((f) => f.endsWith('.ts'))
    .map((f) => join(extraActionsDir, f));
} catch {
  /* src/actions no existe */
}
mkdirSync(outDir, { recursive: true });

// Lee los nombres de funciones exportadas de un archivo.
function exportedFns(filePath) {
  const src = readFileSync(filePath, 'utf8');
  const names = new Set();
  const re = /export\s+(?:async\s+)?function\s+([A-Za-z_$][\w$]*)/g;
  let m;
  while ((m = re.exec(src))) names.add(m[1]);
  // export const fn = async (...) => ...
  const re2 = /export\s+const\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?(?:\(|[A-Za-z_$])/g;
  while ((m = re2.exec(src))) names.add(m[1]);
  return [...names];
}

// Lee los tipos exportados (interface/type) de un archivo: devuelve el bloque completo,
// con parsing balanceado de llaves (soporta interfaces anidadas).
function exportedTypes(filePath) {
  const src = readFileSync(filePath, 'utf8');
  const blocks = [];
  const re = /export\s+(interface\s+[A-Za-z_$][\w$]*|type\s+[A-Za-z_$][\w$]*\s*=)/g;
  let m;
  while ((m = re.exec(src))) {
    let i = m.index;
    const startKeyword = m[1];
    const isInterface = startKeyword.startsWith('interface');
    // Encontrar la apertura de llaves (interface) o el '=' seguido de objeto (type)
    let openIdx;
    if (isInterface) {
      openIdx = src.indexOf('{', i);
    } else {
      openIdx = src.indexOf('=', i);
      // type X = { ... } o type X = ...;  — manejar ambos
      const braceIdx = src.indexOf('{', i);
      const semiIdx = src.indexOf(';', i);
      if (braceIdx !== -1 && braceIdx < semiIdx) openIdx = braceIdx;
      else {
        // type alias simple: hasta ';'
        const endIdx = src.indexOf(';', i);
        if (endIdx === -1) continue;
        blocks.push(src.slice(i, endIdx + 1).trim());
        continue;
      }
    }
    if (openIdx === -1) continue;

    let depth = 0;
    let j = openIdx;
    for (; j < src.length; j++) {
      const ch = src[j];
      if (ch === '{') depth++;
      else if (ch === '}') {
        depth--;
        if (depth === 0) break;
      }
    }
    if (depth !== 0) continue;
    blocks.push(src.slice(i, j + 1).trim());
  }
  return blocks;
}

let total = 0;
const allFiles = [
  ...files.map((f) => ({ abs: join(actionsDir, f), name: f.replace(/\.ts$/, '') })),
  ...extraFiles.map((abs) => ({ abs, name: 'activation' })),
];

// Extrae nombres importados (como tipos) desde '@prisma/client' (o subpaths de prisma),
// para re-emitirlos como `import type` sin arrastrar código prisma al bundle del cliente.
function prismaTypeImports(filePath) {
  const src = readFileSync(filePath, 'utf8');
  const names = new Set();
  const re = /import\s+(?:type\s+)?\{([^}]*)\}\s*from\s*['"](?:@prisma\/client(?:\/[^'"]*)?)['"]/g;
  let m;
  while ((m = re.exec(src))) {
    const inner = m[1];
    for (const part of inner.split(',')) {
      const trimmed = part.trim().replace(/\s+as\s+\w+/, '');
      if (trimmed) names.add(trimmed);
    }
  }
  return [...names];
}

for (const { abs, name } of allFiles) {
  const fns = exportedFns(abs);
  const types = exportedTypes(abs);
  const typeImports = prismaTypeImports(abs);

  if (fns.length === 0 && types.length === 0) continue;

  const lines = [];
  lines.push('// GENERADO AUTOMÁTICAMENTE. No editar.');
  lines.push(`// Wrappers de transporte para el módulo '${name}' (llaman a la API).`);
  lines.push(`import { callAction } from '../api-client';`);
  lines.push('');
  // Tipos importados como `import type` (se borran en build; no arrastran prisma al bundle).
  if (typeImports.length > 0) {
    lines.push(`import type { ${typeImports.join(', ')} } from '@prisma/client';`);
    lines.push('');
  }
  // Copiar declaraciones de tipos inline (evita importar el módulo server original).
  if (types.length > 0) {
    lines.push('// Tipos copiados del action original (para no arrastrar código server al bundle).');
    for (const block of types) {
      lines.push(block);
      lines.push('');
    }
  }
  for (const fn of fns) {
    lines.push(`export async function ${fn}(...args: any[]): Promise<any> {`);
    lines.push(`  return callAction('${name}', '${fn}', args);`);
    lines.push(`}`);
    lines.push('');
    total++;
  }

  writeFileSync(join(outDir, `${name}.ts`), lines.join('\n'));
}

console.log(`OK: ${allFiles.length} módulos, ${total} wrappers -> ${outDir}`);