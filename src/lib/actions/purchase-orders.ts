'use server'
import { generateUUID } from '@/lib/uuid';
// Re-evaluating types

import db from '../db';
import { PurchaseOrder, PurchaseOrderItem } from '@prisma/client';
import { revalidatePath } from 'next/cache';

import { verifySession } from '../session';

export async function getPurchaseOrders() {
    const session = await verifySession();
    if (!session) return { success: false, error: 'Unauthorized' };

    try {
        const orders = await db.purchaseOrder.findMany({
            orderBy: { date: 'desc' },
            include: {
                supplier: true,
                purchaseOrderItem: true
            }
        });
        return { success: true, data: orders };
    } catch (error) {
        console.error('Error fetching purchase orders:', error);
        return { success: false, error: 'Failed to fetch purchase orders' };
    }
}

export async function getPurchaseOrderById(id: string) {
    const session = await verifySession();
    if (!session) return { success: false, error: 'Unauthorized' };

    try {
        const order = await db.purchaseOrder.findUnique({
            where: { id },
            include: {
                supplier: true,
                purchaseOrderItem: true
            }
        });
        return { success: true, data: order };
    } catch (error) {
        console.error('Error fetching purchase order:', error);
        return { success: false, error: 'Failed to fetch purchase order' };
    }
}

export async function createPurchaseOrder(data: {
    supplierId: string;
    date: Date;
    expectedDate?: Date;
    notes?: string;
    paymentType?: string;
    items: {
        productId: string;
        productName: string;
        quantity: number;
        unitCost: number;
    }[]
}) {
    const session = await verifySession();
    if (!session) return { success: false, error: 'Unauthorized' };

    try {
        // Calculate total
        const totalAmount = data.items.reduce((sum, item) => sum + (item.quantity * item.unitCost), 0);

        // Generate Order Number (Simple timestamp based for now, or count)
        const count = await db.purchaseOrder.count();
        const orderNumber = `PO-${new Date().getFullYear()}-${(count + 1).toString().padStart(4, '0')}`;

        const order = await db.purchaseOrder.create({
            data: {
                id: generateUUID(),
                orderNumber,
                supplierId: data.supplierId,
                date: data.date,
                expectedDate: data.expectedDate,
                totalAmount,
                notes: data.notes,
                paymentType: data.paymentType || 'CASH',
                status: 'Pending',
                updatedAt: new Date(),
                purchaseOrderItem: {
                    create: data.items.map(item => ({
                        id: generateUUID(),
                        productId: item.productId,
                        productName: item.productName,
                        quantity: item.quantity,
                        unitCost: item.unitCost,
                        totalCost: item.quantity * item.unitCost
                    }))
                }
            } as any,
            include: {
                purchaseOrderItem: true
            }
        });

        revalidatePath('/purchases');
        revalidatePath('/purchases/orders');
        return { success: true, data: order };
    } catch (error) {
        console.error('Error creating purchase order:', error);
        return { success: false, error: 'Failed to create purchase order' };
    }
}

export async function updatePurchaseOrderStatus(id: string, status: string) {
    const session = await verifySession();
    if (!session) return { success: false, error: 'Unauthorized' };

    try {
        const order = await db.purchaseOrder.update({
            where: { id },
            data: { status }
        });
        revalidatePath('/purchases');
        revalidatePath('/purchases/orders');
        return { success: true, data: order };
    } catch (error) {
        console.error('Error updating purchase order status:', error);
        return { success: false, error: 'Failed to update purchase order status' };
    }
}

