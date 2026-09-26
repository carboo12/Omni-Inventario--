import { describe, it, expect } from 'vitest';
import {
    NO_STOCK_MESSAGE,
    INSUFFICIENT_STOCK_CODE,
    InsufficientStockError,
    getProductStock,
    allowsNegativeStock,
    buildInsufficientStockMessage,
    buildNoStockMessage,
    getMaxSellableQuantity,
    clampQuantityToStock,
    findStockIssues,
    requiresEncargoConfirmation,
    type StockCheckLine,
} from './stock-policy';

const line = (over: Partial<StockCheckLine> = {}): StockCheckLine => ({
    productId: 'p1',
    productName: 'Acetaminofen',
    physicalUnits: 1,
    available: 10,
    allowNegative: false,
    ...over,
});

describe('getProductStock / allowsNegativeStock', () => {
    it('lee el stock declarado y tolera datos ausentes', () => {
        expect(getProductStock({ stock: 7 })).toBe(7);
        expect(getProductStock({ stock: 0 })).toBe(0);
        expect(getProductStock({ stock: -2 })).toBe(-2);
        expect(getProductStock({})).toBe(0);
        expect(getProductStock(null)).toBe(0);
    });

    it('solo admite stock negativo con el flag estrictamente en true', () => {
        expect(allowsNegativeStock({ allowNegativeStock: true })).toBe(true);
        expect(allowsNegativeStock({ allowNegativeStock: false })).toBe(false);
        expect(allowsNegativeStock({ allowNegativeStock: null })).toBe(false);
        expect(allowsNegativeStock({})).toBe(false);
    });
});

describe('mensajes', () => {
    it('usa el texto acordado para producto sin existencias', () => {
        expect(NO_STOCK_MESSAGE).toBe('Producto sin existencias disponibles');
        expect(buildNoStockMessage()).toBe(NO_STOCK_MESSAGE);
    });

    it('reporta la existencia máxima disponible y lo solicitado', () => {
        expect(buildInsufficientStockMessage('Acetaminofen', 4, 10)).toBe(
            'Stock insuficiente para "Acetaminofen". Existencia máxima disponible: 4 unidades (solicitado: 10 unidades).'
        );
    });

    it('nunca reporta una existencia máxima negativa', () => {
        expect(buildInsufficientStockMessage('X', -5, 2)).toContain('0 unidades');
    });

    it('InsufficientStockError expone el código y los datos del conflicto', () => {
        const error = new InsufficientStockError('p1', 'Acetaminofen', 4, 10);
        expect(error.code).toBe(INSUFFICIENT_STOCK_CODE);
        expect(error.productId).toBe('p1');
        expect(error.productName).toBe('Acetaminofen');
        expect(error.available).toBe(4);
        expect(error.requested).toBe(10);
        expect(error.message).toContain('Stock insuficiente para "Acetaminofen"');
    });
});

describe('getMaxSellableQuantity', () => {
    it('topa con la existencia cuando no permite stock negativo', () => {
        expect(getMaxSellableQuantity(10, false)).toBe(10);
        expect(getMaxSellableQuantity(0, false)).toBe(0);
        // Un stock ya negativo en BD no habilita la venta: el tope nunca es < 0.
        expect(getMaxSellableQuantity(-5, false)).toBe(0);
    });

    it('no pone tope cuando permite stock negativo', () => {
        expect(getMaxSellableQuantity(10, true)).toBe(Number.POSITIVE_INFINITY);
        expect(getMaxSellableQuantity(0, true)).toBe(Number.POSITIVE_INFINITY);
    });
});

describe('clampQuantityToStock', () => {
    it('aplica Math.min(solicitado, disponible) sin stock negativo', () => {
        expect(clampQuantityToStock(10, 4, false)).toBe(4);
        expect(clampQuantityToStock(3, 10, false)).toBe(3);
        expect(clampQuantityToStock(5, 0, false)).toBe(0);
    });

    it('respeta la cantidad solicitada con stock negativo habilitado', () => {
        expect(clampQuantityToStock(10, 4, true)).toBe(10);
        expect(clampQuantityToStock(1, 0, true)).toBe(1);
    });

    it('normaliza valores inválidos a 0', () => {
        expect(clampQuantityToStock(-4, 10, false)).toBe(0);
        expect(clampQuantityToStock(Number.NaN, 10, false)).toBe(0);
    });
});

describe('findStockIssues', () => {
    it('no reporta conflicto cuando la existencia alcanza', () => {
        expect(findStockIssues([line({ physicalUnits: 10, available: 10 })])).toHaveLength(0);
        expect(findStockIssues([line({ physicalUnits: 3, available: 10 })])).toHaveLength(0);
    });

    it('bloquea con el mensaje de agotado cuando available <= 0', () => {
        const issues = findStockIssues([line({ physicalUnits: 1, available: 0 })]);
        expect(issues).toHaveLength(1);
        expect(issues[0].message).toBe(NO_STOCK_MESSAGE);
        expect(issues[0].productId).toBe('p1');
    });

    it('bloquea con existencia máxima cuando no alcanza', () => {
        const issues = findStockIssues([line({ physicalUnits: 10, available: 4 })]);
        expect(issues).toHaveLength(1);
        expect(issues[0].message).toContain('Existencia máxima disponible: 4 unidades');
        expect(issues[0].requested).toBe(10);
        expect(issues[0].available).toBe(4);
    });

    it('excluye los productos con allowNegativeStock (venta bajo encargo)', () => {
        const issues = findStockIssues([
            line({ physicalUnits: 99, available: 0, allowNegative: true }),
            line({ productId: 'p2', physicalUnits: 50, available: 5, allowNegative: true }),
        ]);
        expect(issues).toHaveLength(0);
    });

    it('reporta todos los productos conflictivos a la vez', () => {
        const issues = findStockIssues([
            line({ productId: 'p1', physicalUnits: 10, available: 4 }),
            line({ productId: 'p2', productName: 'Vitamina', physicalUnits: 2, available: 0 }),
        ]);
        expect(issues.map((i) => i.productId)).toEqual(['p1', 'p2']);
    });
});

describe('requiresEncargoConfirmation', () => {
    it('solo pide confirmación si el producto permite stock negativo y se excede', () => {
        expect(requiresEncargoConfirmation(line({ physicalUnits: 5, available: 10, allowNegative: true }))).toBe(false);
        expect(requiresEncargoConfirmation(line({ physicalUnits: 10, available: 10, allowNegative: true }))).toBe(false);
        expect(requiresEncargoConfirmation(line({ physicalUnits: 11, available: 10, allowNegative: true }))).toBe(true);
        expect(requiresEncargoConfirmation(line({ physicalUnits: 1, available: 0, allowNegative: true }))).toBe(true);
    });

    it('nunca pide confirmación si el producto no permite stock negativo', () => {
        expect(requiresEncargoConfirmation(line({ physicalUnits: 999, available: 1, allowNegative: false }))).toBe(false);
    });
});
