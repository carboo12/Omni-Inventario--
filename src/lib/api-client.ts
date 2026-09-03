// Cliente de transporte: llama al dispatcher de la API (server Hono)
// replicando las firmas de los action modules de Next.

import { forceSessionExpiry } from './session-expiry';

// En desarrollo el frontend Vite usa VITE_API_URL; en producción misma-origen.
export const API_BASE =
  (import.meta as any).env?.VITE_API_URL?.replace(/\/$/, '') ||
  (typeof window !== 'undefined' && (window as any).__API_BASE__) ||
  '/api';

export interface ActionError {
  error?: string;
}

// Guard against redirect loops: only redirect once per 5 seconds
let lastAuthRedirect = 0;

function handleAuthError(status: number) {
  if (typeof window === 'undefined') return;

  const now = Date.now();
  if (now - lastAuthRedirect < 5000) return; // debounce
  lastAuthRedirect = now;

  console.warn(`[api-client] Session expired (${status}). Redirecting to login...`);

  // Invalida la sesión: borra credenciales/caché locales, cierra la cookie en
  // el servidor y fuerza la redirección dura a /login.
  forceSessionExpiry();
}

export async function callAction(
  module: string,
  fn: string,
  args: unknown[] = []
): Promise<any> {
  const url = `${API_BASE}/actions/${module}/${fn}`;

  let body: string;
  let headers: Record<string, string> = {};

  // Detección de FormData (para subidas de archivos)
  const hasFile = args.some(
    (a) => a instanceof File || a instanceof Blob
  );

  if (hasFile) {
    const fd = new FormData();
    fd.append('args', JSON.stringify(args.map((a) => (a instanceof File || a instanceof Blob ? null : a))));
    // Adjuntamos los archivos por índice
    args.forEach((a, i) => {
      if (a instanceof File || a instanceof Blob) fd.append(`file_${i}`, a);
    });
    body = fd as unknown as string;
  } else {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify({ args });
  }

  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: body as BodyInit,
    credentials: 'include',
  });

  if (!res.ok) {
    // Auto-logout on 401/403 — session expired or revoked
    if (res.status === 401 || res.status === 403) {
      handleAuthError(res.status);
    }

    let message = `API error ${res.status}`;
    try {
      const j = await res.json();
      if (j?.message) message = j.message;
    } catch {
      /* ignore */
    }
    const err = new Error(message) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }

  const text = await res.text();
  if (!text) return { success: true };
  return JSON.parse(text);
}

/** Wrapper tipado: genera una función que llama a la API con los mismos args. */
export function makeAction<A extends unknown[], R>(module: string, fn: string) {
  return (...args: A): Promise<R> => callAction(module, fn, args);
}