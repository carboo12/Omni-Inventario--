'use server'
import { generateUUID } from '@/lib/uuid';

import db from '../db';
import { InventoryItem } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { notifyLowStock } from './notifications';
import { verifySession } from '../session';
import { recordAudit } from './audit';

export async function getInventory(inventoryType?: string) {
    const session = await verifySession();
    if (!session) return { success: false, error: 'Unauthorized' };

    try {
        const where = inventoryType ? { inventoryType } : {};
        const inventory = await db.inventoryItem.findMany({
            where,
            include: {
                product: true
            },
            orderBy: { productName: 'asc' }
        });
        return { success: true, data: inventory };
    } catch (error) {
        console.error('Error fetching inventory:', error);
        return { success: false, error: 'Failed to fetch inventory' };
    }
}

export async function getInventoryItemById(id: string) {
    const session = await verifySession();
    if (!session) return { success: false, error: 'Unauthorized' };

    try {
        const item = await db.inventoryItem.findUnique({
            where: { id },
            include: { product: true }
        });
        return { success: true, data: item };
    } catch (error) {
        console.error('Error fetching inventory item:', error);
        return { success: false, error: 'Failed to fetch inventory item' };
    }
}

export async function createInventoryItem(data: Omit<InventoryItem, 'id'>) {
    const session = await verifySession();
    if (!session) return { success: false, error: 'Unauthorized' };

    try {
        const item = await db.inventoryItem.create({
            data: { id: generateUUID(), ...data } as any
        });

        // Registrar la entrada en el Kardex para que el nuevo artículo siempre
        // tenga un movimiento visible (solo cuando representa stock entrante).
        if (typeof item.quantity === 'number' && item.quantity > 0) {
            const currentStockRecords = await db.inventoryItem.findMany({
                where: {
                    productId: item.productId,
                    inventoryType: item.inventoryType || undefined,
                },
            });
            const currentTotal = currentStockRecords.reduce((sum, i) => sum + (i.quantity || 0), 0);
            const previousTotal = currentTotal - item.quantity;

            await db.inventoryMovement.create({
                data: {
                    id: generateUUID(),
                    timestamp: new Date().toISOString(),
                    productName: item.productName,
                    movementType: 'Entrada',
                    movementId: `AJUSTE-${item.id.slice(0, 8)}`,
                    quantityChange: item.quantity,
                    previousQuantity: previousTotal,
                    newQuantity: currentTotal,
                    userId: session.userId,
                    inventoryType: item.inventoryType || 'general',
                } as any
            });
        }

        // AUDIT
        try {
            const actor = await db.user.findUnique({ where: { id: session.userId }, select: { name: true } });
            await recordAudit({
                userId: session.userId,
                userName: actor?.name || 'Usuario',
                action: 'CREATE',
                entity: 'Inventory',
                entityId: item.id,
                description: `Añadió el artículo de inventario: ${item.productName}${item.batch ? ` (lote ${item.batch})` : ''}`,
                metadata: { productName: item.productName, quantity: item.quantity, batch: item.batch, inventoryType: item.inventoryType }
            });
        } catch (auditError) { console.error('Error recording inventory create audit:', auditError); }

        revalidatePath('/inventory');
        revalidatePath('/pos');
        revalidatePath('/kardex');
        return { success: true, data: item };
    } catch (error) {
        console.error('Error creating inventory item:', error);
        return {
            success: false,
            error: 'Failed to create inventory item',
            details: error instanceof Error ? error.message : String(error)
        };
    }
}

