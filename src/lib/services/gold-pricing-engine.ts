/**
 * GoldPricingEngine.ts
 * Fórmula de MOSTRADOR (Lógica Casio del cliente).
 *
 * ORDEN EXACTO DEL CÁLCULO:
 *
 *  1. precioPuroUSD      = marketPricePerOunce / 31.10
 *  2. precioPuroCordobas = ROUND(precioPuroUSD × exchangeRate, 2)   ← "precio del día" que se grita en el mostrador
 *  3. valorPiezaGramos   = precioPuroCordobas × (purityPercent / 100)
 *  4. precioFinalGramos  = valorPiezaGramos × (marginPercent / 100)
 *  5. totalPagar         = precioFinalGramos × grossWeightGrams
 *
 * NOTAS:
 * - Constante Troy fija: 31.10
 * - precioPuroCordobas se redondea a 2 decimales inmediatamente (paso 2).
 * - El campo "Margen (%)" representa el % que se le PAGA al cliente (ej: 63 → 0.63).
 * - NO se usa Merma ni Redondeo de Quilataje.
 */

export interface PricingInput {
    grossWeightGrams: number;
    purityPercent: number;
    marketPricePerOunce: number;
    /** % real que ingresa el usuario en UI (ej: 63.17). */
    marginPercent?: number;
    exchangeRate?: number;
}

export interface PricingResult {
    // Pasos intermedios (Lógica de Mostrador)
    precioPuroUSD: number;           // paso 1: precio del gramo de oro puro en USD
    precioPuroCordobas: number;      // paso 2: precio del gramo puro en C$ (redondeado a 2 dec.)
    valorPiezaGramos: number;        // paso 3: valor del gramo de la pieza según pureza
    precioFinalGramos: number;       // paso 4: precio final por gramo al cliente
    totalPagar: number;              // paso 5: total a pagar (C$)

    // Informativo
    kilataje: number;
    quilatajeReal: number;
    karatEquivalent: number;
    totalUSD: number;                // totalPagar / exchangeRate

    // Alias de compatibilidad con el resto del sistema
    totalComercial: number;
    totalPagarCordobas: number;
    totalLocal: number;
    valueLocalCurrency: number;
    finalPaidAmount: number;
    marginApplied: number;
    marginValue: number;
    baseValueUSD: number;
    valueUSD: number;
    fineGoldGrams: number;
    fineGoldOunces: number;
    totalGrossUSD: number;
    netPayableUSD: number;
    paymentFactor: number;
    karatUsed: number;
    pricePerPureGram: number;
    pricePerGramPiece: number;
    precioAjustadoUSD: number;
    precioAjustadoCordobas: number;
    precioGramo24k: number;
    precioPorQuilate: number;
    precioGramoPieza: number;
}

// Quilatajes comerciales (se mantiene para compatibilidad con imports existentes)
export const COMMERCIAL_KARATS = [10, 14, 18, 21, 24] as const;

const TROY_CONSTANT = 31.10;

export class GoldPricingEngine {
    public static calculateCommercial(input: PricingInput): PricingResult | null {
        const {
            grossWeightGrams,
            purityPercent,
            marketPricePerOunce,
            marginPercent = 63,
            exchangeRate = 36.5,
        } = input;

        if (grossWeightGrams <= 0) return null;
        if (purityPercent <= 0 || purityPercent > 100) return null;
        if (marketPricePerOunce <= 0) return null;
        if (exchangeRate <= 0) return null;

        // Paso 1 (pizarra): precio por gramo de 24K en C$
        const pricePerGram24k = this.round((marketPricePerOunce / TROY_CONSTANT) * exchangeRate, 2);
        // Paso 2: contenido real de oro fino
        const fineGoldGrams = grossWeightGrams * (purityPercent / 100);
        const onzasFinas = this.round(fineGoldGrams / TROY_CONSTANT, 4);
        // Paso 3: valor real de mercado de la pieza
        const valorMercadoPieza = fineGoldGrams * pricePerGram24k;
        // Paso 4: pago final al cliente con margen real
        const totalPagar = this.round(valorMercadoPieza * (marginPercent / 100), 2);
        const totalUSD = this.round(totalPagar / exchangeRate, 2);

        // Informativos
        const quilatajeReal = (purityPercent * 24) / 100;
        // Se mantienen estos campos por compatibilidad con vistas existentes.
        const precioPuroUSD = marketPricePerOunce / TROY_CONSTANT;
        const precioPuroCordobas = pricePerGram24k;
        const valorPiezaGramos = this.round(valorMercadoPieza / grossWeightGrams, 4);
        const precioFinalGramos = this.round(totalPagar / grossWeightGrams, 4);

        return {
            // Pasos de la fórmula de mostrador
            precioPuroUSD: this.round(precioPuroUSD, 6),
            precioPuroCordobas,
            valorPiezaGramos: this.round(valorPiezaGramos, 4),
            precioFinalGramos: this.round(precioFinalGramos, 4),
            totalPagar,

            // Informativos
            kilataje: quilatajeReal,
            quilatajeReal,
            karatEquivalent: this.round(quilatajeReal, 2),
            totalUSD,

            // Alias de compatibilidad
            totalComercial: totalPagar,
            totalPagarCordobas: totalPagar,
            totalLocal: totalPagar,
            valueLocalCurrency: totalPagar,
            finalPaidAmount: totalUSD,
            marginApplied: 0,
            marginValue: 0,
            baseValueUSD: totalUSD,
            valueUSD: totalUSD,
            fineGoldGrams: this.round(fineGoldGrams, 3),
            fineGoldOunces: onzasFinas,
            totalGrossUSD: totalUSD,
            netPayableUSD: totalUSD,
            paymentFactor: marginPercent / 100,
            karatUsed: quilatajeReal,
            pricePerPureGram: pricePerGram24k,
            pricePerGramPiece: this.round(valorPiezaGramos, 4),
            precioAjustadoUSD: totalUSD,
            precioAjustadoCordobas: totalPagar,
            precioGramo24k: pricePerGram24k,
            precioPorQuilate: this.round(pricePerGram24k / 24, 4),
            precioGramoPieza: this.round(valorPiezaGramos, 4),
        };
    }

    /** Método principal */
    public static calculate(input: PricingInput): PricingResult | null {
        return this.calculateCommercial(input);
    }

    private static round(value: number, decimals: number): number {
        const factor = Math.pow(10, decimals);
        return Math.round((value + Number.EPSILON) * factor) / factor;
    }
}
