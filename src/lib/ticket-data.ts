// Convierte una venta ya registrada en la BD en los MISMOS datos de ticket que usa el
// cobro directo (prepareReceiptData en pos/client.tsx). Garantiza que la reimpresión y
// el cobro impriman exactamente la misma plantilla ESC/POS con el mismo esquema de datos.
import { getDeliveryStatusLabel, isRouteDelivery } from './delivery-status';

export const buildReceiptDataFromInvoice = (invoice: any, settings: any, ticketLabel: string) => {
    // Resuelve el nombre del cliente contemplando los distintos orígenes de datos
    // (snapshot de nombre, relación de cliente con 'name' o con 'fullName').
    const customerName = invoice.customerName
        || invoice.customer?.name
        || invoice.customer?.fullName
        || 'Cliente Genérico';

    const items = (invoice.salesInvoiceItem || []).map((item: any) => {
        // Metadatos de presentación persistidos al momento del cobro.
        // Si se guardó una presentación (ej. 'LITRO'), esa es la unidad exacta del ticket.
        const unit = item.presentationName || item.baseUnit || 'ud';

        return {
            quantity: item.quantity,
            // Misma estructura que el cobro directo: nombre del producto como descripción.
            description: item.productName,
            price: item.unitPrice,
            total: item.totalPrice,
            // Cantidad + presentación exacta (el template renderiza "{quantity} {unit}").
            unit,
            // Código del producto para la columna "Código" de la Hoja Normal.
            code: item.product?.barcode || undefined,
            // Nivel de precio aplicado al momento del cobro (1 = base/general).
            priceLevel: item.priceLevel || 1,
            pending: !!item.isEncargo,
        };
    });

    // Desglose de impuestos: usa los valores persistidos; para facturas históricas
    // sin subtotal/tax, se reconstruye el subtotal desde las líneas y el impuesto como
    // la diferencia con el total.
    const subtotal = (typeof invoice.subtotal === 'number' && invoice.subtotal > 0)
        ? invoice.subtotal
        : items.reduce((sum: number, i: any) => sum + (typeof i.total === 'number' ? i.total : 0), 0);
    const reportedTotal = (typeof invoice.totalAmount === 'number') ? invoice.totalAmount : subtotal;
    const tax = (typeof invoice.tax === 'number') ? invoice.tax : Math.max(0, reportedTotal - subtotal);

    return {
        pharmacyName: settings.ticketHeader.name,
        address: settings.ticketHeader.address,
        phone: settings.ticketHeader.phone,
        rfc: settings.ticketHeader.rfc,
        ticketId: ticketLabel,
        date: new Date(invoice.date),
        cashierName: invoice.user?.name || 'Cajero',
        clientName: customerName,
        // La dirección/teléfono de la venta a domicilio prima sobre los del cliente
        // (pueden diferir si el cliente pidió entregar en otro punto).
        clientAddress: invoice.deliveryAddress || invoice.customer?.address || undefined,
        clientPhone: invoice.deliveryPhone || invoice.customer?.phone || undefined,
        items,
        subtotal,
        tax,
        total: reportedTotal,
        paymentMethod: invoice.paymentMethod,
        amountPaid: reportedTotal,
        change: Math.max(0, reportedTotal - subtotal - tax),
        hasEncargoItems: items.some((i: any) => i.pending),
        footerMessage: settings.ticketFooter.message,
        website: settings.ticketFooter.website,
        logoSvg: settings.logoSvg,
        exchangeRate: parseFloat(settings.exchangeRate) || 36.5,
        showTotalUSD: true,
        isReprint: true,
        // Datos de reparto: solo se imprimen en la factura Hoja Normal.
        deliveryType: isRouteDelivery(invoice.deliveryType) ? 'route' : 'counter',
        deliveryStatus: isRouteDelivery(invoice.deliveryType)
            ? getDeliveryStatusLabel(invoice.deliveryStatus, invoice.payOnDelivery)
            : undefined,
        routeName: invoice.routeStop?.route?.name || undefined,
        deliveredByName: invoice.routeStop?.route?.rutero?.name || undefined,
    };
};