export async function updateInventoryItem(id: string, data: Partial<InventoryItem>) {
    const session = await verifySession();
    if (!session) return { success: false, error: 'Unauthorized' };

    try {
        const variant = await db.productVariant.findUnique({ where: { id } });
        if (variant) {
            const previousStock = variant.stock;
            await db.productVariant.update({
                where: { id },
                data: {
                    stock: typeof data.quantity === 'number' ? data.quantity : undefined,
                    barcode: data.barcode || undefined,
                }
            });

            // AUDIT
            try {
                const actor = await db.user.findUnique({ where: { id: session.userId }, select: { name: true } });
                await recordAudit({
                    userId: session.userId,
                    userName: actor?.name || 'Usuario',
                    action: 'UPDATE',
                    entity: 'InventoryVariant',
                    entityId: id,
                    description: `Ajustó el stock de una variante de ${previousStock ?? 'N/A'} a ${data.quantity ?? previousStock}`,
                    metadata: { previousStock, newStock: data.quantity ?? previousStock }
                });
            } catch (auditError) { console.error('Error recording variant audit:', auditError); }

            revalidatePath('/inventory');
            revalidatePath('/pos');
            return { success: true };
        }

        const item = await db.inventoryItem.update({
            where: { id },
            data
        });

        // AUDIT
        try {
            const actor = await db.user.findUnique({ where: { id: session.userId }, select: { name: true } });
            await recordAudit({
                userId: session.userId,
                userName: actor?.name || 'Usuario',
                action: 'UPDATE',
                entity: 'Inventory',
                entityId: id,
                description: `Modificó el artículo de inventario: ${item.productName}`,
                metadata: { productName: item.productName, quantity: item.quantity, updated: Object.keys(data) }
            });
        } catch (auditError) { console.error('Error recording inventory update audit:', auditError); }

        revalidatePath('/inventory');
        revalidatePath('/pos');
        return { success: true };
    } catch (error) {
        console.error('Error updating inventory item:', error);
        return { success: false, error: 'Failed to update inventory item' };
    }
}

export async function updateInventoryQuantity(id: string, quantityChange: number) {
    const session = await verifySession();
    if (!session) return { success: false, error: 'Unauthorized' };

    try {
        // Use atomic increment (or decrement if negative)
        // Prisma increment adds the value, so if quantityChange is negative, it subtracts.
        const updatedItem = await db.inventoryItem.update({
            where: { id },
            data: {
                quantity: {
                    increment: quantityChange
                }
            }
        });

        // Determine new status based on the ATOMICALLY updated quantity
        const newQuantity = updatedItem.quantity;
        const status = newQuantity <= 0 ? 'Agotado' : (newQuantity < 10 ? 'Stock Bajo' : 'En Stock');

        // Update status if it changed (this is a second write, but the critical quantity update is already safe)
        if (updatedItem.status !== status) {
            await db.inventoryItem.update({
                where: { id },
                data: { status }
            });
        }

        if (status === 'Stock Bajo' || status === 'Agotado') {
            await notifyLowStock(updatedItem.productName);
        }

        // AUDIT
        try {
            const actor = await db.user.findUnique({ where: { id: session.userId }, select: { name: true } });
            await recordAudit({
                userId: session.userId,
                userName: actor?.name || 'Usuario',
                action: 'UPDATE',
                entity: 'Inventory',
                entityId: id,
                description: `Ajustó manualmente el stock de ${updatedItem.productName} en ${quantityChange > 0 ? '+' : ''}${quantityChange}`,
                metadata: { quantityChange, newQuantity }
            });
        } catch (auditError) { console.error('Error recording inventory qty audit:', auditError); }

        revalidatePath('/inventory');
        revalidatePath('/pos');
        return { success: true, data: { ...updatedItem, status } };
    } catch (error) {
        console.error('Error updating inventory quantity:', error);
        return { success: false, error: 'Failed to update inventory quantity' };
    }
}

