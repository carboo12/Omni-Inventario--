// Servidor principal Hono para JoyeriaPlus API.
// Reutiliza los 41 action modules de Next mediante shims de compatibilidad.
// En producción sirve también los estáticos del frontend (dist/) en el mismo origen.
//
// Uso dev: npx tsx server/index.ts
// Uso prod: node dist-server/index.mjs

import 'dotenv/config';
import { serve } from '@hono/node-server';
import { cors } from 'hono/cors';
import { buildDispatcherApp } from './dispatcher';
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { serveStatic } from '@hono/node-server/serve-static';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const PORT = Number(process.env.PORT || 9003);
const FRONTEND_DIR = resolve(__dirname, '../dist');

const app = buildDispatcherApp();

// CORS: permitimos credenciales (cookies de sesión) desde el origen del frontend.
const frontendOrigin = process.env.FRONTEND_ORIGIN || 'http://localhost:5173';
app.use('*', cors({
  origin: (origin) => {
    if (!origin) return '*';
    if (process.env.NODE_ENV === 'production') return origin;
    return frontendOrigin;
  },
  credentials: true,
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'Cookie'],
}));

// En producción, servir los estáticos del frontend (SPA) en el mismo origen.
if (existsSync(FRONTEND_DIR)) {
  app.use('*', serveStatic({ root: FRONTEND_DIR }));

  // SPA fallback: cualquier ruta no-API sirve index.html (historia HTML5).
  app.get('*', (c) => {
    const pathname = c.req.path;
    if (pathname.startsWith('/api/')) return c.notFound();
    return serveStatic({ root: FRONTEND_DIR, path: 'index.html' })(c);
  });
}

serve({ fetch: app.fetch, port: PORT }, (info) => {
  console.log(`[joyeriaplus-api] escuchando en http://localhost:${info.port}`);
});