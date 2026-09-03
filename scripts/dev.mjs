// Dev runner: arranca la API (Hono) y el frontend (Vite) en paralelo.
// Uso: npm run dev

import { spawn } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

const api = spawn('npx', ['tsx', '--tsconfig', 'tsconfig.server.json', 'server/index.ts'], {
  cwd: root,
  shell: true,
  stdio: 'inherit',
  env: { ...process.env, PORT: process.env.API_PORT || '9003' },
});

const vite = spawn('npx', ['vite', '--port', process.env.WEB_PORT || '5173'], {
  cwd: root,
  shell: true,
  stdio: 'inherit',
});

const shutdown = () => {
  api.kill();
  vite.kill();
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

api.on('error', (e) => console.error('[api]', e.message));
vite.on('error', (e) => console.error('[web]', e.message));