export async function createInventoryMovement(data: {
    productId: string;
    productName: string;
    movementType: 'Salida' | 'Devolución' | 'Entrada' | 'Ajuste';
    quantityChange: number;
    previousQuantity: number;
    newQuantity: number;
    user: string;
    inventoryType: string;
    movementId?: string;
}) {
    const session = await verifySession();
    if (!session) return { success: false, error: 'Unauthorized' };

    try {
        const movement = await db.inventoryMovement.create({
            data: {
                id: generateUUID(),
                timestamp: new Date().toISOString(),
                productName: data.productName,
                movementType: data.movementType,
                movementId: data.movementId || 'MANUAL-' + Date.now(),
                quantityChange: data.quantityChange,
                previousQuantity: data.previousQuantity,
                newQuantity: data.newQuantity,
                userId: data.user,
                inventoryType: data.inventoryType
            } as any
        });
        return { success: true, data: movement };
    } catch (error) {
        console.error('Error creating inventory movement:', error);
        return { success: false, error: 'Failed to create inventory movement' };
    }
}

export async function getInventoryMovements() {
    const session = await verifySession();
    if (!session) return { success: false, error: 'Unauthorized' };

    try {
        const movements = await db.inventoryMovement.findMany({
            include: {
                user: {
                    select: {
                        name: true,
                        role: true
                    }
                }
            },
            orderBy: {
                timestamp: 'desc'
            },
            take: 100
        });
        return { success: true, data: movements };
    } catch (error) {
        console.error('Error fetching inventory movements:', error);
        return { success: false, error: 'Failed to fetch inventory movements' };
    }
}

