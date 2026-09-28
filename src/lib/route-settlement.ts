/**
 * Liquidación offline de pedidos para ruta con "Cobro contra entrega".
 *
 * El POS emite el pedido como PENDIENTE_LIQUIDACION: el inventario sale de
 * bodega de inmediato, pero el efectivo viaja con el rutero y NO entra a la caja
 * del día. Cuando el rutero vuelve, el cajero liquida el pedido en el módulo
 * Ruta & Entregas y es ahí cuando el dinero se registra en la caja del día.
 *
 * Este módulo es puro (sin Prisma ni servidor) para poder ser usado por las
 * acciones, por la interfaz y por las plantillas de impresión.
 */

/** Valor persistido en `SalesInvoice.paymentMethod` para cobro contra entrega. */
export const PAY_ON_DELIVERY_METHOD = 'Cobro contra entrega';

/** Nombres genéricos de cliente que no admiten pedidos para ruta. */
export const GENERIC_CUSTOMER_NAMES = ['ANONIM', 'ANÓNIMO', 'CLIENTE GENERAL', 'Cliente General'];

/** Ciclo de vida del pedido para ruta (columna `SalesInvoice.routeStatus`). */
export const ROUTE_STATUS = {
    /** Emitido por el POS, el dinero está en la calle. */
    PENDIENTE_LIQUIDACION: 'PENDIENTE_LIQUIDACION',
    /** Entregado y cobrado por el rutero. */
    LIQUIDADO_Y_PAGADO: 'LIQUIDADO_Y_PAGADO',
    /** Entregado con devolución parcial: se cobra solo el neto. */
    LIQUIDADO_CON_DEVOLUCION_PARCIAL: 'LIQUIDADO_CON_DEVOLUCION_PARCIAL',
    /** El cliente no aceptó el pedido: vuelve todo a bodega. */
    RECHAZADO_EN_RUTA: 'RECHAZADO_EN_RUTA',
} as const;

export type RouteStatus = (typeof ROUTE_STATUS)[keyof typeof ROUTE_STATUS];

/** Escenarios soportados por la estación de liquidación. */
export const SETTLEMENT_OUTCOMES = {
    ENTREGA_COMPLETA: 'ENTREGA_COMPLETA',
    DEVOLUCION_PARCIAL: 'DEVOLUCION_PARCIAL',
    DEVOLUCION_TOTAL: 'DEVOLUCION_TOTAL',
} as const;

export type SettlementOutcome = (typeof SETTLEMENT_OUTCOMES)[keyof typeof SETTLEMENT_OUTCOMES];

/** Filtros de la estación de liquidación. */
export const SETTLEMENT_FILTERS = {
    PENDIENTES: 'PENDIENTES',
    LIQUIDADOS: 'LIQUIDADOS',
    DEVUELTOS: 'DEVUELTOS',
} as const;

export type SettlementFilter = (typeof SETTLEMENT_FILTERS)[keyof typeof SETTLEMENT_FILTERS];

export interface RouteSettlementRequest {
    invoiceId: string;
    outcome: SettlementOutcome;
    paymentMethod: string;
    returns?: ReturnLine[];
    reason?: string;
    notes?: string;
}

export interface RouteSettlementResult {
    success: boolean;
    error?: string;
    data?: {
        invoiceId: string;
        invoiceNumber: number;
        outcome: SettlementOutcome;
        routeStatus: string;
        originalAmount: number;
        returnedAmount: number;
        collectedAmount: number;
        returnedUnits: number;
        creditNoteNumber?: number | null;
    };
}

export const SETTLEMENT_FILTER_OPTIONS: { value: SettlementFilter; label: string }[] = [
    { value: SETTLEMENT_FILTERS.PENDIENTES, label: 'Pendientes de Cierre' },
    { value: SETTLEMENT_FILTERS.LIQUIDADOS, label: 'Liquidados / Cobrados' },
    { value: SETTLEMENT_FILTERS.DEVUELTOS, label: 'Devueltos / Cancelados' },
];

export const ROUTE_STATUS_LABELS: Record<string, string> = {
    [ROUTE_STATUS.PENDIENTE_LIQUIDACION]: 'Pendiente de Cierre',
    [ROUTE_STATUS.LIQUIDADO_Y_PAGADO]: 'Liquidado y Cobrado',
    [ROUTE_STATUS.LIQUIDADO_CON_DEVOLUCION_PARCIAL]: 'Liquidado con Devolución',
    [ROUTE_STATUS.RECHAZADO_EN_RUTA]: 'Devuelto / Rechazado',
};

