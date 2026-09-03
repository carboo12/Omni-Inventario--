// Build del servidor Hono con esbuild (arquitectura Vite SPA + Hono).
// Resuelve shims de compatibilidad para server actions que antes usaban Next.js:
//   server-only  -> server/shims/server-only.ts  (no-op)
//   next/cache   -> server/shims/next-cache.ts   (stub local, sin Next.js)
//   next/headers -> server/shims/next-headers.ts (stub local, sin Next.js)
//   react        -> server/shims/react.ts         (re-export estándar)
// Salida: dist-server/index.mjs
// Uso: npx tsx scripts/build-server.mjs

import { build } from 'esbuild';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const shims = resolve(root, 'server/shims');

const isProd = process.env.NODE_ENV === 'production';

await build({
  entryPoints: [resolve(root, 'server/index.ts')],
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'esm',
  outfile: resolve(root, 'dist-server/index.mjs'),
  sourcemap: true,
  minify: isProd,
  packages: 'external', // no bundlear deps de node_modules (prisma, etc.)
  alias: {
    'server-only': resolve(shims, 'server-only.ts'),
    'next/cache': resolve(shims, 'next-cache.ts'),
    'next/headers': resolve(shims, 'next-headers.ts'),
    'react': resolve(shims, 'react.ts'),
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
  },
  banner: {
    js: "import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);",
  },
  logLevel: 'info',
});

console.log('[build-server] OK -> dist-server/index.mjs');