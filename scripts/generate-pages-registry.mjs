// Genera src/pages-registry.tsx a partir de la estructura src/app.
// Cada página cliente se envuelve con un adapter que carga sus datos
// vía la API (actions-client) en lugar de recibirlos del server de Next.
//
// Uso: npx tsx scripts/generate-pages-registry.mjs

import { readdirSync, mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { join, resolve, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const appDir = resolve(__dirname, '../src/app');
const outFile = resolve(__dirname, '../src/pages-registry.tsx');

// Convención: cómo cada ruta obtiene sus datos iniciales vía actions-client.
// Clave: path relativo dentro de src/app (sin paréntesis de grupo). Valor: array de
// { prop, actionModule, actionFn, key } donde key es un parámetro de ruta opcional.
const DATA_CONVENTIONS = {
  'cash-management': [
    { prop: 'initialUsers', actionModule: 'users', actionFn: 'getUsers' },
  ],
  categories: [
    { prop: 'initialCategories', actionModule: 'categories', actionFn: 'getCategories' },
  ],
  collections: [
    { prop: 'initialCollections', actionModule: 'collections', actionFn: 'getCollections' },
  ],
  customers: [
    { prop: 'initialCustomers', actionModule: 'customers', actionFn: 'getAllCustomers' },
  ],
  'customers/credit': [
    { prop: 'initialCustomers', actionModule: 'customers', actionFn: 'getAllCustomers' },
  ],
  'delivery-routes': [
    { prop: 'initialRoutes', actionModule: 'delivery-routes', actionFn: 'getDeliveryRoutes' },
  ],
  'delivery-routes/new': [],
  'delivery-routes/[id]': [
    { prop: 'route', actionModule: 'delivery-routes', actionFn: 'getDeliveryRouteById', key: 'id' },
  ],
  inventory: [
    { prop: 'initialInventory', actionModule: 'inventory', actionFn: 'getInventory' },
    { prop: 'initialProducts', actionModule: 'products', actionFn: 'getProducts' },
    { prop: 'initialMovements', actionModule: 'inventory', actionFn: 'getInventoryMovements' },
  ],
  'inventory/history': [
    { prop: 'movements', actionModule: 'inventory', actionFn: 'getInventoryMovements' },
  ],
  'inventory/import-history': [
    { prop: 'history', actionModule: 'import-history', actionFn: 'getImportHistory' },
  ],
  kardex: [
    { prop: 'initialMovements', actionModule: 'kardex', actionFn: 'getInventoryMovements' },
  ],
  orders: [
    { prop: 'initialOrders', actionModule: 'orders', actionFn: 'getOrders' },
  ],
  'orders/[id]': [
    { prop: 'order', actionModule: 'orders', actionFn: 'getOrderById', key: 'id' },
  ],
  pos: [
    { prop: 'initialProducts', actionModule: 'products', actionFn: 'getProducts' },
    { prop: 'initialInventory', actionModule: 'inventory', actionFn: 'getInventory' },
  ],
  purchases: [
    { prop: 'initialInvoices', actionModule: 'purchases', actionFn: 'getPurchaseInvoices' },
    { prop: 'initialSuppliers', actionModule: 'suppliers', actionFn: 'getSuppliers' },
    { prop: 'initialOrders', actionModule: 'purchase-orders', actionFn: 'getPurchaseOrders' },
  ],
  quotations: [
    { prop: 'initialQuotes', actionModule: 'quotations', actionFn: 'getQuotes' },
  ],
  'purchases/new': [
    { prop: 'initialSuppliers', actionModule: 'suppliers', actionFn: 'getSuppliers' },
  ],
  'purchases/orders/[id]': [
    { prop: 'order', actionModule: 'purchase-orders', actionFn: 'getPurchaseOrderById', key: 'id' },
  ],
  'purchases/orders/new': [
    { prop: 'suppliers', actionModule: 'suppliers', actionFn: 'getSuppliers' },
    { prop: 'products', actionModule: 'products', actionFn: 'getProducts' },
  ],
  reports: [],
  'reports/cash-closings': [
    { prop: 'initialData', actionModule: 'cash-register', actionFn: 'getSessions' },
    { prop: 'users', actionModule: 'users', actionFn: 'getUsers' },
  ],
  'settings/audit': [
    { prop: 'initialLogs', actionModule: 'audit', actionFn: 'getAuditLogs' },
  ],
  suppliers: [
    { prop: 'initialSuppliers', actionModule: 'suppliers', actionFn: 'getSuppliers' },
  ],
  users: [
    { prop: 'initialUsers', actionModule: 'users', actionFn: 'getUsers' },
  ],
};

// Páginas públicas (sin auth layout)
const PUBLIC_PATHS = ['/', '/login', '/setup', '/offline'];

function walk(dir, base = '') {
  const entries = [];
  for (const f of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, f.name);
    const rel = base ? `${base}/${f.name}` : f.name;
    if (f.isDirectory()) {
      // Ignorar grupos de Next (paréntesis) en la ruta
      if (f.name.startsWith('(') && f.name.endsWith(')')) {
        entries.push(...walk(full, base));
      } else {
        entries.push(...walk(full, rel));
      }
    } else if (f.name === 'client.tsx' || f.name === 'page.tsx') {
      entries.push({ full, rel });
    }
  }
  return entries;
}

// Resolver el componente de página a importar: preferir client.tsx, sino page.tsx.
const files = walk(appDir);

// Detecta si un page.tsx es seguro para SPA (usa 'use client' y no es async server).
function isClientSafe(filePath) {
  if (!filePath) return false;
  const src = readFileSync(filePath, 'utf8');
  if (/use client/.test(src) && !/export default async function/.test(src)) return true;
  return false;
}

// Agrupar: clave de ruta = rel dirname
const routeMap = new Map();
for (const f of files) {
  const isClientFile = f.rel === 'client.tsx' || f.rel.endsWith('/client.tsx');
  const isPageFile = f.rel === 'page.tsx' || f.rel.endsWith('/page.tsx');
  let dirKey = f.rel;
  if (isClientFile) dirKey = f.rel === 'client.tsx' ? '' : f.rel.slice(0, f.rel.length - '/client.tsx'.length);
  else if (isPageFile) dirKey = f.rel === 'page.tsx' ? '' : f.rel.slice(0, f.rel.length - '/page.tsx'.length);
  const route = dirKey === '' ? '/' : `/${dirKey}`;
  if (!routeMap.has(route)) routeMap.set(route, {});
  const cur = routeMap.get(route);
  if (f.rel.endsWith('client.tsx')) cur.client = f.full;
  else cur.page = f.full;
}

const toIdent = (s) => s.replace(/[^a-zA-Z0-9_$]/g, '_').replace(/^[0-9]/, 'm_$&');

const lines = [];
lines.push('// GENERADO AUTOMÁTICAMENTE por scripts/generate-pages-registry.mjs');
lines.push('// No editar a mano. Regenerar: npx tsx scripts/generate-pages-registry.mjs');
lines.push('');
lines.push("import { createElement, lazy, Suspense } from 'react';");
lines.push("import { useQuery } from '@tanstack/react-query';");
lines.push("import { callAction } from '@/lib/api-client';");
lines.push("import { useRouteParams } from '@/lib/route-match';");
lines.push('');

// Imports de cada componente cliente + wrapper
const pageEntries = [];
for (const [route, { client, page }] of routeMap.entries()) {
  // Elegir componente usable en SPA: client.tsx siempre; page.tsx solo si es client-safe.
  let componentFile = client || null;
  if (!componentFile && isClientSafe(page)) componentFile = page;
  if (!componentFile) continue;

  const isClient = !!client;
  // Path relativo de src/pages-registry.tsx al componente
  let relPath = relative(resolve(__dirname, '../src'), componentFile).replace(/\\/g, '/');
  if (!relPath.startsWith('.')) relPath = `./${relPath}`;
  relPath = relPath.replace(/\.tsx$/, '');

  const id = toIdent(route);
  const src = readFileSync(componentFile, 'utf8');
  const isDefault = /export default/.test(src);
  if (isDefault) {
    lines.push(`const ${id}Component = lazy(() => import('${relPath}'));`);
  } else {
    // Named export: adivinar nombre del componente exportado.
    const named = /export function (\w+)/.exec(src);
    const fnName = named ? named[1] : `${toIdent(route.replace(/^\//, ''))}Client`;
    lines.push(`const ${id}Component = lazy(() => import('${relPath}').then((m) => ({ default: m.${fnName} })));`);
  }

  const conv = DATA_CONVENTIONS[route.replace(/^\//, '')] || [];
  const isPublic = PUBLIC_PATHS.includes(route);

  pageEntries.push({ route, id, isClient, isPublic, conv, hasPage: !!page, hasClient: !!client });
}

lines.push('');
lines.push('export interface PageEntry {');
lines.push('  Component: React.ComponentType<any>;');
lines.push('  requiresAuth: boolean;');
lines.push('}');
lines.push('');
lines.push('const LoadingFallback = () =>');
lines.push("  createElement('div', { className: 'flex h-screen items-center justify-center bg-muted' },");
lines.push("    createElement('div', { className: 'flex items-center space-x-2' },");
lines.push("      createElement('div', { className: 'h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent' }),");
lines.push("      createElement('span', { className: 'text-lg font-medium text-muted-foreground' }, 'Cargando...')");
lines.push('    )');
lines.push('  );');
lines.push('');

// Fallback por página (reutiliza LoadingFallback para no duplicar código).
for (const p of pageEntries) {
  lines.push(`const ${p.id}Fallback = LoadingFallback;`);
}
lines.push('');

// Wrappers con carga de datos
for (const p of pageEntries) {
  if (p.conv.length === 0) {
    lines.push(`const ${p.id}Wrapper = () => createElement(Suspense, { fallback: ${p.id}Fallback() }, createElement(${p.id}Component, {}));`);
  } else {
    lines.push(`const ${p.id}Wrapper = () => {`);
    lines.push(`  const params = useRouteParams();`);
    lines.push(`  const queries: any = {};`);
    const qnames = [];
    for (const conv of p.conv) {
      const args = conv.key ? `[params.${conv.key}]` : `[]`;
      qnames.push(`q${p.id}_${conv.prop}`);
      lines.push(`  const q${p.id}_${conv.prop} = useQuery({`);
      lines.push(`    queryKey: ['${p.id}', '${conv.prop}', ${conv.key ? `params.${conv.key}` : 'null'}],`);
      const mapExpr = conv.key
        ? `(r && typeof r === 'object' && 'success' in r && 'data' in r ? (r.success ? r.data : null) : r)`
        : `(r && typeof r === 'object' && 'success' in r && 'data' in r ? (r.success ? (r.data ?? []) : []) : r)`;
      lines.push(`    queryFn: () => callAction('${conv.actionModule}', '${conv.actionFn}', ${args}).then((r) => ${mapExpr}),`);
      lines.push(`    staleTime: 30_000,`);
      lines.push(`  });`);
      lines.push(`  queries.${conv.prop} = q${p.id}_${conv.prop}.data;`);
    }
    lines.push(`  if ([${qnames.join(', ')}].some((q) => q.isPending || q.data === undefined)) return createElement(LoadingFallback);`);
    lines.push(`  return createElement(Suspense, { fallback: ${p.id}Fallback() }, createElement(${p.id}Component, queries));`);
    lines.push(`};`);
  }
  lines.push('');
}

// Export del registro
lines.push('export const publicPages: Record<string, PageEntry> = {');
for (const p of pageEntries.filter((x) => x.isPublic)) {
  lines.push(`  '${p.route}': { Component: ${p.id}Wrapper, requiresAuth: false },`);
}
lines.push('};');
lines.push('');
lines.push('export const authenticatedPages: Record<string, PageEntry> = {');
for (const p of pageEntries.filter((x) => !x.isPublic)) {
  lines.push(`  '${p.route}': { Component: ${p.id}Wrapper, requiresAuth: true },`);
}
lines.push('};');
lines.push('');
lines.push('export const pageNotFound: PageEntry = { Component: () => createElement("div", null, "Página no encontrada"), requiresAuth: false };');

writeFileSync(outFile, lines.join('\n') + '\n');
console.log(`OK: ${pageEntries.length} rutas -> ${outFile}`);