/** Clases de badge por estado (Tailwind, clase completa). */
export const ROUTE_STATUS_BADGE: Record<string, string> = {
    [ROUTE_STATUS.PENDIENTE_LIQUIDACION]: 'bg-amber-100 text-amber-800 border-amber-300',
    [ROUTE_STATUS.LIQUIDADO_Y_PAGADO]: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    [ROUTE_STATUS.LIQUIDADO_CON_DEVOLUCION_PARCIAL]: 'bg-sky-100 text-sky-800 border-sky-300',
    [ROUTE_STATUS.RECHAZADO_EN_RUTA]: 'bg-rose-100 text-rose-800 border-rose-300',
};

const round2 = (n: number) => Math.round((Number(n) || 0) * 100) / 100;

/**
 * `true` si el nombre corresponde a un cliente genérico (anónimo / mostrador).
 * Un pedido para ruta nunca puede emitirse bajo estos nombres.
 */
export function isGenericCustomerName(name?: string | null): boolean {
    const normalized = (name || '').trim().toUpperCase();
    if (!normalized) return true;
    return GENERIC_CUSTOMER_NAMES.some((generic) => generic.toUpperCase() === normalized);
}

/** `true` si el pedido fue emitido con la modalidad "Cobro contra entrega". */
export function isCashOnDelivery(paymentMethod?: string | null, isPaid?: boolean | null): boolean {
    if ((paymentMethod || '').trim().toLowerCase() === PAY_ON_DELIVERY_METHOD.toLowerCase()) return true;
    return isPaid === false;
}

/**
 * Estado de liquidación derivado de la factura. Tolera pedidos emitidos antes de
 * que existiera `routeStatus`: cualquier venta no pagada se trata como
 * pendiente de cierre.
 */
export function getSettlementState(invoice: {
    routeStatus?: string | null;
    isPaid?: boolean | null;
    paymentMethod?: string | null;
    status?: string | null;
}): SettlementFilter {
    if (invoice.status === 'CANCELLED' || invoice.routeStatus === ROUTE_STATUS.RECHAZADO_EN_RUTA) {
        return SETTLEMENT_FILTERS.DEVUELTOS;
    }
    if (invoice.routeStatus === ROUTE_STATUS.LIQUIDADO_Y_PAGADO
        || invoice.routeStatus === ROUTE_STATUS.LIQUIDADO_CON_DEVOLUCION_PARCIAL) {
        return SETTLEMENT_FILTERS.LIQUIDADOS;
    }
    if (invoice.routeStatus === ROUTE_STATUS.PENDIENTE_LIQUIDACION) {
        return SETTLEMENT_FILTERS.PENDIENTES;
    }
    // Pedidos legacy: no pagados y con estado de entrega en ruta.
    if (invoice.isPaid === false && invoice.status !== 'REFUNDED') {
        return SETTLEMENT_FILTERS.PENDIENTES;
    }
    return SETTLEMENT_FILTERS.LIQUIDADOS;
}

/** `true` si el pedido todavía espera la llegada del rutero al cajero. */
export function isPendingSettlement(invoice: {
    routeStatus?: string | null;
    isPaid?: boolean | null;
    paymentMethod?: string | null;
    status?: string | null;
}): boolean {
    return getSettlementState(invoice) === SETTLEMENT_FILTERS.PENDIENTES;
}

/** Línea de factura vista desde la liquidación. */
export interface SettleableItem {
    id: string;
    productId: string;
    productName: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    presentationName?: string | null;
    baseUnit?: string | null;
}

/** Devolución capturada por el cajero para una línea de la factura. */
export interface ReturnLine {
    invoiceItemId: string;
    quantity: number;
}

export interface SettlementTotals {
    /** Unidades originales del pedido. */
    originalUnits: number;
    /** Unidades que el cliente se llevó. */
    deliveredUnits: number;
    /** Unidades que regresaron a bodega. */
    returnedUnits: number;
    /** Monto original del pedido. */
    originalAmount: number;
    /** Valor de la mercancía devuelta. */
    returnedAmount: number;
    /** Neto a cobrar por el rutero. */
    netAmount: number;
    /** Una sola línea con devoluciones parciales. */
    hasPartialReturn: boolean;
    /** Devolución total: no queda nada por cobrar. */
    isFullReturn: boolean;
}

