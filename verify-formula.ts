import { GoldPricingEngine } from './src/lib/services/gold-pricing-engine';

async function testFormula() {
    console.log("Testing Gold Pricing Engine - Nicaragua Commercial Formula");
    
    // Case 1: Manual Calculation Match
    const input1 = {
        grossWeightGrams: 10,
        purityPercent: 60, // Should be ignored if roundedKarat is present
        marketPricePerOunce: 2000,
        marginPercent: 80,
        exchangeRate: 36.65,
        roundedKarat: 14,
        troyOunceGrams: 31.10
    };

    const result1 = GoldPricingEngine.calculateCommercial(input1);
    
    if (result1) {
        console.log("\nTest Case 1 (14K, 10g, Margin 80%, FX 36.65):");
        console.log("  Precio Ajustado USD (1600 expected):", result1.precioAjustadoUSD);
        console.log("  Precio Gramo 24K (1885.53 expected):", result1.precioGramo24k);
        console.log("  Precio Gramo 14K (1099.8925 expected):", result1.precioGramoPieza);
        console.log("  Total Pagar (10998.93 expected):", result1.totalPagar);
        
        const success = result1.precioGramo24k === 1885.53 && result1.totalPagar === 10998.93;
        console.log("\n  RESULT:", success ? "SUCCESS" : "FAILED");
    } else {
        console.log("  RESULT: FAILED (null result)");
    }
}

testFormula();
