'use server'
import { generateUUID } from '@/lib/uuid';

import db from '../db';
import { Prisma } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { InventoryMovement, PendingSale, CartItem } from '../types';
import { InventoryMovement as PrismaInventoryMovement, User as PrismaUser } from '@prisma/client';
import { verifySession } from '../session';
import { BusinessGuard } from '../business-guard';
import { recordAudit } from './audit';
import { getPaymentBucket, isCreditPayment } from '../payment-method';
import { resolvePresentationFactor } from '../presentations';
import {
    INSUFFICIENT_STOCK_CODE,
    InsufficientStockError,
    allowsNegativeStock,
} from '../stock-policy';

export interface SaleFinancing {
    installments: number;
    frequency: 'SEMANAL' | 'QUINCENAL' | 'MENSUAL';
    interestRate: number;
}

/** Se lanza cuando una venta a crédito requiere autorización de Administrador
 * (cliente en mora o límite de crédito excedido). El POS abre el diálogo de
 * autorización y reintenta con `adminAuthorized = true`. */
class CreditAuthRequiredError extends Error {
    requiresAdmin = true;
}

/** Número de intentos ante conflictos de escritura (carreras de stock). */
const STOCK_TX_MAX_ATTEMPTS = 3;

/**
 * Ejecuta la transacción de venta con aislamiento SERIALIZABLE y reintenta ante
 * conflictos de escritura (Prisma P2034). Esto hace que la comprobación de
 * existencias y el descuento FIFO sean atómicos: dos cajeros cobrando el mismo
 * producto a la vez no pueden ambos pasar la validación y dejar el stock en
 * negativo. Con el aislamiento por defecto (REPEATABLE READ) la lectura previa
 * al descuento no está protegida contra esas carreras.
 */
async function runStockSafeTransaction<T>(
    fn: (tx: Prisma.TransactionClient) => Promise<T>
): Promise<T> {
    let lastError: unknown;
    for (let attempt = 1; attempt <= STOCK_TX_MAX_ATTEMPTS; attempt++) {
        try {
            return await db.$transaction(fn, {
                isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
                maxWait: 5000,
                timeout: 15000,
            });
        } catch (error: any) {
            lastError = error;
            // P2034: transacción en conflicto o deadlock. Se reintenta con backoff.
            if (error?.code !== 'P2034' || attempt === STOCK_TX_MAX_ATTEMPTS) throw error;
            await new Promise((resolve) => setTimeout(resolve, 25 * attempt));
        }
    }
    throw lastError;
}

/** Consume la materia prima (INGREDIENT) de una receta dentro de la transacción
 * de venta de un platillo preparado (RECIPE_ITEM). Reproduce el descuento FIFO
 * por vencimiento + Kardex del producto estándar, pero aplicado al inventario
 * del insumo. Se permite stock negativo (encargo) por consistencia con el
 * ticket, igual que los productos normales.
 *
 * NO ALTERA el comportamiento de los productos STANDARD: solo se invoca para
 * RECIPE_ITEM y únicamente cuando `enableRecipes === true`. */