/**
 * Recalcula los totales de la liquidación a partir de las líneas originales y
 * las cantidades devueltas. Es la única fuente de verdad del "Nuevo Total Neto
 * a Cobrar" que muestra el modal mientras el cajero edita.
 */
export function computeSettlementTotals(
    items: SettleableItem[],
    returns: ReturnLine[],
    invoiceTotal?: number
): SettlementTotals {
    const lineAmount = items.reduce((sum, item) => sum + (Number(item.totalPrice) || 0), 0);
    const originalAmount = round2(Number(invoiceTotal) || lineAmount);

    let returnedAmount = 0;
    let returnedUnits = 0;
    for (const line of returns) {
        const item = items.find((candidate) => candidate.id === line.invoiceItemId);
        if (!item) continue;
        const quantity = Math.max(0, Math.floor(Number(line.quantity) || 0));
        if (quantity === 0) continue;
        // Una línea nunca puede devolver más de lo que se vendió.
        const capped = Math.min(quantity, Math.max(0, Math.floor(Number(item.quantity) || 0)));
        if (capped === 0) continue;
        const unitValue = Number(item.quantity) > 0
            ? (Number(item.totalPrice) || (Number(item.unitPrice) || 0) * Number(item.quantity)) / Number(item.quantity)
            : Number(item.unitPrice) || 0;
        returnedAmount += unitValue * capped;
        returnedUnits += capped;
    }

    returnedAmount = round2(returnedAmount);
    const originalUnits = items.reduce((sum, item) => sum + (Math.floor(Number(item.quantity) || 0)), 0);
    const netAmount = round2(Math.max(0, originalAmount - returnedAmount));

    return {
        originalUnits,
        deliveredUnits: Math.max(0, originalUnits - returnedUnits),
        returnedUnits,
        originalAmount,
        returnedAmount,
        netAmount,
        hasPartialReturn: returnedUnits > 0 && returnedUnits < originalUnits,
        isFullReturn: originalUnits > 0 && returnedUnits >= originalUnits,
    };
}

/**
 * Resuelve el escenario de liquidación a partir de las cantidades capturadas.
 * Si no hay devoluciones es entrega completa; si se devolvió todo es rechazo.
 */
export function resolveOutcome(totals: SettlementTotals): SettlementOutcome {
    if (totals.returnedUnits <= 0) return SETTLEMENT_OUTCOMES.ENTREGA_COMPLETA;
    if (totals.isFullReturn) return SETTLEMENT_OUTCOMES.DEVOLUCION_TOTAL;
    return SETTLEMENT_OUTCOMES.DEVOLUCION_PARCIAL;
}

/** `routeStatus` que se persiste en la factura según el escenario. */
export function routeStatusForOutcome(outcome: SettlementOutcome): RouteStatus {
    switch (outcome) {
        case SETTLEMENT_OUTCOMES.ENTREGA_COMPLETA:
            return ROUTE_STATUS.LIQUIDADO_Y_PAGADO;
        case SETTLEMENT_OUTCOMES.DEVOLUCION_PARCIAL:
            return ROUTE_STATUS.LIQUIDADO_CON_DEVOLUCION_PARCIAL;
        case SETTLEMENT_OUTCOMES.DEVOLUCION_TOTAL:
        default:
            return ROUTE_STATUS.RECHAZADO_EN_RUTA;
    }
}

/** Texto de la leyenda de cierre que se muestra en el modal y en el ticket. */
export function outcomeLabel(outcome: SettlementOutcome | string | null | undefined): string {
    switch (outcome) {
        case SETTLEMENT_OUTCOMES.ENTREGA_COMPLETA:
            return 'Entrega Completa';
        case SETTLEMENT_OUTCOMES.DEVOLUCION_PARCIAL:
            return 'Liquidado con Devolución Parcial';
        case SETTLEMENT_OUTCOMES.DEVOLUCION_TOTAL:
            return 'Devolución Total / Rechazado';
        default:
            return 'Pendiente de Liquidación';
    }
}

/** Leyenda destacada que debe imprimir la hoja de despacho del cobro contra entrega. */
export const PENDING_COLLECTION_BANNER = '*** COBRO CONTRA ENTREGA - PENDIENTE DE PAGO ***';
