'use server'
import { generateUUID } from '@/lib/uuid';

import db from '../db';
import { PurchaseInvoice } from '@prisma/client';
import { revalidatePath } from 'next/cache';

export async function getPurchaseInvoices() {
    try {
        const invoices = await db.purchaseInvoice.findMany({
            orderBy: { date: 'desc' },
            include: { supplier: true, items: true, accountsPayable: true }
        });
        return { success: true, data: invoices };
    } catch (error) {
        console.error('Error fetching purchase invoices:', error);
        return { success: false, error: 'Failed to fetch purchase invoices' };
    }
}

export async function getPendingInvoicesAlerts(alertDays: number) {
    try {
        const today = new Date();
        const targetDate = new Date();
        targetDate.setDate(today.getDate() + alertDays);

        const invoices = await db.purchaseInvoice.findMany({
            where: {
                status: 'Pendiente',
            },
            include: { supplier: true }
        });

        // Filter those due on or before the target date
        const alerts = invoices.filter(inv => {
            if (!inv.dueDate) return false;
            const due = new Date(inv.dueDate);
            return due <= targetDate;
        });

        return { success: true, data: alerts };
    } catch (error) {
        console.error('Error fetching pending invoice alerts:', error);
        return { success: false, error: 'Failed to fetch alerts' };
    }
}

export async function getPurchaseInvoiceById(id: string) {
    try {
        const invoice = await db.purchaseInvoice.findUnique({
            where: { id },
            include: { supplier: true, items: true, accountsPayable: true }
        });
        return { success: true, data: invoice };
    } catch (error) {
        console.error('Error fetching purchase invoice:', error);
        return { success: false, error: 'Failed to fetch purchase invoice' };
    }
}

export async function createPurchaseInvoice(data: Omit<PurchaseInvoice, 'id'>) {
    try {
        const invoice = await db.purchaseInvoice.create({
            data: { id: generateUUID(), ...data } as any
        });
        revalidatePath('/purchases');
        return { success: true, data: invoice };
    } catch (error) {
        console.error('Error creating purchase invoice:', error);
        return { success: false, error: 'Failed to create purchase invoice' };
    }
}

export async function updatePurchaseInvoice(id: string, data: Partial<PurchaseInvoice>) {
    try {
        const invoice = await db.purchaseInvoice.update({
            where: { id },
            data
        });
        revalidatePath('/purchases');
        return { success: true, data: invoice };
    } catch (error) {
        console.error('Error updating purchase invoice:', error);
        return { success: false, error: 'Failed to update purchase invoice' };
    }
}

