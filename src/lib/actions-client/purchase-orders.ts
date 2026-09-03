// GENERADO AUTOMÁTICAMENTE. No editar.
// Wrappers de transporte para el módulo 'purchase-orders' (llaman a la API).
import { callAction } from '../api-client';

import type { PurchaseOrder, PurchaseOrderItem } from '@prisma/client';

export async function getPurchaseOrders(...args: any[]): Promise<any> {
  return callAction('purchase-orders', 'getPurchaseOrders', args);
}

export async function getPurchaseOrderById(...args: any[]): Promise<any> {
  return callAction('purchase-orders', 'getPurchaseOrderById', args);
}

export async function createPurchaseOrder(...args: any[]): Promise<any> {
  return callAction('purchase-orders', 'createPurchaseOrder', args);
}

export async function updatePurchaseOrderStatus(...args: any[]): Promise<any> {
  return callAction('purchase-orders', 'updatePurchaseOrderStatus', args);
}

export async function receivePurchaseOrder(...args: any[]): Promise<any> {
  return callAction('purchase-orders', 'receivePurchaseOrder', args);
}

export async function deletePurchaseOrder(...args: any[]): Promise<any> {
  return callAction('purchase-orders', 'deletePurchaseOrder', args);
}
