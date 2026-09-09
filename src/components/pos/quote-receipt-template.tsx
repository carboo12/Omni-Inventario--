import React from 'react';
import { format, addDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn, formatNumber } from '@/lib/utils';

interface QuoteReceiptItem {
    quantity: number;
    description: string;
    price: number;
    total: number;
}

interface QuoteReceiptProps {
    businessName: string;
    address: string;
    phone: string;
    rfc?: string;
    quoteNumber: string;
    date: Date;
    expirationDays: number;
    customerName: string;
    customerPhone?: string;
    cashierName: string;
    items: QuoteReceiptItem[];
    subtotal: number;
    total: number;
    notes?: string;
    footerMessage?: string;
    website?: string;
    logoSvg?: string | null;
    previewMode?: boolean;
    currencySymbol?: string;
}

export const QuoteReceiptTemplate: React.FC<QuoteReceiptProps> = ({
    businessName,
    address,
    phone,
    rfc,
    quoteNumber,
    date,
    expirationDays,
    customerName,
    customerPhone,
    cashierName,
    items,
    subtotal,
    total,
    notes,
    footerMessage,
    website,
    logoSvg,
    previewMode = false,
    currencySymbol = "C$",
}) => {
    const expirationDate = addDays(date, expirationDays);

    return (
        <div
            id={previewMode ? "quote-receipt-preview" : "quote-receipt-print"}
            className={cn(
                "p-2 text-xs font-mono w-[80mm] mx-auto text-black",
                previewMode
                    ? "bg-white border text-left"
                    : "fixed -left-[1000px] top-0 opacity-0 pointer-events-none print:static print:opacity-100 print:visible"
            )}
        >
            <div className="text-center mb-4">
                {logoSvg && (
                    <div className="flex justify-center mb-2">
                        <div
                            dangerouslySetInnerHTML={{ __html: logoSvg }}
                            className="w-12 h-12 flex items-center justify-center [&>svg]:w-full [&>svg]:h-full [&>svg]:max-w-full [&>svg]:max-h-full"
                            style={{ maxWidth: '48px', maxHeight: '48px' }}
                        />
                    </div>
                )}
                <h2 className="text-lg font-bold uppercase">{businessName}</h2>
                <p className="whitespace-pre-line">{address}</p>
                {phone && <p>{phone}</p>}
                {rfc && <p>RFC: {rfc}</p>}
            </div>

            <div className="border-2 border-dashed border-black p-2 mb-3 text-center">
                <p className="text-sm font-bold uppercase">PRESUPUESTO / COTIZACION</p>
                <p className="text-[10px] italic mt-1">No valido como comprobante fiscal / factura</p>
            </div>

            <div className="mb-2">
                <p>No. Cotizacion: {quoteNumber}</p>
                <p>Fecha: {format(date, 'dd/MM/yyyy HH:mm', { locale: es })}</p>
                <p>Vigencia hasta: {format(expirationDate, 'dd/MM/yyyy', { locale: es })} ({expirationDays} dias)</p>
                <p>Atendido por: {cashierName}</p>
                {customerName && customerName !== 'Cliente General' && (
                    <>
                        <p>Cliente: {customerName}</p>
                        {customerPhone && <p>Tel: {customerPhone}</p>}
                    </>
                )}
            </div>

            <div className="border-b border-black border-dashed my-2" />

            <table className="w-full text-left">
                <thead>
                    <tr>
                        <th className="w-8">Cant</th>
                        <th>Desc</th>
                        <th className="text-right">P.Unit</th>
                        <th className="text-right">Total</th>
                    </tr>
                </thead>
                <tbody>
                    {items.map((item, index) => (
                        <tr key={index}>
                            <td>{item.quantity}</td>
                            <td>{item.description}</td>
                            <td className="text-right">{currencySymbol} {formatNumber(item.price)}</td>
                            <td className="text-right">{currencySymbol} {formatNumber(item.total)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>

            <div className="border-b border-black border-dashed my-2" />

            <div className="flex justify-between font-bold text-sm">
                <span>TOTAL:</span>
                <span>{currencySymbol} {formatNumber(total)}</span>
            </div>

            {notes && (
                <div className="mt-2 text-[10px] italic">
                    <p>Nota: {notes}</p>
                </div>
            )}

            <div className="mt-4 text-center border-t border-dashed border-black pt-3">
                <p className="text-[10px] font-bold">*** PRESUPUESTO NO VENDA ***</p>
                <p className="text-[10px] mt-1">Presente este documento al momento de facturar.</p>
                <p className="text-[10px]">Los precios pueden variar sin previo aviso.</p>
                {footerMessage && <p className="whitespace-pre-line mt-2">{footerMessage}</p>}
                {website && <p>{website}</p>}
            </div>

            {!previewMode && (
                <style>{`
                    @media print {
                        @page {
                            margin: 0 !important;
                            size: 80mm auto !important;
                        }
                        html,
                        body {
                            margin: 0 !important;
                            padding: 0 !important;
                        }
                        .ticket-container,
                        #quote-receipt-print.ticket-container,
                        #quote-receipt-print {
                            margin-top: 0 !important;
                            padding-top: 0 !important;
                        }
                        body * {
                            visibility: hidden;
                        }
                        #quote-receipt-print, #quote-receipt-print * {
                            visibility: visible;
                            color: #000000 !important;
                            text-shadow: 0 0 0.3px #000 !important;
                            print-color-adjust: exact !important;
                            -webkit-print-color-adjust: exact !important;
                        }
                        #quote-receipt-print {
                            display: block !important;
                            position: relative !important;
                            top: 0 !important;
                            left: 0 !important;
                            float: none !important;
                            width: 80mm !important;
                            max-width: 80mm !important;
                            min-height: 0 !important;
                            height: auto !important;
                            padding: 2mm !important;
                            margin: 0 !important;
                            opacity: 1 !important;
                            box-shadow: none !important;
                            border: none !important;
                            overflow: visible !important;
                            page-break-before: avoid !important;
                            page-break-after: avoid !important;
                            break-before: avoid !important;
                            break-after: avoid !important;
                        }
                        #quote-receipt-print tr,
                        #quote-receipt-print li {
                            page-break-inside: avoid !important;
                            break-inside: avoid !important;
                        }
                    }
                `}</style>
            )}
        </div>
    );
};