export async function deletePurchaseInvoice(id: string) {
    try {
        await db.purchaseInvoice.delete({
            where: { id }
        });
        revalidatePath('/purchases');
        return { success: true };
    } catch (error) {
        console.error('Error deleting purchase invoice:', error);
        return { success: false, error: 'Failed to delete purchase invoice' };
    }
}
export async function createPurchaseInvoiceWithItems(
    invoiceData: Omit<PurchaseInvoice, 'id' | 'subtotal' | 'tax' | 'discount' | 'paymentType' | 'issueDate'> & {
        paymentType?: 'CASH' | 'CREDIT';
        issueDate?: string;
        subtotal?: number | null;
        tax?: number | null;
        discount?: number | null;
    },
    items: Array<{
        productId?: string;
        variantId?: string;
        productName: string;
        barcode: string;
        category: string;
        size?: string;
        color?: string;
        brand?: string;
        costPriceNIO: number;
        priceNIO: number;
        price2?: number;
        price3?: number;
        price4?: number;
        quantity: number;
        batch: string;
        expiryDate: string;
        minStock: number;
        inventoryType: string;
        presentation?: 'unit' | 'box';
        boxUnitsPerBox?: number;
        isFractional?: boolean;
        bulkUnit?: string;
        baseUnit?: string;
    }>,
    userId: string
) {
    try {
        return await db.$transaction(async (tx) => {
            // 1. Create the Invoice (Encabezado)
            const paymentType = invoiceData.paymentType || (invoiceData as any).purchaseType === 'CREDITO' ? 'CREDIT' : 'CASH';
            const invoice = await tx.purchaseInvoice.create({
                data: {
                    id: generateUUID(),
                    supplierId: invoiceData.supplierId,
                    supplierName: invoiceData.supplierName,
                    invoiceNumber: invoiceData.invoiceNumber,
                    date: invoiceData.date,
                    issueDate: invoiceData.issueDate || invoiceData.date,
                    dueDate: invoiceData.dueDate,
                    paymentType: paymentType,
                    subtotal: invoiceData.subtotal ?? undefined,
                    tax: invoiceData.tax ?? undefined,
                    discount: invoiceData.discount ?? undefined,
                    totalAmount: invoiceData.totalAmount,
                    paidAmount: invoiceData.paidAmount,
                    status: invoiceData.status,
                    details: invoiceData.details,
                } as any
            });

// 2. Process each item
            for (const item of items) {
                // Conversión de presentación (Caja/Quintal -> Unidades físicas base).
                // Si el usuario ingresó "10 Cajas" con unitsPerBox=24, se guardan
                // 240 unidades base en el stock / inventario.
                // Para granos básicos: "20 Quintales" con 100 lb por qtl -> 2000 lb.
                const bulkPerBase = (item.boxUnitsPerBox || 1);
                const isBulk = item.presentation === 'box' && bulkPerBase > 1;
                let itemQuantity = item.quantity;
                let itemCostPriceNIO = item.costPriceNIO;
                if (isBulk) {
                    itemQuantity = item.quantity * bulkPerBase;
                    // El costo unitario se divide: el costo ingresado es por presentación
                    // mayor (ej. por quintal), y el Kardex guarda costo por unidad base (lb).
                    if (item.quantity > 0) {
                        itemCostPriceNIO = item.costPriceNIO / bulkPerBase;
                    }
                }
                const normalizedItem = { ...item, quantity: itemQuantity, costPriceNIO: itemCostPriceNIO };

                let productId = normalizedItem.productId;
                let existingProduct = null;

                if (normalizedItem.variantId && productId) {
                    const updatedVariant = await tx.productVariant.update({
                        where: { id: normalizedItem.variantId },
                        data: {
                            stock: { increment: normalizedItem.quantity },
                            cost: normalizedItem.costPriceNIO,
                            price: normalizedItem.priceNIO,
                            barcode: normalizedItem.barcode || undefined,
                        },
                        include: { product: true, size: true, color: true }
                    });

                    await tx.inventoryMovement.create({
                        data: {
                            id: generateUUID(),
                            timestamp: new Date().toISOString(),
                            productName: `${updatedVariant.product.name} - ${updatedVariant.size.name} - ${updatedVariant.color.name}`,
                            movementType: 'Entrada',
                            movementId: `FACTURA-${invoice.invoiceNumber}`,
                            quantityChange: normalizedItem.quantity,
                            previousQuantity: updatedVariant.stock - normalizedItem.quantity,
                            newQuantity: updatedVariant.stock,
                            userId: userId,
                            inventoryType: normalizedItem.inventoryType
                        } as any
                    });

                    continue;
                }

                // Detect if it's a new variant even if productId was provided (e.g. user changed size/color in modal)
                if (productId) {
                    existingProduct = await tx.product.findUnique({ where: { id: productId } });
                    
                    if (existingProduct && (
                        existingProduct.size !== (normalizedItem.size || null) || 
                        existingProduct.color !== (normalizedItem.color || null)
                    )) {
                        productId = undefined; // Force lookup/creation of new variant
                    }
                }

                // If no productId (or it didn't match), find by attributes
                if (!productId) {
                    existingProduct = await tx.product.findFirst({
                        where: {
                            name: normalizedItem.productName.trim(),
                            size: normalizedItem.size || null,
                            color: normalizedItem.color || null,
                            brand: normalizedItem.brand || null,
                            inventoryType: normalizedItem.inventoryType
                        }
                    });

                    if (existingProduct) {
                        productId = existingProduct.id;
                    } else {
                        // Create new product variant
                        // First, try to find a category ID
                        let categoryId = null;
                        if (normalizedItem.category) {
                            const cat = await tx.category.findFirst({
                                where: { name: normalizedItem.category, inventoryType: normalizedItem.inventoryType }
                            });
                            categoryId = cat?.id || null;
                        }

                        const newProduct = await tx.product.create({
                            data: {
                                id: generateUUID(),
                                name: normalizedItem.productName.trim(),
                                priceNIO: normalizedItem.priceNIO,
                                costPriceNIO: normalizedItem.costPriceNIO,
                                category: normalizedItem.category,
                                categoryRelation: categoryId ? { connect: { id: categoryId } } : undefined,
                                inventoryType: normalizedItem.inventoryType,
                                unitOfMeasure: 'unit',
                                minStock: normalizedItem.minStock,
                                barcode: normalizedItem.barcode || null,
                                brand: normalizedItem.brand || null,
                                size: normalizedItem.size || null,
                                color: normalizedItem.color || null,
                                hasBoxOption: Boolean((normalizedItem as any).hasBoxOption) || undefined,
                                unitsPerBox: (normalizedItem as any).unitsPerBox || undefined,
                                boxPrice: (normalizedItem as any).boxPrice || undefined,
                                isFractional: Boolean((normalizedItem as any).isFractional) || undefined,
                                bulkUnit: (normalizedItem as any).bulkUnit || undefined,
                                baseUnit: (normalizedItem as any).baseUnit || undefined,
                                price2: normalizedItem.price2 || null,
                                price3: normalizedItem.price3 || null,
                                price4: normalizedItem.price4 || null,
                            } as any
                        });
                        productId = newProduct.id;
                    }
                }

                if (productId) {
                    // Update existing product prices if they changed
                    await tx.product.update({
                        where: { id: productId },
                        data: {
                            costPriceNIO: normalizedItem.costPriceNIO,
                            priceNIO: normalizedItem.priceNIO,
                            price2: normalizedItem.price2 || null,
                            price3: normalizedItem.price3 || null,
                            price4: normalizedItem.price4 || null,
                        } as any
                    });
                }

                // 3. Consolidar / Crear Inventory Item (Lote)
                // Un lote "genérico" (vacío, N/A o STOCK-INICIAL) no debe duplicar registros:
                // se suma directamente al lote genérico existente del producto.
                const rawBatch = (normalizedItem.batch || '').trim();
                const isGenericBatch = !rawBatch || ['STOCK-INICIAL', 'N/A', 'NA', 'SIN LOTE', 'GENERICO', 'VARIANTE'].includes(rawBatch.toUpperCase());

                let targetItem: any = null;
                if (isGenericBatch) {
                    // Buscar un lote genérico existente entre varios nombres conocidos.
                    targetItem = await tx.inventoryItem.findFirst({
                        where: {
                            productId: productId!,
                            inventoryType: normalizedItem.inventoryType,
                            batch: { in: ['STOCK-INICIAL', 'N/A', 'NA', 'SIN LOTE', 'GENERICO', ''] }
                        }
                    });
                    // Si no hay ninguno, caer en el registro base (busca uno cualquiera de este producto)
                    // para no crear filas repetidas.
                    if (!targetItem) {
                        targetItem = await tx.inventoryItem.findFirst({
                            where: { productId: productId!, inventoryType: normalizedItem.inventoryType }
                        });
                    }
                } else {
                    // Lote específico: buscar ese número de lote para el producto.
                    targetItem = await tx.inventoryItem.findFirst({
                        where: {
                            productId: productId!,
                            inventoryType: normalizedItem.inventoryType,
                            batch: rawBatch
                        }
                    });
                }

                if (targetItem) {
                    // Consolidar: sumar stock sobre el registro existente (nunca reemplazar).
                    const newQuantity = targetItem.quantity + normalizedItem.quantity;
                    const status = newQuantity <= 0 ? 'Agotado' : (newQuantity < (normalizedItem.minStock || 10) ? 'Stock Bajo' : 'En Stock');
                    await tx.inventoryItem.update({
                        where: { id: targetItem.id },
                        data: {
                            quantity: newQuantity,
                            status,
                            expiryDate: normalizedItem.expiryDate || targetItem.expiryDate,
                            barcode: normalizedItem.barcode || targetItem.barcode || undefined,
                        } as any
                    });
                } else {
                    const status = normalizedItem.quantity <= 0 ? 'Agotado' : (normalizedItem.quantity < (normalizedItem.minStock || 10) ? 'Stock Bajo' : 'En Stock');
                    await tx.inventoryItem.create({
                        data: {
                            id: generateUUID(),
                            productId: productId!,
                            productName: normalizedItem.productName,
                            barcode: normalizedItem.barcode || null,
                            inventoryType: normalizedItem.inventoryType,
                            batch: rawBatch || 'STOCK-INICIAL',
                            quantity: normalizedItem.quantity,
                            expiryDate: normalizedItem.expiryDate,
                            status: status
                        } as any
                    });
                }

                // 4. Record Movement (Kardex)
                // Fetch current total stock for this product across all batches for an accurate Kardex
                const currentStockRecords = await tx.inventoryItem.findMany({
                    where: { productId: productId!, inventoryType: normalizedItem.inventoryType }
                });
                // Subtract the item.quantity we just added to get the PREVIOUS total
                const currentTotal = currentStockRecords.reduce((sum, i) => sum + i.quantity, 0);
                const previousTotal = currentTotal - normalizedItem.quantity;

await tx.inventoryMovement.create({
                    data: {
                        id: generateUUID(),
                        timestamp: new Date().toISOString(),
                        productName: normalizedItem.productName,
                        movementType: 'Entrada',
                        movementId: `FACTURA-${invoice.invoiceNumber}`,
                        quantityChange: normalizedItem.quantity,
                        previousQuantity: previousTotal,
                        newQuantity: currentTotal,
                        userId: userId,
                        inventoryType: normalizedItem.inventoryType
                    } as any
                });

                // 5. Guardar el detalle (PurchaseInvoiceItem) con la presentación
                // y las unidades convertidas para inventario físico.
                const presentationLabel =
                    normalizedItem.presentation === 'box'
                        ? (normalizedItem.isFractional ? 'QUINTAL' : 'BOX')
                        : (normalizedItem.isFractional ? 'UNIT' : 'UNIT');
                await tx.purchaseInvoiceItem.create({
                    data: {
                        id: generateUUID(),
                        purchaseInvoiceId: invoice.id,
                        productId: productId || null,
                        productName: normalizedItem.productName,
                        presentation: presentationLabel,
                        quantity: normalizedItem.quantity,
                        unitCost: normalizedItem.costPriceNIO,
                        subtotal: normalizedItem.quantity * normalizedItem.costPriceNIO,
                        unitsConverted: normalizedItem.quantity,
                    } as any
                });
            }

            // 6. Si la compra es a crédito, registrar la cuenta por pagar al proveedor.
            if (paymentType === 'CREDIT' && invoice.totalAmount > 0) {
                const existingAp = await tx.accountsPayable.findUnique({
                    where: { invoiceId: invoice.id },
                });
                if (!existingAp) {
                    await tx.accountsPayable.create({
                        data: {
                            id: generateUUID(),
                            invoiceId: invoice.id,
                            supplierId: invoice.supplierId,
                            amount: invoice.totalAmount,
                            paidAmount: invoice.paidAmount || 0,
                            status: (invoice.paidAmount || 0) >= invoice.totalAmount ? 'PAID' : 'PENDING',
                            dueDate: invoice.dueDate || null,
                        } as any
                    });
                }
            }

            // 7. AUDIT: Registrar el ingreso de la factura de proveedor.
            try {
                const actor = await tx.user.findUnique({ where: { id: userId }, select: { name: true } });
                await tx.auditLog.create({
                    data: {
                        id: generateUUID(),
                        userId,
                        userName: actor?.name || 'Usuario',
                        action: 'CREATE',
                        entity: 'Purchase',
                        entityId: invoice.id,
                        description: `Registró factura de proveedor #${invoice.invoiceNumber || invoice.id} por C$${(invoice.totalAmount || 0).toFixed(2)}`,
                        metadata: JSON.stringify({ invoiceNumber: invoice.invoiceNumber, totalAmount: invoice.totalAmount, items: items.length }),
                    } as any
                });
            } catch (auditError) {
                console.error('Error recording purchase audit:', auditError);
            }

revalidatePath('/purchases');
            revalidatePath('/inventory');
            revalidatePath('/kardex');
            
            return { success: true, data: invoice };
        });
    } catch (error) {
        console.error('Error creating purchase invoice with items:', error);
        return { success: false, error: 'Failed to create purchase invoice with items' };
    }
}

