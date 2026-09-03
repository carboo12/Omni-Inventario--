'use server'
import { generateUUID } from '@/lib/uuid';

import db from '../db';
import { revalidatePath } from 'next/cache';
import { verifySession } from '../session';

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

        const invoice = await db.salesInvoice.findUnique({
            where: { invoiceNumber: parsed },
            include: {
                salesInvoiceItem: true,
                creditNote: true // Check if already refunded
            }
        });

        if (!invoice) {
            return { success: false as const, error: 'Factura no encontrada' };
        }

        if (invoice.creditNote) {
            return { success: false as const, error: 'Esta factura ya tiene una nota de crédito asociada' };
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
    sessionId: string
) {
    const session = await verifySession();
    if (!session) return { success: false as const, error: 'Unauthorized' };

    try {
        return await db.$transaction(async (tx) => {
            // 1. Fetch Invoice
            const invoice = await tx.salesInvoice.findUnique({
                where: { id: invoiceId },
                include: { salesInvoiceItem: true }
            });

            if (!invoice) throw new Error('Factura no encontrada');

            // 2. Validate items to return
            let refundAmount = 0;
            for (const itemReturn of itemsToReturn) {
                const originalItem = (invoice as any).salesInvoiceItem.find((i: any) => i.productId === itemReturn.productId);
                if (!originalItem) throw new Error(`Producto no encontrado en factura original: ${itemReturn.productId}`);
                if (itemReturn.quantity > originalItem.quantity) throw new Error(`Cantidad a devolver excede la cantidad original para el producto: ${originalItem.productName}`);

                refundAmount += (originalItem.unitPrice * itemReturn.quantity);
            }

            // 3. Create Credit Note Record
            const creditNote = await tx.creditNote.create({
                data: {
                    id: generateUUID(),
                    invoiceId: invoice.id,
                    reason: reason,
                    totalAmount: refundAmount,
                    sessionId: sessionId,
                    userId: session.userId,
                } as any
            });

            // 4. Update Invoice Status
            await tx.salesInvoice.update({
                where: { id: invoice.id },
                data: { status: 'REFUNDED' } // Or PARTIALLY_REFUNDED if we support that later
            });

            // 5. Restore Inventory
            for (const itemReturn of itemsToReturn) {
                const inventoryItem = await tx.inventoryItem.findFirst({
                    where: { productId: itemReturn.productId }
                });

                if (inventoryItem) {
                    await tx.inventoryItem.update({
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
                            movementType: 'Devolución',
                            movementId: invoice.invoiceNumber.toString(),
                            quantityChange: itemReturn.quantity,
                            previousQuantity: previousTotal,
                            newQuantity: currentTotal,
                            userId: session.userId,
                            inventoryType: inventoryItem.inventoryType
                        } as any
                    });
                }
            }

            // 6. Update Cash Register Session (Deduct from Expected Cash)
            // We use the `totalReturns` field we added to the session
            await tx.cashRegisterSession.update({
                where: { id: sessionId },
                data: {
                    totalReturns: { increment: refundAmount }
                }
            });

            return { success: true as const, creditNote };
        });

    } catch (error) {
        console.error('Error creating credit note:', error);
        return { success: false as const, error: 'Error al procesar la nota de crédito' };
    }
}
