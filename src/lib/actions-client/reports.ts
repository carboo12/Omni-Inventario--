// GENERADO AUTOMÁTICAMENTE. No editar.
// Wrappers de transporte para el módulo 'reports' (llaman a la API).
import { callAction } from '../api-client';

export async function getSalesData(...args: any[]): Promise<any> {
  return callAction('reports', 'getSalesData', args);
}

export async function getTopProducts(...args: any[]): Promise<any> {
  return callAction('reports', 'getTopProducts', args);
}

export async function getLowStockInventory(...args: any[]): Promise<any> {
  return callAction('reports', 'getLowStockInventory', args);
}

export async function getExpiringProducts(...args: any[]): Promise<any> {
  return callAction('reports', 'getExpiringProducts', args);
}

export async function getCashClosingReport(...args: any[]): Promise<any> {
  return callAction('reports', 'getCashClosingReport', args);
}

export async function getCreditPerformanceData(...args: any[]): Promise<any> {
  return callAction('reports', 'getCreditPerformanceData', args);
}

export async function getPriceLevelAnalysis(...args: any[]): Promise<any> {
  return callAction('reports', 'getPriceLevelAnalysis', args);
}
