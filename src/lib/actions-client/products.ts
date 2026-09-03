// GENERADO AUTOMÁTICAMENTE. No editar.
// Wrappers de transporte para el módulo 'products' (llaman a la API).
import { callAction } from '../api-client';

import type { Product } from '@prisma/client';

export async function getProducts(...args: any[]): Promise<any> {
  return callAction('products', 'getProducts', args);
}

export async function getProductById(...args: any[]): Promise<any> {
  return callAction('products', 'getProductById', args);
}

export async function createProduct(...args: any[]): Promise<any> {
  return callAction('products', 'createProduct', args);
}

export async function updateProduct(...args: any[]): Promise<any> {
  return callAction('products', 'updateProduct', args);
}

export async function deleteProduct(...args: any[]): Promise<any> {
  return callAction('products', 'deleteProduct', args);
}
