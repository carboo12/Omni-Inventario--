// GENERADO AUTOMÁTICAMENTE. No editar.
// Wrappers de transporte para el módulo 'app-settings' (llaman a la API).
import { callAction } from '../api-client';

import type { BusinessMode } from '@prisma/client';

export async function getBusinessMode(...args: any[]): Promise<any> {
  return callAction('app-settings', 'getBusinessMode', args);
}

export async function updateBusinessMode(...args: any[]): Promise<any> {
  return callAction('app-settings', 'updateBusinessMode', args);
}
