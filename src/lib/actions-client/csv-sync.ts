// GENERADO AUTOMÁTICAMENTE. No editar.
// Wrappers de transporte para el módulo 'csv-sync' (llaman a la API).
import { callAction } from '../api-client';

export async function exportJewelryInventoryCSV(...args: any[]): Promise<any> {
  return callAction('csv-sync', 'exportJewelryInventoryCSV', args);
}

export async function importJewelryInventoryCSV(...args: any[]): Promise<any> {
  return callAction('csv-sync', 'importJewelryInventoryCSV', args);
}

export async function exportJewelrySalesCSV(...args: any[]): Promise<any> {
  return callAction('csv-sync', 'exportJewelrySalesCSV', args);
}

export async function importJewelrySalesCSV(...args: any[]): Promise<any> {
  return callAction('csv-sync', 'importJewelrySalesCSV', args);
}

export async function analyzeStoreCsv(...args: any[]): Promise<any> {
  return callAction('csv-sync', 'analyzeStoreCsv', args);
}

export async function applyStoreSyncToLocalInventory(...args: any[]): Promise<any> {
  return callAction('csv-sync', 'applyStoreSyncToLocalInventory', args);
}
