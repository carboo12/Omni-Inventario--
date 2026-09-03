/**
 * JewelryPricingEngine.ts
 * Centralized logic for jewelry price calculations including material, labor, and margins.
 */

const TROY_OUNCE_GRAMS = 31.1035;

export interface JewelryPricingInput {
  grams: number;
  karat: number;
  laborNIO: number;
  marketPriceUSD: number; // Price per Troy Ounce
  exchangeRate: number;
  marginPercent: number;
  fixedTotalCostNIO?: number; // Overrides the calculated total cost
}

export interface JewelryPricingResult {
  materialCostUSD: number;
  laborCostUSD: number;
  totalCostUSD: number;
  totalCostNIO: number;
  salePriceNIO: number;
  salePriceUSD: number;
  profitNIO: number;
  profitUSD: number;
  marginPercent: number;
}

export class JewelryPricingEngine {
  /**
   * Calculates all price components for a jewelry piece.
   */
  public static calculate(input: JewelryPricingInput): JewelryPricingResult {
    const { grams, karat, laborNIO, marketPriceUSD, exchangeRate, marginPercent, fixedTotalCostNIO } = input;

    // 1. Material Cost (USD)
    const materialCostUSD = grams * (marketPriceUSD / TROY_OUNCE_GRAMS) * (karat / 24);

    let laborCostUSD: number;
    let totalCostUSD: number;
    let totalCostNIO: number;

    if (fixedTotalCostNIO !== undefined) {
      totalCostNIO = fixedTotalCostNIO;
      totalCostUSD = fixedTotalCostNIO / exchangeRate;
      laborCostUSD = totalCostUSD - materialCostUSD;
    } else {
      laborCostUSD = laborNIO / exchangeRate;
      totalCostUSD = materialCostUSD + laborCostUSD;
      totalCostNIO = totalCostUSD * exchangeRate;
    }

    // 4. Sale Price
    const salePriceNIO = totalCostNIO * (1 + marginPercent / 100);
    const salePriceUSD = salePriceNIO / exchangeRate;

    // 5. Profit
    const profitNIO = salePriceNIO - totalCostNIO;
    const profitUSD = profitNIO / exchangeRate;

    return {
      materialCostUSD: this.round(materialCostUSD, 2),
      laborCostUSD: this.round(laborCostUSD, 2),
      totalCostUSD: this.round(totalCostUSD, 2),
      totalCostNIO: this.round(totalCostNIO, 2),
      salePriceNIO: this.round(salePriceNIO, 2),
      salePriceUSD: this.round(salePriceUSD, 2),
      profitNIO: this.round(profitNIO, 2),
      profitUSD: this.round(profitUSD, 2),
      marginPercent: this.round(marginPercent, 2),
    };
  }

  public static calculateMarginFromPrice(
    salePriceNIO: number,
    grams: number,
    karat: number,
    laborNIO: number,
    marketPriceUSD: number,
    exchangeRate: number,
    fixedTotalCostNIO?: number
  ): number {
    const materialCostUSD = grams * (marketPriceUSD / TROY_OUNCE_GRAMS) * (karat / 24);
    
    let totalCostNIO: number;
    if (fixedTotalCostNIO !== undefined) {
      totalCostNIO = fixedTotalCostNIO;
    } else {
      const laborCostUSD = laborNIO / exchangeRate;
      totalCostNIO = (materialCostUSD + laborCostUSD) * exchangeRate;
    }

    if (totalCostNIO <= 0) return 0;

    const margin = ((salePriceNIO / totalCostNIO) - 1) * 100;
    return this.round(margin, 2);
  }

  private static round(value: number, decimals: number): number {
    const factor = Math.pow(10, decimals);
    return Math.round((value + Number.EPSILON) * factor) / factor;
  }
}
