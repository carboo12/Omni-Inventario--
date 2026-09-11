// GENERADO AUTOMÁTICAMENTE. No editar.
// Wrappers de transporte para el módulo 'installments' (llaman a la API).
import { callAction } from '../api-client';

export async function getOverdueInstallments(...args: any[]): Promise<any> {
  return callAction('installments', 'getOverdueInstallments', args);
}
