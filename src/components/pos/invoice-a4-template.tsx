import React from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn, formatNumber } from '@/lib/utils';
import { PENDING_COLLECTION_BANNER } from '@/lib/route-settlement';
import type { ReceiptHtmlData } from '@/lib/print-iframe';

export interface InvoiceA4TemplateProps {
    pharmacyName: string;
    address: string;
    phone: string;
    rfc?: string;
    ticketId: string;
    date: Date | string;
    cashierName: string;
    clientName?: string;
    clientDocument?: string;
    clientAddress?: string;
    clientPhone?: string;
    items: Array<{
        quantity: number;
        code?: string;
        description: string;
        price: number;
        total: number;
        unit?: string;
        priceLevel?: number;
    }>;
    subtotal: number;
    tax: number;
    discount?: number;
    total: number;
    paymentMethod: string;
    amountPaid?: number;
    change?: number;
    footerMessage?: string;
    website?: string;
    logoSvg?: string | null;
    previewMode?: boolean;
    currencySymbol?: string;
    exchangeRate?: number;
    showTotalUSD?: boolean;
    isReprint?: boolean;
    deliveryType?: 'counter' | 'route' | string;
    deliveryStatus?: string;
    routeName?: string;
    deliveredByName?: string;
    /** Cobro contra entrega: agrega la leyenda de pago pendiente. */
    pendingCollection?: boolean;
}

