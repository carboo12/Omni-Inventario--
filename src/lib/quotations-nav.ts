// Utilidades compartidas entre el módulo de Cotizaciones y el Punto de Venta.
//
// 1. QUOTATIONS_LIST_QUERY_KEY: clave de la caché de React Query con la lista de
//    cotizaciones. El POS la invalida al guardar una cotización nueva para que al
//    navegar a /cotizaciones la tabla ya muestre el registro.
//
// 2. Handshake de "Cargar en POS": la tabla de cotizaciones deja el número de la
//    cotización en sessionStorage y navega a /pos; el POS la consume al montarse
//    (antes de que usePersistedCart lea el carrito) y la borra. Se usa
//    sessionStorage —igual que el pre-carga de pedidos 'pos-preload-order'— para
//    que el traspaso sobreviva al remontaje de los componentes del POS.

/** Clave de caché de la lista de cotizaciones (compartida POS <-> Cotizaciones). */
export const QUOTATIONS_LIST_QUERY_KEY = ['quotations', 'list'] as const;

/** Clave de sessionStorage donde se deposita la cotización a cargar en el POS. */
export const QUOTE_PRELOAD_STORAGE_KEY = 'pos-quote-preload';

/** Formatea el número interno de la BD como documento COT-0000001. */
export function formatQuoteNumber(quoteNumber: number | string | null | undefined): string {
    const n = Number(quoteNumber);
    if (!Number.isFinite(n)) return 'COT-0000000';
    return `COT-${String(n).padStart(7, '0')}`;
}

/** Deja pendiente una cotización para que el POS la cargue en el carrito. */
export function stageQuoteForPOS(quoteNumber: number | string): void {
    if (typeof window === 'undefined') return;
    try {
        window.sessionStorage.setItem(QUOTE_PRELOAD_STORAGE_KEY, JSON.stringify({ quoteNumber: Number(quoteNumber) }));
    } catch {
        // sessionStorage puede no estar disponible; el POS simplemente no precargará.
    }
}

/** Lee la cotización pendiente de cargar en el POS (si la hay). */
export function readStagedQuoteForPOS(): { quoteNumber: number } | null {
    if (typeof window === 'undefined') return null;
    try {
        const raw = window.sessionStorage.getItem(QUOTE_PRELOAD_STORAGE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as { quoteNumber?: number };
        if (!parsed || !Number.isFinite(Number(parsed.quoteNumber))) return null;
        return { quoteNumber: Number(parsed.quoteNumber) };
    } catch {
        return null;
    }
}

/** Indica si hay una cotización esperando a ser cargada en el POS. */
export function hasStagedQuoteForPOS(): boolean {
    return readStagedQuoteForPOS() !== null;
}

/** Limpia la cotización pendiente tras consumirla (o si ya no es válida). */
export function clearStagedQuoteForPOS(): void {
    if (typeof window === 'undefined') return;
    try {
        window.sessionStorage.removeItem(QUOTE_PRELOAD_STORAGE_KEY);
    } catch {
        // noop
    }
}
