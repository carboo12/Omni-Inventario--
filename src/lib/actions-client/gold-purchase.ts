// GENERADO AUTOMÁTICAMENTE. No editar.
// Wrappers de transporte para el módulo 'gold-purchase' (llaman a la API).
import { callAction } from '../api-client';

export async function saveGoldPurchase(...args: any[]): Promise<any> {
  return callAction('gold-purchase', 'saveGoldPurchase', args);
}

export async function getLatestGoldPrice(...args: any[]): Promise<any> {
  return callAction('gold-purchase', 'getLatestGoldPrice', args);
}

export async function getGoldPurchaseHistory(...args: any[]): Promise<any> {
  return callAction('gold-purchase', 'getGoldPurchaseHistory', args);
}
