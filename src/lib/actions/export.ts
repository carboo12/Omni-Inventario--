'use server'

import db from '../db';
import { revalidatePath } from 'next/cache';

export async function exportInventoryToExcel() {
    try {
        // Get all inventory items with their products
        const inventory = await db.inventoryItem.findMany({
            include: {
                product: true
            },
            orderBy: {
                productName: 'asc'
            }
        });

        // Transform data to Excel format
        const excelData = inventory.map(item => ({
            'Nombre del Producto': item.productName,
            'Código de Barras': item.barcode || '',
            'Categoría': item.product.category,
            'Precio de Venta (C$)': item.product.priceNIO,
            'Precio de Costo (C$)': item.product.costPriceNIO || 0,
            'Stock Mínimo': item.product.minStock || 50,
            'Unidad de Medida': item.product.unitOfMeasure,
            'Tipo de Inventario': item.inventoryType,
            'Lote': item.batch,
            'Cantidad': item.quantity,
            'Fecha de Vencimiento': item.expiryDate
        }));

        return {
            success: true,
            data: excelData
        };
    } catch (error) {
        console.error('Error exporting inventory:', error);
        return {
            success: false,
            error: 'Failed to export inventory'
        };
    }
}
