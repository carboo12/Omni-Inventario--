// GENERADO AUTOMÁTICAMENTE. No editar.
// Wrappers de transporte para el módulo 'purchases' (llaman a la API).
import { callAction } from '../api-client';

import type { PurchaseInvoice } from '@prisma/client';

export async function getPurchaseInvoices(...args: any[]): Promise<any> {
  return callAction('purchases', 'getPurchaseInvoices', args);
}

export async function getPendingInvoicesAlerts(...args: any[]): Promise<any> {
  return callAction('purchases', 'getPendingInvoicesAlerts', args);
}

export async function getPurchaseInvoiceById(...args: any[]): Promise<any> {
  return callAction('purchases', 'getPurchaseInvoiceById', args);
}

export async function createPurchaseInvoice(...args: any[]): Promise<any> {
  return callAction('purchases', 'createPurchaseInvoice', args);
}

export async function updatePurchaseInvoice(...args: any[]): Promise<any> {
  return callAction('purchases', 'updatePurchaseInvoice', args);
}

export async function deletePurchaseInvoice(...args: any[]): Promise<any> {
  return callAction('purchases', 'deletePurchaseInvoice', args);
}

export async function createPurchaseInvoiceWithItems(...args: any[]): Promise<any> {
  return callAction('purchases', 'createPurchaseInvoiceWithItems', args);
}

export async function recordSupplierPayment(...args: any[]): Promise<any> {
  return callAction('purchases', 'recordSupplierPayment', args);
}
