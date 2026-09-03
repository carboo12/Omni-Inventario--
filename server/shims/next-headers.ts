// Shim para 'next/headers'. Expone cookies() leyendo y escribiendo sobre el
// contexto de request real (vía AsyncLocalStorage) del servidor Hono.

import { getRequestContext } from '../lib/request-context';

export function cookies() {
  return getRequestContext().cookies;
}
