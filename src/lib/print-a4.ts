"use client";

import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { ReceiptHtmlData } from './print-iframe';

export function printA4Html(htmlContent: string) {
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
    iframe.setAttribute('title', 'impresion-a4');
    iframe.onload = () => {
        const body = iframe.contentWindow?.document.body;
        if (!body || !body.innerHTML || body.innerHTML.trim().length === 0) {
            return;
        }
        try {
            iframe.contentWindow!.print();
        } catch {
            // Ignore errors
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
    size: letter;
    margin: 12mm;
  }
  @media print {
    html, body {
      width: 100% !important;
      height: 100% !important;
      margin: 0 !important;
      padding: 0 !important;
      background: #fff;
      color: #000;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
  }
  * {
    box-sizing: border-box;
    font-family: inherit;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  html, body {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
    font-size: 14px;
    line-height: 1.5;
    background: #fff;
    color: #000;
  }
  
  .a4-container {
    width: 100%;
    max-width: 800px;
    margin: 0 auto;
  }

  .header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 30px;
    border-bottom: 2px solid #e5e7eb;
    padding-bottom: 20px;
  }

  .company-info {
    flex: 1;
  }

  .pharmacy-name {
    font-size: 24px;
    font-weight: 800;
    text-transform: uppercase;
    margin: 0 0 5px 0;
    color: #111827;
  }

  .info-line {
    margin: 2px 0;
    color: #4b5563;
  }

  .document-info {
    text-align: right;
  }

  .document-title {
    font-size: 20px;
    font-weight: 700;
    text-transform: uppercase;
    margin: 0 0 10px 0;
    color: #374151;
  }

  .logo-img {
    max-height: 80px;
    max-width: 150px;
    margin-bottom: 15px;
  }

  .customer-section {
    display: flex;
    justify-content: space-between;
    margin-bottom: 30px;
    background: #f9fafb;
    padding: 15px;
    border-radius: 8px;
    border: 1px solid #e5e7eb;
  }

  .customer-info, .meta-info {
    flex: 1;
  }

  .meta-info {
    text-align: right;
  }

  .section-title {
    font-size: 12px;
    text-transform: uppercase;
    color: #6b7280;
    font-weight: 600;
    margin: 0 0 5px 0;
  }

  .client-row {
    margin: 0 0 2px 0;
    font-size: 13px;
  }

  .client-row strong {
    color: #374151;
  }

  .delivery-badge {
    display: inline-block;
    margin-top: 8px;
    padding: 4px 10px;
    border: 1px solid #b45309;
    border-radius: 4px;
    background: #fffbeb;
    color: #92400e;
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.03em;
  }

  .items-table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 30px;
    border: 1px solid #9ca3af;
  }

  .items-table th {
    background: #f3f4f6;
    color: #111827;
    font-weight: 700;
    text-align: left;
    padding: 9px 10px;
    border: 1px solid #9ca3af;
    font-size: 11px;
    letter-spacing: 0.02em;
  }

  .items-table td {
    padding: 8px 10px;
    border: 1px solid #d1d5db;
    color: #111827;
    font-size: 13px;
  }

  .items-table tbody tr:nth-child(even) td {
    background: #fafafa;
  }

  .text-right {
    text-align: right !important;
  }

  .text-center {
    text-align: center !important;
  }

  .totals-section {
    display: flex;
    justify-content: flex-end;
    margin-bottom: 40px;
  }

  .totals-table {
    width: 300px;
    border-collapse: collapse;
  }

  .totals-table td {
    padding: 8px 10px;
  }

  .totals-table .sum-label {
    font-weight: 600;
    color: #4b5563;
  }

  .totals-table .total-row {
    font-weight: 800;
    font-size: 18px;
    color: #111827;
    border-top: 2px solid #d1d5db;
  }

  .footer {
    text-align: center;
    margin-top: 50px;
    color: #6b7280;
    font-size: 12px;
    border-top: 1px solid #e5e7eb;
    padding-top: 20px;
  }

  .signatures {
    display: flex;
    justify-content: space-between;
    margin-top: 70px;
    margin-bottom: 30px;
    page-break-inside: avoid;
  }

  .signature-box {
    width: 45%;
    text-align: center;
  }

  .signature-line {
    border-top: 1px solid #000;
    margin-top: 45px;
    padding-top: 6px;
    font-weight: 600;
    font-size: 12px;
  }

  .signature-hint {
    margin-top: 3px;
    font-size: 10px;
    color: #6b7280;
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

export function buildA4ReceiptHtml(data: ReceiptHtmlData): string {
    const {
        pharmacyName, address, phone, rfc, ticketId, date,
        cashierName, clientName, clientPhone, clientAddress, items, subtotal, tax, total,
        paymentMethod, amountPaid, change, footerMessage, website,
        logoSvg, currencySymbol = 'C$', exchangeRate = 36.5,
        showTotalUSD = false, isReprint = false,
        deliveryType = 'counter', deliveryStatus, routeName, deliveredByName,
    } = data;

    const totalUSD = total / exchangeRate;
    const dateStr = format(date, 'dd/MM/yyyy HH:mm', { locale: es });

    const logoHtml = logoSvg
        ? `<div class="logo-img" style="display:flex;align-items:center;">${logoSvg}</div>`
        : '';

    const reprintHtml = isReprint
        ? `<p style="color: #dc2626; font-weight: bold; margin-top: 5px;">*** REIMPRESIÓN ***</p>`
        : '';

    const usdHtml = showTotalUSD
        ? `<tr>
             <td class="sum-label">Equivalente USD:</td>
             <td class="text-right" style="font-style: italic;">$ ${fmtNum(totalUSD)}</td>
           </tr>`
        : '';

    // Los pedidos a domicilio se identifican en el propio documento para que la hoja
    // que viaja con el paquete sea de mostrador o de ruta.
    const deliveryBadgeHtml = deliveryType === 'route'
        ? `<div><span class="delivery-badge">Pedido para Ruta / Domicilio</span></div>`
        : '';
    const deliveryMetaHtml = deliveryType === 'route'
        ? [
            deliveryStatus ? `<p class="client-row"><strong>Estado de entrega:</strong> ${escapeHtml(deliveryStatus)}</p>` : '',
            routeName ? `<p class="client-row"><strong>Hoja de ruta:</strong> ${escapeHtml(routeName)}</p>` : '',
        ].filter(Boolean).join('\n      ')
        : '';

    const itemsHtml = items.map((item) => {
        const unit = item.unit ? ` ${item.unit.toUpperCase()}` : '';
        return `<tr>
            <td class="text-center">${item.quantity}${escapeHtml(unit)}</td>
            <td>${escapeHtml(item.code || '—')}</td>
            <td>${escapeHtml(item.description)}</td>
            <td class="text-right">${currencySymbol} ${fmtNum(item.price)}</td>
            <td class="text-right">${currencySymbol} ${fmtNum(item.total)}</td>
        </tr>`;
    }).join('\n');

    return `<div class="a4-container">
  <div class="header">
    <div class="company-info">
      ${logoHtml}
      <h1 class="pharmacy-name">${escapeHtml(pharmacyName)}</h1>
      <p class="info-line">${escapeHtml(address)}</p>
      ${phone ? `<p class="info-line">Teléfono: ${escapeHtml(phone)}</p>` : ''}
      ${rfc ? `<p class="info-line">RUC / NIT: ${escapeHtml(rfc)}</p>` : ''}
    </div>
    <div class="document-info">
      <h2 class="document-title">FACTURA DE VENTA</h2>
      <p class="info-line" style="font-weight: 600; font-size: 16px;">Nº ${escapeHtml(ticketId)}</p>
      <p class="info-line">Fecha: ${dateStr}</p>
      ${reprintHtml}
    </div>
  </div>

  <div class="customer-section">
    <div class="customer-info">
      <p class="section-title">Cliente</p>
      <p style="font-weight: 600; font-size: 16px; margin: 0 0 3px 0;">${escapeHtml(clientName || 'Cliente de Contado')}</p>
      ${clientAddress ? `<p class="client-row"><strong>Dirección de entrega:</strong> ${escapeHtml(clientAddress)}</p>` : ''}
      ${clientPhone ? `<p class="client-row"><strong>Teléfono:</strong> ${escapeHtml(clientPhone)}</p>` : ''}
    </div>
    <div class="meta-info">
      <p class="section-title">Detalles</p>
      <p class="client-row"><strong>Atendido por:</strong> ${escapeHtml(cashierName)}</p>
      <p class="client-row"><strong>Método de pago:</strong> ${escapeHtml(paymentMethod)}</p>
      ${deliveryMetaHtml}
      ${deliveryBadgeHtml}
    </div>
  </div>

  <table class="items-table">
    <thead>
      <tr>
        <th class="text-center" style="width: 10%;">CANT.</th>
        <th style="width: 16%;">CÓDIGO</th>
        <th style="width: 40%;">DESCRIPCIÓN</th>
        <th class="text-right" style="width: 17%;">P. UNITARIO</th>
        <th class="text-right" style="width: 17%;">TOTAL</th>
      </tr>
    </thead>
    <tbody>
      ${itemsHtml}
    </tbody>
  </table>

  <div class="totals-section">
    <table class="totals-table">
      <tr>
        <td class="sum-label">Subtotal:</td>
        <td class="text-right">${currencySymbol} ${fmtNum(subtotal)}</td>
      </tr>
      <tr>
        <td class="sum-label">IVA:</td>
        <td class="text-right">${currencySymbol} ${fmtNum(tax)}</td>
      </tr>
      <tr class="total-row">
        <td>TOTAL:</td>
        <td class="text-right">${currencySymbol} ${fmtNum(total)}</td>
      </tr>
      ${usdHtml}
      <tr>
        <td colspan="2" style="padding-top: 15px;"></td>
      </tr>
      <tr>
        <td class="sum-label" style="font-size: 12px;">Monto Pagado:</td>
        <td class="text-right" style="font-size: 12px;">${currencySymbol} ${fmtNum(amountPaid)}</td>
      </tr>
      <tr>
        <td class="sum-label" style="font-size: 12px;">Cambio:</td>
        <td class="text-right" style="font-size: 12px;">${currencySymbol} ${fmtNum(change)}</td>
      </tr>
    </table>
  </div>

  <div class="signatures">
    <div class="signature-box">
      <div class="signature-line">Entregado por (Ruta)</div>
      <div class="signature-hint">${deliveredByName ? escapeHtml(deliveredByName) : 'Nombre y firma del repartidor'}</div>
    </div>
    <div class="signature-box">
      <div class="signature-line">Recibido Conforme (Cliente)</div>
      <div class="signature-hint">${escapeHtml(clientName || 'Cliente')}</div>
    </div>
  </div>

  <div class="footer">
    ${footerMessage ? `<p style="font-weight: 600; margin-bottom: 5px;">${escapeHtml(footerMessage)}</p>` : ''}
    ${website ? `<p style="margin-bottom: 5px;">${escapeHtml(website)}</p>` : ''}
    <p>Este documento no es válido como comprobante fiscal sin los sellos correspondientes.</p>
  </div>
</div>`;
}
