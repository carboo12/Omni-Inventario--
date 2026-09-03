// GENERADO AUTOMÁTICAMENTE. No editar.
// Wrappers de transporte para el módulo 'jewelry-production' (llaman a la API).
import { callAction } from '../api-client';

export async function createJewelryPiece(...args: any[]): Promise<any> {
  return callAction('jewelry-production', 'createJewelryPiece', args);
}

export async function addJewelryToInventory(...args: any[]): Promise<any> {
  return callAction('jewelry-production', 'addJewelryToInventory', args);
}

export async function getAvailableJewelry(...args: any[]): Promise<any> {
  return callAction('jewelry-production', 'getAvailableJewelry', args);
}

export async function getGoldStock(...args: any[]): Promise<any> {
  return callAction('jewelry-production', 'getGoldStock', args);
}

export async function updateJewelryPiece(...args: any[]): Promise<any> {
  return callAction('jewelry-production', 'updateJewelryPiece', args);
}

export async function deleteJewelryPiece(...args: any[]): Promise<any> {
  return callAction('jewelry-production', 'deleteJewelryPiece', args);
}

export async function transferJewelryPiece(...args: any[]): Promise<any> {
  return callAction('jewelry-production', 'transferJewelryPiece', args);
}

export async function exportJewelryCsv(...args: any[]): Promise<any> {
  return callAction('jewelry-production', 'exportJewelryCsv', args);
}

export async function importJewelryCsv(...args: any[]): Promise<any> {
  return callAction('jewelry-production', 'importJewelryCsv', args);
}
