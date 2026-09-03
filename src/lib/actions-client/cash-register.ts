// GENERADO AUTOMÁTICAMENTE. No editar.
// Wrappers de transporte para el módulo 'cash-register' (llaman a la API).
import { callAction } from '../api-client';

// Tipos copiados del action original (para no arrastrar código server al bundle).
export interface CashRegisterSessionData {
    id: string;
    cashierId: string;
    cashierName: string;
    openingTime: string;
    closingTime?: string | null;
    initialAmount: number;
    initialAmountUSD: number;
    finalAmount?: number | null;
    totalSales?: number | null;
    salesCash?: number;
    salesCard?: number;
    salesUSD?: number;
    salesServices?: number;
    totalReturns?: number;
    actualCash?: number | null;
    actualUSD?: number | null;
    difference?: number | null;
    differenceUSD?: number | null;
    status: 'open' | 'closed';
}

export interface SessionSalesBreakdown {
    totalSales: number;
    salesCash: number;
    salesCard: number;
    salesUSD: number;
    salesCredit: number;
    salesServices: number;
    salesAbonos: number;
    totalReturns: number;
}

export interface CloseCashSessionPayload {
    actualCash?: number;
    actualUSD?: number;
}

export interface CloseCashSessionReport {
    openingBalance: number;
    expectedCash: number;
    expectedUSD: number;
    finalAmount: number;
    actualCash: number;
    actualUSD: number;
    difference: number;
    differenceUSD: number;
    totalSales: number;
    salesCash: number;
    salesCard: number;
    salesUSD: number;
    salesCredit: number;
    salesServices: number;
    salesAbonos: number;
    totalReturns: number;
    totalOutflows: number;
    initialAmount: number;
    initialAmountUSD: number;
    closingTime: string;
}

export async function getSessionSalesBreakdown(...args: any[]): Promise<any> {
  return callAction('cash-register', 'getSessionSalesBreakdown', args);
}

export async function getSessions(...args: any[]): Promise<any> {
  return callAction('cash-register', 'getSessions', args);
}

export async function openSession(...args: any[]): Promise<any> {
  return callAction('cash-register', 'openSession', args);
}

export async function closeCashSession(...args: any[]): Promise<any> {
  return callAction('cash-register', 'closeCashSession', args);
}

export async function closeSession(...args: any[]): Promise<any> {
  return callAction('cash-register', 'closeSession', args);
}

export async function addSaleToSessionDB(...args: any[]): Promise<any> {
  return callAction('cash-register', 'addSaleToSessionDB', args);
}

export async function createOutflowAction(...args: any[]): Promise<any> {
  return callAction('cash-register', 'createOutflowAction', args);
}

export async function getSessionOutflows(...args: any[]): Promise<any> {
  return callAction('cash-register', 'getSessionOutflows', args);
}
