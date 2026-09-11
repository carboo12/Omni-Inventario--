// GENERADO AUTOMÁTICAMENTE. No editar.
// Wrappers de transporte para el módulo 'sales' (llaman a la API).
import { callAction } from '../api-client';

import type { InventoryMovement, User } from '@prisma/client';

// Tipos copiados del action original (para no arrastrar código server al bundle).
export interface SaleFinancing {
    installments: number;
    frequency: 'SEMANAL' | 'QUINCENAL' | 'MENSUAL';
    interestRate: number;
}

export async function createSale(...args: any[]): Promise<any> {
  return callAction('sales', 'createSale', args);
}

export async function getInventoryMovements(...args: any[]): Promise<any> {
  return callAction('sales', 'getInventoryMovements', args);
}

export async function getInvoiceByNumber(...args: any[]): Promise<any> {
  return callAction('sales', 'getInvoiceByNumber', args);
}

export async function getLastSale(...args: any[]): Promise<any> {
  return callAction('sales', 'getLastSale', args);
}
