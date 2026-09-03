'use server'
import { generateUUID } from '@/lib/uuid';

import db from '../db';
import { revalidatePath } from 'next/cache';
import { InventoryMovement, PendingSale, CartItem } from '../types';
import { InventoryMovement as PrismaInventoryMovement, User as PrismaUser } from '@prisma/client';
import { verifySession } from '../session';
import { BusinessGuard } from '../business-guard';
import { recordAudit } from './audit';
import { getPaymentBucket, isCreditPayment } from '../payment-method';
import { resolvePresentationFactor } from '../presentations';

export async function createSale(
    items: CartItem[],
    sessionId: string,
    userId: string,
    inventoryType: string,
    totalAmount: number,
    paymentMethod: 'Efectivo' | 'Tarjeta' | 'Dolares' | 'Credito',
    customerId?: string
) {
    console.log('--- DEBUG createSale ---');
    console.log('paymentMethod:', paymentMethod);
    console.log('customerId:', customerId);
    
    const session = await verifySession();
    if (!session) return { success: false, error: 'Unauthorized' };

    try {
        const isJewelry = await BusinessGuard.isJewelryMode();
        if (isJewelry && !customerId) {
            return { success: false, error: 'El cliente es obligatorio para realizar ventas en modo JoyerÃ­a.' };
        }

        const transactionId = `TX-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

        // Round totalAmount to 2 decimal places to ensure accounting accuracy
        const roundedTotalAmount = Math.round(totalAmount * 100) / 100;

        // Desglose para reproducir el ticket idÃ©ntico en reimpresiÃ³n: el subtotal es la
        // suma de los totales por lÃ­nea y el impuesto es la diferencia con el total.
        const lineTotals = items.reduce((sum, item) => {
            const unitPrice = typeof item.unitPrice === 'number' && item.unitPrice > 0
                ? item.unitPrice
                : item.product.priceNIO;
            return sum + unitPrice * item.quantity;
        }, 0);
        const roundedSubtotal = Math.round(lineTotals * 100) / 100;
        const roundedTax = Math.round((roundedTotalAmount - roundedSubtotal) * 100) / 100;

        let createdInvoiceNumber = 0;

await db.$transaction(async (tx) => {
            for (const item of items) {
                const variantId = (item.product as any).variantId;
                const parentProductId = (item.product as any).parentProductId || item.product.id;

                // Multi-presentaciÃ³n: se descuenta del inventario la cantidad fÃ­sica
                // equivalente en la unidad base (cantidad vendida Ã— factor de la
                // presentaciÃ³n). Ej: 2 Ristras (factor 3) descontarÃ­an 2 Ã— 3 = 6.
                const factor = resolvePresentationFactor(item.product, item.presentation, item.presentationName, item.presentationFactor);
                const physicalUnits = item.quantity * factor;
                // Precio unitario efectivo: el congelado en el carrito (nivel de
                // precio Ã— presentaciÃ³n); fallback al precio de detalle.
                const unitPrice = typeof item.unitPrice === 'number' && item.unitPrice > 0
                    ? item.unitPrice
                    : item.product.priceNIO;

                if (variantId) {
                    const updatedVariant = await tx.productVariant.update({
                        where: { id: variantId },
                        data: { stock: { decrement: physicalUnits } },
                        include: { size: true, color: true, product: true }
                    });

                    // Encargo: se permite stock negativo (kardex en negativo) cuando el
                    // producto no tiene existencias suficientes; el ticket lo marca como
                    // "Pendiente de Entrega / Encargo".

                    await tx.inventoryMovement.create({
                        data: {
                            id: generateUUID(),
                            timestamp: new Date().toISOString(),
                            productName: `${updatedVariant.product.name} - ${updatedVariant.size.name} - ${updatedVariant.color.name}`,
                            movementType: 'Salida',
                            movementId: transactionId,
                            quantityChange: -physicalUnits,
                            previousQuantity: updatedVariant.stock + physicalUnits,
                            newQuantity: updatedVariant.stock,
                            userId: userId,
                            inventoryType: inventoryType
                        } as any
                    });

                    continue;
                }

                // Find inventory items for this product, ordered by expiry (FIFO)
                // Se incluyen registros con cantidad 0/negativa para permitir encargos
                // sobre productos sin existencias (kardex en negativo).
                const inventoryItems = await tx.inventoryItem.findMany({
                    where: {
                        productId: parentProductId,
                        inventoryType: inventoryType
                    },
                    orderBy: { expiryDate: 'asc' }
                });

let remainingToSell = physicalUnits;

                for (const invItem of inventoryItems) {
                    if (remainingToSell <= 0) break;

                    const quantityToTake = Math.min(invItem.quantity, remainingToSell);
                    // El InventoryItem.quantity es Int; para fraccionarios redondeamos
                    // hacia arriba el descuento fÃ­sico pero el Kardex guarda la fracciÃ³n real.
                    const invQtyToTake = item.product.isFractional ? Math.ceil(quantityToTake) : quantityToTake;

                    // Update inventory item ATOMICALLY
                    // We use decrement to ensure safety against concurrent sales
                    const updatedInvItem = await tx.inventoryItem.update({
                        where: { id: invItem.id },
                        data: {
                            quantity: { decrement: invQtyToTake }
                        }
                    });

                    // Check if stock went negative (shouldn't happen if logic is correct, but safe guard)
                    if (updatedInvItem.quantity < 0) {
                        throw new Error(`Stock insuficiente para el producto: ${item.product.name} (Race condition detected)`);
                    }

                    // Update status based on new quantity
                    const newQuantity = updatedInvItem.quantity;
                    const status = newQuantity <= 0 ? 'Agotado' : (newQuantity < 10 ? 'Stock Bajo' : 'En Stock');

                    if (updatedInvItem.status !== status) {
                        await tx.inventoryItem.update({
                            where: { id: invItem.id },
                            data: { status }
                        });
                    }

                    // Create movement
                    // Calculate total stock for this product for accurate Kardex
                    const currentStockRecords = await tx.inventoryItem.findMany({
                        where: { productId: item.product.id, inventoryType: inventoryType }
                    });
                    const currentTotal = currentStockRecords.reduce((sum, i) => sum + i.quantity, 0);
                    const previousTotal = currentTotal + invQtyToTake; // Because we just decremented it

                    await tx.inventoryMovement.create({
                        data: {
                            id: generateUUID(),
                            timestamp: new Date().toISOString(),
                            productName: item.product.name,
                            movementType: 'Salida',
                            movementId: transactionId,
                            quantityChange: -(item.product.isFractional ? quantityToTake : invQtyToTake),
                            previousQuantity: previousTotal,
                            newQuantity: currentTotal,
                            userId: userId,
                            inventoryType: inventoryType
                        } as any
                    });

                    remainingToSell -= quantityToTake;
                }

                // ENCARGO: si el stock es insuficiente, se permite la venta llevando el
                // kardex a valores negativos (venta bajo encargo / entrega pendiente).
                if (remainingToSell > 0) {
                    const encQty = item.product.isFractional ? Math.ceil(remainingToSell) : remainingToSell;
                    const currentRecords = await tx.inventoryItem.findMany({
                        where: { productId: parentProductId, inventoryType: inventoryType }
                    });
                    const totalBefore = currentRecords.reduce((sum, i) => sum + i.quantity, 0);

                    let target = inventoryItems[inventoryItems.length - 1];
                    if (!target) {
                        target = await tx.inventoryItem.create({
                            data: {
                                id: generateUUID(),
                                productId: parentProductId,
                                productName: item.product.name,
                                inventoryType: inventoryType as any,
                                batch: 'ENCARGO',
                                quantity: 0,
                                expiryDate: '2099-12-31',
                                status: 'Agotado'
                            } as any
                        });
                    }

                    await tx.inventoryItem.update({
                        where: { id: target.id },
                        data: { quantity: { decrement: encQty } }
                    });

                    await tx.inventoryMovement.create({
                        data: {
                            id: generateUUID(),
                            timestamp: new Date().toISOString(),
                            productName: item.product.name,
                            movementType: 'Salida',
                            movementId: transactionId,
                            quantityChange: -remainingToSell,
                            previousQuantity: totalBefore,
                            newQuantity: totalBefore - remainingToSell,
                            userId: userId,
                            inventoryType: inventoryType
                        } as any
                    });
                }
            }

            // Create SalesInvoice
            const salesInvoice = await tx.salesInvoice.create({
                data: {
                    id: generateUUID(),
                    totalAmount: roundedTotalAmount,
                    subtotal: roundedSubtotal,
                    tax: roundedTax,
                    paymentMethod: paymentMethod,
                    status: 'COMPLETED',
                    sessionId: sessionId,
                    userId: userId,
                    customerId: customerId,
salesInvoiceItem: {
                        create: items.map(item => {
                            const invUnitPrice = typeof item.unitPrice === 'number' && item.unitPrice > 0
                                ? item.unitPrice
                                : item.product.priceNIO;
                            const isBox = item.presentation === 'box' && (item.product as any).hasBoxOption;
                            const baseUnit = (item.product as any).baseUnit || null;
                            const bulkUnit = (item.product as any).bulkUnit || null;
                            return {
                                id: generateUUID(),
                                productId: (item.product as any).parentProductId || item.product.id,
                                productName: item.product.name,
                                quantity: item.quantity,
                                unitPrice: invUnitPrice,
                                totalPrice: invUnitPrice * item.quantity,
                                variantId: (item.product as any).variantId || null,
                                priceLevel: typeof item.priceLevel === 'number' ? item.priceLevel : 1,
                                presentationName: item.presentationName ?? (isBox ? bulkUnit : null),
                                presentationFactor: resolvePresentationFactor(item.product, item.presentation, item.presentationName, item.presentationFactor),
                                baseUnit,
                                bulkUnit,
                                isEncargo: !!item.isEncargo,
                            };
                        })
                    }
                } as any
            });

            createdInvoiceNumber = salesInvoice.invoiceNumber;

            // Handle Credit Logic
            if (isCreditPayment(paymentMethod)) {
                if (!customerId) throw new Error('Cliente es requerido para venta al crÃ©dito');
                
                const customer = await tx.customer.findUnique({ where: { id: customerId } });
                if (!customer || !customer.hasCredit) throw new Error('El cliente no tiene habilitado el crÃ©dito');

                // Check limit (optional, can be a warning or strict)
                const newBalance = customer.currentBalance + roundedTotalAmount;
                if (customer.creditLimit > 0 && newBalance > customer.creditLimit) {
                    throw new Error(`LÃ­mite de crÃ©dito excedido. Disponible: C$ ${(customer.creditLimit - customer.currentBalance).toFixed(2)}`);
                }

                await tx.customer.update({
                    where: { id: customerId },
                    data: { currentBalance: { increment: roundedTotalAmount } }
                });
            }

            // Update Session with rounded amount
            const updateData: any = {
                totalSales: { increment: roundedTotalAmount }
            };

            // Clasifica el mÃ©todo de pago con normalizaciÃ³n robusta de strings para que
            // 'Efectivo C$', 'CASH', 'CONTADO', 'EFECTIVO' etc. sumen a Ventas Efectivo,
            // y 'Tarjeta'/'TRANSFERENCIA' etc. sumen a Ventas Tarjeta.
            switch (getPaymentBucket(paymentMethod)) {
                case 'cash':
                    updateData.salesCash = { increment: roundedTotalAmount };
                    break;
                case 'card':
                    updateData.salesCard = { increment: roundedTotalAmount };
                    break;
                case 'usd':
                    updateData.salesUSD = { increment: roundedTotalAmount };
                    break;
                case 'credit':
                    updateData.salesCredit = { increment: roundedTotalAmount };
                    break;
                case 'other':
                    break;
            }

            await tx.cashRegisterSession.update({
                where: { id: sessionId },
                data: updateData
            });
        });

        revalidatePath('/pos');
        revalidatePath('/inventory');
        revalidatePath('/dashboard');

        // AUDIT
        try {
            const actor = await db.user.findUnique({ where: { id: session.userId }, select: { name: true } });
            await recordAudit({
                userId: session.userId,
                userName: actor?.name || 'Usuario',
                action: 'CREATE',
                entity: 'Sale',
                entityId: `FACTURA-${createdInvoiceNumber}`,
                description: `RegistrÃ³ una venta por C$${roundedTotalAmount.toFixed(2)} (factura #${createdInvoiceNumber})`,
                metadata: { invoiceNumber: createdInvoiceNumber, totalAmount: roundedTotalAmount, paymentMethod, items: items.length }
            });
        } catch (auditError) {
            console.error('Error recording sale audit:', auditError);
        }

        return { success: true, invoiceNumber: createdInvoiceNumber };
    } catch (error) {
        console.error('Error creating sale:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Error al procesar la venta' };
    }
}

