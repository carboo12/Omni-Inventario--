// GENERADO AUTOMÁTICAMENTE. No editar.
// Wrappers de transporte para el módulo 'customers' (llaman a la API).
import { callAction } from '../api-client';

import type { Customer } from '@prisma/client';

export async function createOrUpdateCustomer(...args: any[]): Promise<any> {
  return callAction('customers', 'createOrUpdateCustomer', args);
}

export async function searchOrCreateCustomer(...args: any[]): Promise<any> {
  return callAction('customers', 'searchOrCreateCustomer', args);
}

export async function updateCustomerCredit(...args: any[]): Promise<any> {
  return callAction('customers', 'updateCustomerCredit', args);
}

export async function getCustomerStatement(...args: any[]): Promise<any> {
  return callAction('customers', 'getCustomerStatement', args);
}

export async function recordCreditPayment(...args: any[]): Promise<any> {
  return callAction('customers', 'recordCreditPayment', args);
}

export async function deleteCustomer(...args: any[]): Promise<any> {
  return callAction('customers', 'deleteCustomer', args);
}

export async function getCustomerByFullName(...args: any[]): Promise<any> {
  return callAction('customers', 'getCustomerByFullName', args);
}

export async function getAllCustomers(...args: any[]): Promise<any> {
  return callAction('customers', 'getAllCustomers', args);
}
