// Dispatcher genérico: expone cualquier función exportada de los action modules
// vía POST /api/actions/:module/:function
// El body es JSON: { args: [...], files?: [...] }
// La respuesta es JSON: el retorno de la función o { error } si falla.

import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { jwtVerify } from 'jose';
import { actionModules } from './action-modules';
import { createCookieStore, RequestContext, runWithContext } from './lib/request-context';

// Nombre de la cookie de sesión (mismo valor que SESSION_COOKIE_NAME en
// src/lib/session.ts) y llave de firma del JWT.
const SESSION_COOKIE_NAME = 'session';
const SESSION_ENCODED_KEY = new TextEncoder().encode(
  process.env.SESSION_SECRET || 'default-secret-key-change-me'
);

// Flujos públicos: funcionan sin sesión, por lo que NO deben devolver 401
// aunque el navegador aún envíe una cookie vencida/inválida.
const PUBLIC_ENDPOINTS: Array<{ module: string; fn: string }> = [
  { module: 'auth', fn: 'checkUsersExist' },
  { module: 'auth', fn: 'registerFirstUser' },
  { module: 'auth', fn: 'loginUser' },
  { module: 'auth', fn: 'resetPassword' },
  { module: 'auth', fn: 'logout' },
  { module: 'activation', fn: 'checkActivationStatus' },
  { module: 'activation', fn: 'activateSystem' },
  // Bootstrap: maneja internamente el caso "no autenticado" (user: null).
  { module: 'init-data', fn: 'getInitialAppData' },
];

function isPublicEndpoint(module: string, fn: string): boolean {
  return PUBLIC_ENDPOINTS.some((e) => e.module === module && e.fn === fn);
}

/** Extrae el valor crudo de la cookie de sesión del header Cookie. */
function readSessionCookie(header: string | undefined): string | undefined {
  if (!header) return undefined;
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    if (part.slice(0, idx).trim() === SESSION_COOKIE_NAME) {
      return part.slice(idx + 1).trim();
    }
  }
  return undefined;
}

export function buildDispatcherApp(): Hono {
  const app = new Hono();

  // Salud del servicio
  app.get('/health', (c) => c.json({ ok: true, ts: Date.now() }));

  // Punto único de ejecución de actions
  app.post('/api/actions/:module/:fn', async (c) => {
    const moduleName = c.req.param('module') as keyof typeof actionModules;
    const fnName = c.req.param('fn');

    const mod = actionModules[moduleName];
    if (!mod) {
      throw new HTTPException(404, { message: `Módulo de acción no existe: ${String(moduleName)}` });
    }

    const fn = (mod as Record<string, unknown>)[fnName];
    if (typeof fn !== 'function') {
      throw new HTTPException(404, { message: `Función no existe: ${String(moduleName)}.${fnName}` });
    }

// 401 Unauthorized si la cookie de sesión (JWT) está presente pero ya
// expiró o es inválida. Endpoints públicos quedan excluidos del chequeo.
if (!isPublicEndpoint(String(moduleName), fnName)) {
  const sessionCookie = readSessionCookie(c.req.header('cookie'));
  if (sessionCookie) {
    let sessionOk = false;
    try {
      await jwtVerify(sessionCookie, SESSION_ENCODED_KEY, { algorithms: ['HS256'] });
      sessionOk = true;
    } catch {
      sessionOk = false;
    }
    if (!sessionOk) {
      throw new HTTPException(401, {
        message: 'Sesión expirada. Por favor inicie sesión nuevamente.',
      });
    }
  }
}

    // Leer body: { args: [...] }
    let args: unknown[] = [];
    try {
      const body = await c.req.json().catch(() => ({}));
      if (Array.isArray(body.args)) args = body.args;
    } catch {
      args = [];
    }

    // Contexto de request con las cookies reales
    const cookieHeader = c.req.header('cookie');
    const cookies = createCookieStore(cookieHeader);
    const ctx: RequestContext = { cookies, cacheStore: new Map() };

    let result: unknown;
    try {
      result = await runWithContext(ctx, () => fn(...args));
    } catch (err) {
      console.error(`[action] ${String(moduleName)}.${fnName} error:`, err);
      throw new HTTPException(500, {
        message: `Error ejecutando ${String(moduleName)}.${fnName}: ${err instanceof Error ? err.message : String(err)}`,
      });
    }

    // Aplicar cookies de sesión escritas durante la ejecución (login/logout)
    // Usamos append para emitir un header Set-Cookie por cookie (comportamiento
    // correcto en todos los navegadores, a diferencia de join(', ')).
    const setCookies = cookies.getSetCookies();
    for (const cookie of setCookies) {
      c.header('Set-Cookie', cookie, { append: true });
    }

    return c.json(result);
  });

  return app;
}