// Registra un abono/pago a una factura de proveedor (Cuentas por Pagar).
export async function recordSupplierPayment(data: {
    invoiceId: string;
    amount: number;
    paymentMethod: string;
    sessionId?: string;
    userId?: string;
    notes?: string;
}) {
    try {
        const amount = Number(data.amount);
        if (!data.invoiceId || !amount || amount <= 0) {
            return { success: false, error: 'Monto o factura inválidos.' };
        }

        const result = await db.$transaction(async (tx) => {
            const invoice = await tx.purchaseInvoice.findUnique({ where: { id: data.invoiceId } });
            if (!invoice) throw new Error('Factura de compra no encontrada');

            const newPaid = (invoice.paidAmount || 0) + amount;
            const remaining = invoice.totalAmount - newPaid;
            const status = remaining <= 0 ? 'Pagada' : (newPaid > 0 ? 'Pagada Parcialmente' : 'Pendiente');

            await tx.purchaseInvoice.update({
                where: { id: invoice.id },
                data: { paidAmount: newPaid, status }
            });

            // Actualizar la cuenta por pagar asociada (saldo + estado).
            const ap = await tx.accountsPayable.findUnique({ where: { invoiceId: invoice.id } });
            if (ap) {
                const apNewPaid = (ap.paidAmount || 0) + amount;
                const apRemaining = ap.amount - apNewPaid;
                await tx.accountsPayable.update({
                    where: { id: ap.id },
                    data: {
                        paidAmount: apNewPaid,
                        status: apRemaining <= 0 ? 'PAID' : 'PENDING',
                    }
                });
            }

            // Si el pago es en efectivo y hay una caja activa, registrar el egreso.
            if (data.sessionId && /efectivo/i.test(data.paymentMethod)) {
                const session = await tx.cashRegisterSession.findUnique({ where: { id: data.sessionId } });
                if (session && session.status === 'open') {
                    await tx.cashOutflow.create({
                        data: {
                            id: generateUUID(),
                            sessionId: session.id,
                            amount,
                            reason: `Pago a proveedor - Factura #${invoice.invoiceNumber}${data.notes ? ` (${data.notes})` : ''}`,
                        } as any
                    });
                }
            }

            return { ...invoice, paidAmount: newPaid, status };
        });

        revalidatePath('/purchases');
        revalidatePath('/dashboard');
        return { success: true, data: result };
    } catch (error: any) {
        console.error('Error recording supplier payment:', error);
        return { success: false, error: error?.message || 'Failed to record supplier payment' };
    }
}
