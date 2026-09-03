'use server'
import { generateUUID } from '@/lib/uuid';

import db from '../db';
import { revalidatePath } from 'next/cache';
import { createNotification, notifyRegisterOpened } from './notifications';
import { sendSessionOpening, sendSessionReport } from '../mail';
import { getPaymentBucket } from '../payment-method';

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

/** Reporte consolidado del cierre de turno, resuelto 100% en el backend. */
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

/**
 * Recálculo AUTORITATIVO de las ventas de una sesión desde la fuente de verdad
 * (tabla SalesInvoice + servicios de joyería), en lugar de depender de los
 * contadores incrementales que pueden desincronizarse.
 *
 * Normaliza TODAS las variantes de métodos de pago guardadas en la BD
 * ('CASH', 'EFECTIVO', 'CONTADO', 'CASH_NIO', 'CASH_USD', 'CARD', 'TARJETA',
 * 'TRANSFER', 'TRANSFERENCIA', 'Efectivo C$', 'Tarjeta', 'Credito', 'Dolares', etc.)
 * sin importar mayúsculas/minúsculas ni acentos.
 *
 * Incluye TODAS las facturas de la sesión (COMPLETED y REFUNDED) para que el
 * "Total Sistema" coincida con la suma de desgloses; las devoluciones se
 * restan aparte vía totalReturns (como en el flujo de notas de crédito).
 * Se excluyen únicamente las facturas no facturadas (PENDING/CANCELLED).
 *
 * Acepta el cliente Prisma (db o una transacción) para poder ejecutarse
 * dentro de una $transaction sin salir de ella.
 */
async function computeSessionBreakdown(client: any, sessionId: string): Promise<SessionSalesBreakdown> {
    const [invoices, servicesAgg, sessionRow] = await Promise.all([
        client.salesInvoice.findMany({
            where: {
                sessionId,
                status: { notIn: ['PENDING', 'CANCELLED', 'VOID', 'HELD'] },
            },
            select: { totalAmount: true, paymentMethod: true },
        }),
        client.jewelryService.aggregate({
            where: { sessionId },
            _sum: { amount: true },
        }),
        client.cashRegisterSession.findUnique({
            where: { id: sessionId },
            select: { totalReturns: true, salesAbonos: true },
        }),
    ]);

    const round2 = (n: number) => Math.round(n * 100) / 100;

    let invoiceTotal = 0;
    let salesCash = 0;
    let salesCard = 0;
    let salesUSD = 0;
    let salesCredit = 0;

    for (const inv of invoices) {
        const amount = Number(inv.totalAmount) || 0;
        invoiceTotal += amount;
        switch (getPaymentBucket(inv.paymentMethod || '')) {
            case 'cash':
                salesCash += amount;
                break;
            case 'card':
                salesCard += amount;
                break;
            case 'usd':
                salesUSD += amount;
                break;
            case 'credit':
                salesCredit += amount;
                break;
            default:
                break;
        }
    }

    // Servicios de joyería: suman como venta en efectivo pero NO crean factura.
    const salesServices = Number(servicesAgg._sum.amount) || 0;

    return {
        totalSales: round2(invoiceTotal + salesServices),
        salesCash: round2(salesCash + salesServices),
        salesCard: round2(salesCard),
        salesUSD: round2(salesUSD),
        salesCredit: round2(salesCredit),
        salesServices: round2(salesServices),
        salesAbonos: Number(sessionRow?.salesAbonos) || 0,
        totalReturns: Number(sessionRow?.totalReturns) || 0,
    };
}

export async function getSessionSalesBreakdown(sessionId: string): Promise<SessionSalesBreakdown> {
    return computeSessionBreakdown(db, sessionId);
}

export async function getSessions(): Promise<CashRegisterSessionData[]> {
    const sessions = await db.cashRegisterSession.findMany({
        orderBy: {
            openingTime: 'desc'
        },
        include: {
            user: true
        }
    });

    return sessions.map(s => {
        const row = s as any; // salesServices is new - TS server may need restart to pick up new Prisma types
        return {
            id: row.id,
            cashierId: row.cashierId,
            cashierName: row.cashierName,
            openingTime: row.openingTime,
            closingTime: row.closingTime,
            initialAmount: row.initialAmount,
            initialAmountUSD: row.initialAmountUSD || 0,
            finalAmount: row.finalAmount,
            totalSales: row.totalSales,
            salesCash: row.salesCash,
            salesCard: row.salesCard,
            salesUSD: row.salesUSD,
            salesServices: row.salesServices ?? 0,
            salesCredit: row.salesCredit ?? 0,
            salesAbonos: row.salesAbonos ?? 0,
            totalReturns: row.totalReturns,
            actualCash: row.actualCash,
            actualUSD: row.actualUSD ?? 0,
            difference: row.difference,
            differenceUSD: row.differenceUSD ?? 0,
            status: row.status as 'open' | 'closed'
        };
    });
}

export async function openSession(cashierId: string, cashierName: string, initialAmount: number, initialAmountUSD: number = 0) {
    // Check if user already has an open session
    const existing = await db.cashRegisterSession.findFirst({
        where: {
            cashierId,
            status: 'open'
        }
    });

    if (existing) {
        throw new Error("User already has an open session");
    }

    const session = await db.cashRegisterSession.create({
        data: {
            id: generateUUID(),
            cashierId,
            cashierName,
            openingTime: new Date().toISOString(),
            initialAmount,
            initialAmountUSD,
            status: 'open',
            totalSales: 0
        } as any
    });

    await notifyRegisterOpened(cashierName);
    // Send email notification (async)
    sendSessionOpening(session.id);
    
    revalidatePath('/');
    return session;
}

