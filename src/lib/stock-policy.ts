/**
 * Política de stock compartida entre el POS (frontend) y `createSale` (backend).
 *
 * Regla: una venta NUNCA puede dejar el inventario en negativo, salvo que el
 * producto tenga `allowNegativeStock = true` (venta bajo encargo / entrega
 * pendiente). Cuando el producto no lo tiene, la venta se bloquea.
 *
 * El stock a comparar es el del PRODUCTO (o el de la VARIANTE), sumando todos
 * sus lotes; nunca el de un lote individual.
 */

/** Mensaje para un producto sin existencias. */
export const NO_STOCK_MESSAGE = 'Producto sin existencias disponibles';

/** Código de error que devuelve el backend ante stock insuficiente. */
export const INSUFFICIENT_STOCK_CODE = 'INSUFFICIENT_STOCK';

/** Error de stock insuficiente. El backend lo serializa como `code`. */
export class InsufficientStockError extends Error {
    readonly code = INSUFFICIENT_STOCK_CODE;
    readonly productId: string;
    readonly productName: string;
    readonly available: number;
    readonly requested: number;

    constructor(productId: string, productName: string, available: number, requested: number) {
        super(buildInsufficientStockMessage(productName, available, requested));
        this.name = 'InsufficientStockError';
        this.productId = productId;
        this.productName = productName;
        this.available = available;
        this.requested = requested;
    }
}

/** Existencias disponibles declaradas en el objeto de producto. */
export function getProductStock(product: any): number {
    const stock = product?.stock;
    return typeof stock === 'number' && Number.isFinite(stock) ? stock : 0;
}

/** `true` solo si el producto fue marcado explícitamente para venta bajo encargo. */
export function allowsNegativeStock(product: any): boolean {
    return product?.allowNegativeStock === true;
}

/** Mensaje de stock insuficiente con la existencia máxima real. */
export function buildInsufficientStockMessage(productName: string, available: number, requested: number): string {
    const max = Math.max(0, available);
    return `Stock insuficiente para "${productName}". Existencia máxima disponible: ${formatUnits(max)} (solicitado: ${formatUnits(requested)}).`;
}

/** Mensaje de producto agotado. */
export function buildNoStockMessage(): string {
    return NO_STOCK_MESSAGE;
}

function formatUnits(value: number): string {
    const rounded = Math.round((Number(value) || 0) * 100) / 100;
    return `${rounded} unidades`;
}

/**
 * Mayor cantidad que se puede vender sin dejar el stock en negativo.
 * Con `allowNegativeStock` no hay tope (devuelve Infinity).
 */
export function getMaxSellableQuantity(available: number, allowNegative: boolean): number {
    return allowNegative ? Number.POSITIVE_INFINITY : Math.max(0, available);
}

/**
 * Limita la cantidad solicitada a la existencia disponible:
 * `Math.min(solicitado, disponible)`. Si el producto permite stock negativo
 * devuelve la cantidad solicitada sin cambios.
 */
export function clampQuantityToStock(requested: number, available: number, allowNegative: boolean): number {
    const qty = Math.max(0, Number.isFinite(requested) ? requested : 0);
    if (allowNegative) return qty;
    return Math.min(qty, Math.max(0, available));
}

/** Una línea de carrito evaluada contra el stock. */
export type StockCheckLine = {
    productId: string;
    productName: string;
    /** Cantidad en unidades físicas (cantidad vendida × factor de presentación). */
    physicalUnits: number;
    /** Existencia total disponible del producto. */
    available: number;
    /** Si el producto permite stock negativo (venta bajo encargo). */
    allowNegative: boolean;
};

/** Incumplimiento detectado para una línea del carrito. */
export type StockIssue = {
    productId: string;
    productName: string;
    requested: number;
    available: number;
    message: string;
};

/**
 * Devuelve las líneas que exceden las existencias. Las que tienen
 * `allowNegativeStock` quedan excluidas: la venta bajo encargo sí las admite,
 * pero el POS debe pedir confirmación explícita al cajero.
 */
export function findStockIssues(lines: StockCheckLine[]): StockIssue[] {
    const issues: StockIssue[] = [];
    for (const line of lines) {
        if (line.allowNegative) continue;
        const available = Math.max(0, Number(line.available) || 0);
        const requested = Math.max(0, Number(line.physicalUnits) || 0);
        if (requested <= available) continue;
        issues.push({
            productId: line.productId,
            productName: line.productName,
            requested,
            available,
            message: available <= 0
                ? buildNoStockMessage()
                : buildInsufficientStockMessage(line.productName, available, requested),
        });
    }
    return issues;
}

/** `true` si la línea necesita confirmación por venta bajo encargo. */
export function requiresEncargoConfirmation(line: StockCheckLine): boolean {
    if (!line.allowNegative) return false;
    return Math.max(0, Number(line.physicalUnits) || 0) > Math.max(0, Number(line.available) || 0);
}
