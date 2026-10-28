// GENERADO AUTOMÁTICAMENTE. No editar.
// Wrappers de transporte para el módulo 'credit-notes' (llaman a la API).
import { callAction } from '../api-client';

export async function getCreditNotes(...args: any[]): Promise<any> {
  return callAction('credit-notes', 'getCreditNotes', args);
}

export async function getInvoiceByNumber(...args: any[]): Promise<any> {
  return callAction('credit-notes', 'getInvoiceByNumber', args);
}

export async function createCreditNote(...args: any[]): Promise<any> {
  return callAction('credit-notes', 'createCreditNote', args);
}
