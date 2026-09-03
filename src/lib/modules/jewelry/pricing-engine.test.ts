import { describe, it, expect } from 'vitest';
import { JewelryPricingEngine } from './pricing-engine';

describe('JewelryPricingEngine', () => {
    describe('getPricePerGram', () => {
        it('calculates the correct price per gram based on karat proportion', () => {
            const currentGoldPrice = 100; // $100 for 24k

            // 24k is 100% pure
            expect(JewelryPricingEngine.getPricePerGram(24, currentGoldPrice)).toBe(100);

            // 18k is 75% pure (18/24)
            expect(JewelryPricingEngine.getPricePerGram(18, currentGoldPrice)).toBe(75);

            // 14k is ~58.33% pure (14/24)
            expect(JewelryPricingEngine.getPricePerGram(14, currentGoldPrice)).toBeCloseTo(58.33, 2);
        });

        it('throws an error for invalid karats', () => {
            expect(() => JewelryPricingEngine.getPricePerGram(0, 100)).toThrow();
            expect(() => JewelryPricingEngine.getPricePerGram(25, 100)).toThrow();
        });
    });

    describe('getPureGoldWeight', () => {
        it('calculates the pure gold weight from gross weight and karats', () => {
            expect(JewelryPricingEngine.getPureGoldWeight(10, 24)).toBe(10);
            expect(JewelryPricingEngine.getPureGoldWeight(10, 18)).toBe(7.5);
            expect(JewelryPricingEngine.getPureGoldWeight(10, 14)).toBeCloseTo(5.833, 3);
        });
    });

    describe('calculatePiecePrice', () => {
        it('calculates the final sale price correctly with labor and margin', () => {
            const params = {
                weight: 10,  // 10 grams of 18k
                karat: 18,
                laborCost: 50,
                margin: 30, // 30% margin
                currentGoldPrice: 100 // 24k base price
            };

            // 10g * (18/24 * 100) = 750 (Material cost)
            // laborCost = 50
            // Total cost = 800
            // Margin = 30% -> 800 * 1.30 = 1040

            expect(JewelryPricingEngine.calculatePiecePrice(params)).toBe(1040);
        });

        it('calculates price when margin is 0', () => {
            const params = {
                weight: 5,  // 5 grams of 24k
                karat: 24,
                laborCost: 0,
                margin: 0,
                currentGoldPrice: 100
            };

            // 5g * 100 = 500
            expect(JewelryPricingEngine.calculatePiecePrice(params)).toBe(500);
        });
    });
});
