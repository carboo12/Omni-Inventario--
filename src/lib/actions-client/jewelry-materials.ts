// GENERADO AUTOMÁTICAMENTE. No editar.
// Wrappers de transporte para el módulo 'jewelry-materials' (llaman a la API).
import { callAction } from '../api-client';

export async function getJewelryMaterials(...args: any[]): Promise<any> {
  return callAction('jewelry-materials', 'getJewelryMaterials', args);
}

export async function createJewelryMaterial(...args: any[]): Promise<any> {
  return callAction('jewelry-materials', 'createJewelryMaterial', args);
}

export async function updateJewelryMaterial(...args: any[]): Promise<any> {
  return callAction('jewelry-materials', 'updateJewelryMaterial', args);
}

export async function deleteJewelryMaterial(...args: any[]): Promise<any> {
  return callAction('jewelry-materials', 'deleteJewelryMaterial', args);
}
