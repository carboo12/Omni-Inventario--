// GENERADO AUTOMÁTICAMENTE. No editar.
// Wrappers de transporte para el módulo 'jewelry-sales' (llaman a la API).
import { callAction } from '../api-client';

export async function sellJewelryPiece(...args: any[]): Promise<any> {
  return callAction('jewelry-sales', 'sellJewelryPiece', args);
}

export async function sellMultipleJewelryPieces(...args: any[]): Promise<any> {
  return callAction('jewelry-sales', 'sellMultipleJewelryPieces', args);
}

export async function getJewelrySalesHistory(...args: any[]): Promise<any> {
  return callAction('jewelry-sales', 'getJewelrySalesHistory', args);
}
