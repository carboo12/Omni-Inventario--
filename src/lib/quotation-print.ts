// Normalización de cotizaciones al esquema de la plantilla de tickets.
//
// La tabla de /quotations, la acción `getQuotes` y la hidratación on-demand
// pueden entregar la cotización con nombres de campo ligeramente distintos
// (`items` vs `quotationItems`, `productName` vs `product.name`, etc.) y con
// nulos en columnas opcionales. Este módulo centraliza esetraducción hacia
// `QuoteReceiptHtmlData`, que es lo único que consume la plantilla unificada
// de 80 mm, para que el botón de imprimir nunca falle por un campo ausente.

import type { QuoteReceiptHtmlData } from './print-iframe';
import { formatQuoteNumber } from './quotations-nav';
import { resolvePresentationUnitLabel } from './presentations';

/** Datos de empresa/negocio tomados de `useSettings()`. */
export interface QuotationPrintSettings {
    ticketHeader: { name?: string | null; address?: string | null; phone?: string | null; rfc?: string | null };
    ticketFooter?: { message?: string | null; website?: string | null };
    logoSvg?: string | null;
    exchangeRate?: string | number | null;
}

/** Producto embebido opcional en la línea de la cotización. */
export interface QuotationPrintProduct {
    id?: string | null;
    name?: string | null;
    baseUnit?: string | null;
    bulkUnit?: string | null;
    hasBoxOption?: boolean | null;
}

/** Línea de cotización aceptada por el normalizador. */
export interface QuotationPrintItem {
    quantity?: number | null;
    unitPrice?: number | null;
    price?: number | null;
    totalPrice?: number | null;
    total?: number | null;
    presentation?: string | null;
    unit?: string | null;
    productName?: string | null;
    productId?: string | null;
    product?: QuotationPrintProduct | null;
}

/** Cotización aceptada por el normalizador (lista, hidratada o de la API). */
export interface QuotationPrintSource {
    quoteNumber?: number | string | null;
    createdAt?: Date | string | null;
    expirationDays?: number | null;
    customerName?: string | null;
    customerPhone?: string | null;
    client?: { name?: string | null; phone?: string | null } | null;
    customer?: { name?: string | null; phone?: string | null } | null;
    subtotal?: number | null;
    tax?: number | null;
    total?: number | null;
    notes?: string | null;
    user?: { name?: string | null } | null;
    items?: QuotationPrintItem[] | null;
    quotationItems?: QuotationPrintItem[] | null;
}

/**
 * Convierte a número finito. `null`, `undefined` y cadenas vacías se consideran
 * "valor ausente" y devuelven el fallback: sin esto `Number(null)` valdría 0 y
 * una vigencia nula se imprimiría como 0 días en vez de la vigencia por defecto.
 */
function toNumber(value: unknown, fallback: number): number {
    if (value === null || value === undefined) return fallback;
    if (typeof value === 'string' && value.trim() === '') return fallback;
    const n = typeof value === 'string' ? parseFloat(value) : value;
    const num = Number(n);
    return Number.isFinite(num) ? num : fallback;
}

/** Devuelve el primer valor no vacío/no nulo entre los candidatos. */
function firstText(...candidates: unknown[]): string {
    for (const candidate of candidates) {
        if (typeof candidate === 'string' && candidate.trim().length > 0) return candidate.trim();
    }
    return '';
}

/** Fecha de creación válida; si llega ausente o corrupta se usa la fecha actual. */
function toDate(value: Date | string | null | undefined): Date {
    const date = value instanceof Date ? value : new Date(value ?? NaN);
    return Number.isNaN(date.getTime()) ? new Date() : date;
}

/** Extrae las líneas de la cotización aceptando ambos nombres de colección. */
function extractItems(quote: QuotationPrintSource): QuotationPrintItem[] {
    const items = quote.items ?? quote.quotationItems;
    return Array.isArray(items) ? items : [];
}

/**
 * Convierte una cotización al objeto que consume la plantilla unificada de 80 mm.
 *
 * - Normaliza nombres de campo (`items`/`quotationItems`, `productName`/`product.name`,
 *   `unitPrice`/`price`, `totalPrice`/`total`, `client`/`customer`).
 * - Reconstrue subtotal/IVA/total cuando llegan ausentes o a cero.
 * - Resuelve la presentación (2.ª línea de Producto) desde la línea, desde el
 *   producto embebido o mediante el callback contra el catálogo.
 * - Devuelve texto siempre como cadena: ningún valor nulo llega a la plantilla.
 */
export function formatQuotationForPrint(
    quote: QuotationPrintSource,
    settings: QuotationPrintSettings,
    options?: { resolveUnitByProductId?: (productId: string) => string | undefined }
): QuoteReceiptHtmlData {
    const resolveUnit = options?.resolveUnitByProductId;

    const items = extractItems(quote).map(item => {
        const quantity = toNumber(item.quantity, 0);
        const unitPrice = toNumber(item.unitPrice ?? item.price, 0);
        const totalPrice = toNumber(item.totalPrice ?? item.total, unitPrice * quantity);
        const productId = firstText(item.productId, item.product?.id);

        const presentation = firstText(item.presentation, item.unit)
            || (productId && resolveUnit ? resolveUnit(productId) : '')
            || resolvePresentationUnitLabel(item.product as any)
            || '';

        return {
            quantity,
            description: firstText(item.productName, item.product?.name) || 'Producto',
            price: unitPrice,
            total: totalPrice,
            // La plantilla omite la línea si la presentación es vacía o genérica.
            unit: presentation || undefined,
        };
    });

    const itemsSubtotal = items.reduce((sum, item) => sum + item.total, 0);
    const subtotal = toNumber(quote.subtotal, itemsSubtotal);
    const total = toNumber(quote.total, subtotal + toNumber(quote.tax, 0));
    // Si el IVA no viene informado se deduce del total (las cotizaciones suelen
    // guardarse sin impuesto), de modo que la línea nunca queda en C$ 0.00 ficticio.
    const tax = toNumber(quote.tax, Math.max(0, total - subtotal));

    const expirationDays = toNumber(quote.expirationDays, 30);
    const exchangeRate = toNumber(settings.exchangeRate, 36.5);

    return {
        businessName: firstText(settings.ticketHeader?.name) || 'Mi Negocio',
        address: firstText(settings.ticketHeader?.address),
        phone: firstText(settings.ticketHeader?.phone),
        rfc: firstText(settings.ticketHeader?.rfc) || undefined,
        quoteNumber: formatQuoteNumber(quote.quoteNumber),
        date: toDate(quote.createdAt),
        expirationDays,
        customerName: firstText(quote.client?.name, quote.customer?.name, quote.customerName) || 'Cliente General',
        customerPhone: firstText(quote.client?.phone, quote.customer?.phone, quote.customerPhone) || undefined,
        cashierName: firstText(quote.user?.name) || 'Cajero',
        items,
        subtotal,
        tax,
        total,
        notes: firstText(quote.notes) || undefined,
        footerMessage: firstText(settings.ticketFooter?.message) || undefined,
        website: firstText(settings.ticketFooter?.website) || undefined,
        logoSvg: settings.logoSvg ?? null,
        exchangeRate,
        showTotalUSD: true,
    };
}
