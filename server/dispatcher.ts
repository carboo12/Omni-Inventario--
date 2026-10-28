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

  // Ruta estable y explícita para el historial de tickets. Se conserva el
  // contrato del cliente ({ args: [startDate, endDate] }) y el contexto de
  // cookies usado por verifySession en las acciones.
  app.post('/api/actions/reports/getTicketHistory', async (c) => {
    const action = actionModules.reports.getTicketHistory;
    let args: unknown[] = [];
    try {
      const body = await c.req.json().catch(() => ({}));
      if (Array.isArray(body.args)) args = body.args;
      else if (body && typeof body === 'object' && 'startDate' in body && 'endDate' in body) {
        args = [(body as any).startDate, (body as any).endDate];
      }
    } catch {
      args = [];
    }
    const cookies = createCookieStore(c.req.header('cookie'));
    const ctx: RequestContext = { cookies, cacheStore: new Map() };
    try {
      const result = await runWithContext(ctx, () => action(...args as [string, string]));
      for (const cookie of cookies.getSetCookies()) c.header('Set-Cookie', cookie, { append: true });
      return c.json(result);
    } catch (err) {
      console.error('[action] reports.getTicketHistory error:', err);
      throw new HTTPException(500, {
        message: `Error ejecutando reports.getTicketHistory: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  });

  // Ruta explícita para el historial de devoluciones. Mantiene el contexto de
  // sesión que necesitan las acciones y garantiza el contrato de args del cliente.
  app.post('/api/actions/credit-notes/getCreditNotes', async (c) => {
    const action = actionModules['credit-notes'].getCreditNotes;
    let args: unknown[] = [];
    try {
      const body = await c.req.json().catch(() => ({}));
      if (Array.isArray(body.args)) args = body.args;
    } catch {
      args = [];
    }

    const cookies = createCookieStore(c.req.header('cookie'));
    const ctx: RequestContext = { cookies, cacheStore: new Map() };
    try {
      const result = await runWithContext(ctx, () => action(...args as [number?]));
      for (const cookie of cookies.getSetCookies()) c.header('Set-Cookie', cookie, { append: true });
      return c.json(result);
    } catch (err) {
      console.error('[action] credit-notes.getCreditNotes error:', err);
      throw new HTTPException(500, {
        message: `Error ejecutando credit-notes.getCreditNotes: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  });

  // Rutas explícitas de historiales de personal. Además de documentar el
  // contrato público, aceptan tanto el formato estándar { args: [...] } como
  // { employeeId } para clientes de versiones anteriores.
  const registerEmployeeHistoryRoute = (
    fnName: 'getEmployeeLoanHistory' | 'getEmployeePayrollHistory',
  ) => app.post(`/api/actions/employees/${fnName}`, async (c) => {
    const action = actionModules.employees[fnName];
    let employeeId: unknown;
    try {
      const body = await c.req.json().catch(() => ({}));
      if (Array.isArray(body.args)) employeeId = body.args[0];
      else if (body && typeof body === 'object') employeeId = body.employeeId;
    } catch {
      employeeId = undefined;
    }

    if (typeof employeeId !== 'string' || !employeeId.trim()) {
      return c.json({ success: false, data: [], error: 'employeeId es obligatorio.' }, 400);
    }

    const cookies = createCookieStore(c.req.header('cookie'));
    const ctx: RequestContext = { cookies, cacheStore: new Map() };
    try {
      const result = await runWithContext(ctx, () => action(employeeId));
      for (const cookie of cookies.getSetCookies()) c.header('Set-Cookie', cookie, { append: true });
      return c.json(result);
    } catch (err) {
      console.error(`[action] employees.${fnName} error:`, err);
      throw new HTTPException(500, {
        message: `Error ejecutando employees.${fnName}: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  });

  registerEmployeeHistoryRoute('getEmployeeLoanHistory');
  registerEmployeeHistoryRoute('getEmployeePayrollHistory');

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
