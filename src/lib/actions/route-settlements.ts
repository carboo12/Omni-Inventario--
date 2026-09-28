'use server';

import { generateUUID } from '@/lib/uuid';
import { revalidatePath } from 'next/cache';

import db from '../db';
import { Prisma } from '@prisma/client';
import { verifySession } from '../session';
import { recordAudit } from './audit';
import { getPaymentBucket } from '../payment-method';
import { runStockSafeTransaction } from '../stock-tx';
import {
    PAY_ON_DELIVERY_METHOD,
    ROUTE_STATUS,
    SETTLEMENT_OUTCOMES,
    computeSettlementTotals,
    resolveOutcome,
    routeStatusForOutcome,
    type ReturnLine,
    type SettlementOutcome,
} from '../route-settlement';

export interface RouteSettlementRequest {
    invoiceId: string;
    /** Escenario elegido por el cajero en la estación de liquidación. */
    outcome: SettlementOutcome;
    /** Forma de pago que el cliente usó al recibir el pedido. */
    paymentMethod: string;
    /** Cantidades devueltas por línea de factura. */
    returns?: ReturnLine[];
    reason?: string;
    notes?: string;
}

export interface RouteSettlementResult {
    success: boolean;
    error?: string;
    data?: {
        invoiceId: string;
        invoiceNumber: number;
        outcome: SettlementOutcome;
        routeStatus: string;
        originalAmount: number;
        returnedAmount: number;
        collectedAmount: number;
        returnedUnits: number;
        creditNoteNumber?: number | null;
    };
}

/** Bodega por defecto cuando la factura no la tiene registrada (pedidos anteriores). */
const FALLBACK_INVENTORY_TYPE = 'MOSTRADOR';

function round2(value: number): number {
    return Math.round((Number(value) || 0) * 100) / 100;
}

/**
 * Devuelve la bodega desde la que se descontó el pedido. Se usa la que quedó
 * guardada en la factura; si el pedido es anterior a ese registro se resuelve
 * por el inventario existente del producto.
 */
async function resolveInventoryType(
    tx: Prisma.TransactionClient,
    productId: string,
    invoiceInventoryType: string | null
): Promise<string> {
    if (invoiceInventoryType) return invoiceInventoryType;
    const existing = await tx.inventoryItem.findFirst({
        where: { productId },
        orderBy: { expiryDate: 'asc' },
        select: { inventoryType: true },
    });
    return existing?.inventoryType || FALLBACK_INVENTORY_TYPE;
}

/**
 * Repone las unidades devueltas en la misma bodega y con el mismo factor de
 * presentación con el que se descontaron, invirtiendo exactamente la lógica de
 * `createSale`: variantes, productos estándar, insumos de receta y kardex.
 */
