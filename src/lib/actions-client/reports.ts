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

export async function getReportSummary(...args: any[]): Promise<any> {
  return callAction('reports', 'getReportSummary', args);
}

export async function getReportSalesByCategory(...args: any[]): Promise<any> {
  return callAction('reports', 'getReportSalesByCategory', args);
}

export async function getReportSalesByProduct(...args: any[]): Promise<any> {
  return callAction('reports', 'getReportSalesByProduct', args);
}

export async function getReportTopSelling(...args: any[]): Promise<any> {
  return callAction('reports', 'getReportTopSelling', args);
}

export async function getReportPaymentMethods(...args: any[]): Promise<any> {
  return callAction('reports', 'getReportPaymentMethods', args);
}

export async function getReportCashiers(...args: any[]): Promise<any> {
  return callAction('reports', 'getReportCashiers', args);
}

export async function getReportSalesByHour(...args: any[]): Promise<any> {
  return callAction('reports', 'getReportSalesByHour', args);
}

export async function getReportDeadStock(...args: any[]): Promise<any> {
  return callAction('reports', 'getReportDeadStock', args);
}

export async function getReportProfitMargin(...args: any[]): Promise<any> {
  return callAction('reports', 'getReportProfitMargin', args);
}

export async function getReportFilters(...args: any[]): Promise<any> {
  return callAction('reports', 'getReportFilters', args);
}

export async function getAgingReport(...args: any[]): Promise<any> {
  return callAction('reports', 'getAgingReport', args);
}

export async function getDispatcherProductivityReport(...args: any[]): Promise<any> {
  return callAction('reports', 'getDispatcherProductivityReport', args);
}
