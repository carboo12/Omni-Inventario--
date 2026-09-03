import React from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn, formatNumber } from '@/lib/utils';

interface FullPageInvoiceItem {
    quantity: number;
    description: string;
    price: number;
    total: number;
    /** Unidad de medida de la presentación vendida (ej. 'lb', 'qtl', 'ud'). */
    unit?: string;
    /** Nivel de precio aplicado (1 = priceNIO, 2 = price2, 3 = price3, 4 = price4). */
    priceLevel?: number;
    /** Código del producto (opcional). */
    code?: string;
}

interface FullPageInvoiceProps {
    pharmacyName: string;
    address: string;
    phone: string;
    rfc?: string;
    ticketId: string;
    date: Date;
    cashierName: string;
    clientName?: string;
    clientDocument?: string;
    items: FullPageInvoiceItem[];
    subtotal: number;
    tax: number;
    discount?: number;
    total: number;
    paymentMethod: string;
    amountPaid: number;
    change: number;
    footerMessage?: string;
    website?: string;
    logoSvg?: string | null;
    previewMode?: boolean;
    currencySymbol?: string;
}

export const FullPageInvoiceTemplate: React.FC<FullPageInvoiceProps> = ({
    pharmacyName,
    address,
    phone,
    rfc,
    ticketId,
    date,
    cashierName,
    clientName,
    clientDocument,
    items,
    subtotal,
    tax,
    discount = 0,
    total,
    paymentMethod,
    amountPaid,
    change,
    footerMessage,
    website,
    logoSvg,
    previewMode = false,
    currencySymbol = "C$"
}) => {
    const taxableBase = subtotal - discount;
    const paymentType = paymentMethod.toLowerCase().includes('credit') ? 'Crédito' : 'Contado';

    return (
        <div
            id={previewMode ? "invoice-preview" : "invoice-print"}
            className={cn(
                "p-8 text-sm text-black bg-white",
                previewMode
                    ? "border shadow-sm mx-auto w-full"
                    : "fixed -left-[1000px] top-0 opacity-0 pointer-events-none print:static print:opacity-100 print:visible"
            )}
        >
            {/* Encabezado de la empresa */}
            <div className="flex items-start justify-between border-b-2 border-gray-800 pb-4 mb-6">
                <div className="flex items-center gap-3">
                    {logoSvg && (
                        <div
                            dangerouslySetInnerHTML={{ __html: logoSvg }}
                            className="w-16 h-16 flex items-center justify-center [&>svg]:w-full [&>svg]:h-full [&>svg]:max-w-full [&>svg]:max-h-full"
                            style={{ maxWidth: '64px', maxHeight: '64px' }}
                        />
                    )}
                    <div>
                        <h1 className="text-2xl font-bold uppercase tracking-wide">{pharmacyName}</h1>
                        <p className="text-xs whitespace-pre-line text-gray-700">{address}</p>
                        <p className="text-xs text-gray-700">
                            {[phone && `Tel: ${phone}`, rfc && `RUC/ID Fiscal: ${rfc}`].filter(Boolean).join(' | ')}
                        </p>
                        {website && <p className="text-xs text-gray-600">{website}</p>}
                    </div>
                </div>
                <div className="text-right">
                    <h2 className="text-lg font-extrabold uppercase tracking-wide">Factura de Venta</h2>
                    <p className="text-sm font-bold text-gray-800">N° {ticketId}</p>
                </div>
            </div>

            {/* Datos de la factura y del cliente */}
            <div className="grid grid-cols-2 gap-6 mb-6">
                <div className="text-xs space-y-1">
                    <p className="font-semibold text-gray-500 uppercase tracking-wide">Datos del Cliente</p>
                    <p className="text-sm font-bold">{clientName || 'Cliente Genérico'}</p>
                    {clientDocument && <p>RUC/Cédula: {clientDocument}</p>}
                    <p>Fecha de Emisión: {format(date, 'dd/MM/yyyy HH:mm', { locale: es })}</p>
                    <p>Atendido por: {cashierName}</p>
                </div>
                <div className="text-xs space-y-1 text-right">
                    <p className="font-semibold text-gray-500 uppercase tracking-wide">Información de Pago</p>
                    <p>Tipo de Pago: <span className="font-bold">{paymentType}</span></p>
                    <p>Método: {paymentMethod}</p>
                </div>
            </div>

            {/* Tabla de ítems */}
            <table className="w-full text-xs border-collapse mb-6">
                <thead>
                    <tr className="bg-gray-800 text-white">
                        <th className="py-2 px-2 text-left font-semibold w-8">#</th>
                        <th className="py-2 px-2 text-left font-semibold w-20">Código</th>
                        <th className="py-2 px-2 text-left font-semibold">Descripción</th>
                        <th className="py-2 px-2 text-right font-semibold w-16">Cant.</th>
                        <th className="py-2 px-2 text-right font-semibold w-24">Precio Unit.</th>
                        <th className="py-2 px-2 text-right font-semibold w-28">Subtotal</th>
                    </tr>
                </thead>
                <tbody>
                    {items.map((item, index) => (
                        <tr key={index} className="border-b border-gray-200">
                            <td className="py-2 px-2">{index + 1}</td>
                            <td className="py-2 px-2">{item.code || '—'}</td>
                            <td className="py-2 px-2">
                                {item.description}
                                {item.unit ? <span className="text-gray-500"> ({item.unit})</span> : null}
                            </td>
                            <td className="py-2 px-2 text-right">{formatNumber(item.quantity)}</td>
                            <td className="py-2 px-2 text-right">{currencySymbol} {formatNumber(item.price)}</td>
                            <td className="py-2 px-2 text-right font-medium">{currencySymbol} {formatNumber(item.total)}</td>
                        </tr>
                    ))}
                    {items.length === 0 && (
                        <tr>
                            <td colSpan={6} className="py-4 text-center text-gray-400">Sin artículos</td>
                        </tr>
                    )}
                </tbody>
            </table>

            {/* Pie de factura */}
            <div className="flex justify-end mb-6">
                <div className="w-72 space-y-1 text-sm">
                    <div className="flex justify-between">
                        <span className="text-gray-600">Subtotal:</span>
                        <span>{currencySymbol} {formatNumber(subtotal)}</span>
                    </div>
                    {discount > 0 && (
                        <div className="flex justify-between text-red-600">
                            <span>Descuento:</span>
                            <span>- {currencySymbol} {formatNumber(discount)}</span>
                        </div>
                    )}
                    <div className="flex justify-between">
                        <span className="text-gray-600">IVA (15%):</span>
                        <span>{currencySymbol} {formatNumber(tax)}</span>
                    </div>
                    <div className="flex justify-between items-center border-t-2 border-gray-800 pt-2 mt-1">
                        <span className="font-extrabold text-base uppercase">Total Factura</span>
                        <span className="font-extrabold text-xl">{currencySymbol} {formatNumber(total)}</span>
                    </div>
                    <div className="border-t border-dashed border-gray-400 my-2" />
                    <div className="flex justify-between">
                        <span className="text-gray-600">Efectivo:</span>
                        <span>{currencySymbol} {formatNumber(amountPaid)}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-600">Cambio:</span>
                        <span>{currencySymbol} {formatNumber(change)}</span>
                    </div>
                    <p className="text-[10px] text-gray-500 mt-2 text-right">
                        Base imponible: {currencySymbol} {formatNumber(taxableBase)}
                    </p>
                </div>
            </div>

            {/* Notas de garantía / firma */}
            <div className="flex items-end justify-between mt-10">
                <div className="text-[10px] text-gray-600 max-w-xs whitespace-pre-line">
                    {footerMessage || 'Gracias por su compra. Sin derecho a devolución.'}
                </div>
                <div className="text-center">
                    <div className="border-t border-gray-800 pt-1 px-8">
                        <p className="text-xs font-semibold">Firma del Cliente</p>
                    </div>
                </div>
            </div>

            {!previewMode && (
                <style dangerouslySetInnerHTML={{ __html: `@media print {
                        @page {
                            size: letter;
                            margin: 15mm;
                        }
                        body * {
                            visibility: hidden;
                        }
                        #app-sidebar, nav, aside {
                            display: none !important;
                        }
                        #invoice-print, #invoice-print * {
                            visibility: visible;
                            color: #000000 !important;
                            text-shadow: 0 0 0.3px #000 !important;
                            print-color-adjust: exact !important;
                            -webkit-print-color-adjust: exact !important;
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
                            overflow: visible !important;
                        }
                    }` }} />
            )}
        </div>
    );
};
