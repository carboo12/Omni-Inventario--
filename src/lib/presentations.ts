import type { Product } from './types';

export interface BulkPresentationOption {
    /** Clave estable de la presentación ('bulk', 'bulk2', 'bulk3' o 'box' legado). */
    key: string;
    /** Nombre legible (ej. Caja, Ristra). */
    name: string;
    /** Factor de equivalencia en unidades base (ej. Caja = 12). */
    factor: number;
}

/**
 * Presentaciones fijas disponibles para un producto: la Presentación 1 (Venta
 * Fraccionada / Al Mayor) + las opcionales 2 y 3 (bulkUnit2/3), más la caja
 * legada (hasBoxOption/unitsPerBox) por compatibilidad con datos existentes.
 * Solo se incluyen opciones con datos válidos (nombre y factor > 0).
 */
export const getBulkPresentationOptions = (product: Product | null): BulkPresentationOption[] => {
    if (!product) return [];

    const options: BulkPresentationOption[] = [];
    const push = (key: string, name: unknown, factor: unknown) => {
        if (typeof name === 'string' && name.trim().length > 0 && Number(factor) > 0) {
            options.push({ key, name: name.trim(), factor: Number(factor) });
        }
    };

    // Presentación 1 usa los campos nuevos unitsPerBulk; si no están poblados y aún
    // existe la caja legada (hasBoxOption + unitsPerBox), se conserva como 'box'.
    push('bulk', product.bulkUnit, product.unitsPerBulk);
    if (product.hasBoxOption && Number(product.unitsPerBox) > 1 && !options.some(o => o.key === 'bulk')) {
        options.push({ key: 'box', name: product.bulkUnit || 'Caja', factor: Number(product.unitsPerBox) });
    }

    // Presentaciones opcionales 2 y 3.
    push('bulk2', (product as any).bulkUnit2, (product as any).unitsPerBulk2);
    push('bulk3', (product as any).bulkUnit3, (product as any).unitsPerBulk3);

    return options;
};

/**
 * Resuelve el factor de conversión a la unidad base de una presentación vendida.
 * Prioriza el factor congelado en el carrito (presentationFactor); si no, lo deduce
 * del producto según la clave de presentación o el nombre guardado. Retorna 1 para
 * la unidad base.
 */
export const resolvePresentationFactor = (
    product: Product,
    presentation: string | undefined,
    presentationName: string | undefined,
    presentationFactor?: number
): number => {
    if (typeof presentationFactor === 'number' && presentationFactor > 0) return presentationFactor;

    const opts = getBulkPresentationOptions(product);
    const name = presentationName?.trim().toLowerCase();
    const match = opts.find(o =>
        o.key === presentation || (name && o.name.toLowerCase() === name)
    );
    if (match) return match.factor;
    if (presentation === 'box') return Number((product as any).unitsPerBox || 1);
    return 1;
};