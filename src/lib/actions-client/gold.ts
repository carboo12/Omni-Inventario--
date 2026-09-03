// GENERADO AUTOMÁTICAMENTE. No editar.
// Wrappers de transporte para el módulo 'gold' (llaman a la API).
import { callAction } from '../api-client';

export async function buyGold(...args: any[]): Promise<any> {
  return callAction('gold', 'buyGold', args);
}

export async function meltGold(...args: any[]): Promise<any> {
  return callAction('gold', 'meltGold', args);
}
