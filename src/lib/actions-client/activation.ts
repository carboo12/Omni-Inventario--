// GENERADO AUTOMÁTICAMENTE. No editar.
// Wrappers de transporte para el módulo 'activation' (llaman a la API).
import { callAction } from '../api-client';

export async function checkActivationStatus(...args: any[]): Promise<any> {
  return callAction('activation', 'checkActivationStatus', args);
}

export async function activateSystem(...args: any[]): Promise<any> {
  return callAction('activation', 'activateSystem', args);
}
