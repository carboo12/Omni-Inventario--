import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn, formatNumber } from '@/lib/utils';

interface ReceiptItem {
    quantity: number;
    description: string;
    price: number;
    total: number;
    /** Unidad de medida de la presentación vendida (ej. 'lb', 'qtl', 'ud'). */
    unit?: string;
    /** Nivel de precio aplicado (1 = priceNIO, 2 = price2, 3 = price3, 4 = price4). */
    priceLevel?: number;
    /** Artículo sin stock vendido bajo encargo (entrega pendiente). */
    pending?: boolean;
}

interface ReceiptProps {
    pharmacyName: string;
    address: string;
    phone: string;
    rfc?: string;
    ticketId: string;
    date: Date;
    cashierName: string;
    clientName?: string;
    items: ReceiptItem[];
    subtotal: number;
    tax: number;
    total: number;
    paymentMethod: string;
    amountPaid: number;
    change: number;
    footerMessage?: string;
    website?: string;
    logoSvg?: string | null;
    previewMode?: boolean;
    currencySymbol?: string;
    exchangeRate?: number;
    showTotalUSD?: boolean;
    /** Indica si el ticket contiene al menos un artículo encargado. */
    hasEncargoItems?: boolean;
    /** Marca la impresión como una reimpresión del último ticket. */
    isReprint?: boolean;
}

