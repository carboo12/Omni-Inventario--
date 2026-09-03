// GENERADO AUTOMÁTICAMENTE. No editar.
// Wrappers de transporte para el módulo 'orders' (llaman a la API).
import { callAction } from '../api-client';

export async function getOrders(...args: any[]): Promise<any> {
  return callAction('orders', 'getOrders', args);
}

export async function getOrderById(...args: any[]): Promise<any> {
  return callAction('orders', 'getOrderById', args);
}

export async function createOrder(...args: any[]): Promise<any> {
  return callAction('orders', 'createOrder', args);
}

export async function updateOrderStatus(...args: any[]): Promise<any> {
  return callAction('orders', 'updateOrderStatus', args);
}

export async function queueOrderForPOS(...args: any[]): Promise<any> {
  return callAction('orders', 'queueOrderForPOS', args);
}
