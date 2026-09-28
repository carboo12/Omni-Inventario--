import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn, formatNumber } from '@/lib/utils';
import { useReceiptSettings } from '@/hooks/use-receipt-settings';
import { PENDING_COLLECTION_BANNER } from '@/lib/route-settlement';

interface ReceiptItem {
    quantity: number;
    description: string;
    price: number;
    total: number;
    unit?: string;
    priceLevel?: number;
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
    hasEncargoItems?: boolean;
    isReprint?: boolean;
    /** Cobro contra entrega: agrega la leyenda de pago pendiente. */
    pendingCollection?: boolean;
}

const GENERIC_UNITS = ['ud', 'unidad', 'unid', 'un', 'pza', 'pz'];

function formatUnitLabel(unit?: string): string | null {
    if (!unit) return null;
    const trimmed = unit.trim();
    if (!trimmed) return null;
    const lower = trimmed.toLowerCase();
    if (GENERIC_UNITS.includes(lower)) {
        return null;
    }
    if (trimmed.startsWith('(') && trimmed.endsWith(')')) {
        return trimmed;
    }
    return `(${trimmed})`;
}

/** Presentación en línea continua: sin paréntesis ni cursiva (En Línea con la Cantidad). */
function formatInlinePresentation(unit?: string): string | null {
    if (!unit) return null;
    const unwrapped = unit.trim().replace(/^\((.*)\)$/, '$1').trim();
    if (!unwrapped) return null;
    if (GENERIC_UNITS.includes(unwrapped.toLowerCase())) {
        return null;
    }
    return unwrapped;
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
    isReprint = false,
    pendingCollection = false
}) => {
    const totalUSD = total / exchangeRate;
    const [isMounted, setIsMounted] = useState(false);
    // Diseño del ticket elegido en /settings/ticket: la vista previa previa a
    // imprimir debe mostrar exactamente la misma línea que sale por la impresora.
    const receiptSettings = useReceiptSettings();
    const isInline = receiptSettings?.presentationLayout === 'INLINE_QTY';
    const presentationFontSize = receiptSettings?.fontSizePresentation;

    useEffect(() => {
        setIsMounted(true);
    }, []);

    const content = (
        <div
            id={previewMode ? "receipt-preview" : "ticket-print-area"}
            className={cn(
                "p-2 text-[12px] w-[80mm] max-w-[80mm] mx-auto text-black bg-white h-auto min-h-0 overflow-visible",
                previewMode
                    ? "border text-left"
                    : "hidden print:block print:w-[80mm] print:max-w-[80mm] print:p-0 print:m-0 print:mx-0 print:h-auto print:min-h-full print:overflow-visible"
            )}
        >
            <div className="text-center">
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
                    <h2 className="text-[18px] leading-tight font-extrabold uppercase">{pharmacyName}</h2>
                    <p className="whitespace-pre-line text-[12px] leading-tight">{address}</p>
                    {phone && <p className="text-[12px] leading-tight">{phone}</p>}
                    {rfc && <p className="text-[12px] leading-tight">RFC: {rfc}</p>}
                </div>
                {isReprint && (
                    <p className="mt-1 font-black text-[12px] border-2 border-black rounded px-1 py-0.5 inline-block">
                        *** REIMPRESIÓN DE TICKET ***
                    </p>
                )}
                {pendingCollection && (
                    <p className="mt-1 font-black text-[11px] leading-tight border-2 border-black rounded px-1 py-0.5 inline-block">
                        {PENDING_COLLECTION_BANNER}
                    </p>
                )}
            </div>

            <div className="mt-2 text-[12px]">
                <p className="leading-tight">Ticket: {ticketId}</p>
                <p className="leading-tight">Fecha: {format(date, 'dd/MM/yyyy HH:mm', { locale: es })}</p>
                <p className="leading-tight">Cajero: {cashierName}</p>
                <p className="leading-tight">Cliente: {clientName || 'Cliente Genérico'}</p>
            </div>

            {/* Encabezado del Detalle: Estilo Bazar El Cairo */}
            <div className="text-center font-bold uppercase text-[13px] tracking-wide border-t border-b border-black py-1 my-2">
                Detalle Factura
            </div>

            {/* Tabla con encabezados: Cant | Producto | P. Unit | Total */}
            <table className="w-full text-left border-collapse text-[12px] table-auto">
                <thead>
                    <tr className="border-b border-black font-bold">
                        <th className="col-cant text-left py-1 px-0.5 w-[12%] whitespace-nowrap font-bold">Cant</th>
                        <th className="col-prod text-left py-1 px-0.5 w-[48%] break-words">Producto</th>
                        <th className="col-price text-right py-1 px-0.5 w-[20%] whitespace-nowrap">P. Unit</th>
                        <th className="col-total text-right py-1 px-0.5 w-[20%] whitespace-nowrap">Total</th>
                    </tr>
                </thead>
                <tbody>
                    {items.map((item, index) => {
                        // EN LÍNEA CON LA CANTIDAD → [Cantidad] [Presentación] [Nombre] [P. Unit] [Total]
                        // ABAJO DEL NOMBRE → [Cantidad] [Nombre] [P. Unit] [Total] + presentación en 2.ª línea
                        const presentationText = isInline
                            ? formatInlinePresentation(item.unit)
                            : formatUnitLabel(item.unit);
                        return (
                            <tr key={index} className="item-row border-t border-dashed border-black">
                                <td className="col-cant align-top text-left py-1 px-0.5 whitespace-nowrap font-bold">
                                    {item.quantity}
                                </td>
                                <td className="col-prod align-top text-left py-1 px-0.5 break-words font-semibold" style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}>
                                    {isInline ? (
                                        <div>
                                            {presentationText && (
                                                <span style={presentationFontSize
                                                    ? { fontSize: `${presentationFontSize}px`, margin: '0 3px' }
                                                    : { margin: '0 3px' }}>
                                                    {presentationText}
                                                </span>
                                            )}
                                            <span>{item.description}</span>
                                        </div>
                                    ) : (
                                        <>
                                            <div>{item.description}</div>
                                            {presentationText && (
                                                <div className="text-[0.9em] italic font-normal">{presentationText}</div>
                                            )}
                                        </>
                                    )}
                                </td>
                                <td className="col-price align-top text-right py-1 px-0.5 whitespace-nowrap font-semibold">
                                    {formatNumber(item.price)}
                                </td>
                                <td className="col-total align-top text-right py-1 px-0.5 whitespace-nowrap font-semibold">
                                    {formatNumber(item.total)}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>

            <div className="border-b border-black border-dashed my-2" />

            <div className="flex justify-between text-[13px] font-semibold">
                <span>Subtotal:</span>
                <span>{currencySymbol} {formatNumber(subtotal)}</span>
            </div>
            <div className="flex justify-between text-[13px] font-semibold">
                <span>IVA:</span>
                <span>{currencySymbol} {formatNumber(tax)}</span>
            </div>
            <div className="flex justify-between font-black text-[19px] mt-1 leading-tight">
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

            <div className="flex justify-between text-[13px]">
                <span>Pago ({paymentMethod}):</span>
                <span>{currencySymbol} {formatNumber(amountPaid)}</span>
            </div>
            <div className="flex justify-between text-[13px]">
                <span>Cambio:</span>
                <span>{currencySymbol} {formatNumber(change)}</span>
            </div>

            <div className="mt-4 text-center text-[12px]">
                <p className="whitespace-pre-line">{footerMessage}</p>
                {website && <p>{website}</p>}
                <p className="mt-2 font-bold text-[13px]">*** GRACIAS POR SU COMPRA ***</p>
            </div>
        </div>
    );

    if (previewMode) {
        return content;
    }

    if (!isMounted) {
        return null;
    }

    return createPortal(content, document.body);
};