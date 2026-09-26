'use client';

import React, { useState } from 'react';
import Link from '@/lib/router-nav';
import { ArrowLeft, Printer, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { InvoiceA4Template } from '@/components/pos/invoice-a4-template';
import { ReceiptTemplate } from '@/components/pos/receipt-template';
import { PrintFormatToggle } from '@/components/pos/print-format-toggle';
import { useSettings } from '@/hooks/use-settings';
import { printA4Html, buildA4ReceiptHtml } from '@/lib/print-a4';
import { printReceiptHtml, buildReceiptHtml } from '@/lib/print-iframe';
import type { PrintFormat } from '@/lib/print-format';

interface FacturaPrintClientProps {
    invoice?: any;
}

export default function FacturaPrintClient({ invoice }: FacturaPrintClientProps) {
    const { settings } = useSettings();
    const [printFormat, setPrintFormat] = useState<PrintFormat>('invoice');

    if (!invoice) {
        return (
            <div className="p-8 text-center max-w-md mx-auto space-y-4">
                <p className="text-muted-foreground font-medium">No se encontró la factura solicitada.</p>
                <Link href="/orders">
                    <Button variant="outline"><ArrowLeft className="w-4 h-4 mr-2" /> Volver a Facturas</Button>
                </Link>
            </div>
        );
    }

    const prepareReceiptData = () => {
        const items = (invoice.salesInvoiceItem || []).map((item: any) => ({
            quantity: item.quantity,
            description: item.productName || item.product?.name || 'Producto',
            price: item.unitPrice,
            total: item.totalPrice,
            unit: item.presentationName || item.baseUnit || undefined,
            code: item.product?.barcode || undefined,
            priceLevel: item.priceLevel,
        }));

        return {
            pharmacyName: settings.ticketHeader?.name || 'OMNI POS',
            address: settings.ticketHeader?.address || '',
            phone: settings.ticketHeader?.phone || '',
            rfc: settings.ticketHeader?.rfc || '',
            ticketId: String(invoice.invoiceNumber || invoice.id),
            date: invoice.date ? new Date(invoice.date) : new Date(),
            cashierName: invoice.user?.name || 'Cajero',
            clientName: invoice.customer?.fullName || 'Cliente de Contado',
            clientAddress: invoice.deliveryAddress || invoice.customer?.address || undefined,
            clientPhone: invoice.deliveryPhone || invoice.customer?.phone || undefined,
            items,
            subtotal: invoice.subtotal || invoice.totalAmount,
            tax: invoice.tax || 0,
            total: invoice.totalAmount,
            paymentMethod: invoice.paymentMethod || 'Efectivo',
            amountPaid: invoice.totalAmount,
            change: 0,
            footerMessage: settings.ticketFooter?.message,
            website: settings.ticketFooter?.website,
            logoSvg: settings.logoSvg,
            exchangeRate: parseFloat(settings.exchangeRate) || 36.5,
            showTotalUSD: true,
            deliveryType: invoice.deliveryType,
            deliveryStatus: invoice.deliveryStatus,
        };
    };

    const receiptData = prepareReceiptData();

    const handlePrint = () => {
        if (printFormat === 'invoice') {
            printA4Html(buildA4ReceiptHtml(receiptData));
        } else {
            printReceiptHtml(buildReceiptHtml(receiptData));
        }
    };

    return (
        <div className="min-h-screen bg-gray-100 p-4 print:p-0 print:bg-white">
            {/* Top Control Bar (Hidden on Print) */}
            <div className="max-w-4xl mx-auto mb-4 flex items-center justify-between bg-white p-4 rounded-lg shadow border print:hidden">
                <div className="flex items-center gap-3">
                    <Link href="/orders">
                        <Button variant="ghost" size="sm">
                            <ArrowLeft className="w-4 h-4 mr-2" /> Volver
                        </Button>
                    </Link>
                    <span className="font-bold text-lg">Factura Nº {invoice.invoiceNumber || invoice.id}</span>
                </div>
                <div className="flex items-center gap-4">
                    <PrintFormatToggle value={printFormat} onChange={setPrintFormat} />
                    <Button onClick={handlePrint} className="bg-primary hover:bg-primary/90">
                        <Printer className="w-4 h-4 mr-2" /> Imprimir ({printFormat === 'invoice' ? 'A4/Carta' : 'Ticket 80mm'})
                    </Button>
                </div>
            </div>

            {/* Template Container */}
            <div className="bg-white rounded-lg shadow-sm print:shadow-none">
                {printFormat === 'invoice' ? (
                    <InvoiceA4Template {...receiptData} previewMode={true} />
                ) : (
                    <div className="p-8 flex justify-center bg-gray-50">
                        <ReceiptTemplate {...receiptData} previewMode={true} />
                    </div>
                )}
            </div>
        </div>
    );
}
