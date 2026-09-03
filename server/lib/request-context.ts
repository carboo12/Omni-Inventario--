// Contexto de request para el servidor Hono. Permite que los shims de
// 'next/headers' (cookies) y 'react' cache funcionen leyendo/escribiendo la
// petición HTTP real, usando AsyncLocalStorage de Node.

import { AsyncLocalStorage } from 'node:async_hooks';

export interface ReadonlyRequestCookies {
  get(name: string): { name: string; value: string } | undefined;
  getAll(): { name: string; value: string }[];
  has(name: string): boolean;
}

export interface RequestCookieStore extends ReadonlyRequestCookies {
  set(name: string, value: string, opts?: Record<string, unknown>): void;
  delete(name: string): void;
  /** Encabezados Set-Cookie a aplicar sobre la respuesta (acumulados). */
  getSetCookies(): string[];
}

export interface RequestContext {
  cookies: RequestCookieStore;
  /** Implementación de cache vía AsyncLocalStorage. */
  cacheStore: Map<string, unknown>;
}

const storage = new AsyncLocalStorage<RequestContext>();

export function getRequestContext(): RequestContext {
  const ctx = storage.getStore();
  if (!ctx) {
    throw new Error(
      'No hay contexto de request activo. Los shims de Next solo funcionan ' +
      'dentro de una petición manejada por el servidor Hono.'
    );
  }
  return ctx;
}

/** Crea un store de cookies mutable a partir de los cookies crudos de la request. */
export function createCookieStore(
  rawCookieHeader: string | undefined
): RequestCookieStore {
  const map = new Map<string, string>();
  const setCookies: string[] = [];

  if (rawCookieHeader) {
    for (const part of rawCookieHeader.split(';')) {
      const idx = part.indexOf('=');
      if (idx === -1) continue;
      const name = part.slice(0, idx).trim();
      const value = part.slice(idx + 1).trim();
      if (name) map.set(decodeURIComponent(name), decodeURIComponent(value));
    }
  }

  return {
    get(name) {
      const value = map.get(name);
      return value === undefined ? undefined : { name, value };
    },
    getAll() {
      return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
    },
    has(name) {
      return map.has(name);
    },
    set(name, value, opts = {}) {
      map.set(name, value);
      let cookie = `${name}=${encodeURIComponent(value)}`;
      // Traducimos las opciones de cookies de Next a atributos Set-Cookie.
      const maxAge = opts.maxAge as number | undefined;
      const expires = opts.expires as Date | undefined;
      const path = (opts.path as string | undefined) ?? '/';
      const httpOnly = opts.httpOnly as boolean | undefined;
      const secure = opts.secure as boolean | undefined;
      const sameSite = opts.sameSite as string | undefined;

      cookie += `; Path=${path}`;
      if (expires) cookie += `; Expires=${expires.toUTCString()}`;
      if (maxAge !== undefined && maxAge !== null) cookie += `; Max-Age=${Math.floor(Number(maxAge))}`;
      if (httpOnly) cookie += '; HttpOnly';
      if (secure) cookie += '; Secure';
      if (sameSite) cookie += `; SameSite=${sameSite}`;

      setCookies.push(cookie);
    },
    delete(name) {
      map.delete(name);
      setCookies.push(`${name}=; Path=/; Max-Age=0`);
    },
    getSetCookies() {
      return setCookies;
    },
  };
}

export function runWithContext<T>(ctx: RequestContext, fn: () => T): T {
  return storage.run(ctx, fn);
}
