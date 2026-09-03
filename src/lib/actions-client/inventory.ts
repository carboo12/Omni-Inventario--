// GENERADO AUTOMÁTICAMENTE. No editar.
// Wrappers de transporte para el módulo 'inventory' (llaman a la API).
import { callAction } from '../api-client';

import type { InventoryItem } from '@prisma/client';

export async function getInventory(...args: any[]): Promise<any> {
  return callAction('inventory', 'getInventory', args);
}

export async function getInventoryItemById(...args: any[]): Promise<any> {
  return callAction('inventory', 'getInventoryItemById', args);
}

export async function createInventoryItem(...args: any[]): Promise<any> {
  return callAction('inventory', 'createInventoryItem', args);
}

export async function updateInventoryItem(...args: any[]): Promise<any> {
  return callAction('inventory', 'updateInventoryItem', args);
}

export async function updateInventoryQuantity(...args: any[]): Promise<any> {
  return callAction('inventory', 'updateInventoryQuantity', args);
}

export async function createInventoryMovement(...args: any[]): Promise<any> {
  return callAction('inventory', 'createInventoryMovement', args);
}

export async function getInventoryMovements(...args: any[]): Promise<any> {
  return callAction('inventory', 'getInventoryMovements', args);
}

export async function bulkImportInventory(...args: any[]): Promise<any> {
  return callAction('inventory', 'bulkImportInventory', args);
}
