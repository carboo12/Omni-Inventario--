"use client";

import { format } from 'date-fns';
import { es } from 'date-fns/locale';

/**
 * Aísla la impresión de tickets térmicos en un iframe dinámico e invisible.
 * Inyecta CSS dedicado que evita saltos de página forzados por Chromium
 * en tickets largos (>10 ítems) sobre papel térmico continuo.
 */
export function printReceiptHtml(htmlContent: string) {
    if (typeof document === 'undefined') return;

    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.style.background = 'transparent';
    iframe.setAttribute('aria-hidden', 'true');
    iframe.setAttribute('title', 'impresion-ticket');
    iframe.onload = () => {
        const body = iframe.contentWindow?.document.body;
        if (!body || !body.innerHTML || body.innerHTML.trim().length === 0) {
            return;
        }
        try {
            iframe.contentWindow!.print();
        } catch {
            // Ignorar cancelaciones o errores del diálogo de impresión.
        }
        setTimeout(() => iframe.remove(), 1000);
    };
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow!.document;
    doc.open();
    doc.write(`<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
<style>
  @page {
    size: 80mm auto !important;
    margin: 0 !important;
  }
  @media print {
    html, body {
      width: 80mm !important;
      max-width: 80mm !important;
      height: auto !important;
      min-height: auto !important;
      max-height: none !important;
      overflow: visible !important;
      -webkit-print-color-adjust: exact;
    }
    .ticket-container {
      width: 100% !important;
      max-width: 80mm !important;
      height: auto !important;
      max-height: none !important;
      overflow: visible !important;
    }
  }
  * {
    box-sizing: border-box;
    font-family: inherit;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  html, body {
    width: 80mm !important;
    height: auto !important;
    min-height: auto !important;
    max-height: none !important;
    margin: 0 !important;
    padding: 0 !important;
    overflow: visible !important;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
    font-size: 13px;
    line-height: 1.2;
    background: #fff;
    color: #000;
  }

  .ticket-item,
  .item-row,
  .ticket-container tr,
  .ticket-container td {
    page-break-inside: avoid !important;
    break-inside: avoid !important;
  }

  .ticket-totals,
  .total-row,
  .payment-info,
  .ticket-footer {
    break-inside: auto !important;
    page-break-inside: auto !important;
  }

  .ticket-container {
    width: 100% !important;
    height: auto !important;
    max-height: none !important;
    overflow: visible !important;
    padding: 4mm 2mm;
  }

  .text-center { text-align: center; }
  .text-right { text-align: right; }
  .bold { font-weight: bold; }
  .dashed-line {
    border-bottom: 1px dashed #000;
    margin: 4px 0;
  }

  .flex-row {
    display: flex;
    justify-content: space-between;
    font-size: 14px;
    font-weight: 400;
    line-height: 1.4;
  }

  .sum-row {
    font-weight: 600;
  }

  .total-row {
    display: flex;
    justify-content: space-between;
    font-weight: 900;
    font-size: 20px;
    margin-top: 4px;
    line-height: 1.2;
  }

  .usd-row {
    display: flex;
    justify-content: space-between;
    font-size: 12px;
    font-style: italic;
  }

  .item-row {
    padding: 2px 0;
    font-size: 13px;
    font-weight: 600;
    line-height: 1.3;
  }

  .info-line {
    font-size: 13px;
    line-height: 1.2;
    margin: 0;
  }

  .pharmacy-name {
    font-size: 19px;
    line-height: 1.2;
    font-weight: 800;
    text-transform: uppercase;
    margin: 0;
  }

  .reprint-badge {
    margin-top: 4px;
    font-weight: 900;
    font-size: 12px;
    border: 2px solid #000;
    border-radius: 4px;
    padding: 2px 4px;
    display: inline-block;
  }

  .logo-img {
    width: 48px;
    height: 48px;
    margin: 0 auto 4px;
  }

  .footer-msg {
    white-space: pre-line;
    font-size: 13px;
  }

  .thanks {
    margin-top: 8px;
    font-weight: bold;
    font-size: 13px;
  }
</style>
</head>
<body>
${htmlContent}
</body>
</html>`);
    doc.close();
}

