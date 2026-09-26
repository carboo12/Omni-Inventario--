import type { InventoryItem } from '@/lib/types';

export type StockStatus = InventoryItem['status'];

/** Punto de reorden usado cuando el producto no define `minStock`. */
export const DEFAULT_MIN_STOCK = 10;

/**
 * Regla ÚNICA de estado de existencias.
 *
 * La comparten la métrica "Stock Bajo" del Dashboard y el filtro/badge de la
 * tabla de Inventario, de modo que ambas pantallas coincidan exactamente:
 *
 *   cantidad <= 0        -> Agotado     (badge rojo)
 *   cantidad <= minStock -> Stock Bajo  (badge azul)
 *   cantidad >  minStock -> En Stock    (badge verde/gris)
 *
 * Equivale a la consulta unificada:
 *   where: { OR: [ { stock: { lte: minStock } }, { stock: { lte: 0 } } ] }
 *
 * IMPORTANTE: el total a comparar es el del PRODUCTO (suma de todos sus
 * lotes), nunca el de un lote individual.
 */
export function resolveStockStatus(
    quantity: number | null | undefined,
    minStock?: number | null
): StockStatus {
    const qty = Number(quantity) || 0;
    const rawMin = Number(minStock);
    // `minStock` en 0 o nulo se trata como "sin punto de reorden definido".
    const min = Number.isFinite(rawMin) && rawMin > 0 ? rawMin : DEFAULT_MIN_STOCK;

    if (qty <= 0) return 'Agotado';
    if (qty <= min) return 'Stock Bajo';
    return 'En Stock';
}

/** Un producto requiere reabastecimiento si está agotado o en/bajo su punto de reorden. */
export function isLowStock(
    quantity: number | null | undefined,
    minStock?: number | null
): boolean {
    return resolveStockStatus(quantity, minStock) !== 'En Stock';
}

/**
 * Definición ESTRICTA de lote/producto agotado: cantidad <= 0.
 *
 * Cubre tanto el cero exacto como los saldos negativos (ventas bajo encargo o
 * ajustes), que antes se colaban en la tabla porque solo se comparaba con `=== 0`.
 */
export function isOutOfStock(quantity: number | null | undefined): boolean {
    return (Number(quantity) || 0) <= 0;
}

/**
 * ¿Debe ocultarse esta fila mientras el switch "Mostrar lotes agotados" esté
 * apagado?
 *
 * Se evalúa sobre la FILA visible de la tabla, que puede ser un lote individual
 * o un grupo/consolidado de varios lotes. Por eso se miran las dos cosas:
 *
 *  - la cantidad mostrada (`quantity` / `totalQuantity`), que es la suma de los
 *    lotes del grupo, y
 *  - el `status`, que la tabla de Inventario ya calcula sobre el stock TOTAL del
 *    producto. Sin esto, un producto con lotes `+5` y `-8` se consolidaba en una
 *    fila de `-3` (badge "Agotado") que se colaba en pantalla aunque ningún lote
 *    individual fuera `<= 0`.
 */
export function isOutOfStockRow(row: {
    quantity?: number | null;
    totalQuantity?: number | null;
    status?: string | null;
}): boolean {
    const shown = row.totalQuantity !== undefined && row.totalQuantity !== null
        ? row.totalQuantity
        : row.quantity;
    if (isOutOfStock(shown)) return true;
    return row.status === 'Agotado';
}
