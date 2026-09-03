// GENERADO AUTOMÁTICAMENTE. No editar.
// Wrappers de transporte para el módulo 'check-expirations' (llaman a la API).
import { callAction } from '../api-client';

export async function checkAndNotifyExpirations(...args: any[]): Promise<any> {
  return callAction('check-expirations', 'checkAndNotifyExpirations', args);
}
