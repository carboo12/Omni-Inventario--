// GENERADO AUTOMÁTICAMENTE. No editar.
// Wrappers de transporte para el módulo 'jewelry-reports' (llaman a la API).
import { callAction } from '../api-client';

export async function getJewelryInventoryStats(...args: any[]): Promise<any> {
  return callAction('jewelry-reports', 'getJewelryInventoryStats', args);
}

export async function getJewelrySalesStats(...args: any[]): Promise<any> {
  return callAction('jewelry-reports', 'getJewelrySalesStats', args);
}

export async function getJewelryDetailedInventory(...args: any[]): Promise<any> {
  return callAction('jewelry-reports', 'getJewelryDetailedInventory', args);
}

export async function getJewelryTopSellingPieces(...args: any[]): Promise<any> {
  return callAction('jewelry-reports', 'getJewelryTopSellingPieces', args);
}

export async function getTodayJewelrySalesDetail(...args: any[]): Promise<any> {
  return callAction('jewelry-reports', 'getTodayJewelrySalesDetail', args);
}

export async function getJewelrySessionSummary(...args: any[]): Promise<any> {
  return callAction('jewelry-reports', 'getJewelrySessionSummary', args);
}
