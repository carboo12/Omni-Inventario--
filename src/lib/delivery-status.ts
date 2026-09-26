// Estados de entrega de una venta. El nombre del enum en BD es el mismo que el de
// Prisma (`DeliveryStatus`); aquí solo viven las etiquetas en español y los helpers
// compartidos por el POS, la vista de ruta y las plantillas de impresión.

export const DELIVERY_STATUSES = ['PENDIENTE_ENTREGA', 'EN_RUTA', 'ENTREGADO'] as const;

export type DeliveryStatus = (typeof DELIVERY_STATUSES)[number];

/** Tipo de despacho de la venta: mostrador o entrega a domicilio. */
export const DELIVERY_TYPES = ['MOSTRADOR', 'RUTA'] as const;

export type DeliveryType = (typeof DELIVERY_TYPES)[number];

const STATUS_LABELS: Record<DeliveryStatus, string> = {
    PENDIENTE_ENTREGA: 'Pendiente de entrega',
    EN_RUTA: 'En ruta',
    ENTREGADO: 'Entregado',
};

/** Etiquetas por estado para selectores, tarjetas y filtros. */
export const DELIVERY_STATUS_OPTIONS: { value: DeliveryStatus; label: string }[] = [
    { value: 'PENDIENTE_ENTREGA', label: STATUS_LABELS.PENDIENTE_ENTREGA },
    { value: 'EN_RUTA', label: STATUS_LABELS.EN_RUTA },
    { value: 'ENTREGADO', label: STATUS_LABELS.ENTREGADO },
];

/** Colores de badge por estado (Tailwind, clase completa). */
export const DELIVERY_STATUS_BADGE: Record<DeliveryStatus, string> = {
    PENDIENTE_ENTREGA: 'bg-amber-100 text-amber-800 border-amber-300',
    EN_RUTA: 'bg-blue-100 text-blue-800 border-blue-300',
    ENTREGADO: 'bg-emerald-100 text-emerald-800 border-emerald-300',
};

/**
 * Traduce el estado persistido a texto legible. Cuando la venta se cobró contra
 * entrega, el estado final se muestra como "Entregado y cobrado" porque el dinero
 * entró a caja en el momento de la entrega.
 */
export function getDeliveryStatusLabel(status?: string | null, paidOnDelivery?: boolean): string {
    if (!status) return 'Venta de mostrador';
    if (status === 'ENTREGADO' && paidOnDelivery) return 'Entregado y cobrado';
    return STATUS_LABELS[status as DeliveryStatus] || String(status);
}

/** `true` si la venta es un pedido a domicilio destined a una hoja de ruta. */
export function isRouteDelivery(deliveryType?: string | null): boolean {
    return deliveryType === 'RUTA';
}

/** `true` si el pedido aún no fue entregado. */
export function isPendingDelivery(status?: string | null): boolean {
    return status === 'PENDIENTE_ENTREGA' || status === 'EN_RUTA';
}

/** Nombre legible del método de cobro contra entrega. */
export const PAY_ON_DELIVERY_LABEL = 'Cobro contra entrega';
