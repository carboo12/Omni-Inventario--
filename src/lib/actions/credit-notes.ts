'use server'
import { generateUUID } from '@/lib/uuid';

import db from '../db';
import { revalidatePath } from 'next/cache';
import { verifySession } from '../session';
import { isCreditPayment } from '../payment-method';
import { BusinessGuard } from '../business-guard';

export async function getCreditNotes(limit = 100) {
    const session = await verifySession();
    if (!session || !['master-admin', 'admin', 'cashier'].includes(session.role)) {
        return { success: false as const, error: 'No autorizado', data: [] };
    }
    try {
        const notes = await db.creditNote.findMany({
            take: Math.min(Math.max(Math.trunc(Number(limit) || 100), 1), 200),
            orderBy: { date: 'desc' },
            include: {
                salesInvoice: { select: { invoiceNumber: true, customer: { select: { fullName: true } } } },
                user: { select: { name: true } },
                items: { select: { productName: true, quantity: true, totalPrice: true, disposition: true } },
            },
        });
        return {
            success: true as const,
            data: notes.map((note) => ({
                id: note.id,
                noteNumber: note.noteNumber,
                invoiceNumber: note.salesInvoice.invoiceNumber,
                customerName: note.salesInvoice.customer?.fullName || 'Cliente General',
                cashierName: note.user.name,
                date: note.date,
                reason: note.reason,
                totalAmount: note.totalAmount,
                items: note.items,
            })),
        };
    } catch (error) {
        console.error('Error fetching credit notes:', error);
        return { success: false as const, error: error instanceof Error ? error.message : 'No se pudo cargar el historial de devoluciones', data: [] };
    }
}

export async function getInvoiceByNumber(invoiceNumber: number | string) {
    const session = await verifySession();
    if (!session) return { success: false as const, error: 'Unauthorized' };

    try {
        let parsed: number;
        if (typeof invoiceNumber === 'string') {
            const cleaned = invoiceNumber.replace(/^0+/, '');
            parsed = cleaned === '' ? 1 : parseInt(cleaned, 10);
            if (!Number.isFinite(parsed) || parsed <= 0) {
                return { success: false as const, error: 'Número de factura inválido' };
            }
        } else {
            parsed = invoiceNumber;
        }

        if (!Number.isInteger(parsed) || parsed <= 0) return { success: false as const, error: 'Número de factura inválido' };

        const invoice = await db.salesInvoice.findUnique({
            where: { invoiceNumber: parsed },
            include: {
                salesInvoiceItem: true,
                creditNote: { include: { items: true } },
                customer: { select: { fullName: true } },
            }
        });

        if (!invoice) {
            return { success: false as const, error: 'Factura no encontrada' };
        }

        return { success: true as const, invoice };
    } catch (error) {
        console.error('Error fetching invoice:', error);
        return { success: false as const, error: 'Error al buscar la factura' };
    }
}