/**
 * SERVER ACTION ATÓMICA de cierre de caja.
 *
 * Resuelve TODO en el backend dentro de UNA SOLA transacción de BD:
 *   1. Cálculo exacto de ventas por método de pago (efectivo, tarjeta,
 *      transferencias, retiros) desde la fuente de verdad (SalesInvoice +
 *      JewelryService), sin depender de contadores incrementales.
 *   2. Reconteo de salidas/retiros (CashOutflow).
 *   3. Cálculo del esperado en caja (C$ y USD) y diferencias.
 *   4. Actualización del estado de la sesión a CLOSED con los totales
 *      autoritativos.
 *
 * Retorna el objeto consolidado del reporte de cierre directamente, sin que
 * el cliente tenga que recalcular nada.
 */
export async function closeCashSession(
    sessionId: string,
    payload: CloseCashSessionPayload = {}
): Promise<{ success: boolean; session: any; breakdown: SessionSalesBreakdown; report: CloseCashSessionReport }> {
    const actualCash = Number(payload?.actualCash) || 0;
    const actualUSD = Number(payload?.actualUSD) || 0;
    const round2 = (n: number) => Math.round(n * 100) / 100;

    const result = await db.$transaction(async (tx) => {
        const session = await tx.cashRegisterSession.findUnique({ where: { id: sessionId } });
        if (!session) throw new Error("Session not found");

        // 1) Ventas autoritativas por método (dentro de la transacción).
        const breakdown = await computeSessionBreakdown(tx, sessionId);

        // 2) Salidas / retiros de la sesión.
        const outflowsAgg = await tx.cashOutflow.aggregate({
            where: { sessionId },
            _sum: { amount: true },
        });
        const totalOutflows = Number(outflowsAgg._sum.amount) || 0;

        // 3) Esperados y diferencias (misma fórmula que el reporte local).
        const expectedCash = round2((session.initialAmount || 0) + breakdown.salesCash + breakdown.salesAbonos - totalOutflows - breakdown.totalReturns);
        const expectedUSD = round2((session.initialAmountUSD || 0) + breakdown.salesUSD);
        const finalAmount = expectedCash;
        const difference = round2(actualCash - expectedCash);
        const differenceUSD = round2(actualUSD - expectedUSD);
        const closingTime = new Date().toISOString();

        // 4) Cierre transaccional de la sesión con totales autoritativos.
        const updated = await tx.cashRegisterSession.update({
            where: { id: sessionId },
            data: {
                status: 'closed',
                closingTime,
                finalAmount,
                actualCash,
                actualUSD,
                difference,
                differenceUSD,
                totalSales: breakdown.totalSales,
                salesCash: breakdown.salesCash,
                salesCard: breakdown.salesCard,
                salesUSD: breakdown.salesUSD,
                salesCredit: breakdown.salesCredit,
                salesServices: breakdown.salesServices,
                salesAbonos: breakdown.salesAbonos,
            },
        });

        const report: CloseCashSessionReport = {
            openingBalance: session.initialAmount || 0,
            initialAmount: session.initialAmount || 0,
            initialAmountUSD: session.initialAmountUSD || 0,
            closingTime,
            expectedCash,
            expectedUSD,
            finalAmount,
            actualCash,
            actualUSD,
            difference,
            differenceUSD,
            totalSales: breakdown.totalSales,
            salesCash: breakdown.salesCash,
            salesCard: breakdown.salesCard,
            salesUSD: breakdown.salesUSD,
            salesCredit: breakdown.salesCredit,
            salesServices: breakdown.salesServices,
            salesAbonos: breakdown.salesAbonos,
            totalReturns: breakdown.totalReturns,
            totalOutflows,
        };

        return { session: updated, breakdown, report, cashierName: session.cashierName };
    });

    // Efectos secundarios POST-commit: no deben romper la respuesta del cierre.
    try {
        await createNotification('info', `Caja cerrada por ${result.cashierName}. Total Ventas: C$${result.breakdown.totalSales}. Diferencia: C$${result.report.difference}`);
    } catch (e) {
        console.error('Error creando notificación de cierre:', e);
    }
    sendSessionReport(sessionId).catch(() => {});
    revalidatePath('/');

    return { success: true, session: result.session, breakdown: result.breakdown, report: result.report };
}

/** Mantiene compatibilidad con el hook (updateSession/closeCashRegister/resetCashRegister). */
export async function closeSession(sessionId: string, finalAmount: number, actualCash: number, actualUSD: number = 0) {
    return closeCashSession(sessionId, { actualCash, actualUSD });
}

export async function addSaleToSessionDB(sessionId: string, amount: number) {
    const session = await db.cashRegisterSession.findUnique({
        where: { id: sessionId }
    });

    if (!session) throw new Error("Session not found");

    await db.cashRegisterSession.update({
        where: { id: sessionId },
        data: {
            totalSales: (session.totalSales || 0) + amount
        }
    });
    revalidatePath('/');
}

export async function createOutflowAction(sessionId: string, amount: number, reason: string) {
    const session = await db.cashRegisterSession.findUnique({
        where: { id: sessionId }
    });

    if (!session) throw new Error("Session not found");
    if (session.status !== 'open') throw new Error("Session is closed");

    const outflow = await db.cashOutflow.create({
        data: {
            id: generateUUID(),
            sessionId,
            amount,
            reason
        } as any
    });

    revalidatePath('/');
    return outflow;
}

export async function getSessionOutflows(sessionId: string) {
    return db.cashOutflow.findMany({
        where: { sessionId },
        orderBy: { createdAt: 'desc' }
    });
}
