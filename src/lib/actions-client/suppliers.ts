// GENERADO AUTOMÁTICAMENTE. No editar.
// Wrappers de transporte para el módulo 'suppliers' (llaman a la API).
import { callAction } from '../api-client';

import type { Supplier } from '@prisma/client';

export async function getSuppliers(...args: any[]): Promise<any> {
  return callAction('suppliers', 'getSuppliers', args);
}

export async function getSupplierById(...args: any[]): Promise<any> {
  return callAction('suppliers', 'getSupplierById', args);
}

export async function createSupplier(...args: any[]): Promise<any> {
  return callAction('suppliers', 'createSupplier', args);
}

export async function updateSupplier(...args: any[]): Promise<any> {
  return callAction('suppliers', 'updateSupplier', args);
}

export async function deleteSupplier(...args: any[]): Promise<any> {
  return callAction('suppliers', 'deleteSupplier', args);
}
