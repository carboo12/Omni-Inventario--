// GENERADO AUTOMÁTICAMENTE. No editar.
// Wrappers de transporte para el módulo 'collections' (llaman a la API).
import { callAction } from '../api-client';

export async function getCollections(...args: any[]): Promise<any> {
  return callAction('collections', 'getCollections', args);
}

export async function registerPayment(...args: any[]): Promise<any> {
  return callAction('collections', 'registerPayment', args);
}