export async function getInventoryMovements(): Promise<InventoryMovement[]> {
    const session = await verifySession();
    if (!session) return [];

    const movements = await db.inventoryMovement.findMany({
        orderBy: {
            timestamp: 'desc'
        },
        include: {
            user: true
        }
    });

    return movements.map((m: PrismaInventoryMovement & { user: PrismaUser }) => ({
        id: m.id,
        timestamp: m.timestamp,
        productName: m.productName,
        movementType: m.movementType as any,
        movementId: m.movementId,
        quantityChange: m.quantityChange,
        previousQuantity: m.previousQuantity,
        newQuantity: m.newQuantity,
        user: m.user.name, // The type expects the name string
        inventoryType: m.inventoryType as any
    }));
}

export async function getInvoiceByNumber(invoiceNumber: number | string) {
    const session = await verifySession();
    if (!session) return { success: false, error: 'Unauthorized' };

    try {
        let parsed: number;
        if (typeof invoiceNumber === 'string') {
            const cleaned = invoiceNumber.replace(/^0+/, '');
            parsed = cleaned === '' ? 1 : parseInt(cleaned, 10);
            if (!Number.isFinite(parsed) || parsed <= 0) {
                return { success: false, error: 'NÃºmero de factura invÃ¡lido' };
            }
        } else {
            parsed = invoiceNumber;
        }

        const invoice = await db.salesInvoice.findUnique({
            where: { invoiceNumber: parsed },
            include: {
                salesInvoiceItem: {
                    orderBy: { id: 'asc' }
                },
                customer: true,
                user: true
            }
        });

        if (!invoice) {
            return { success: false, error: 'Factura no encontrada' };
        }

        return { success: true, data: invoice };
    } catch (error) {
        console.error('Error fetching invoice:', error);
        return { success: false, error: 'Error al buscar la factura' };
    }
}

export async function getLastSale(sessionId?: string) {
    const session = await verifySession();
    if (!session) return { success: false, error: 'Unauthorized' };

    try {
        const where: any = { status: 'COMPLETED' };
        if (sessionId) where.sessionId = sessionId;

        const invoice = await db.salesInvoice.findFirst({
            where,
            orderBy: { date: 'desc' },
            include: {
                salesInvoiceItem: {
                    orderBy: { id: 'asc' }
                },
                customer: true,
                user: true
            }
        });

        if (!invoice) {
            return { success: false, error: 'No hay ventas registradas' };
        }

        return { success: true, data: invoice };
    } catch (error) {
        console.error('Error fetching last sale:', error);
        return { success: false, error: 'Error al obtener la Ãºltima venta' };
    }
}
