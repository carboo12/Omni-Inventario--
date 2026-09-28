import { describe, it, expect } from "vitest";
import {
    GENERIC_CUSTOMER_NAMES,
    PAY_ON_DELIVERY_METHOD,
    PENDING_COLLECTION_BANNER,
    ROUTE_STATUS,
    SETTLEMENT_FILTERS,
    SETTLEMENT_OUTCOMES,
    computeSettlementTotals,
    getSettlementState,
    isCashOnDelivery,
    isGenericCustomerName,
    isPendingSettlement,
    outcomeLabel,
    resolveOutcome,
    routeStatusForOutcome,
} from "./route-settlement";

const items = [
    { id: "i1", productId: "p1", productName: "Quaker Ristra", quantity: 5, unitPrice: 20, totalPrice: 100 },
    { id: "i2", productId: "p2", productName: "Aceite", quantity: 2, unitPrice: 50, totalPrice: 100 },
];

describe("isGenericCustomerName", () => {
    it("rechaza los nombres genéricos de mostrador", () => {
        for (const name of GENERIC_CUSTOMER_NAMES) {
            expect(isGenericCustomerName(name)).toBe(true);
        }
        expect(isGenericCustomerName("  anónimo  ")).toBe(true);
        expect(isGenericCustomerName("")).toBe(true);
        expect(isGenericCustomerName(null)).toBe(true);
        expect(isGenericCustomerName(undefined)).toBe(true);
    });

    it("acepta clientes reales registrados", () => {
        expect(isGenericCustomerName("Juan Pérez")).toBe(false);
        expect(isGenericCustomerName("CLIENTE GENERAL S.A.")).toBe(false);
    });
});

describe("isCashOnDelivery", () => {
    it("detecta la modalidad por método de pago o por isPaid en false", () => {
        expect(isCashOnDelivery(PAY_ON_DELIVERY_METHOD, false)).toBe(true);
        expect(isCashOnDelivery("cobro contra entrega", true)).toBe(true);
        expect(isCashOnDelivery("Efectivo C$", false)).toBe(true);
        expect(isCashOnDelivery("Efectivo C$", true)).toBe(false);
    });
});

describe("getSettlementState", () => {
    it("agrupa los pendientes de cierre", () => {
        expect(getSettlementState({ routeStatus: ROUTE_STATUS.PENDIENTE_LIQUIDACION, isPaid: false }))
            .toBe(SETTLEMENT_FILTERS.PENDIENTES);
        // Pedidos legacy sin routeStatus pero no pagados.
        expect(getSettlementState({ isPaid: false, paymentMethod: PAY_ON_DELIVERY_METHOD }))
            .toBe(SETTLEMENT_FILTERS.PENDIENTES);
        expect(isPendingSettlement({ isPaid: false })).toBe(true);
    });

    it("agrupa los liquidados y los devueltos", () => {
        expect(getSettlementState({ routeStatus: ROUTE_STATUS.LIQUIDADO_Y_PAGADO, isPaid: true }))
            .toBe(SETTLEMENT_FILTERS.LIQUIDADOS);
        expect(getSettlementState({ routeStatus: ROUTE_STATUS.LIQUIDADO_CON_DEVOLUCION_PARCIAL, isPaid: true }))
            .toBe(SETTLEMENT_FILTERS.LIQUIDADOS);
        expect(getSettlementState({ routeStatus: ROUTE_STATUS.RECHAZADO_EN_RUTA, isPaid: false }))
            .toBe(SETTLEMENT_FILTERS.DEVUELTOS);
        expect(getSettlementState({ status: "CANCELLED" })).toBe(SETTLEMENT_FILTERS.DEVUELTOS);
        expect(isPendingSettlement({ routeStatus: ROUTE_STATUS.LIQUIDADO_Y_PAGADO, isPaid: true })).toBe(false);
    });
});

