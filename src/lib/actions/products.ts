'use server'
import { generateUUID } from '@/lib/uuid';

import db from '../db';
import { Product } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { recordAudit } from './audit';

export async function getProducts(inventoryType?: string) {
    try {
        const where: any = inventoryType ? { inventoryType } : {};
        // Note: For now we return all products. 
        // Filtering by hierarchy often happens on UI or needs recursive query (find products in CAT or CHILDREN).
        // Let's keep it simple: fetching all products is fine for small catalogs, 
        // but for scalability we might want to filter by categoryId.

        const products = await db.product.findMany({
            where,
            orderBy: { name: 'asc' },
            include: {
                categoryRelation: true,
                productVariant: {
                    where: { active: true },
                    include: { size: true, color: true },
                    orderBy: { createdAt: 'asc' }
                }
            }
        });

        const expandedProducts = products.flatMap((product: any) => {
            if (!product.hasVariants) return [product];

            return product.productVariant.map((variant: any) => ({
                ...product,
                id: variant.id,
                parentProductId: product.id,
                variantId: variant.id,
                parentName: product.name,
                name: `${product.name} - ${variant.size?.name || 'N/A'} - ${variant.color?.name || 'N/A'}`,
                barcode: variant.barcode || product.barcode,
                priceNIO: variant.price,
                costPriceNIO: variant.cost,
                size: variant.size?.name || 'N/A',
                color: variant.color?.name || 'N/A',
                stock: variant.stock,
                productVariant: [variant],
            }));
        });

        return { success: true, data: expandedProducts };
    } catch (error) {
        console.error('Error fetching products:', error);
        return { success: false, error: 'Failed to fetch products' };
    }
}

export async function getProductById(id: string) {
    try {
        const product = await db.product.findUnique({
            where: { id }
        });
        return { success: true, data: product };
    } catch (error) {
        console.error('Error fetching product:', error);
        return { success: false, error: 'Failed to fetch product' };
    }
}

export async function createProduct(data: Omit<Product, 'id'> & {
    variantsData?: Array<{
        sizeId: string;
        colorId: string;
        barcode?: string;
        costNIO: number;
        priceNIO: number;
        stock: number;
    }>
}) {
    try {
        // Sanitize data for Prisma
        const { categoryId, updatedAt, variantsData, ...cleanData } = data as any;

        const product = await db.$transaction(async (tx) => {
            const createData: any = {
                ...cleanData,
                id: generateUUID(),
                hasVariants: Boolean(cleanData.hasVariants || variantsData?.length)
            };
            if (categoryId) {
                createData.categoryRelation = { connect: { id: categoryId } };
            }

            const createdProduct = await tx.product.create({ data: createData });

            const validVariants = (variantsData || []).filter((variant: any) => variant.sizeId && variant.colorId);
            if (createData.hasVariants && validVariants.length) {
                await tx.productVariant.createMany({
                    data: validVariants.map((variant: any) => ({
                        id: generateUUID(),
                        productId: createdProduct.id,
                        sizeId: variant.sizeId,
                        colorId: variant.colorId,
                        barcode: variant.barcode || null,
                        cost: Number(variant.costNIO || 0),
                        price: Number(variant.priceNIO || 0),
                        stock: Number(variant.stock || 0),
                    })),
                    skipDuplicates: true,
                });
            }

            return createdProduct;
        });

        // AUDIT
        try {
            await recordAudit({
                userId: "SYSTEM_OR_CURRENT",
                userName: "Administrator",
                action: "CREATE",
                entity: "Product",
                entityId: product.id,
                description: `Creó el producto: ${product.name}`,
                metadata: { name: product.name, inventoryType: (product as any).inventoryType, hasVariants: Boolean((product as any).hasVariants) }
            });
        } catch (auditError) { console.error('Error recording product create audit:', auditError); }

        revalidatePath('/inventory');
        revalidatePath('/pos');
        return { success: true, data: product };
    } catch (error) {
        console.error('Error creating product:', error);
        return { success: false, error: 'Failed to create product' };
    }
}

export async function updateProduct(id: string, data: Partial<Product>) {
    try {
        const { categoryId, updatedAt, ...cleanData } = data as any;
        const updateData: any = { ...cleanData };
        if (categoryId) {
            updateData.categoryRelation = { connect: { id: categoryId } };
        }

        const product = await db.$transaction(async (tx) => {
            const updated = await tx.product.update({
                where: { id },
                data: updateData
            });

            return updated;
        });

        // AUDIT
        try {
            await recordAudit({
                userId: "SYSTEM_OR_CURRENT",
                userName: "Administrator",
                action: "PRICE_CHANGE",
                entity: "Product",
                entityId: product.id,
                description: `Actualizó precios/stock del producto: ${product.name}`,
                metadata: { changed: Object.keys(cleanData), new: { priceNIO: (product as any).priceNIO, costPriceNIO: (product as any).costPriceNIO, stock: (product as any).stock } }
            });
        } catch (auditError) { console.error('Error recording product update audit:', auditError); }

        revalidatePath('/inventory');
        revalidatePath('/pos');
        return { success: true, data: product };
    } catch (error) {
        console.error('Error updating product:', error);
        return { success: false, error: 'Failed to update product' };
    }
}

export async function deleteProduct(id: string) {
    try {
        const existing = await db.product.findUnique({ where: { id } });
        await db.product.delete({
            where: { id }
        });

        // AUDIT
        try {
            await recordAudit({
                userId: "SYSTEM_OR_CURRENT",
                userName: "Administrator",
                action: "DELETE",
                entity: "Product",
                entityId: id,
                description: `Eliminó el producto: ${existing?.name || id}`,
                metadata: { deleted: existing }
            });
        } catch (auditError) { console.error('Error recording product delete audit:', auditError); }

        revalidatePath('/inventory');
        revalidatePath('/pos');
        return { success: true };
    } catch (error) {
        console.error('Error deleting product:', error);
        return { success: false, error: 'Failed to delete product' };
    }
}
