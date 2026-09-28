/**
 * Plazo de crédito (días) con jerarquía Global vs. Individual por cliente.
 *
 * Un cliente puede tener un plazo propio (`Customer.creditDays`). Si no lo tiene
 * (null / 0 / negativo) se aplica el valor global del negocio
 * (`SystemSettings.defaultCreditDays`).
 *
 * Es un módulo puro (sin Prisma ni servidor) para poder usarse tanto en las
 * acciones del backend como en la interfaz.
 */

/** Valor de respaldo cuando no hay ni plazo individual ni global configurado. */
export const FALLBACK_CREDIT_DAYS = 30;

export interface CreditDaysCustomer {
    /** Plazo propio del cliente. `null`/indefinido = usar el ajuste global. */
    creditDays?: number | null;
}

export interface CreditDaysSettings {
    /** Ajuste global del negocio (Ajustes → Formas de Pago). */
    defaultCreditDays?: number | null;
}

/**
 * Días de crédito efectivas para un cliente: prevalece el plazo individual y,
 * si no existe, se recurre al ajuste global (y a 30 días como último recurso).
 */
export function getEffectiveCreditDays(
    customer: CreditDaysCustomer | null | undefined,
    settings: CreditDaysSettings | null | undefined
): number {
    const individual = customer?.creditDays;
    if (typeof individual === 'number' && Number.isFinite(individual) && individual > 0) {
        return Math.floor(individual);
    }

    const global = settings?.defaultCreditDays;
    if (typeof global === 'number' && Number.isFinite(global) && global > 0) {
        return Math.floor(global);
    }

    return FALLBACK_CREDIT_DAYS;
}

/**
 * Fecha de vencimiento de una factura al crédito: la fecha de la factura más
 * los días de crédito efectivos del cliente.
 */
export function computeCreditDueDate(invoiceDate: Date, effectiveDays: number): Date {
    const dueDate = new Date(invoiceDate.getTime());
    const days = typeof effectiveDays === 'number' && Number.isFinite(effectiveDays) && effectiveDays > 0
        ? Math.floor(effectiveDays)
        : FALLBACK_CREDIT_DAYS;
    dueDate.setDate(dueDate.getDate() + days);
    return dueDate;
}