describe("computeSettlementTotals", () => {
    it("sin devoluciones cobra el total completo", () => {
        const totals = computeSettlementTotals(items, []);
        expect(totals.originalAmount).toBe(200);
        expect(totals.returnedAmount).toBe(0);
        expect(totals.netAmount).toBe(200);
        expect(totals.returnedUnits).toBe(0);
        expect(totals.deliveredUnits).toBe(7);
        expect(totals.hasPartialReturn).toBe(false);
        expect(totals.isFullReturn).toBe(false);
    });

    it("recalcula el neto con una devolución parcial", () => {
        const totals = computeSettlementTotals(items, [{ invoiceItemId: "i1", quantity: 2 }]);
        expect(totals.returnedUnits).toBe(2);
        expect(totals.returnedAmount).toBe(40);
        expect(totals.netAmount).toBe(160);
        expect(totals.deliveredUnits).toBe(5);
        expect(totals.hasPartialReturn).toBe(true);
        expect(totals.isFullReturn).toBe(false);
    });

    it("reparte proporcionalmente descuentos aplicados al total de una línea", () => {
        const totals = computeSettlementTotals([
            { id: "i1", productId: "p1", productName: "Producto", quantity: 5, unitPrice: 20, totalPrice: 90 },
        ], [{ invoiceItemId: "i1", quantity: 2 }]);
        expect(totals.returnedAmount).toBe(36);
        expect(totals.netAmount).toBe(54);
    });

    it("detecta la devolución total y deja el neto en cero", () => {
        const totals = computeSettlementTotals(items, [
            { invoiceItemId: "i1", quantity: 5 },
            { invoiceItemId: "i2", quantity: 2 },
        ]);
        expect(totals.returnedUnits).toBe(7);
        expect(totals.returnedAmount).toBe(200);
        expect(totals.netAmount).toBe(0);
        expect(totals.isFullReturn).toBe(true);
    });

    it("limita cada línea a la cantidad vendida e ignora ruido del formulario", () => {
        const totals = computeSettlementTotals(items, [
            { invoiceItemId: "i1", quantity: 99 },
            { invoiceItemId: "i2", quantity: -3 },
            { invoiceItemId: "i1", quantity: 0 },
            { invoiceItemId: "desconocida", quantity: 4 },
        ]);
        expect(totals.returnedUnits).toBe(5);
        expect(totals.returnedAmount).toBe(100);
        expect(totals.netAmount).toBe(100);
    });

    it("usa el total de la factura si las líneas no suman lo mismo", () => {
        const totals = computeSettlementTotals(
            [{ id: "i1", productId: "p1", productName: "X", quantity: 1, unitPrice: 10, totalPrice: 10 }],
            [],
            12
        );
        expect(totals.originalAmount).toBe(12);
    });
});

describe("resolveOutcome / routeStatusForOutcome", () => {
    it("mapea cada escenario a su estado persistido", () => {
        const full = computeSettlementTotals(items, []);
        expect(resolveOutcome(full)).toBe(SETTLEMENT_OUTCOMES.ENTREGA_COMPLETA);
        expect(routeStatusForOutcome(SETTLEMENT_OUTCOMES.ENTREGA_COMPLETA)).toBe(ROUTE_STATUS.LIQUIDADO_Y_PAGADO);

        const partial = computeSettlementTotals(items, [{ invoiceItemId: "i1", quantity: 1 }]);
        expect(resolveOutcome(partial)).toBe(SETTLEMENT_OUTCOMES.DEVOLUCION_PARCIAL);
        expect(routeStatusForOutcome(SETTLEMENT_OUTCOMES.DEVOLUCION_PARCIAL))
            .toBe(ROUTE_STATUS.LIQUIDADO_CON_DEVOLUCION_PARCIAL);

        const rejected = computeSettlementTotals(items, [
            { invoiceItemId: "i1", quantity: 5 },
            { invoiceItemId: "i2", quantity: 2 },
        ]);
        expect(resolveOutcome(rejected)).toBe(SETTLEMENT_OUTCOMES.DEVOLUCION_TOTAL);
        expect(routeStatusForOutcome(SETTLEMENT_OUTCOMES.DEVOLUCION_TOTAL)).toBe(ROUTE_STATUS.RECHAZADO_EN_RUTA);
    });

    it("tiene etiquetas en español para cada escenario", () => {
        expect(outcomeLabel(SETTLEMENT_OUTCOMES.ENTREGA_COMPLETA)).toBe('Entrega Completa');
        expect(outcomeLabel(SETTLEMENT_OUTCOMES.DEVOLUCION_TOTAL)).toBe('Devolución Total / Rechazado');
        expect(outcomeLabel(null)).toBe('Pendiente de Liquidación');
        expect(PENDING_COLLECTION_BANNER).toBe('*** COBRO CONTRA ENTREGA - PENDIENTE DE PAGO ***');
    });
});
