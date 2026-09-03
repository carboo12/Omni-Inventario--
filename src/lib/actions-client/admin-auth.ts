// GENERADO AUTOMÁTICAMENTE. No editar.
// Wrappers de transporte para el módulo 'admin-auth' (llaman a la API).
import { callAction } from '../api-client';

export async function authorizeAction(...args: any[]): Promise<any> {
  return callAction('admin-auth', 'authorizeAction', args);
}
