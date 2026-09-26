import { describe, it, expect } from 'vitest';
import { resolveStockStatus, isLowStock, isOutOfStock, isOutOfStockRow, DEFAULT_MIN_STOCK } from './inventory-status';

describe('regla unificada de stock bajo', () => {
    it('marca Agotado cuando la cantidad es <= 0 (incluye negativos)', () => {
        expect(resolveStockStatus(0, 10)).toBe('Agotado');
        expect(resolveStockStatus(-3, 10)).toBe('Agotado');
        expect(resolveStockStatus(0, 0)).toBe('Agotado');
    });

    it('marca Stock Bajo cuando la cantidad es <= minStock', () => {
        expect(resolveStockStatus(1, 10)).toBe('Stock Bajo');
        expect(resolveStockStatus(9, 10)).toBe('Stock Bajo');
        // Frontera: igual al punto de reorden cuenta como stock bajo (lte).
        expect(resolveStockStatus(10, 10)).toBe('Stock Bajo');
    });

    it('marca En Stock solo cuando supera minStock', () => {
        expect(resolveStockStatus(11, 10)).toBe('En Stock');
        expect(resolveStockStatus(500, 10)).toBe('En Stock');
    });

    it('usa DEFAULT_MIN_STOCK cuando el producto no define minStock', () => {
        expect(DEFAULT_MIN_STOCK).toBe(10);
        expect(resolveStockStatus(10, null)).toBe('Stock Bajo');
        expect(resolveStockStatus(10, undefined)).toBe('Stock Bajo');
        expect(resolveStockStatus(11, null)).toBe('En Stock');
    });

    it('isLowStock incluye agotados y productos en/bajo el punto de reorden', () => {
        expect(isLowStock(0, 10)).toBe(true);
        expect(isLowStock(-1, 10)).toBe(true);
        expect(isLowStock(10, 10)).toBe(true);
        expect(isLowStock(11, 10)).toBe(false);
    });

    it('coincide con la consulta unificada (stock <= minStock OR stock <= 0)', () => {
        const expected = (stock: number, minStock: number) => stock <= minStock || stock <= 0;
        for (const stock of [-5, 0, 1, 9, 10, 11, 40]) {
            for (const minStock of [1, 5, 10, 50]) {
                expect(isLowStock(stock, minStock)).toBe(expected(stock, minStock));
            }
        }
    });
});

describe('isOutOfStock: agotado es cantidad <= 0', () => {
    it('cubre el cero exacto y los saldos negativos', () => {
        expect(isOutOfStock(0)).toBe(true);
        expect(isOutOfStock(-1)).toBe(true);
        expect(isOutOfStock(-3)).toBe(true);
        expect(isOutOfStock(-0.01)).toBe(true);
    });

    it('no marca agotado lo que tiene existencias', () => {
        expect(isOutOfStock(1)).toBe(false);
        expect(isOutOfStock(0.5)).toBe(false);
        expect(isOutOfStock(250)).toBe(false);
    });

    it('normaliza valores ausentes a 0 (agotado)', () => {
        expect(isOutOfStock(null)).toBe(true);
        expect(isOutOfStock(undefined)).toBe(true);
        expect(isOutOfStock(Number.NaN)).toBe(true);
    });
});

describe('isOutOfStockRow: regla del switch sobre la fila visible', () => {
    it('detecta el lote individual con cantidad <= 0', () => {
        expect(isOutOfStockRow({ quantity: -3, status: 'Agotado' })).toBe(true);
        expect(isOutOfStockRow({ quantity: 0, status: 'Agotado' })).toBe(true);
    });

    it('detecta la fila consolidada cuyo total es <= 0 (regresión del bug)', () => {
        // ATUN BAHIA VEGETAL: lotes +5 y -8 consolidados en una fila de -3.
        expect(isOutOfStockRow({ quantity: -3, status: 'Agotado' })).toBe(true);
        expect(isOutOfStockRow({ totalQuantity: -3, status: 'Agotado' })).toBe(true);
        // Sin el campo status, la cantidad consolidada negativa basta.
        expect(isOutOfStockRow({ totalQuantity: -3 })).toBe(true);
    });

    it('usa totalQuantity cuando el grupo la expone (BOUTIQUE)', () => {
        expect(isOutOfStockRow({ quantity: 7, totalQuantity: -3 })).toBe(true);
        expect(isOutOfStockRow({ quantity: -3, totalQuantity: 7 })).toBe(false);
    });

    it('detecta el agotado por status aunque la cantidad mostrada sea positiva', () => {
        // Un lote con saldo propio positivo puede pertenecer a un producto cuyo
        // stock total ya es <= 0: también debe ocultarse.
        expect(isOutOfStockRow({ quantity: 5, status: 'Agotado' })).toBe(true);
    });

    it('deja ver las filas con existencias', () => {
        expect(isOutOfStockRow({ quantity: 5, status: 'En Stock' })).toBe(false);
        expect(isOutOfStockRow({ quantity: 12, status: 'Stock Bajo' })).toBe(false);
        expect(isOutOfStockRow({ totalQuantity: 30, status: 'En Stock' })).toBe(false);
    });
});
