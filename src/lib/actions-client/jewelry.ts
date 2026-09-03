// GENERADO AUTOMÁTICAMENTE. No editar.
// Wrappers de transporte para el módulo 'jewelry' (llaman a la API).
import { callAction } from '../api-client';

export async function createJewelryPiece(...args: any[]): Promise<any> {
  return callAction('jewelry', 'createJewelryPiece', args);
}

export async function sellJewelryPiece(...args: any[]): Promise<any> {
  return callAction('jewelry', 'sellJewelryPiece', args);
}

export async function revertJewelrySale(...args: any[]): Promise<any> {
  return callAction('jewelry', 'revertJewelrySale', args);
}