async function consumeIngredientStock(
    tx: any,
    ingredient: { id: string; name: string; isFractional?: boolean | null; allowNegativeStock?: boolean | null },
    requiredUnits: number,
    transactionId: string,
    userId: string,
    inventoryType: string
) {
    if (requiredUnits <= 0) return;

    const inventoryItems = await tx.inventoryItem.findMany({
        where: { productId: ingredient.id, inventoryType },
        orderBy: { expiryDate: 'asc' }
    });

    // Validación atómica ANTES de descontar: si el insumo no tiene existencias
    // suficientes y no permite stock negativo, se aborta toda la transacción.
    const available = inventoryItems.reduce((sum: number, i: any) => sum + (i.quantity || 0), 0);
    if (!allowsNegativeStock(ingredient) && requiredUnits > available) {
        throw new InsufficientStockError(ingredient.id, ingredient.name, available, requiredUnits);
    }

    let remaining = requiredUnits;

    for (const invItem of inventoryItems) {
        if (remaining <= 0) break;
        if (invItem.quantity <= 0) continue;

        const quantityToTake = Math.min(invItem.quantity, remaining);
        const invQtyToTake = ingredient.isFractional ? Math.ceil(quantityToTake) : quantityToTake;
        if (invQtyToTake <= 0) continue;

        const updatedInvItem = await tx.inventoryItem.update({
            where: { id: invItem.id },
            data: { quantity: { decrement: invQtyToTake } }
        });

        if (updatedInvItem.quantity < 0) {
            throw new Error(`Stock insuficiente para la materia prima: ${ingredient.name} (carrera de datos)`);
        }

        const newQuantity = updatedInvItem.quantity;
        const status = newQuantity <= 0 ? 'Agotado' : (newQuantity < 10 ? 'Stock Bajo' : 'En Stock');

        if (updatedInvItem.status !== status) {
            await tx.inventoryItem.update({
                where: { id: invItem.id },
                data: { status }
            });
        }

        const currentStockRecords = await tx.inventoryItem.findMany({
            where: { productId: ingredient.id, inventoryType }
        });
        const currentTotal = currentStockRecords.reduce((sum: number, i: any) => sum + i.quantity, 0);
        const previousTotal = currentTotal + invQtyToTake;

        await tx.inventoryMovement.create({
            data: {
                id: generateUUID(),
                timestamp: new Date().toISOString(),
                productName: ingredient.name,
                movementType: 'Salida',
                movementId: transactionId,
                quantityChange: -(ingredient.isFractional ? quantityToTake : invQtyToTake),
                previousQuantity: previousTotal,
                newQuantity: currentTotal,
                userId: userId,
                inventoryType: inventoryType
            } as any
        });

        remaining -= quantityToTake;
    }

    // ENCARGO: solo si el insumo tiene `allowNegativeStock`. Si no lo tiene, la
    // validación de arriba ya abortó la transacción y nunca se llega aquí.
    if (remaining > 0) {
        const encQty = ingredient.isFractional ? Math.ceil(remaining) : remaining;
        const currentRecords = await tx.inventoryItem.findMany({
            where: { productId: ingredient.id, inventoryType }
        });
        const totalBefore = currentRecords.reduce((sum: number, i: any) => sum + i.quantity, 0);

        let target = inventoryItems[inventoryItems.length - 1];
        if (!target) {
            target = await tx.inventoryItem.create({
                data: {
                    id: generateUUID(),
                    productId: ingredient.id,
                    productName: ingredient.name,
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
                productName: ingredient.name,
                movementType: 'Salida',
                movementId: transactionId,
                quantityChange: -remaining,
                previousQuantity: totalBefore,
                newQuantity: totalBefore - remaining,
                userId: userId,
                inventoryType: inventoryType
            } as any
        });
    }
}

export interface SaleDeliveryDetails {
    deliveryType?: 'COUNTER' | 'ROUTE';
    deliveryStatus?: 'PENDIENTE_ENTREGA' | 'EN_RUTA' | 'ENTREGADO' | 'COBRADO';
    deliveryAddress?: string;
    deliveryPhone?: string;
    isPaid?: boolean;
}

export async function createSale(
    items: CartItem[],
    sessionId: string,
    userId: string,
    inventoryType: string,
    totalAmount: number,
    paymentMethod: string,
    customerId?: string,
    financing?: SaleFinancing | null,
    adminAuthorized?: boolean,
    deliveryDetails?: SaleDeliveryDetails
) {
    console.log('--- DEBUG createSale ---');
    console.log('paymentMethod:', paymentMethod);
    console.log('customerId:', customerId);
    console.log('deliveryDetails:', deliveryDetails);
    
    const session = await verifySession();
    if (!session) return { success: false, error: 'Unauthorized' };

    try {
        const isJewelry = await BusinessGuard.isJewelryMode();
        if (isJewelry && !customerId) {
            return { success: false, error: 'El cliente es obligatorio para realizar ventas en modo Joyería.' };
        }

        const transactionId = `TX-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

        // Recetas (BOM): bandera global de configuración. Solo cuando está
        // habilitada y el producto es RECIPE_ITEM se descuentan insumos.
        const sysSettings = await db.systemSettings.findFirst({ select: { enableRecipes: true } });
        const enableRecipes = !!sysSettings?.enableRecipes;

        // Round totalAmount to 2 decimal places to ensure accounting accuracy
        const roundedTotalAmount = Math.round(totalAmount * 100) / 100;

        // Desglose para reproducir el ticket idéntico en reimpresión: el subtotal es la
        // suma de los totales por línea y el impuesto es la diferencia con el total.
        const lineTotals = items.reduce((sum, item) => {
            const unitPrice = typeof item.unitPrice === 'number' && item.unitPrice > 0
                ? item.unitPrice
                : item.product.priceNIO;
            return sum + unitPrice * item.quantity;
        }, 0);
        const roundedSubtotal = Math.round(lineTotals * 100) / 100;
        const roundedTax = Math.round((roundedTotalAmount - roundedSubtotal) * 100) / 100;

        let createdInvoiceNumber = 0;

        const isCobroContraEntrega = paymentMethod === 'Cobro contra entrega' || deliveryDetails?.isPaid === false;
        const isPaid = deliveryDetails?.isPaid !== undefined ? deliveryDetails.isPaid : !isCobroContraEntrega;
        const deliveryType = deliveryDetails?.deliveryType || (isCobroContraEntrega ? 'ROUTE' : 'COUNTER');
        const deliveryStatus = deliveryDetails?.deliveryStatus || (deliveryType === 'ROUTE' ? 'PENDIENTE_ENTREGA' : 'DELIVERED');

        await runStockSafeTransaction(async (tx) => {
            for (const item of items) {
                const variantId = (item.product as any).variantId;
                const parentProductId = (item.product as any).parentProductId || item.product.id;

                const factor = resolvePresentationFactor(item.product, item.presentation, item.presentationName, item.presentationFactor);
                const physicalUnits = item.quantity * factor;

                const productType = (item.product as any).type || 'STANDARD';
                if (enableRecipes && productType === 'RECIPE_ITEM') {
                    const recipeLines = await tx.recipeItem.findMany({
                        where: { productId: parentProductId },
                        include: { ingredient: { select: { id: true, name: true, isFractional: true, allowNegativeStock: true } } }
                    });
                    if (recipeLines.length > 0) {
                        for (const line of recipeLines) {
                            const needed = physicalUnits * line.quantity;
                            await consumeIngredientStock(tx, line.ingredient, needed, transactionId, userId, inventoryType);
                        }
                        continue;
                    }
                }

                if (variantId) {
                    const variantRecord = await tx.productVariant.findUnique({
                        where: { id: variantId },
                        include: { size: true, color: true, product: true }
                    });
                    if (!variantRecord) {
                        throw new Error(`La variante del producto no existe.`);
                    }
                    if (!allowsNegativeStock(variantRecord.product)
                        && physicalUnits > Math.max(0, variantRecord.stock)) {
                        throw new InsufficientStockError(
                            variantRecord.productId || parentProductId,
                            `${variantRecord.product.name} - ${variantRecord.size.name} - ${variantRecord.color.name}`,
                            variantRecord.stock,
                            physicalUnits
                        );
                    }

                    const updatedVariant = await tx.productVariant.update({
                        where: { id: variantId },
                        data: { stock: { decrement: physicalUnits } },
                        include: { size: true, color: true, product: true }
                    });

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

                const inventoryItems = await tx.inventoryItem.findMany({
                    where: {
                        productId: parentProductId,
                        inventoryType: inventoryType
                    },
                    orderBy: { expiryDate: 'asc' }
                });

                const productPolicy = await tx.product.findUnique({
                    where: { id: parentProductId },
                    select: { allowNegativeStock: true }
                });
                const availableForProduct = inventoryItems.reduce((sum: number, i: any) => sum + (i.quantity || 0), 0);
                if (!allowsNegativeStock(productPolicy)
                    && physicalUnits > Math.max(0, availableForProduct)) {
                    throw new InsufficientStockError(
                        parentProductId,
                        item.product.name,
                        availableForProduct,
                        physicalUnits
                    );
                }

                let remainingToSell = physicalUnits;

                for (const invItem of inventoryItems) {
                    if (remainingToSell <= 0) break;
                    if (invItem.quantity <= 0) continue;

                    const quantityToTake = Math.min(invItem.quantity, remainingToSell);
                    const invQtyToTake = item.product.isFractional ? Math.ceil(quantityToTake) : quantityToTake;
                    if (invQtyToTake <= 0) continue;

                    const updatedInvItem = await tx.inventoryItem.update({
                        where: { id: invItem.id },
                        data: {
                            quantity: { decrement: invQtyToTake }
                        }
                    });

                    if (updatedInvItem.quantity < 0) {
                        throw new Error(`Stock insuficiente para el producto: ${item.product.name} (Race condition detected)`);
                    }

                    const newQuantity = updatedInvItem.quantity;
                    const status = newQuantity <= 0 ? 'Agotado' : (newQuantity < 10 ? 'Stock Bajo' : 'En Stock');

                    if (updatedInvItem.status !== status) {
                        await tx.inventoryItem.update({
                            where: { id: invItem.id },
                            data: { status }
                        });
                    }

                    const currentStockRecords = await tx.inventoryItem.findMany({
                        where: { productId: item.product.id, inventoryType: inventoryType }
                    });
                    const currentTotal = currentStockRecords.reduce((sum, i) => sum + i.quantity, 0);
                    const previousTotal = currentTotal + invQtyToTake;

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

            // Create SalesInvoice with Delivery fields
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
                    deliveryType: deliveryType,
                    deliveryStatus: deliveryStatus,
                    deliveryAddress: deliveryDetails?.deliveryAddress || null,
                    deliveryPhone: deliveryDetails?.deliveryPhone || null,
                    isPaid: isPaid,
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
                if (!customerId) throw new Error('El cliente es obligatorio para la venta al crédito');

                const customer = await tx.customer.findUnique({
                    where: { id: customerId },
                    include: {
                        creditInstallment: {
                            where: { status: { in: ['PENDING', 'OVERDUE'] }, dueDate: { lt: new Date() } },
                            select: { id: true },
                        },
                    },
                });
                if (!customer || !customer.hasCredit) throw new Error('El cliente no tiene habilitado el crédito');

                let financedTotal = roundedTotalAmount;
                if (financing && financing.installments > 0) {
                    const interestRate = Number(financing.interestRate) || 0;
                    financedTotal = Math.round((roundedTotalAmount + (roundedTotalAmount * interestRate) / 100) * 100) / 100;
                }

                const overdueCount = customer.creditInstallment?.length || 0;
                const newBalance = customer.currentBalance + financedTotal;
                const exceedsLimit = customer.creditLimit > 0 && newBalance > customer.creditLimit;

                if ((overdueCount > 0 || exceedsLimit) && !adminAuthorized) {
                    const reason = overdueCount > 0
                        ? 'El cliente tiene cuotas vencidas (mora).'
                        : `Límite de crédito excedido. Disponible: C$ ${(customer.creditLimit - customer.currentBalance).toFixed(2)}`;
                    throw new CreditAuthRequiredError(
                        `${reason} Se requiere autorización del Administrador para completar la venta a crédito.`
                    );
                }

                await tx.customer.update({
                    where: { id: customerId },
                    data: { currentBalance: { increment: financedTotal } }
                });

                await tx.salesInvoice.update({
                    where: { id: salesInvoice.id },
                    data: { pendingBalance: { increment: financedTotal } }
                });

                if (financing && financing.installments > 0) {
                    const totalInstallments = Math.max(1, Math.floor(Number(financing.installments) || 1));
                    const interestRate = Number(financing.interestRate) || 0;
                    const totalWithInterest = Math.round((roundedTotalAmount + (roundedTotalAmount * interestRate) / 100) * 100) / 100;
                    const baseAmount = Math.round((totalWithInterest / totalInstallments) * 100) / 100;
                    const periodDays = financing.frequency === 'QUINCENAL' ? 15 : financing.frequency === 'MENSUAL' ? 30 : 7;
                    const baseDate = new Date();

                    await tx.creditInstallment.createMany({
                        data: Array.from({ length: totalInstallments }, (_, i) => ({
                            id: generateUUID(),
                            saleId: salesInvoice.id,
                            customerId,
                            installmentNumber: i + 1,
                            dueDate: new Date(baseDate.getTime() + (i + 1) * periodDays * 24 * 60 * 60 * 1000),
                            amount: i === totalInstallments - 1
                                ? Math.round((totalWithInterest - baseAmount * (totalInstallments - 1)) * 100) / 100
                                : baseAmount,
                            status: 'PENDING'
                        })),
                        skipDuplicates: true
                    });
                }
            }

            // Update Session ONLY if sale is already paid (not pending cash on delivery)
            if (isPaid) {
                const updateData: any = {
                    totalSales: { increment: roundedTotalAmount }
                };

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
            }
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
                description: `Registró una venta por C$${roundedTotalAmount.toFixed(2)} (factura #${createdInvoiceNumber})`,
                metadata: { invoiceNumber: createdInvoiceNumber, totalAmount: roundedTotalAmount, paymentMethod, items: items.length }
            });
        } catch (auditError) {
            console.error('Error recording sale audit:', auditError);
        }

        return { success: true, invoiceNumber: createdInvoiceNumber };
    } catch (error) {
        console.error('Error creating sale:', error);
        if (error instanceof InsufficientStockError) {
            // La transacción ya se revirtió: no hay venta, no hay kardex y el
            // carrito del cajero queda intacto para que corrija las cantidades.
            return {
                success: false,
                error: error.message,
                code: INSUFFICIENT_STOCK_CODE,
                productId: error.productId,
                productName: error.productName,
                available: error.available,
                requested: error.requested,
            };
        }
        if (error instanceof CreditAuthRequiredError) {
            return { success: false, error: error.message, requiresAdmin: true };
        }
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
                    orderBy: { id: 'asc' },
                    // El código (código de barras) alimenta la columna "Código" de la
                    // factura en Hoja Normal; no interviene en el ticket de 80 mm.
                    include: { product: { select: { barcode: true } } }
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
        return { success: false, error: 'Error al obtener la última venta' };
    }
}