export async function bulkImportInventory(
    data: Array<{
        productName: string;
        barcode?: string;
        category: string;
        priceNIO: number;
        costPriceNIO: number;
        minStock: number;
        unitOfMeasure: 'unit' | 'bulk' | 'box' | 'blister';
        inventoryType: 'pharmacy' | 'general' | 'jewelry';
        batch: string;
        quantity: number;
        expiryDate: string;
        brand?: string;
        size?: string;
        color?: string;
        gender?: string;
        subCategory?: string;
        price2?: number;
        price3?: number;
        price4?: number;
        baseUnit?: string;
        bulkUnit?: string;
        unitsPerBox?: number;
        isFractional?: boolean;
        hasBoxOption?: boolean;
    }>,
    mode: 'create' | 'update' = 'create',
    fileName?: string,
    userId?: string
) {
    const session = await verifySession();
    if (!session) return { success: false, error: 'Unauthorized' };

    try {
        const results = {
            productsCreated: 0,
            productsUpdated: 0,
            inventoryItemsCreated: 0,
            errors: [] as string[]
        };

        const settings = await db.systemSettings.findFirst();
        const exchangeRate = settings?.exchangeRate ? parseFloat(settings.exchangeRate) : 36.5;
        const importInDollars = settings?.importProductsInDollars === true;
        const priceMultiplier = importInDollars ? exchangeRate : 1;

        // Process each item
        for (const item of data) {
            try {
                // 1. Handle Category Hierarchy
                let categoryId: string | null = null;
                if (item.category) {
                    // Find or create parent category
                    let parentCat = await db.category.findFirst({
                        where: { 
                            name: item.category,
                            inventoryType: item.inventoryType,
                            parentId: null
                        }
                    });

                    if (!parentCat) {
                        parentCat = await db.category.create({
                            data: {
                                id: generateUUID(),
                                name: item.category,
                                inventoryType: item.inventoryType,
                                updatedAt: new Date(),
                                description: `Creado durante importación de ${item.inventoryType}`
                            } as any
                        });
                    }

                    categoryId = parentCat.id;

                    // Handle Subcategory if provided
                    if (item.subCategory) {
                        let subCat = await db.category.findFirst({
                            where: {
                                name: item.subCategory,
                                parentId: parentCat.id
                            }
                        });

                        if (!subCat) {
                            subCat = await db.category.create({
                                data: {
                                    id: generateUUID(),
                                    name: item.subCategory,
                                    inventoryType: item.inventoryType,
                                    parentId: parentCat.id,
                                    updatedAt: new Date(),
                                    description: `Subcategoría de ${item.category}`
                                } as any
                            });
                        }
                        categoryId = subCat.id;
                    }
                }

                // 2. Check if product exists — for Boutique, a "product" is uniquely identified
                //    by name + size + color (same garment in different sizes/colors = different SKUs)
                const productWhere: any = {
                    name: item.productName.trim(),
                };

                // Normalize size and color: treat empty string or 'NINGUNO' as null
                const normalizedSize = (item.size && item.size.trim() && item.size.trim().toUpperCase() !== 'NINGUNO')
                    ? item.size.trim() : null;
                const normalizedColor = (item.color && item.color.trim() && item.color.trim().toUpperCase() !== 'NINGUNO')
                    ? item.color.trim() : null;

                // For boutique/retail items that carry size or color attributes,
                // include them in the lookup key so each variant gets its own record.
                if (normalizedSize) {
                    productWhere.size = normalizedSize;
                }
                if (normalizedColor) {
                    productWhere.color = normalizedColor;
                }

                const finalPriceNIO = item.priceNIO * priceMultiplier;
                const finalCostPriceNIO = item.costPriceNIO * priceMultiplier;

                const shouldUseVariantStock = item.inventoryType === 'general' && (!!normalizedSize || !!normalizedColor);

                if (shouldUseVariantStock) {
                    const sizeName = normalizedSize || 'UNICA';
                    const colorName = normalizedColor || 'UNICO';

                    const [size, color] = await Promise.all([
                        db.size.upsert({
                            where: { name: sizeName.toUpperCase() },
                            create: { id: generateUUID(), name: sizeName.toUpperCase(), order: 0 },
                            update: { active: true }
                        }),
                        db.color.upsert({
                            where: { name: colorName.toUpperCase() },
                            create: { id: generateUUID(), name: colorName.toUpperCase() },
                            update: { active: true }
                        })
                    ]);

                    let product = await db.product.findFirst({
                        where: {
                            name: item.productName.trim(),
                            brand: item.brand || null,
                            category: item.subCategory ? `${item.category} > ${item.subCategory}` : item.category,
                            inventoryType: item.inventoryType,
                            hasVariants: true
                        }
                    });

if (!product) {
                        product = await db.product.create({
                            data: {
                                id: generateUUID(),
                                name: item.productName.trim(),
                                priceNIO: finalPriceNIO,
                                costPriceNIO: finalCostPriceNIO,
                                category: item.subCategory ? `${item.category} > ${item.subCategory}` : item.category,
                                inventoryType: item.inventoryType,
                                unitOfMeasure: item.unitOfMeasure,
                                minStock: item.minStock,
                                barcode: null,
                                imageUrl: null,
                                imageHint: null,
                                brand: item.brand || null,
                                gender: item.gender || null,
                                hasVariants: true,
                                categoryRelation: categoryId ? { connect: { id: categoryId } } : undefined,
                                purchaseCurrency: importInDollars ? 'USD' : 'NIO',
                                originalPrice: item.priceNIO,
                                price2: item.price2 || undefined,
                                price3: item.price3 || undefined,
                                price4: item.price4 || undefined,
                                baseUnit: item.baseUnit || undefined,
                                bulkUnit: item.bulkUnit || undefined,
                                unitsPerBox: item.unitsPerBox || undefined,
                                hasBoxOption: item.hasBoxOption || undefined,
                                isFractional: item.isFractional || undefined,
                            } as any
                        });
                        results.productsCreated++;
                    } else if (mode === 'update') {
                        await db.product.update({
                            where: { id: product.id },
                            data: {
                                priceNIO: finalPriceNIO,
                                costPriceNIO: finalCostPriceNIO,
                                minStock: item.minStock,
                                brand: item.brand || (product as any).brand,
                                gender: item.gender || (product as any).gender,
                                categoryId: categoryId || (product as any).categoryId,
                                price2: item.price2 || (product as any).price2,
                                price3: item.price3 || (product as any).price3,
                                price4: item.price4 || (product as any).price4,
                                baseUnit: item.baseUnit || (product as any).baseUnit,
                                bulkUnit: item.bulkUnit || (product as any).bulkUnit,
                                unitsPerBox: item.unitsPerBox || (product as any).unitsPerBox,
                                hasBoxOption: item.hasBoxOption !== undefined ? item.hasBoxOption : (product as any).hasBoxOption,
                                isFractional: item.isFractional !== undefined ? item.isFractional : (product as any).isFractional,
                            } as any
                        });
                        results.productsUpdated++;
                    }

                    const existingVariant = await db.productVariant.findUnique({
                        where: {
                            productId_sizeId_colorId: {
                                productId: product.id,
                                sizeId: size.id,
                                colorId: color.id
                            }
                        }
                    });

                    const previousStock = existingVariant?.stock || 0;
                    const variant = existingVariant
                        ? await db.productVariant.update({
                            where: { id: existingVariant.id },
                            data: {
                                barcode: item.barcode || existingVariant.barcode,
                                cost: finalCostPriceNIO,
                                price: finalPriceNIO,
                                stock: mode === 'update' ? item.quantity : { increment: item.quantity },
                                active: true
                            } as any
                        })
                        : await db.productVariant.create({
                            data: {
                                id: generateUUID(),
                                productId: product.id,
                                sizeId: size.id,
                                colorId: color.id,
                                barcode: item.barcode || null,
                                cost: finalCostPriceNIO,
                                price: finalPriceNIO,
                                stock: item.quantity,
                                active: true
                            }
                        });

                    results.inventoryItemsCreated++;

                    if (item.quantity > 0 || mode === 'update') {
                        await db.inventoryMovement.create({
                            data: {
                                id: generateUUID(),
                                timestamp: new Date().toISOString(),
                                productName: `${product.name} - ${size.name} - ${color.name}`,
                                movementType: mode === 'update' ? 'Ajuste' : 'Entrada',
                                movementId: `IMPORT-${Date.now()}-${results.inventoryItemsCreated}`,
                                quantityChange: mode === 'update' ? variant.stock - previousStock : item.quantity,
                                previousQuantity: previousStock,
                                newQuantity: variant.stock,
                                userId: userId || session.userId,
                                inventoryType: item.inventoryType
                            } as any
                        });
                    }

                    continue;
                }

                let product = await db.product.findFirst({
                    where: productWhere
                });

                // 3. Create or update product
if (!product) {
                    product = await db.product.create({
                        data: {
                            id: generateUUID(),
                            name: item.productName.trim(),
                            priceNIO: finalPriceNIO,
                            costPriceNIO: finalCostPriceNIO,
                            category: item.subCategory ? `${item.category} > ${item.subCategory}` : item.category,
                            inventoryType: item.inventoryType,
                            unitOfMeasure: item.unitOfMeasure,
                            minStock: item.minStock,
                            barcode: item.barcode || null,
                            imageUrl: null,
                            imageHint: null,
                            brand: item.brand || null,
                            size: normalizedSize,
                            color: normalizedColor,
                            gender: item.gender || null,
                            categoryRelation: categoryId ? { connect: { id: categoryId } } : undefined,
                            purchaseCurrency: importInDollars ? 'USD' : 'NIO',
                            originalPrice: item.priceNIO,
                            price2: item.price2 || undefined,
                            price3: item.price3 || undefined,
                            price4: item.price4 || undefined,
                            baseUnit: item.baseUnit || undefined,
                            bulkUnit: item.bulkUnit || undefined,
                            unitsPerBox: item.unitsPerBox || undefined,
                            hasBoxOption: item.hasBoxOption || undefined,
                            isFractional: item.isFractional || undefined,
                        } as any
                    });
                    results.productsCreated++;
                } else if (mode === 'update') {
                    // Update existing product
                    await db.product.update({
                        where: { id: product.id },
                        data: {
                            priceNIO: finalPriceNIO,
                            costPriceNIO: finalCostPriceNIO,
                            category: item.subCategory ? `${item.category} > ${item.subCategory}` : item.category,
                            minStock: item.minStock,
                            barcode: item.barcode || product.barcode,
                            brand: item.brand || (product as any).brand,
                            size: normalizedSize || (product as any).size,
                            color: normalizedColor || (product as any).color,
                            gender: item.gender || (product as any).gender,
                            categoryId: categoryId || (product as any).categoryId,
                            price2: item.price2 || (product as any).price2,
                            price3: item.price3 || (product as any).price3,
                            price4: item.price4 || (product as any).price4,
                            baseUnit: item.baseUnit || (product as any).baseUnit,
                            bulkUnit: item.bulkUnit || (product as any).bulkUnit,
                            unitsPerBox: item.unitsPerBox || (product as any).unitsPerBox,
                            hasBoxOption: item.hasBoxOption !== undefined ? item.hasBoxOption : (product as any).hasBoxOption,
                            isFractional: item.isFractional !== undefined ? item.isFractional : (product as any).isFractional,
                        } as any
                    });
                    results.productsUpdated++;
                }

                // Determine status
                let status: 'En Stock' | 'Stock Bajo' | 'Agotado' = 'En Stock';
                if (item.quantity === 0) {
                    status = 'Agotado';
                } else if (item.quantity < item.minStock) {
                    status = 'Stock Bajo';
                }

                // Create inventory item
                const invItem = await db.inventoryItem.create({
                    data: {
                        id: generateUUID(),
                        productId: product.id,
                        productName: item.productName,
                        barcode: item.barcode || null,
                        inventoryType: item.inventoryType,
                        batch: item.batch,
                        quantity: item.quantity,
                        expiryDate: item.expiryDate,
                        status: status
                    } as any
                });
                results.inventoryItemsCreated++;

                // Record the movement (Kardex)
                if (item.quantity > 0) {
                    // For accurate Kardex in import, we assume item.quantity is the NEW total for this batch, 
                    // but we should check if there are other batches of the SAME product already.
                    const currentStockRecords = await db.inventoryItem.findMany({
                        where: { productId: product.id }
                    });
                    const currentTotal = currentStockRecords.reduce((sum, i) => sum + i.quantity, 0);
                    const previousTotal = currentTotal - item.quantity;

                    await db.inventoryMovement.create({
                        data: {
                            id: generateUUID(),
                            timestamp: new Date().toISOString(),
                            productName: item.productName,
                            movementType: 'Entrada',
                            movementId: `IMPORT-${Date.now()}-${results.inventoryItemsCreated}`,
                            quantityChange: item.quantity,
                            previousQuantity: previousTotal,
                            newQuantity: currentTotal,
                            userId: userId || session.userId,
                            inventoryType: item.inventoryType
                        } as any
                    });
                }

            } catch (itemError) {
                console.error(`Error processing item ${item.productName}:`, itemError);
                results.errors.push(`Error en ${item.productName}: ${itemError instanceof Error ? itemError.message : 'Error desconocido'}`);
            }
        }
        // Save import history if userId is provided
        if (userId) {
            try {
                await db.importHistory.create({
                    data: {
                        id: generateUUID(),
                        fileName: fileName || 'import.xlsx',
                        importedBy: userId,
                        mode,
                        totalRows: data.length,
                        successfulRows: data.length - results.errors.length,
                        failedRows: results.errors.length,
                        productsCreated: results.productsCreated,
                        productsUpdated: results.productsUpdated,
                        inventoryItemsCreated: results.inventoryItemsCreated,
                        errors: JSON.stringify(results.errors),
                        summary: JSON.stringify({
                            timestamp: new Date().toISOString(),
                            mode,
                            stats: results
                        })
                    } as any
                });
            } catch (historyError) {
                console.error('Error saving import history:', historyError);
                // Don't fail the import if history saving fails
            }
        }

        revalidatePath('/inventory');
        revalidatePath('/pos');
        revalidatePath('/kardex');
        revalidatePath('/inventory/import-history');

        return { success: true, data: results };
    } catch (error) {
        console.error('Error in bulk import:', error);
        return { success: false, error: 'Failed to import inventory' };
    }
}
