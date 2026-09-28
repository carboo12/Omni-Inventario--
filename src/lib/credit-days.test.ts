import { describe, it, expect } from "vitest";
import {
    FALLBACK_CREDIT_DAYS,
    getEffectiveCreditDays,
    computeCreditDueDate,
} from "./credit-days";

describe("getEffectiveCreditDays", () => {
    it("prevalece el plazo individual del cliente sobre el ajuste global", () => {
        expect(getEffectiveCreditDays({ creditDays: 15 }, { defaultCreditDays: 45 })).toBe(15);
    });

    it("usa el ajuste global cuando el cliente no tiene plazo propio (null)", () => {
        expect(getEffectiveCreditDays({ creditDays: null }, { defaultCreditDays: 45 })).toBe(45);
    });

    it("usa el ajuste global cuando el cliente no trae el campo (undefined)", () => {
        expect(getEffectiveCreditDays({}, { defaultCreditDays: 45 })).toBe(45);
    });

    it("ignora plazos no positivos y cae al ajuste global", () => {
        expect(getEffectiveCreditDays({ creditDays: 0 }, { defaultCreditDays: 45 })).toBe(45);
        expect(getEffectiveCreditDays({ creditDays: -10 }, { defaultCreditDays: 45 })).toBe(45);
        expect(getEffectiveCreditDays({ creditDays: NaN }, { defaultCreditDays: 45 })).toBe(45);
    });

    it("cae a 30 días si no hay ni plazo individual ni global", () => {
        expect(getEffectiveCreditDays({ creditDays: null }, {})).toBe(FALLBACK_CREDIT_DAYS);
        expect(getEffectiveCreditDays({ creditDays: null }, { defaultCreditDays: 0 })).toBe(30);
        expect(getEffectiveCreditDays(null, null)).toBe(30);
    });

    it("redondea hacia abajo los días decimales", () => {
        expect(getEffectiveCreditDays({ creditDays: 15.9 }, { defaultCreditDays: 30 })).toBe(15);
    });
});

describe("computeCreditDueDate", () => {
    it("suma los días de crédito a la fecha de la factura", () => {
        const invoiceDate = new Date(2026, 8, 26, 10, 30, 0);
        const due = computeCreditDueDate(invoiceDate, 15);
        expect(due.getFullYear()).toBe(2026);
        expect(due.getMonth()).toBe(9);  // 26 de septiembre + 15 días = 11 de octubre
        expect(due.getDate()).toBe(11);
        expect(due.getHours()).toBe(10);
    });

    it("no muta la fecha de factura recibida", () => {
        const invoiceDate = new Date(2026, 0, 31, 8, 0, 0);
        computeCreditDueDate(invoiceDate, 30);
        expect(invoiceDate.getFullYear()).toBe(2026);
        expect(invoiceDate.getMonth()).toBe(0);
        expect(invoiceDate.getDate()).toBe(31);
    });

    it("usa 30 días si el plazo no es utilizable", () => {
        const invoiceDate = new Date(2026, 0, 1, 8, 0, 0);
        expect(computeCreditDueDate(invoiceDate, 0).getDate()).toBe(31);
        expect(computeCreditDueDate(invoiceDate, -5).getDate()).toBe(31);
    });
});