export async function confirmDeliveryAndPayment(invoiceId: string, sessionId?: string) {
    const session = await verifySession();
    if (!session) return { success: false, error: 'Unauthorized' };

    try {
        const invoice = await db.salesInvoice.findUnique({
            where: { id: invoiceId },
            include: { customer: true, salesInvoiceItem: true }
        });

        if (!invoice) {
            return { success: false, error: 'Factura no encontrada' };
        }

        const wasUnpaid = !invoice.isPaid;
        let activeSessionId = sessionId || invoice.sessionId;

        // Si la factura no estaba pagada ("Cobro contra entrega"), ingresar el dinero a la caja activa
        if (wasUnpaid) {
            // Buscar la sesión abierta si no se proporcionó una
            if (!activeSessionId) {
                const openSession = await db.cashRegisterSession.findFirst({
                    where: { status: 'OPEN' },
                    orderBy: { openingTime: 'desc' }
                });
                if (openSession) {
                    activeSessionId = openSession.id;
                }
            }

            if (activeSessionId) {
                const isCash = getPaymentBucket(invoice.paymentMethod) === 'cash';
                const isCard = getPaymentBucket(invoice.paymentMethod) === 'card';
                const isUSD = getPaymentBucket(invoice.paymentMethod) === 'usd';

                const sessionUpdate: any = {
                    totalSales: { increment: invoice.totalAmount }
                };

                if (isCard) {
                    sessionUpdate.salesCard = { increment: invoice.totalAmount };
                } else if (isUSD) {
                    sessionUpdate.salesUSD = { increment: invoice.totalAmount };
                } else {
                    sessionUpdate.salesCash = { increment: invoice.totalAmount };
                }

                await db.cashRegisterSession.update({
                    where: { id: activeSessionId },
                    data: sessionUpdate
                });
            }
        }

        const updated = await db.salesInvoice.update({
            where: { id: invoiceId },
            data: {
                isPaid: true,
                deliveryStatus: 'COBRADO',
            }
        });

        revalidatePath('/ruta');
        revalidatePath('/entregas');
        revalidatePath('/delivery-routes');
        revalidatePath('/orders');

        try {
            const actor = await db.user.findUnique({ where: { id: session.userId }, select: { name: true } });
            await recordAudit({
                userId: session.userId,
                userName: actor?.name || 'Usuario',
                action: 'UPDATE',
                entity: 'Sale',
                entityId: `FACTURA-${updated.invoiceNumber}`,
                description: `Confirmó cobro y entrega del pedido #${updated.invoiceNumber} por C$${updated.totalAmount.toFixed(2)}`,
                metadata: { invoiceNumber: updated.invoiceNumber, totalAmount: updated.totalAmount }
            });
        } catch (auditErr) {
            console.error('Audit error:', auditErr);
        }

        return { success: true, data: updated };
    } catch (error) {
        console.error('Error confirming delivery:', error);
        return { success: false, error: 'Error al confirmar cobro y entrega' };
    }
}

