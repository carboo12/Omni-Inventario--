// GENERADO AUTOMÁTICAMENTE. No editar.
// Wrappers de transporte para el módulo 'quotations' (llaman a la API).
import { callAction } from '../api-client';

export async function createQuote(...args: any[]): Promise<any> {
  return callAction('quotations', 'createQuote', args);
}

export async function getQuotes(...args: any[]): Promise<any> {
  return callAction('quotations', 'getQuotes', args);
}

export async function getQuoteByNumber(...args: any[]): Promise<any> {
  return callAction('quotations', 'getQuoteByNumber', args);
}

export async function convertQuoteToInvoice(...args: any[]): Promise<any> {
  return callAction('quotations', 'convertQuoteToInvoice', args);
}

export async function cancelQuote(...args: any[]): Promise<any> {
  return callAction('quotations', 'cancelQuote', args);
}
