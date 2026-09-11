// GENERADO AUTOMÁTICAMENTE. No editar.
// Wrappers de transporte para el módulo 'held-sales' (llaman a la API).
import { callAction } from '../api-client';

export async function createHeldSale(...args: any[]): Promise<any> {
  return callAction('held-sales', 'createHeldSale', args);
}

export async function createHeldOrder(...args: any[]): Promise<any> {
  return callAction('held-sales', 'createHeldOrder', args);
}

export async function getHeldOrders(...args: any[]): Promise<any> {
  return callAction('held-sales', 'getHeldOrders', args);
}

export async function promoteHeldOrder(...args: any[]): Promise<any> {
  return callAction('held-sales', 'promoteHeldOrder', args);
}

export async function getPendingHeldSales(...args: any[]): Promise<any> {
  return callAction('held-sales', 'getPendingHeldSales', args);
}

export async function completeHeldSale(...args: any[]): Promise<any> {
  return callAction('held-sales', 'completeHeldSale', args);
}

export async function cancelHeldSale(...args: any[]): Promise<any> {
  return callAction('held-sales', 'cancelHeldSale', args);
}

export async function updateHeldSale(...args: any[]): Promise<any> {
  return callAction('held-sales', 'updateHeldSale', args);
}

export async function lockHeldSale(...args: any[]): Promise<any> {
  return callAction('held-sales', 'lockHeldSale', args);
}

export async function deleteHeldSale(...args: any[]): Promise<any> {
  return callAction('held-sales', 'deleteHeldSale', args);
}

export async function unlockHeldSale(...args: any[]): Promise<any> {
  return callAction('held-sales', 'unlockHeldSale', args);
}