export async function receivePurchaseOrder(id: string, items: {
    productId: string;
    quantity: number;
    batch: string;
    expiryDate: string;
}[]) {
    const session = await verifySession();
    if (!session) return { success: false, error: 'Unauthorized' };

    try {
        return await db.$transaction(async (tx) => {
            // 1. Update Order Status
            const order = await tx.purchaseOrder.update({
                where: { id },
                data: { status: 'Received' },
                include: { supplier: true }
            });

            // 2. Process each item
            for (const item of items) {
                // Get product to know inventory type
                const product = await tx.product.findUnique({ where: { id: item.productId } });
                if (!product) throw new Error(`Product not found: ${item.productId}`);

                // Create Inventory Item
                await tx.inventoryItem.create({
                    data: {
                        id: generateUUID(),
                        productId: item.productId,
                        productName: product.name,
                        inventoryType: product.inventoryType,
                        batch: item.batch,
                        quantity: item.quantity,
                        expiryDate: item.expiryDate,
                        status: 'En Stock'
                    } as any
                });

                // Calculate current global stock for this product to set correct previousQuantity
                const currentStock = await tx.inventoryItem.aggregate({
                    _sum: {
                        quantity: true
                    },
                    where: {
                        productId: item.productId
                    }
                });
                const previousQty = currentStock._sum.quantity || 0;

                // Create Movement
                await tx.inventoryMovement.create({
                    data: {
                        id: generateUUID(),
                        timestamp: new Date().toISOString(),
                        productName: product.name,
                        movementType: 'Ingreso',
                        movementId: order.orderNumber,
                        quantityChange: item.quantity,
                        previousQuantity: previousQty,
                        newQuantity: previousQty + item.quantity,
                        userId: session.userId, // Use session user ID
                        inventoryType: product.inventoryType
                    } as any
                });
            }

            // 3. Si la orden es a crédito, generar la cuenta por pagar del proveedor.
            if (order.paymentType === 'CREDIT' && order.totalAmount > 0) {
                const existingInvoice = await tx.purchaseInvoice.findFirst({
                    where: { invoiceNumber: order.orderNumber }
                });
                let invoiceId: string;
                if (existingInvoice) {
                    invoiceId = existingInvoice.id;
                } else {
                    const newInvoice = await tx.purchaseInvoice.create({
                        data: {
                            id: generateUUID(),
                            invoiceNumber: order.orderNumber,
                            supplierId: order.supplierId,
                            supplierName: order.supplier?.name || 'Proveedor',
                            date: new Date().toISOString().slice(0, 10),
                            dueDate: order.expectedDate ? new Date(order.expectedDate).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
                            totalAmount: order.totalAmount,
                            paidAmount: 0,
                            status: 'Pendiente',
                            paymentType: 'CREDIT',
                            details: `Orden de compra ${order.orderNumber}`,
                        } as any
                    });
                    invoiceId = newInvoice.id;
                }

                const existingAp = await tx.accountsPayable.findUnique({ where: { invoiceId } });
                if (!existingAp) {
                    await tx.accountsPayable.create({
                        data: {
                            id: generateUUID(),
                            invoiceId,
                            supplierId: order.supplierId,
                            amount: order.totalAmount,
                            paidAmount: 0,
                            status: 'PENDING',
                            dueDate: order.expectedDate ? new Date(order.expectedDate).toISOString() : null,
                        } as any
                    });
                }
            }

            return { success: true, data: order };
        });
    } catch (error) {
        console.error('Error receiving purchase order:', error);
        return { success: false, error: 'Failed to receive purchase order' };
    }
}

export async function deletePurchaseOrder(id: string) {
    const session = await verifySession();
    if (!session) return { success: false, error: 'Unauthorized' };

    try {
        // Delete items first (cascade should handle this but good to be explicit if needed, 
        // though Prisma cascade delete is usually configured in schema. 
        // Our schema didn't specify onDelete: Cascade, so we might need to delete items manually or update schema.
        // Let's try deleting items first.)

        await db.purchaseOrderItem.deleteMany({
            where: { purchaseOrderId: id }
        });

        await db.purchaseOrder.delete({
            where: { id }
        });

        revalidatePath('/purchases');
        revalidatePath('/purchases/orders');
        return { success: true };
    } catch (error) {
        console.error('Error deleting purchase order:', error);
        return { success: false, error: 'Failed to delete purchase order' };
    }
}
