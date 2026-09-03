// GENERADO AUTOMÁTICAMENTE. No editar.
// Wrappers de transporte para el módulo 'import-history' (llaman a la API).
import { callAction } from '../api-client';

export async function getImportHistory(...args: any[]): Promise<any> {
  return callAction('import-history', 'getImportHistory', args);
}

export async function getImportDetails(...args: any[]): Promise<any> {
  return callAction('import-history', 'getImportDetails', args);
}

export async function createImportHistory(...args: any[]): Promise<any> {
  return callAction('import-history', 'createImportHistory', args);
}