export const ReceiptTemplate: React.FC<ReceiptProps> = ({
    pharmacyName,
    address,
    phone,
    rfc,
    ticketId,
    date,
    cashierName,
    clientName,
    items,
    subtotal,
    tax,
    total,
    paymentMethod,
    amountPaid,
    change,
    footerMessage,
    website,
    logoSvg,
    previewMode = false,
    currencySymbol = "C$",
    exchangeRate = 36.5,
    showTotalUSD = false,
    hasEncargoItems = false,
    isReprint = false
}) => {
    const totalUSD = total / exchangeRate;
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    const content = (
        <div 
            id={previewMode ? "receipt-preview" : "ticket-print-area"} 
            className={cn(
                "p-2 text-[13px] w-[80mm] max-w-[80mm] mx-auto text-black",
                previewMode 
                    ? "bg-white border text-left" 
                    : "fixed left-0 top-0 w-[80mm] max-w-[80mm] bg-white text-black z-[-9999] opacity-0 print:opacity-100 print:z-[9999] print:visible print:static print:m-0 print:p-0"
            )}
        >
            <div className="text-center">
                {/* Logo Premium */}
                {logoSvg && (
                    <div className="flex justify-center mb-1">
                        <div
                            dangerouslySetInnerHTML={{ __html: logoSvg }}
                            className="w-12 h-12 flex items-center justify-center [&>svg]:w-full [&>svg]:h-full [&>svg]:max-w-full [&>svg]:max-h-full"
                            style={{ maxWidth: '48px', maxHeight: '48px' }}
                        />
                    </div>
                )}
                <div className={cn(logoSvg && "mt-1")}>
                    <h2 className="text-[19px] leading-tight font-extrabold uppercase">{pharmacyName}</h2>
                    <p className="whitespace-pre-line text-[13px] leading-tight">{address}</p>
                    {phone && <p className="text-[13px] leading-tight">{phone}</p>}
                    {rfc && <p className="text-[13px] leading-tight">RFC: {rfc}</p>}
                </div>
                {isReprint && (
                    <p className="mt-1 font-black text-[12px] border-2 border-black rounded px-1 py-0.5 inline-block">
                        *** REIMPRESIÓN DE TICKET ***
                    </p>
                )}
            </div>

            <div className="mt-2">
                <p className="text-[13px] leading-tight">Ticket: {ticketId}</p>
                <p className="text-[13px] leading-tight">Fecha: {format(date, 'dd/MM/yyyy HH:mm', { locale: es })}</p>
                <p className="text-[13px] leading-tight">Cajero: {cashierName}</p>
                <p className="text-[13px] leading-tight">Cliente: {clientName || 'Cliente Genérico'}</p>
            </div>

            <div className="border-b border-black border-dashed my-2" />

            <table className="w-full text-left">
                <tbody>
                    {items.map((item, index) => (
                        <tr key={index}>
                            <td className="py-0.5 text-[13px] font-semibold leading-snug">
                                <div className="text-[13px] font-semibold leading-snug">
                                    {item.quantity}
                                    {item.unit ? ` ${item.unit.toUpperCase()}` : ''}
                                    {' - '}{item.description}
                                    {' - P.U '}{currencySymbol} {formatNumber(item.price)}
                                    {' - '}{currencySymbol} {formatNumber(item.total)}
                                </div>
                                {item.pending && (
                                    <div className="text-[11px] font-bold text-[#FF5722] uppercase leading-tight">
                                        * ENCARGO / ENTREGA PENDIENTE
                                    </div>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {hasEncargoItems && (
                <div className="my-2 border-2 border-black rounded p-1 text-center font-bold text-[12px] leading-tight">
                    ARTÍCULO ENCARGADO / PENDIENTE DE ENTREGA - PAGADO
                </div>
            )}

            <div className="border-b border-black border-dashed my-2" />

            <div className="flex justify-between text-[14px] font-semibold">
                <span>Subtotal:</span>
                <span>{currencySymbol} {formatNumber(subtotal)}</span>
            </div>
            <div className="flex justify-between text-[14px] font-semibold">
                <span>IVA:</span>
                <span>{currencySymbol} {formatNumber(tax)}</span>
            </div>
            <div className="flex justify-between font-black text-[20px] mt-1 leading-tight">
                <span>TOTAL:</span>
                <span>{currencySymbol} {formatNumber(total)}</span>
            </div>
            {showTotalUSD && (
                <div className="flex justify-between text-[12px] italic">
                    <span>Equiv. USD (Tasa: {exchangeRate}):</span>
                    <span>$ {formatNumber(totalUSD)}</span>
                </div>
            )}

            <div className="border-b border-black border-dashed my-2" />

            <div className="flex justify-between text-[14px]">
                <span>Pago ({paymentMethod}):</span>
                <span>{currencySymbol} {formatNumber(amountPaid)}</span>
            </div>
            <div className="flex justify-between text-[14px]">
                <span>Cambio:</span>
                <span>{currencySymbol} {formatNumber(change)}</span>
            </div>

            <div className="mt-4 text-center">
                <p className="whitespace-pre-line text-[13px]">{footerMessage}</p>
                {website && <p className="text-[13px]">{website}</p>}
                <p className="mt-2 font-bold text-[13px]">*** GRACIAS POR SU COMPRA ***</p>
            </div>

            {!previewMode && (
                <style jsx global>{`
                    @media print {
                        @page {
                            size: auto !important;
                            margin: 0 !important;
                        }
                        html, body {
                            margin: 0 !important;
                            padding: 0 !important;
                            width: 100% !important;
                            height: auto !important;
                            min-height: 0 !important;
                            overflow: visible !important;
                            background: #ffffff !important;
                        }
                        [role="dialog"], [data-radix-portal], .radix-dialog-overlay, .radix-dialog-content {
                            display: none !important;
                            visibility: hidden !important;
                        }
                        body * {
                            visibility: hidden !important;
                        }
                        #ticket-print-area, #ticket-print-area * {
                            visibility: visible !important;
                            box-sizing: border-box !important;
                            color: #000000 !important;
                            text-shadow: 0 0 0.3px #000 !important;
                            print-color-adjust: exact !important;
                            -webkit-print-color-adjust: exact !important;
                        }
                        #ticket-print-area table,
                        #ticket-print-area tbody,
                        #ticket-print-area tr,
                        #ticket-print-area td {
                            page-break-inside: auto !important;
                            break-inside: auto !important;
                            page-break-after: auto !important;
                            break-after: auto !important;
                            page-break-before: auto !important;
                            break-before: auto !important;
                        }
                        #ticket-print-area {
                            position: static !important;
                            float: none !important;
                            width: 80mm !important;
                            max-width: 80mm !important;
                            min-height: 0 !important;
                            height: auto !important;
                            padding: 2mm 2mm 5mm 2mm !important;
                            margin: 0 auto !important;
                            overflow: visible !important;
                            display: block !important;
                        }
                    }
                `}</style>
            )}
        </div>
    );

    if (previewMode) {
        return content;
    }

    if (!isMounted) {
        return null; // Evitar hidratación mismatch
    }

    return createPortal(content, document.body);
};