export async function updateInvoiceDeliveryStatus(invoiceId: string, deliveryStatus: string) {
    const session = await verifySession();
    if (!session) return { success: false, error: 'Unauthorized' };

    try {
        const updated = await db.salesInvoice.update({
            where: { id: invoiceId },
            data: { deliveryStatus }
        });

        revalidatePath('/ruta');
        revalidatePath('/entregas');
        revalidatePath('/delivery-routes');
        revalidatePath('/orders');

        return { success: true, data: updated };
    } catch (error) {
        console.error('Error updating delivery status:', error);
        return { success: false, error: 'Error al actualizar estado de entrega' };
    }
}

export async function getDeliveryInvoices() {
    const session = await verifySession();
    if (!session) return { success: false, error: 'Unauthorized' };

    try {
        const invoices = await db.salesInvoice.findMany({
            where: {
                OR: [
                    { deliveryType: 'ROUTE' },
                    { deliveryStatus: { in: ['PENDIENTE_ENTREGA', 'EN_RUTA', 'ENTREGADO', 'COBRADO'] } }
                ]
            },
            orderBy: { date: 'desc' },
            include: {
                customer: true,
                user: { select: { name: true } },
                salesInvoiceItem: {
                    include: { product: { select: { barcode: true } } }
                }
            }
        });
        return { success: true, data: invoices };
    } catch (error) {
        console.error('Error fetching delivery invoices:', error);
        return { success: false, error: 'Error al obtener pedidos de ruta' };
    }
}