async function restoreReturnedStock(
    tx: Prisma.TransactionClient,
    params: {
        productId: string;
        productName: string;
        variantId: string | null;
        presentationFactor: number;
        units: number;
        inventoryType: string;
        movementId: string;
        userId: string;
        enableRecipes: boolean;
    }
): Promise<void> {
    const { productId, productName, variantId, units, inventoryType, movementId, userId } = params;
    const factor = Number(params.presentationFactor) || 1;
    const physicalUnits = units * factor;
    if (physicalUnits <= 0) return;

    const product = await tx.product.findUnique({
        where: { id: productId },
        select: { id: true, name: true, type: true },
    });
    if (!product) return;

    // La venta de una receta descuenta insumos, no el platillo: se repone cada insumo.
    if (params.enableRecipes && product.type === 'RECIPE_ITEM') {
        const recipeLines = await tx.recipeItem.findMany({ where: { productId } });
        if (recipeLines.length > 0) {
            for (const line of recipeLines) {
                const amount = physicalUnits * Number(line.quantity || 0);
                if (amount <= 0) continue;
                const target = await tx.inventoryItem.findFirst({
                    where: { productId: line.ingredientId, inventoryType },
                    orderBy: { expiryDate: 'asc' },
                });
                if (target) {
                    await tx.inventoryItem.update({
                        where: { id: target.id },
                        data: { quantity: { increment: amount } },
                    });
                } else {
                    await tx.inventoryItem.create({
                        data: {
                            id: generateUUID(),
                            productId: line.ingredientId,
                            quantity: amount,
                            inventoryType,
                        } as any,
                    });
                }
                await tx.inventoryMovement.create({
                    data: {
                        id: generateUUID(),
                        timestamp: new Date().toISOString(),
                        productName: `${productName} (insumo repuesto)`,
                        movementType: 'Devolución',
                        movementId,
                        quantityChange: amount,
                        previousQuantity: 0,
                        newQuantity: amount,
                        userId,
                        inventoryType,
                    } as any,
                });
            }
            return;
        }
    }

    if (variantId) {
        const variant = await tx.productVariant.update({
            where: { id: variantId },
            data: { stock: { increment: physicalUnits } },
            include: { size: true, color: true },
        });
        await tx.inventoryMovement.create({
            data: {
                id: generateUUID(),
                timestamp: new Date().toISOString(),
                productName: `${productName} - ${variant.size?.name || ''} - ${variant.color?.name || ''}`.trim(),
                movementType: 'Devolución',
                movementId,
                quantityChange: physicalUnits,
                previousQuantity: variant.stock - physicalUnits,
                newQuantity: variant.stock,
                userId,
                inventoryType,
            } as any,
        });
        return;
    }

    const target = await tx.inventoryItem.findFirst({
        where: { productId, inventoryType },
        orderBy: { expiryDate: 'asc' },
    });
    if (target) {
        const siblings = await tx.inventoryItem.findMany({
            where: { productId, inventoryType },
            select: { quantity: true },
        });
        const previousTotal = siblings.reduce((sum, row) => sum + (Number(row.quantity) || 0), 0);
        await tx.inventoryItem.update({
            where: { id: target.id },
            data: { quantity: { increment: physicalUnits } },
        });
        await tx.inventoryMovement.create({
            data: {
                id: generateUUID(),
                timestamp: new Date().toISOString(),
                productName,
                movementType: 'Devolución',
                movementId,
                quantityChange: physicalUnits,
                previousQuantity: previousTotal,
                newQuantity: previousTotal + physicalUnits,
                userId,
                inventoryType,
            } as any,
        });
        return;
    }

    // El producto no tenía registro en esta bodega: se crea con lo devuelto.
    await tx.inventoryItem.create({
        data: {
            id: generateUUID(),
            productId,
            quantity: physicalUnits,
            inventoryType,
        } as any,
    });
    await tx.inventoryMovement.create({
        data: {
            id: generateUUID(),
            timestamp: new Date().toISOString(),
            productName,
            movementType: 'Devolución',
            movementId,
            quantityChange: physicalUnits,
            previousQuantity: 0,
            newQuantity: physicalUnits,
            userId,
            inventoryType,
        } as any,
    });
}

/**
 * Liquida un pedido emitido con "Cobro contra entrega". Todo el proceso es una
 * sola transacción: valida el pedido pendiente, repone la mercancía devuelta,
 * registra la nota de crédito, cierra la factura y suma el neto cobrado a la caja
 * del cajero. Si algo falla, no se toca caja ni inventario.
 */
