// Shim para `react` en el servidor: re-exporta TODO React y añade la función
// `cache` (que Next parchea). Así cualquier import de react en el grafo del
// servidor sigue funcionando, y session.ts obtiene `cache` correctamente.
//
// IMPORTANTE: el caché debe ser POR-REQUEST, no global. Si se cachea en
// variables de módulo, `verifySession()` (que usa `cache`) devolvería el JWT
// de la petición ANTERIOR, rompiendo el aislamiento de sesiones por usuario.
// Usamos el cacheStore del RequestContext (AsyncLocalStorage), que se crea
// fresco en cada request del servidor Hono.

export * from 'react';

import { getRequestContext } from '../lib/request-context';

export function cache<Args extends unknown[], Result>(
  fn: (...args: Args) => Result
): (...args: Args) => Result {
  const cached = (...args: Args): Result => {
    const key = JSON.stringify(args);
    const ctx = getRequestContext();
    if (ctx.cacheStore.has(key)) return ctx.cacheStore.get(key) as Result;

    const result = fn(...args);
    ctx.cacheStore.set(key, result);
    return result;
  };

  return cached;
}