/**
 * Jewelry Pricing Engine
 * FASE 4: MOTOR DE PRECIOS DINÁMICO
 * 
 * Calcula el precio dinámico y centralizado de las piezas de joyería
 * basado en variables en tiempo real.
 */

export interface PricingParams {
    weight: number;
    karat: number;
    laborCost: number;
    margin: number;       // represented as a pure percentage (e.g., 30 for 30%)
    currentGoldPrice: number; // Price per gram of 24k gold
}

export class JewelryPricingEngine {
    /**
     * Obtiene el precio por gramo de acuerdo al kilataje,
     * derivado del precio del oro puro (24k).
     * 
     * Fórmula: (Precio Mercado * Kilataje) / 24
     */
    static getPricePerGram(karat: number, basePrice24k: number): number {
        return (basePrice24k * karat) / 24;
    }

    /**
     * Calcula la cantidad de oro puro en gramos para un peso bruto.
     */
    static getPureGoldWeight(grossWeight: number, karat: number): number {
        return (grossWeight * karat) / 24;
    }

    /**
     * Calcula el precio de venta sugerido (salePrice) de una pieza
     * Sale Price = (Weight * currentGoldPriceForKarat) + LaborCost + Margin
     * Tenga en cuenta que el margin se aplica como porcentaje extra sobre los costos totales
     * o como un valor fijo si se decide. Según el requerimiento, la fórmula es:
     * (weight * currentGoldPrice) + laborCost + margin
     * Asumiremos que margin es un valor monetario directo de ganancia neta.
     * Si 'margin' representa porcentaje, puede ajustarse este motor.
     */
    static calculatePiecePrice(params: PricingParams): number {
        const pricePerGram = this.getPricePerGram(params.karat, params.currentGoldPrice);
        const materialCost = params.weight * pricePerGram;
        const baseCost = materialCost + params.laborCost;

        // Si 'margin' es porcentaje, usaríamos baseCost * (1 + (params.margin / 100))
        // Pero la fórmula del documento dice: + laborCost + margin
        // Vamos a implementarlo como si fueran dólares/moneda, como está escrito
        const finalPrice = materialCost + params.laborCost + params.margin;

        return Number(finalPrice.toFixed(2));
    }

    /**
     * Calcula el porcentaje de margen real obtenido a partir de un precio overrideado
     */
    static calculateRealMargin(overridePrice: number, params: Omit<PricingParams, 'margin'>): number {
        const pricePerGram = this.getPricePerGram(params.karat, params.currentGoldPrice);
        const materialCost = params.weight * pricePerGram;
        return Number((overridePrice - materialCost - params.laborCost).toFixed(2));
    }
}