export async function createCreditNote(
    invoiceId: string,
    reason: string,
    itemsToReturn: { productId: string, quantity: number }[],
    sessionId: string,
    options: { resolution?: 'REFUND' | 'CREDIT'; restockProductIds?: string[] } = {}
) {
    const session = await verifySession();
    if (!session) return { success: false as const, error: 'Unauthorized' };
    if (!reason?.trim()) return { success: false as const, error: 'El motivo de devolución es obligatorio' };

    try {
        const pharmacyMode = await BusinessGuard.isPharmacyMode();
        return await db.$transaction(async (tx) => {
            // 1. Fetch Invoice
            const invoice = await tx.salesInvoice.findUnique({
                where: { id: invoiceId },
                include: { salesInvoiceItem: true }
            });

            if (!invoice) throw new Error('Factura no encontrada');
            if (options.resolution !== 'CREDIT') {
                if (!sessionId) throw new Error('Se requiere una caja activa para reembolsar');
                const activeSession = await tx.cashRegisterSession.findUnique({ where: { id: sessionId } });
                if (!activeSession || activeSession.status !== 'open') throw new Error('La caja seleccionada no está abierta');
            }
            // CreditNote requiere una sesión por compatibilidad del modelo; los vales
            // sin caja activa quedan vinculados a la sesión de la factura original.
            const creditNoteSessionId = sessionId || invoice.sessionId;

            // 2. Validate items to return
            let refundAmount = 0;
            const priorReturns = await tx.returnItem.findMany({
                where: { invoiceItemId: { in: invoice.salesInvoiceItem.map((item) => item.id) } },
                select: { invoiceItemId: true, quantity: true },
            });
            const alreadyReturned = new Map<string, number>();
            priorReturns.forEach((item) => alreadyReturned.set(item.invoiceItemId, (alreadyReturned.get(item.invoiceItemId) || 0) + item.quantity));
            const validatedReturns: Array<{ original: typeof invoice.salesInvoiceItem[number]; quantity: number }> = [];
            for (const itemReturn of itemsToReturn) {
                const originalItem = invoice.salesInvoiceItem.find((i) => i.id === itemReturn.productId);
                if (!originalItem) throw new Error(`Renglón de factura no encontrado: ${itemReturn.productId}`);
                const remaining = originalItem.quantity - (alreadyReturned.get(originalItem.id) || 0);
                if (!Number.isInteger(itemReturn.quantity) || itemReturn.quantity < 1 || itemReturn.quantity > remaining) throw new Error(`Cantidad a devolver excede la cantidad disponible para: ${originalItem.productName}`);

                refundAmount += (originalItem.unitPrice * itemReturn.quantity);
                validatedReturns.push({ original: originalItem, quantity: itemReturn.quantity });
            }
            if (!validatedReturns.length) throw new Error('Seleccione al menos un producto para devolver');

            // 3. Create Credit Note Record
            const creditNote = await tx.creditNote.create({
                data: {
                    id: generateUUID(),
                    invoiceId: invoice.id,
                    reason: reason,
                    totalAmount: refundAmount,
                    sessionId: creditNoteSessionId,
                    userId: session.userId,
                }
            });

            for (const { original, quantity } of validatedReturns) {
                const restock = options.restockProductIds?.includes(original.id) || options.restockProductIds?.includes(original.productId);
                await tx.returnItem.create({ data: {
                    id: generateUUID(), returnId: creditNote.id, invoiceItemId: original.id,
                    productId: original.productId, productName: original.productName, quantity,
                    unitPrice: original.unitPrice, totalPrice: original.unitPrice * quantity,
                    disposition: restock ? 'RESTOCK' : 'DAMAGED',
                } });
            }

            // 4. Update Invoice Status
            await tx.salesInvoice.update({
                where: { id: invoice.id },
                data: { status: 'PARTIALLY_REFUNDED' }
            });
            const remainingItems = invoice.salesInvoiceItem.some((item) => item.quantity > (alreadyReturned.get(item.id) || 0) + (validatedReturns.find((v) => v.original.id === item.id)?.quantity || 0));
            if (!remainingItems) await tx.salesInvoice.update({ where: { id: invoice.id }, data: { status: 'REFUNDED' } });

            // 4b. Si la venta fue a crédito, la devolución reduce el saldo pendiente
            //     de la factura y del cliente (CxC), marcando las cuotas cubiertas.
            if (options.resolution === 'CREDIT' && invoice.customerId && refundAmount > 0) {
                await tx.customer.update({ where: { id: invoice.customerId }, data: { currentBalance: { decrement: refundAmount } } });
                if (isCreditPayment(invoice.paymentMethod)) {
                    const actualReduction = Math.min(refundAmount, Math.max(0, invoice.pendingBalance));
                    await tx.salesInvoice.update({ where: { id: invoice.id }, data: { pendingBalance: { decrement: actualReduction } } });
                }
            } else if (isCreditPayment(invoice.paymentMethod) && invoice.customerId && refundAmount > 0) {
                const actualReduction = Math.min(refundAmount, Math.max(0, invoice.pendingBalance));
                await tx.salesInvoice.update({
                    where: { id: invoice.id },
                    data: { pendingBalance: { decrement: actualReduction } }
                });
                await tx.customer.update({
                    where: { id: invoice.customerId },
                    data: { currentBalance: { decrement: actualReduction } }
                });
                const openInst = await tx.creditInstallment.findMany({
                    where: { saleId: invoice.id, status: { in: ['PENDING', 'OVERDUE'] } },
                    orderBy: { dueDate: 'asc' },
                    select: { id: true, amount: true },
                });
                let rem = actualReduction;
                for (const i of openInst) {
                    if (rem <= 0.005) break;
                    if (Number(i.amount) <= rem + 0.005) {
                        await tx.creditInstallment.update({ where: { id: i.id }, data: { status: 'PAID' } });
                        rem -= Number(i.amount);
                    } else {
                        break;
                    }
                }
            }

            // 5. Restore Inventory
            for (const { original, quantity } of validatedReturns) {
                const itemReturn = { productId: original.productId, quantity };
                const restock = options.restockProductIds?.includes(original.id) || options.restockProductIds?.includes(original.productId);
                if (!restock) continue;
                const inventoryItem = await tx.inventoryItem.findFirst({
                    where: {
                        productId: itemReturn.productId,
                        ...(pharmacyMode && invoice.inventoryType
                            ? { inventoryType: invoice.inventoryType }
                            : {}),
                    },
                    ...(pharmacyMode ? { orderBy: { expiryDate: 'asc' as const } } : {}),
                });

                if (inventoryItem) {
                    const restoredLot = await tx.inventoryItem.update({
                        where: { id: inventoryItem.id },
                        data: { quantity: { increment: itemReturn.quantity } }
                    });

                    // Log Movement
                    // Calculate total stock for this product for accurate Kardex
                    const currentStockRecords = await tx.inventoryItem.findMany({
                        where: { productId: itemReturn.productId, inventoryType: inventoryItem.inventoryType }
                    });
                    const currentTotal = currentStockRecords.reduce((sum, i) => sum + i.quantity, 0);
                    const previousTotal = currentTotal - itemReturn.quantity; // Because we just incremented it

                    await tx.inventoryMovement.create({
                        data: {
                            id: generateUUID(),
                            timestamp: new Date().toISOString(),
                            productName: (invoice as any).salesInvoiceItem.find((i: any) => i.productId === itemReturn.productId)?.productName || 'Unknown',
                            movementType: 'ENTRADA_DEVOLUCION',
                            movementId: invoice.invoiceNumber.toString(),
                            quantityChange: itemReturn.quantity,
                            previousQuantity: pharmacyMode && inventoryItem.inventoryType === 'pharmacy' ? inventoryItem.quantity : previousTotal,
                            newQuantity: pharmacyMode && inventoryItem.inventoryType === 'pharmacy' ? restoredLot.quantity : currentTotal,
                            userId: session.userId,
                            inventoryType: inventoryItem.inventoryType,
                            ...(pharmacyMode && inventoryItem.inventoryType === 'pharmacy'
                                ? { batchNumber: restoredLot.batch, expiryDate: restoredLot.expiryDate }
                                : {}),
                        } as any
                    });
                }
            }

            // 6. Update Cash Register Session (Deduct from Expected Cash)
            // We use the `totalReturns` field we added to the session
            if (options.resolution !== 'CREDIT') {
                await tx.cashOutflow.create({ data: {
                    id: generateUUID(), sessionId, amount: refundAmount,
                    reason: `Devolución factura #${invoice.invoiceNumber} - ${reason}`,
                } });
                await tx.cashRegisterSession.update({ where: { id: sessionId }, data: { totalReturns: { increment: refundAmount } } });
            }

            revalidatePath('/devoluciones');
            revalidatePath('/customers/credit');
            revalidatePath(`/facturas/${invoice.id}`);
            return { success: true as const, creditNote };
        });

    } catch (error) {
        console.error('Error creating credit note:', error);
        return { success: false as const, error: error instanceof Error ? error.message : 'Error al procesar la nota de crédito' };
    }
}
