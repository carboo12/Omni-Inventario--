// GENERADO AUTOMÁTICAMENTE. No editar.
// Wrappers de transporte para el módulo 'kardex' (llaman a la API).
import { callAction } from '../api-client';

// Tipos copiados del action original (para no arrastrar código server al bundle).
export interface KardexReportRow {
    productName: string;
    barcode: string | null;
    category: string;
    inventoryType: string;
    initialStock: number;
    entries: number;
    exits: number;
    finalStock: number;
    costPriceNIO: number;
    priceNIO: number;
    unitProfit: number;
    profitMargin: number;
    exitsProfit: number;
    potentialProfit: number;
    inventoryValue: number;
}

export async function getInventoryMovements(...args: any[]): Promise<any> {
  return callAction('kardex', 'getInventoryMovements', args);
}

export async function getKardexReport(...args: any[]): Promise<any> {
  return callAction('kardex', 'getKardexReport', args);
}
