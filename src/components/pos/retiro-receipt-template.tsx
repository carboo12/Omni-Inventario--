import React from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn, formatNumber } from '@/lib/utils';

interface RetiroReceiptProps {
    pharmacyName: string;
    address: string;
    phone: string;
    rfc?: string;
    ticketId: string;
    date: Date;
    cashierName: string;
    amount: number;
    reason: string;
    footerMessage?: string;
    website?: string;
    logoSvg?: string | null;
    previewMode?: boolean;
}

// Comprobante ESC/POS de "Retiro / Salida de Efectivo" (80mm).
export const RetiroReceiptTemplate: React.FC<RetiroReceiptProps> = ({
    pharmacyName,
    address,
    phone,
    rfc,
    ticketId,
    date,
    cashierName,
    amount,
    reason,
    footerMessage,
    website,
    logoSvg,
    previewMode = false
}) => {
    return (
        <div
            id={previewMode ? "retiro-preview" : "retiro-print"}
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
                <h2 className="text-lg font-bold uppercase">{pharmacyName}</h2>
                <p className="whitespace-pre-line">{address}</p>
                {phone && <p>{phone}</p>}
                {rfc && <p>RFC: {rfc}</p>}
                <h3 className="text-sm font-bold uppercase mt-2">Retiro / Salida de Efectivo</h3>
            </div>

            <div className="mb-2">
                <p>Recibo: {ticketId}</p>
                <p>Fecha: {format(date, 'dd/MM/yyyy HH:mm', { locale: es })}</p>
                <p>Cajero: {cashierName}</p>
            </div>

            <div className="border-b border-black border-dashed my-2" />

            <div className="flex justify-between">
                <span>Monto:</span>
                <span>C$ {formatNumber(amount)}</span>
            </div>
            <div className="flex justify-between mt-1">
                <span>Concepto / Motivo:</span>
                <span className="max-w-[55%] text-right">{reason}</span>
            </div>

            <div className="border-b border-black border-dashed my-2" />

            <div className="mt-4 text-center">
                <p className="whitespace-pre-line">{footerMessage}</p>
                {website && <p>{website}</p>}
                <p className="mt-2">*** FIN DEL COMPROBANTE ***</p>
            </div>

            {!previewMode && (
                <style jsx global>{`
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
                        #retiro-print.ticket-container,
                        #retiro-print {
                            margin-top: 0 !important;
                            padding-top: 0 !important;
                        }
                        body * {
                            visibility: hidden;
                        }
                        #retiro-print, #retiro-print * {
                            visibility: visible;
                            color: #000000 !important;
                            text-shadow: 0 0 0.3px #000 !important;
                            print-color-adjust: exact !important;
                            -webkit-print-color-adjust: exact !important;
                        }
                        #retiro-print {
                            position: absolute;
                            left: 0;
                            top: 0;
                            width: 100% !important;
                            min-height: 0 !important;
                            height: auto !important;
                            padding: 0 2mm 15mm 2mm !important;
                            opacity: 1 !important;
                            box-shadow: none !important;
                            border: none !important;
                            overflow: visible !important;
                            page-break-before: avoid !important;
                            page-break-after: avoid !important;
                            break-before: avoid !important;
                            break-after: avoid !important;
                        }
                        #retiro-print tr,
                        #retiro-print li {
                            page-break-inside: avoid !important;
                            break-inside: avoid !important;
                        }
                    }
                `}</style>
            )}
        </div>
    );
};