// Utilidades de expiración de sesión en el cliente (móviles/tablets).
//
// El JWT real vive en una cookie httpOnly (no accesible desde JS). Aquí se
// guarda en localStorage un marcador de sesión junto con el timestamp de
// vencimiento (Date.now() + 8h) para poder:
//   1. Detectar en primer plano (intervalo + visibilitychange) que ya pasaron
//      las 8 horas y forzar el cierre de sesión automático.
//   2. Limpiar credenciales locales y hacer una redirección dura a /login
//      cuando cualquier petición API devuelve 401.

const SESSION_STORAGE_KEY = 'omnip_sesion';
export const SESSION_DURATION_MS = 8 * 60 * 60 * 1000;

// Evento DOM global para avisar a la app (QueryProvider, overlays, etc.) de
// que la sesión expiró, para limpiar caches y estados en memoria.
export const SESSION_EXPIRED_EVENT = 'omnip:session-expired';

// Claves de caché persistida (React Query + PWA/fallback) que conviene limpiar
// al expirar la sesión para evitar "estado zombi" (listas viejas tras re-login).
const PERSISTED_CACHE_KEYS = ['joyeriaplus-rq-cache-v1'];

interface StoredSession {
  token: string;
  sessionExpiresAt: number;
}

export function getStoredSession(): StoredSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredSession;
    if (!parsed || typeof parsed.sessionExpiresAt !== 'number') return null;
    return parsed;
  } catch {
    return null;
  }
}

/** Guarda el marcador de sesión con su vencimiento (por defecto +8h). */
export function setSessionStored(sessionExpiresAt: number = Date.now() + SESSION_DURATION_MS): void {
  if (typeof window === 'undefined') return;
  const record: StoredSession = {
    token: 'session-activa',
    sessionExpiresAt,
  };
  try {
    window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(record));
  } catch { /* localStorage no disponible; no bloquear la UI */ }
}

export function clearStoredSession(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(SESSION_STORAGE_KEY);
  } catch { /* noop */ }
}

/** true si hay una sesión guardada y ya pasaron las 8 horas. */
export function isSessionExpired(): boolean {
  const session = getStoredSession();
  return !!session && Date.now() >= session.sessionExpiresAt;
}

const isLoginPage = () => {
  if (typeof window === 'undefined') return true;
  return ['/', '/login', '/setup', '/offline'].includes(window.location.pathname);
};

/**
 * Fuerza el cierre de sesión completo:
 *  - limpia credenciales locales (marcador de sesión, carrito persistido),
 *  - limpia caches persistidos (React Query) para evitar "estado zombi",
 *  - invalida la cookie httpOnly en el servidor (fire-and-forget),
 *  - avisa al resto de la app (evento DOM) para resetear estados en memoria,
 *  - redirección dura a /login.
 */
export function clearPersistedSessionCaches(): void {
  if (typeof window === 'undefined') return;
  try {
    PERSISTED_CACHE_KEYS.forEach((key) => window.localStorage.removeItem(key));
  } catch { /* noop */ }
}

export function forceSessionExpiry(): void {
  if (typeof window === 'undefined') return;

  clearStoredSession();
  clearPersistedSessionCaches();
  try {
    sessionStorage.removeItem('pos-cart');
  } catch { /* noop */ }

  // Avisar a la app (QueryProvider limpia la caché en memoria, overlays, etc.).
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(SESSION_EXPIRED_EVENT));
  }

  // Cerrar sesión en el servidor para borrar la cookie httpOnly.
  const base =
    (import.meta as any).env?.VITE_API_URL?.replace(/\/$/, '') ||
    (window as any).__API_BASE__ ||
    '/api';
  fetch(`${base}/actions/auth/logout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ args: [] }),
    credentials: 'include',
  }).catch(() => { /* noop */ });

  if (isLoginPage()) return;
  window.location.href = '/login';
}

// ---- Interceptor HTTP global ----
// Atrapa cualquier respuesta 401/403 de la API (incluso code paths que usen
// fetch() directamente en vez de callAction) y fuerza el cierre de sesión.
// Con debounce para evitar bucles de redirección con peticiones en paralelo.

let lastInterceptorRedirect = 0;
let interceptorInstalled = false;

export function installSessionInterceptor(): void {
  if (typeof window === 'undefined' || interceptorInstalled) return;
  interceptorInstalled = true;

  const originalFetch = window.fetch.bind(window);

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const res = await originalFetch(input, init);

    // Ignorar la propia llamada de logout para no entrar en bucle.
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input?.url || '';
    if (url.includes('/actions/auth/logout')) return res;

    if ((res.status === 401 || res.status === 403) && typeof window !== 'undefined') {
      const now = Date.now();
      if (now - lastInterceptorRedirect > 5000) {
        lastInterceptorRedirect = now;
        console.warn(`[session-interceptor] Auth expired (${res.status}). Forcing logout...`);
        forceSessionExpiry();
      }
    }

    return res;
  };
}