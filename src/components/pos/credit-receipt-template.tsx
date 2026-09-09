"use client";

import React from 'react';
import { formatCurrency } from '@/lib/utils';

interface CreditReceiptTemplateProps {
    businessName: string;
    address: string;
    phone: string;
    rfc: string;
    receiptId: string;
    date: Date;
    cashierName: string;
    customerName: string;
    previousBalance: number;
    amountPaid: number;
    newBalance: number;
    paymentMethod: string;
    footerMessage?: string;
    website?: string;
    logoSvg?: string;
    previewMode?: boolean;
}

export function CreditReceiptTemplate({
    businessName,
    address,
    phone,
    rfc,
    receiptId,
    date,
    cashierName,
    customerName,
    previousBalance,
    amountPaid,
    newBalance,
    paymentMethod,
    footerMessage,
    website,
    logoSvg,
    previewMode = false
}: CreditReceiptTemplateProps) {
    return (
        <div className={`receipt-container ${previewMode ? 'preview' : 'print-only'}`} id="receipt-to-print">
            <style jsx>{`
                .receipt-container {
                    width: 80mm;
                    padding: 5mm;
                    font-family: 'Courier New', Courier, monospace;
                    font-size: 12px;
                    color: black;
                    background: white;
                }
                .receipt-container.preview {
                    width: 100%;
                    max-width: 350px;
                    margin: 0 auto;
                    box-shadow: 0 0 10px rgba(0,0,0,0.1);
                    border: 1px solid #eee;
                }
                .header {
                    text-align: center;
                    margin-bottom: 5mm;
                }
                .logo-container {
                    margin-bottom: 2mm;
                }
                .business-name {
                    font-weight: bold;
                    font-size: 16px;
                    text-transform: uppercase;
                }
                .divider {
                    border-top: 1px dashed black;
                    margin: 3mm 0;
                }
                .section-title {
                    text-align: center;
                    font-weight: bold;
                    text-transform: uppercase;
                    margin-bottom: 2mm;
                    background: #eee;
                    padding: 1mm;
                }
                .info-row {
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: 1mm;
                }
                .label {
                    font-weight: bold;
                }
                .total-section {
                    margin-top: 5mm;
                }
                .balance-box {
                    border: 1px solid black;
                    padding: 2mm;
                    margin-top: 3mm;
                }
                .footer {
                    text-align: center;
                    margin-top: 8mm;
                    font-size: 10px;
                }
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
                    #receipt-to-print.ticket-container,
                    #receipt-to-print {
                        margin-top: 0 !important;
                        padding-top: 0 !important;
                    }
                    .print-only {
                        display: block !important;
                    }
                    body * {
                        visibility: hidden;
                    }
                    #receipt-to-print, #receipt-to-print * {
                        visibility: visible;
                        color: #000000 !important;
                        text-shadow: 0 0 0.3px #000 !important;
                        print-color-adjust: exact !important;
                        -webkit-print-color-adjust: exact !important;
                    }
                    #receipt-to-print {
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
                        box-shadow: none !important;
                        border: none !important;
                        overflow: visible !important;
                        page-break-before: avoid !important;
                        page-break-after: avoid !important;
                        break-before: avoid !important;
                        break-after: avoid !important;
                    }
                    #receipt-to-print tr,
                    #receipt-to-print li {
                        page-break-inside: avoid !important;
                        break-inside: avoid !important;
                    }
                }
            `}</style>

            <div className="header">
                {logoSvg && (
                    <div className="logo-container" dangerouslySetInnerHTML={{ __html: logoSvg.replace(/width="[^"]*"/, 'width="150"').replace(/height="[^"]*"/, 'height="auto"') }} />
                )}
                <div className="business-name">{businessName}</div>
                <div>{address}</div>
                <div>Tel: {phone}</div>
                {rfc && <div>RFC: {rfc}</div>}
            </div>

            <div className="section-title">Comprobante de Abono</div>

            <div className="info-row">
                <span className="label">Folio:</span>
                <span>{receiptId}</span>
            </div>
            <div className="info-row">
                <span className="label">Fecha:</span>
                <span>{date.toLocaleDateString()} {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
            <div className="info-row">
                <span className="label">Atendido por:</span>
                <span>{cashierName}</span>
            </div>

            <div className="divider" />

            <div className="info-row">
                <span className="label">Cliente:</span>
                <span style={{ textAlign: 'right' }}>{customerName}</span>
            </div>

            <div className="divider" />

            <div className="total-section">
                <div className="info-row">
                    <span>Saldo Anterior:</span>
                    <span>{formatCurrency(previousBalance)}</span>
                </div>
                <div className="info-row" style={{ fontSize: '14px', fontWeight: 'bold' }}>
                    <span>MONTO ABONADO:</span>
                    <span>{formatCurrency(amountPaid)}</span>
                </div>
                <div className="info-row">
                    <span>Método de Pago:</span>
                    <span>{paymentMethod}</span>
                </div>

                <div className="balance-box">
                    <div className="info-row" style={{ fontSize: '16px', fontWeight: 'bold' }}>
                        <span>SALDO ACTUAL:</span>
                        <span>{formatCurrency(newBalance)}</span>
                    </div>
                </div>
            </div>

            <div className="footer">
                {footerMessage && <p>{footerMessage}</p>}
                {website && <p>{website}</p>}
                <div className="divider" />
                <p>¡Gracias por su pago!</p>
                <p style={{ marginTop: '10mm' }}>__________________________</p>
                <p>Firma del Cliente</p>
            </div>
        </div>
    );
}
