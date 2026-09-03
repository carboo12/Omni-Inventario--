// GENERADO AUTOMÁTICAMENTE. No editar.
// Wrappers de transporte para el módulo 'backup' (llaman a la API).
import { callAction } from '../api-client';

export async function generateBackup(...args: any[]): Promise<any> {
  return callAction('backup', 'generateBackup', args);
}
