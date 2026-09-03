// GENERADO AUTOMÁTICAMENTE. No editar.
// Wrappers de transporte para el módulo 'upload-image' (llaman a la API).
import { callAction } from '../api-client';

export async function uploadProductImage(...args: any[]): Promise<any> {
  return callAction('upload-image', 'uploadProductImage', args);
}