export async function settleRouteOrder(
    request: RouteSettlementRequest
): Promise<RouteSettlementResult> {
    const session = await verifySession();
    if (!session) return { success: false, error: 'Unauthorized' };

    const invoiceId = (request.invoiceId || '').trim();
    if (!invoiceId) return { success: false, error: 'Pedido no seleccionado' };

    const paymentMethod = (request.paymentMethod || '').trim();
    const returns: ReturnLine[] = Array.isArray(request.returns) ? request.returns : [];
    const requestedOutcome = request.outcome;
    const isFullReturnRequest = requestedOutcome === SETTLEMENT_OUTCOMES.DEVOLUCION_TOTAL;
    if (!paymentMethod && !isFullReturnRequest) {
        return { success: false, error: 'Seleccione cómo pagó el cliente' };
    }
    if (paymentMethod && !/TRANSFER/i.test(paymentMethod) && getPaymentBucket(paymentMethod) === 'other') {
        return {
            success: false,
            error: 'La liquidación en ruta solo admite Efectivo o Transferencia',
        };
    }

    try {
        const invoice = await db.salesInvoice.findUnique({
            where: { id: invoiceId },
            include: {
                customer: true,
                salesInvoiceItem: true,
                routeSettlement: true,
            },
        });
        if (!invoice) return { success: false, error: 'Factura no encontrada' };
        if (invoice.routeSettlement) {
            return { success: false, error: 'Este pedido ya fue liquidado' };
        }
        if (invoice.status === 'CANCELLED' || invoice.status === 'VOID') {
            return { success: false, error: 'El pedido está cancelado y no se puede liquidar' };
        }
        if ((invoice.paymentMethod || '') !== PAY_ON_DELIVERY_METHOD && invoice.isPaid) {
            return { success: false, error: 'El pedido no fue emitido con Cobro contra entrega' };
        }
        const alreadyPending = invoice.routeStatus === ROUTE_STATUS.PENDIENTE_LIQUIDACION;
        if (!alreadyPending && invoice.isPaid) {
            return { success: false, error: 'El pedido ya está pagado' };
        }

        // El dinero entra a la caja del cajero que liquida, no a la del día de la venta.
        const openSession = await db.cashRegisterSession.findFirst({
            where: { status: { in: ['open', 'OPEN'] } },
            orderBy: { openingTime: 'desc' },
        });
        if (!openSession) {
            return {
                success: false,
                error: 'No hay una caja abierta. Abra la caja antes de liquidar pedidos.',
            };
        }

        const totals = computeSettlementTotals(invoice.salesInvoiceItem, returns, invoice.totalAmount);
        const derivedOutcome = resolveOutcome(totals);
        if (isFullReturnRequest && derivedOutcome !== SETTLEMENT_OUTCOMES.DEVOLUCION_TOTAL) {
            return { success: false, error: 'Para marcar devolución total, indique todas las unidades devueltas' };
        }
        if (request.outcome && request.outcome !== derivedOutcome) {
            return {
                success: false,
                error: 'El escenario no coincide con las cantidades devueltas. Revise el modal.',
            };
        }
        const outcome = derivedOutcome;
        if (outcome === SETTLEMENT_OUTCOMES.ENTREGA_COMPLETA && returns.length > 0) {
            const anyUnits = returns.some((line) => Number(line.quantity) > 0);
            if (anyUnits) {
                return { success: false, error: 'No hay devoluciones en una entrega completa' };
            }
        }

        const routeStatus = routeStatusForOutcome(outcome);
        const collectedAmount = outcome === SETTLEMENT_OUTCOMES.DEVOLUCION_TOTAL ? 0 : totals.netAmount;
        const reason = (request.reason || '').trim() || null;
        const notes = (request.notes || '').trim() || null;
        const movementId = `RT-${invoice.invoiceNumber}-${Date.now()}`;

        const settings = await db.systemSettings.findFirst({ select: { enableRecipes: true } });
        const enableRecipes = !!settings?.enableRecipes;

        const result = await runStockSafeTransaction(async (tx) => {
            // Doble comprobación dentro de la transacción: dos cajeros no pueden
            // liquidar el mismo pedido a la vez.
            const claimed = await tx.routeSettlement.findUnique({ where: { invoiceId } });
            if (claimed) throw new Error('PEDIDO_YA_LIQUIDADO');

            const settlement = await tx.routeSettlement.create({
                data: {
                    id: generateUUID(),
                    invoiceId,
                    sessionId: openSession.id,
                    userId: session.userId,
                    userName: '',
                    outcome,
                    paymentMethod: paymentMethod || 'Sin cobro (devolución total)',
                    collectedAmount,
                    returnedAmount: totals.returnedAmount,
                    returnedUnits: totals.returnedUnits,
                    reason,
                    notes,
                },
            });

            let creditNoteNumber: number | null = null;

            for (const line of returns) {
                const item = invoice.salesInvoiceItem.find((row) => row.id === line.invoiceItemId);
                if (!item) continue;
                const quantity = Math.min(
                    Math.max(0, Math.floor(Number(line.quantity) || 0)),
                    Math.max(0, item.quantity)
                );
                if (quantity === 0) continue;

                const inventoryType = await resolveInventoryType(tx, item.productId, invoice.inventoryType);
                await restoreReturnedStock(tx, {
                    productId: item.productId,
                    productName: item.productName,
                    variantId: item.variantId,
                    presentationFactor: item.presentationFactor,
                    units: quantity,
                    inventoryType,
                    movementId,
                    userId: session.userId,
                    enableRecipes,
                });

                await tx.routeReturnItem.create({
                    data: {
                        id: generateUUID(),
                        invoiceId,
                        invoiceItemId: item.id,
                        productId: item.productId,
                        productName: item.productName,
                        quantity,
                        unitPrice: item.unitPrice,
                        totalPrice: round2(item.unitPrice * quantity),
                    },
                });
            }

            if (totals.returnedAmount > 0) {
                const creditNote = await tx.creditNote.create({
                    data: {
                        id: generateUUID(),
                        invoiceId,
                        reason:
                            reason ||
                            (outcome === SETTLEMENT_OUTCOMES.DEVOLUCION_TOTAL
                                ? 'Devolución total del pedido en ruta'
                                : 'Devolución parcial del pedido en ruta'),
                        totalAmount: totals.returnedAmount,
                        sessionId: openSession.id,
                        userId: session.userId,
                    },
                });
                creditNoteNumber = creditNote.noteNumber;
            }

            await tx.salesInvoice.update({
                where: { id: invoiceId },
                data:
                    outcome === SETTLEMENT_OUTCOMES.DEVOLUCION_TOTAL
                        ? {
                            isPaid: false,
                            status: 'CANCELLED',
                            deliveryStatus: 'RECHAZADO',
                            routeStatus,
                        }
                        : {
                            isPaid: true,
                            status: 'COMPLETED',
                            deliveryStatus: 'COBRADO',
                            routeStatus,
                        },
            });

            // Solo entra a caja el dinero que realmente se cobró. La mercancía
            // devuelta no sale del cajón, por eso no toca `totalReturns`.
            if (collectedAmount > 0) {
                const bucket = getPaymentBucket(paymentMethod);
                const increment: Record<string, { increment: number }> = {
                    totalSales: { increment: collectedAmount },
                };
                if (bucket === 'card') increment.salesCard = { increment: collectedAmount };
                else increment.salesCash = { increment: collectedAmount };

                const currentCashSession = await tx.cashRegisterSession.findUnique({ where: { id: openSession.id }, select: { status: true } });
                if (!currentCashSession || !['open', 'OPEN'].includes(currentCashSession.status)) {
                    throw new Error('CAJA_CERRADA');
                }
                await tx.cashRegisterSession.update({
                    where: { id: openSession.id },
                    data: increment as any,
                });
            }

            return { settlement, creditNoteNumber };
        });

        const actor = await db.user.findUnique({
            where: { id: session.userId },
            select: { name: true },
        });
        const userName = actor?.name || 'Usuario';
        await db.routeSettlement.update({
            where: { id: result.settlement.id },
            data: { userName },
        });

        try {
            await recordAudit({
                userId: session.userId,
                userName,
                action: 'UPDATE',
                entity: 'Sale',
                entityId: `FACTURA-${invoice.invoiceNumber}`,
                description:
                    outcome === SETTLEMENT_OUTCOMES.DEVOLUCION_TOTAL
                        ? `Rechazó en ruta el pedido #${invoice.invoiceNumber}: devolución total por C$${totals.returnedAmount.toFixed(2)}`
                        : `Liquidó el pedido #${invoice.invoiceNumber} por C$${collectedAmount.toFixed(2)} (${paymentMethod})` +
                          (totals.returnedAmount > 0
                              ? ` con devolución parcial de C$${totals.returnedAmount.toFixed(2)}`
                              : ''),
                metadata: {
                    invoiceNumber: invoice.invoiceNumber,
                    outcome,
                    routeStatus,
                    paymentMethod,
                    originalAmount: totals.originalAmount,
                    collectedAmount,
                    returnedAmount: totals.returnedAmount,
                    returnedUnits: totals.returnedUnits,
                    sessionId: openSession.id,
                    creditNoteNumber: result.creditNoteNumber,
                },
            });
        } catch (auditError) {
            console.error('Audit error:', auditError);
        }

        revalidatePath('/ruta');
        revalidatePath('/entregas');
        revalidatePath('/delivery-routes');
        revalidatePath('/orders');
        revalidatePath('/cash-register');

        return {
            success: true,
            data: {
                invoiceId,
                invoiceNumber: invoice.invoiceNumber,
                outcome,
                routeStatus,
                originalAmount: totals.originalAmount,
                returnedAmount: totals.returnedAmount,
                collectedAmount,
                returnedUnits: totals.returnedUnits,
                creditNoteNumber: result.creditNoteNumber,
            },
        };
    } catch (error: any) {
        if (error?.message === 'PEDIDO_YA_LIQUIDADO') {
            return { success: false, error: 'Este pedido ya fue liquidado' };
        }
        console.error('Error settling route order:', error);
        return { success: false, error: 'Error al liquidar el pedido. No se modificó caja ni inventario.' };
    }
}