export const InvoiceA4Template: React.FC<InvoiceA4TemplateProps> = ({
    pharmacyName,
    address,
    phone,
    rfc,
    ticketId,
    date,
    cashierName,
    clientName,
    clientDocument,
    clientAddress,
    clientPhone,
    items,
    subtotal,
    tax,
    discount = 0,
    total,
    paymentMethod,
    amountPaid = 0,
    change = 0,
    footerMessage,
    website,
    logoSvg,
    previewMode = false,
    currencySymbol = "C$",
    exchangeRate = 36.5,
    showTotalUSD = true,
    isReprint = false,
    deliveryType = 'counter',
    deliveryStatus,
    routeName,
    deliveredByName,
    pendingCollection = false,
}) => {
    const formattedDate = typeof date === 'string'
        ? format(new Date(date), 'dd/MM/yyyy HH:mm', { locale: es })
        : format(date || new Date(), 'dd/MM/yyyy HH:mm', { locale: es });

    const totalUSD = total / (exchangeRate || 36.5);
    const isRouteDelivery = deliveryType === 'route' || deliveryType === 'ROUTE';

    return (
        <div
            id={previewMode ? "invoice-preview" : "invoice-print"}
            className={cn(
                "p-8 text-sm text-black bg-white max-w-4xl mx-auto font-sans",
                previewMode
                    ? "border shadow-sm w-full my-4"
                    : "fixed -left-[1000px] top-0 opacity-0 pointer-events-none print:static print:opacity-100 print:visible"
            )}
        >
            {/* Encabezado formal con Logo, Nombre del Negocio, RUC, Dirección y Teléfono */}
            <div className="flex items-start justify-between border-b-2 border-gray-800 pb-4 mb-6">
                <div className="flex items-center gap-4">
                    {logoSvg && (
                        <div
                            dangerouslySetInnerHTML={{ __html: logoSvg }}
                            className="w-20 h-20 flex items-center justify-center [&>svg]:w-full [&>svg]:h-full [&>svg]:max-w-full [&>svg]:max-h-full"
                        />
                    )}
                    <div>
                        <h1 className="text-2xl font-extrabold uppercase tracking-wide text-gray-900">{pharmacyName}</h1>
                        <p className="text-xs whitespace-pre-line text-gray-700">{address}</p>
                        <div className="text-xs text-gray-700 mt-1 space-x-2">
                            {phone && <span><strong>Teléfono:</strong> {phone}</span>}
                            {rfc && <span>| <strong>RUC/NIT:</strong> {rfc}</span>}
                        </div>
                        {website && <p className="text-xs text-gray-600">{website}</p>}
                    </div>
                </div>
                <div className="text-right">
                    <h2 className="text-xl font-black uppercase tracking-wider text-gray-800">Factura de Venta</h2>
                    <p className="text-lg font-bold text-gray-900 mt-1">Nº {ticketId}</p>
                    <p className="text-xs text-gray-600">Fecha: {formattedDate}</p>
                    {isReprint && (
                        <p className="text-xs font-bold text-red-600 mt-1">*** REIMPRESIÓN ***</p>
                    )}
                    {isRouteDelivery && (
                        <div className="mt-2 inline-block px-2.5 py-1 text-xs font-bold text-amber-800 bg-amber-100 border border-amber-300 rounded uppercase">
                            Pedido para Ruta / Domicilio
                        </div>
                    )}
                </div>
            </div>

            {/* Cuadro de datos del cliente: Nombre, Dirección de Entrega, Teléfono, Fecha y No. Factura */}
            {pendingCollection && (
                <div className="mb-4 rounded-lg border-2 border-red-600 bg-red-50 px-4 py-2 text-center">
                    <p className="text-sm font-black tracking-wide text-red-700">{PENDING_COLLECTION_BANNER}</p>
                    <p className="mt-0.5 text-[11px] font-semibold text-red-700">
                        El rutero entrega y cobra; el importe se liquida en caja al volver.
                    </p>
                </div>
            )}
            <div className="grid grid-cols-2 gap-6 mb-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                <div className="space-y-1 text-xs">
                    <p className="font-bold text-gray-500 uppercase tracking-wider text-[11px]">Datos del Cliente</p>
                    <p className="text-sm font-bold text-gray-900">{clientName || 'Cliente de Contado'}</p>
                    {clientDocument && <p className="text-gray-700"><strong>Cédula/RUC:</strong> {clientDocument}</p>}
                    {clientAddress && <p className="text-gray-700"><strong>Dirección de Entrega:</strong> {clientAddress}</p>}
                    {clientPhone && <p className="text-gray-700"><strong>Teléfono:</strong> {clientPhone}</p>}
                </div>
                <div className="space-y-1 text-xs text-right">
                    <p className="font-bold text-gray-500 uppercase tracking-wider text-[11px]">Detalles de Venta / Despacho</p>
                    <p className="text-gray-700"><strong>Atendido por:</strong> {cashierName}</p>
                    <p className="text-gray-700"><strong>Método de Pago:</strong> <span className="font-semibold">{paymentMethod}</span></p>
                    {deliveryStatus && <p className="text-gray-700"><strong>Estado de Entrega:</strong> {deliveryStatus}</p>}
                    {routeName && <p className="text-gray-700"><strong>Hoja de Ruta:</strong> {routeName}</p>}
                </div>
            </div>

            {/* Tabla estilizada con bordes limpios: Cant | Código | Descripción | P. Unitario | Total */}
            <table className="w-full text-xs border-collapse mb-6 border border-gray-400">
                <thead>
                    <tr className="bg-gray-100 text-gray-900 border-b border-gray-400">
                        <th className="py-2.5 px-3 text-center font-bold w-16 border-r border-gray-400 uppercase">Cant.</th>
                        <th className="py-2.5 px-3 text-left font-bold w-24 border-r border-gray-400 uppercase">Código</th>
                        <th className="py-2.5 px-3 text-left font-bold border-r border-gray-400 uppercase">Descripción</th>
                        <th className="py-2.5 px-3 text-right font-bold w-28 border-r border-gray-400 uppercase">P. Unitario</th>
                        <th className="py-2.5 px-3 text-right font-bold w-28 uppercase">Total</th>
                    </tr>
                </thead>
                <tbody>
                    {items.map((item, index) => (
                        <tr key={index} className="border-b border-gray-300 odd:bg-white even:bg-gray-50">
                            <td className="py-2 px-3 text-center border-r border-gray-300 font-medium">
                                {item.quantity}{item.unit ? ` ${item.unit.toUpperCase()}` : ''}
                            </td>
                            <td className="py-2 px-3 border-r border-gray-300 font-mono">{item.code || '—'}</td>
                            <td className="py-2 px-3 border-r border-gray-300 font-medium">{item.description}</td>
                            <td className="py-2 px-3 text-right border-r border-gray-300">{currencySymbol} {formatNumber(item.price)}</td>
                            <td className="py-2 px-3 text-right font-semibold">{currencySymbol} {formatNumber(item.total)}</td>
                        </tr>
                    ))}
                    {items.length === 0 && (
                        <tr>
                            <td colSpan={5} className="py-6 text-center text-gray-400">Sin artículos registrados</td>
                        </tr>
                    )}
                </tbody>
            </table>

            {/* Resumen financiero: Subtotal, IVA, Total C$, Equivalente USD */}
            <div className="flex justify-end mb-8">
                <table className="w-72 text-xs border-collapse">
                    <tbody>
                        <tr>
                            <td className="py-1.5 text-gray-600 font-medium">Subtotal:</td>
                            <td className="py-1.5 text-right font-semibold">{currencySymbol} {formatNumber(subtotal)}</td>
                        </tr>
                        {discount > 0 && (
                            <tr>
                                <td className="py-1.5 text-red-600 font-medium">Descuento:</td>
                                <td className="py-1.5 text-right font-semibold text-red-600">- {currencySymbol} {formatNumber(discount)}</td>
                            </tr>
                        )}
                        <tr>
                            <td className="py-1.5 text-gray-600 font-medium">IVA (15%):</td>
                            <td className="py-1.5 text-right font-semibold">{currencySymbol} {formatNumber(tax)}</td>
                        </tr>
                        <tr className="border-t-2 border-gray-800 text-sm font-bold text-gray-900">
                            <td className="py-2 uppercase">TOTAL:</td>
                            <td className="py-2 text-right text-base">{currencySymbol} {formatNumber(total)}</td>
                        </tr>
                        {showTotalUSD && (
                            <tr className="text-gray-600 italic">
                                <td className="py-1 text-xs">Equivalente USD:</td>
                                <td className="py-1 text-right text-xs font-medium">$ {formatNumber(totalUSD)}</td>
                            </tr>
                        )}
                        {amountPaid > 0 && (
                            <>
                                <tr className="border-t border-dashed border-gray-300">
                                    <td className="py-1 text-gray-600">Monto Pagado:</td>
                                    <td className="py-1 text-right">{currencySymbol} {formatNumber(amountPaid)}</td>
                                </tr>
                                <tr>
                                    <td className="py-1 text-gray-600">Cambio:</td>
                                    <td className="py-1 text-right">{currencySymbol} {formatNumber(change)}</td>
                                </tr>
                            </>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Sección de Firma de Recibido */}
            <div className="flex justify-between items-end mt-16 pt-4 border-t border-gray-200 page-break-inside-avoid">
                <div className="w-5/12 text-center">
                    <div className="border-t border-black pt-1.5 font-bold text-xs">
                        _______________________
                    </div>
                    <p className="font-semibold text-xs mt-1">Entregado por (Ruta)</p>
                    <p className="text-[10px] text-gray-500">{deliveredByName || 'Nombre y firma del repartidor'}</p>
                </div>
                <div className="w-5/12 text-center">
                    <div className="border-t border-black pt-1.5 font-bold text-xs">
                        _______________________
                    </div>
                    <p className="font-semibold text-xs mt-1">Recibido Conforme (Cliente)</p>
                    <p className="text-[10px] text-gray-500">{clientName || 'Nombre y firma del cliente'}</p>
                </div>
            </div>

            {/* Pie de página */}
            <div className="text-center mt-10 pt-4 border-t border-gray-200 text-xs text-gray-500 space-y-1">
                {footerMessage && <p className="font-medium text-gray-700">{footerMessage}</p>}
                {website && <p>{website}</p>}
                <p className="text-[10px]">Este documento sirve como comprobante de entrega y factura de venta.</p>
            </div>

            {!previewMode && (
                <style dangerouslySetInnerHTML={{ __html: `@media print {
                    @page {
                        size: letter;
                        margin: 12mm;
                    }
                    body * {
                        visibility: hidden;
                    }
                    #invoice-print, #invoice-print * {
                        visibility: visible;
                        color: #000000 !important;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                    #invoice-print {
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 100%;
                        margin: 0;
                        padding: 0;
                        opacity: 1 !important;
                        box-shadow: none !important;
                        border: none !important;
                    }
                }` }} />
            )}
        </div>
    );
};

export default InvoiceA4Template;