function escapeHtml(str: string): string {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function fmtNum(value: number | string | null | undefined): string {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (num === null || num === undefined || isNaN(Number(num))) return '0.00';
    return Number(num).toLocaleString('es-NI', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
}

/* ------------------------------------------------------------------ */
/*  Build ticket HTML (ReceiptTemplate equivalent)                    */
/* ------------------------------------------------------------------ */

export interface ReceiptHtmlData {
    pharmacyName: string;
    address: string;
    phone: string;
    rfc?: string;
    ticketId: string;
    date: Date;
    cashierName: string;
    clientName?: string;
    items: Array<{
        quantity: number;
        description: string;
        price: number;
        total: number;
        unit?: string;
    }>;
    subtotal: number;
    tax: number;
    total: number;
    paymentMethod: string;
    amountPaid: number;
    change: number;
    footerMessage?: string;
    website?: string;
    logoSvg?: string | null;
    currencySymbol?: string;
    exchangeRate?: number;
    showTotalUSD?: boolean;
    isReprint?: boolean;
}

export function buildReceiptHtml(data: ReceiptHtmlData): string {
    const {
        pharmacyName, address, phone, rfc, ticketId, date,
        cashierName, clientName, items, subtotal, tax, total,
        paymentMethod, amountPaid, change, footerMessage, website,
        logoSvg, currencySymbol = 'C$', exchangeRate = 36.5,
        showTotalUSD = false, isReprint = false,
    } = data;

    const totalUSD = total / exchangeRate;
    const dateStr = format(date, 'dd/MM/yyyy HH:mm', { locale: es });

    const logoHtml = logoSvg
        ? `<div class="logo-img" style="display:flex;align-items:center;justify-content:center;">${logoSvg}</div>`
        : '';

    const reprintHtml = isReprint
        ? `<p class="reprint-badge">*** REIMPRESIÓN DE TICKET ***</p>`
        : '';

    const usdHtml = showTotalUSD
        ? `<div class="usd-row">
            <span>Equiv. USD (Tasa: ${escapeHtml(String(exchangeRate))}):</span>
            <span>$ ${fmtNum(totalUSD)}</span>
          </div>`
        : '';

    const itemsHtml = items.map(item => {
        const unit = item.unit ? ` ${item.unit.toUpperCase()}` : '';
        return `<div class="ticket-item item-row">${item.quantity}${escapeHtml(unit)} - ${escapeHtml(item.description)} - P.U ${currencySymbol} ${fmtNum(item.price)} - ${currencySymbol} ${fmtNum(item.total)}</div>`;
    }).join('\n');

    return `<div class="ticket-container">
  <div class="ticket-header text-center">
    ${logoHtml}
    <p class="pharmacy-name">${escapeHtml(pharmacyName)}</p>
    <p class="info-line" style="white-space:pre-line;">${escapeHtml(address)}</p>
    ${phone ? `<p class="info-line">${escapeHtml(phone)}</p>` : ''}
    ${rfc ? `<p class="info-line">RFC: ${escapeHtml(rfc)}</p>` : ''}
    ${reprintHtml}
  </div>

  <div style="margin-top:8px;">
    <p class="info-line">Ticket: ${escapeHtml(ticketId)}</p>
    <p class="info-line">Fecha: ${dateStr}</p>
    <p class="info-line">Cajero: ${escapeHtml(cashierName)}</p>
    <p class="info-line">Cliente: ${escapeHtml(clientName || 'Cliente Genérico')}</p>
  </div>

  <div class="dashed-line"></div>

  <div>
    ${itemsHtml}
  </div>

  <div class="dashed-line"></div>

  <div class="ticket-totals">
    <div class="flex-row sum-row">
      <span>Subtotal:</span>
      <span>${currencySymbol} ${fmtNum(subtotal)}</span>
    </div>
    <div class="flex-row sum-row">
      <span>IVA:</span>
      <span>${currencySymbol} ${fmtNum(tax)}</span>
    </div>
    <div class="total-row">
      <span>TOTAL:</span>
      <span>${currencySymbol} ${fmtNum(total)}</span>
    </div>
    ${usdHtml}
  </div>

  <div class="dashed-line"></div>

  <div class="payment-info">
    <div class="flex-row">
      <span>Pago (${escapeHtml(paymentMethod)}):</span>
      <span>${currencySymbol} ${fmtNum(amountPaid)}</span>
    </div>
    <div class="flex-row">
      <span>Cambio:</span>
      <span>${currencySymbol} ${fmtNum(change)}</span>
    </div>
  </div>

  <div class="ticket-footer text-center" style="margin-top:16px;">
    ${footerMessage ? `<p class="footer-msg">${escapeHtml(footerMessage)}</p>` : ''}
    ${website ? `<p class="info-line">${escapeHtml(website)}</p>` : ''}
    <p class="thanks">*** GRACIAS POR SU COMPRA ***</p>
  </div>
</div>`;
}

/* ------------------------------------------------------------------ */
/*  Build Z report (cash closing) HTML (ZReportTemplate equivalent)    */
/* ------------------------------------------------------------------ */

export interface ZReportOutflow {
    id: string;
    createdAt: Date | string;
    reason: string;
    amount: number;
}

export interface ZReportHtmlData {
    pharmacyName: string;
    address: string;
    phone: string;
    rfc?: string;
    cashierName: string;
    openingTime: Date | string;
    closingTime?: Date | string | null;
    initialAmount: number;
    salesCash: number;
    salesCard: number;
    salesServices?: number;
    salesAbonos?: number;
    outflows?: ZReportOutflow[];
    totalReturns?: number;
    totalSales?: number;
    finalAmount?: number;
    actualCash?: number;
    difference?: number;
    initialAmountUSD?: number;
    salesUSD?: number;
    actualUSD?: number;
    differenceUSD?: number;
    footerMessage?: string;
    website?: string;
}

export function buildZReportHtml(data: ZReportHtmlData): string {
    const {
        pharmacyName, address, phone, rfc, cashierName,
        openingTime, closingTime, initialAmount,
        salesCash, salesCard, salesServices, salesAbonos,
        outflows = [], totalReturns = 0, totalSales,
        finalAmount, actualCash, difference,
        initialAmountUSD, salesUSD, actualUSD, differenceUSD,
        footerMessage, website,
    } = data;

    const openStr = new Date(openingTime).toLocaleString();
    const closeStr = closingTime ? new Date(closingTime).toLocaleString() : '';
    const nowStr = new Date().toLocaleString();

    const servicesHtml = (salesServices && salesServices > 0)
        ? `<div class="flex-row" style="color:#6d28d9;">
            <span>SERVICIOS JOYERIA:</span>
            <span>C$ ${fmtNum(salesServices)}</span>
          </div>`
        : '';

    const abonosHtml = (salesAbonos && salesAbonos > 0)
        ? `<div class="flex-row" style="color:#1d4ed8;">
            <span>ABONOS CRÉDITOS:</span>
            <span>C$ ${fmtNum(salesAbonos)}</span>
          </div>`
        : '';

    const totalOutflows = outflows.reduce((acc, o) => acc + Number(o.amount), 0);

    const outflowsDetailHtml = outflows.length > 0
        ? `<div style="border-top:1px dashed #000;margin-top:6px;padding-top:6px;">
            <div style="font-weight:700;">DETALLE SALIDAS / RETIROS</div>
            ${outflows.map(o => `
              <div style="margin-top:4px;">
                <div>${new Date(o.createdAt).toLocaleTimeString()} ${new Date(o.createdAt).toLocaleDateString()}</div>
                <div class="flex-row">
                  <span style="flex:1;">${escapeHtml(o.reason)}</span>
                  <span>-C$ ${fmtNum(o.amount)}</span>
                </div>
                <div style="color:#6b7280;">Usuario: ${escapeHtml(cashierName)}</div>
              </div>`).join('')}
          </div>`
        : '';

    const expectedUSD = (initialAmountUSD || 0) + (salesUSD || 0);
    const diffColor = difference !== undefined && difference < 0 ? '#dc2626' : '#16a34a';
    const diffSign = difference !== undefined && difference > 0 ? '+' : '';

    return `<div class="ticket-container">
  <div class="ticket-header text-center">
    <p class="pharmacy-name">${escapeHtml(pharmacyName)}</p>
    <p class="info-line" style="white-space:pre-line;">${escapeHtml(address)}</p>
    ${phone ? `<p class="info-line">${escapeHtml(phone)}</p>` : ''}
    ${rfc ? `<p class="info-line">RFC: ${escapeHtml(rfc)}</p>` : ''}
    <p class="info-line" style="font-weight:700;margin-top:8px;font-size:14px;">REPORTE DE CIERRE DE CAJA</p>
    <p class="info-line" style="font-weight:700;">REIMPRESIÓN TICKET Z</p>
  </div>

  <div style="margin-top:8px;">
    <div class="flex-row"><span>CAJA:</span><span>01</span></div>
    <div class="flex-row"><span>CAJERO:</span><span>${escapeHtml(cashierName)}</span></div>
    <div class="flex-row"><span>APERTURA:</span><span>${openStr}</span></div>
    ${closeStr ? `<div class="flex-row"><span>CIERRE:</span><span>${closeStr}</span></div>` : ''}
    <div class="flex-row"><span>IMPRESION:</span><span>${nowStr}</span></div>
  </div>

  <div class="dashed-line"></div>

  <div class="flex-row sum-row">
    <span>DESCRIPCION</span>
    <span>VALOR</span>
  </div>

  <div class="flex-row"><span>FONDO INICIAL:</span><span>C$ ${fmtNum(initialAmount)}</span></div>
  <div class="flex-row"><span>VENTAS EFECTIVO:</span><span>C$ ${fmtNum(salesCash)}</span></div>
  <div class="flex-row"><span>VENTAS TARJETA:</span><span>C$ ${fmtNum(salesCard)}</span></div>
  ${servicesHtml}
  ${abonosHtml}
  <div class="flex-row" style="color:#dc2626;">
    <span>SALIDAS/RECIBOS:</span>
    <span>-C$ ${fmtNum(totalOutflows)}</span>
  </div>
  <div class="flex-row" style="color:#dc2626;">
    <span>DEVOLUCIONES:</span>
    <span>-C$ ${fmtNum(totalReturns)}</span>
  </div>
  ${outflowsDetailHtml}

  <div class="dashed-line"></div>

  <div class="flex-row" style="font-weight:700;">
    <span>TOTAL VENTAS:</span>
    <span>C$ ${fmtNum(totalSales)}</span>
  </div>
  <div class="flex-row sum-row">
    <span>EFECTIVO ESPERADO:</span>
    <span>C$ ${fmtNum(finalAmount)}</span>
  </div>
  <div class="flex-row sum-row">
    <span>EFECTIVO REAL:</span>
    <span>C$ ${fmtNum(actualCash)}</span>
  </div>
  <div class="flex-row" style="font-weight:700;color:${diffColor};">
    <span>DIFERENCIA C$:</span>
    <span>${diffSign}${fmtNum(difference)}</span>
  </div>

  <div class="dashed-line"></div>

  <div class="flex-row"><span>FONDO INICIAL USD:</span><span>$ ${fmtNum(initialAmountUSD)}</span></div>
  <div class="flex-row"><span>VENTAS USD:</span><span>$ ${fmtNum(salesUSD)}</span></div>
  <div class="flex-row sum-row"><span>ESPERADO USD:</span><span>$ ${fmtNum(expectedUSD)}</span></div>
  <div class="flex-row sum-row"><span>REAL USD:</span><span>$ ${fmtNum(actualUSD)}</span></div>
  <div class="flex-row" style="font-weight:700;color:${diffColor};">
    <span>DIFERENCIA USD:</span>
    <span>$ ${fmtNum(differenceUSD)}</span>
  </div>

  <div class="dashed-line"></div>

  <div class="ticket-footer text-center" style="margin-top:12px;">
    ${footerMessage ? `<p class="footer-msg">${escapeHtml(footerMessage)}</p>` : ''}
    ${website ? `<p class="info-line">${escapeHtml(website)}</p>` : ''}
    <p style="margin-top:8px;font-weight:700;">*** FIN DEL REPORTE ***</p>
  </div>
</div>`;
}

/* ------------------------------------------------------------------ */
/*  Build retiro receipt HTML (RetiroReceiptTemplate equivalent)       */
/* ------------------------------------------------------------------ */

export interface RetiroReceiptHtmlData {
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
}

export function buildRetiroReceiptHtml(data: RetiroReceiptHtmlData): string {
    const {
        pharmacyName, address, phone, rfc, ticketId, date,
        cashierName, amount, reason, footerMessage, website, logoSvg,
    } = data;

    const dateStr = format(date, 'dd/MM/yyyy HH:mm', { locale: es });
    const logoHtml = logoSvg
        ? `<div class="logo-img" style="display:flex;align-items:center;justify-content:center;margin-bottom:8px;">${logoSvg}</div>`
        : '';

    return `<div class="ticket-container">
  <div class="ticket-header text-center" style="margin-bottom:16px;">
    ${logoHtml}
    <p style="font-size:16px;font-weight:bold;text-transform:uppercase;margin:0;">${escapeHtml(pharmacyName)}</p>
    <p style="white-space:pre-line;margin:0;">${escapeHtml(address)}</p>
    ${phone ? `<p style="margin:0;">${escapeHtml(phone)}</p>` : ''}
    ${rfc ? `<p style="margin:0;">RFC: ${escapeHtml(rfc)}</p>` : ''}
    <p style="font-size:14px;font-weight:bold;text-transform:uppercase;margin-top:8px;">Retiro / Salida de Efectivo</p>
  </div>

  <div style="margin-bottom:8px;">
    <p style="margin:0;">Recibo: ${escapeHtml(ticketId)}</p>
    <p style="margin:0;">Fecha: ${dateStr}</p>
    <p style="margin:0;">Cajero: ${escapeHtml(cashierName)}</p>
  </div>

  <div class="dashed-line"></div>

  <div class="flex-row">
    <span>Monto:</span>
    <span>C$ ${fmtNum(amount)}</span>
  </div>
  <div class="flex-row" style="margin-top:4px;">
    <span>Concepto / Motivo:</span>
    <span style="max-width:55%;text-align:right;">${escapeHtml(reason)}</span>
  </div>

  <div class="dashed-line"></div>

  <div class="ticket-footer text-center" style="margin-top:16px;">
    ${footerMessage ? `<p class="footer-msg">${escapeHtml(footerMessage)}</p>` : ''}
    ${website ? `<p style="margin:0;">${escapeHtml(website)}</p>` : ''}
    <p style="margin-top:8px;">*** FIN DEL COMPROBANTE ***</p>
  </div>
</div>`;
}

/* ------------------------------------------------------------------ */
/*  Build quote receipt HTML (QuoteReceiptTemplate equivalent)         */
/* ------------------------------------------------------------------ */

export interface QuoteReceiptHtmlData {
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
    items: Array<{
        quantity: number;
        description: string;
        price: number;
        total: number;
    }>;
    subtotal: number;
    total: number;
    notes?: string;
    footerMessage?: string;
    website?: string;
    logoSvg?: string | null;
    currencySymbol?: string;
}

export function buildQuoteReceiptHtml(data: QuoteReceiptHtmlData): string {
    const {
        businessName, address, phone, rfc, quoteNumber, date,
        expirationDays, customerName, customerPhone, cashierName,
        items, subtotal, total, notes, footerMessage, website,
        logoSvg, currencySymbol = 'C$',
    } = data;

    const dateStr = format(date, 'dd/MM/yyyy HH:mm', { locale: es });
    const expirationDate = new Date(date);
    expirationDate.setDate(expirationDate.getDate() + expirationDays);
    const expirationStr = format(expirationDate, 'dd/MM/yyyy', { locale: es });

    const logoHtml = logoSvg
        ? `<div class="logo-img" style="display:flex;align-items:center;justify-content:center;margin-bottom:8px;">${logoSvg}</div>`
        : '';

    const customerHtml = customerName && customerName !== 'Cliente General'
        ? `<p style="margin:0;">Cliente: ${escapeHtml(customerName)}</p>
           ${customerPhone ? `<p style="margin:0;">Tel: ${escapeHtml(customerPhone)}</p>` : ''}`
        : '';

    const itemsHtml = items.map(item =>
        `<tr>
            <td>${item.quantity}</td>
            <td>${escapeHtml(item.description)}</td>
            <td class="text-right">${currencySymbol} ${fmtNum(item.price)}</td>
            <td class="text-right">${currencySymbol} ${fmtNum(item.total)}</td>
        </tr>`
    ).join('\n');

    const notesHtml = notes
        ? `<div style="margin-top:8px;font-size:10px;font-style:italic;"><p style="margin:0;">Nota: ${escapeHtml(notes)}</p></div>`
        : '';

    return `<div class="ticket-container">
  <div class="ticket-header text-center" style="margin-bottom:16px;">
    ${logoHtml}
    <p style="font-size:16px;font-weight:bold;text-transform:uppercase;margin:0;">${escapeHtml(businessName)}</p>
    <p style="white-space:pre-line;margin:0;">${escapeHtml(address)}</p>
    ${phone ? `<p style="margin:0;">${escapeHtml(phone)}</p>` : ''}
    ${rfc ? `<p style="margin:0;">RFC: ${escapeHtml(rfc)}</p>` : ''}
  </div>

  <div style="border:2px dashed #000;padding:8px;margin-bottom:12px;text-align:center;">
    <p style="font-size:14px;font-weight:bold;text-transform:uppercase;margin:0;">PRESUPUESTO / COTIZACION</p>
    <p style="font-size:10px;font-style:italic;margin-top:4px;">No valido como comprobante fiscal / factura</p>
  </div>

  <div style="margin-bottom:8px;">
    <p style="margin:0;">No. Cotizacion: ${escapeHtml(quoteNumber)}</p>
    <p style="margin:0;">Fecha: ${dateStr}</p>
    <p style="margin:0;">Vigencia hasta: ${expirationStr} (${expirationDays} dias)</p>
    <p style="margin:0;">Atendido por: ${escapeHtml(cashierName)}</p>
    ${customerHtml}
  </div>

  <div class="dashed-line"></div>

  <table style="width:100%;text-align:left;border-collapse:collapse;font-size:12px;">
    <thead>
      <tr>
        <th style="width:32px;">Cant</th>
        <th>Desc</th>
        <th class="text-right">P.Unit</th>
        <th class="text-right">Total</th>
      </tr>
    </thead>
    <tbody>
      ${itemsHtml}
    </tbody>
  </table>

  <div class="dashed-line"></div>

  <div class="ticket-totals flex-row" style="font-weight:bold;font-size:14px;">
    <span>TOTAL:</span>
    <span>${currencySymbol} ${fmtNum(total)}</span>
  </div>

  ${notesHtml}

  <div class="ticket-footer text-center" style="margin-top:16px;border-top:1px dashed #000;padding-top:12px;">
    <p style="font-size:10px;font-weight:bold;margin:0;">*** PRESUPUESTO NO VENDA ***</p>
    <p style="font-size:10px;margin-top:4px;margin-bottom:0;">Presente este documento al momento de facturar.</p>
    <p style="font-size:10px;margin:0;">Los precios pueden variar sin previo aviso.</p>
    ${footerMessage ? `<p class="footer-msg" style="margin-top:8px;">${escapeHtml(footerMessage)}</p>` : ''}
    ${website ? `<p style="margin:0;">${escapeHtml(website)}</p>` : ''}
  </div>
</div>`;
}
