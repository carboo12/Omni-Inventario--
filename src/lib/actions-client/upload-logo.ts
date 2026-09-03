// GENERADO AUTOMÁTICAMENTE. No editar.
// Wrappers de transporte para el módulo 'upload-logo' (llaman a la API).
import { callAction } from '../api-client';

export async function uploadLogo(...args: any[]): Promise<any> {
  return callAction('upload-logo', 'uploadLogo', args);
}

export async function removeLogo(...args: any[]): Promise<any> {
  return callAction('upload-logo', 'removeLogo', args);
}
