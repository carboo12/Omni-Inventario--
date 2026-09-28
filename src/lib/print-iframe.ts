"use client";

import { addDays, format } from 'date-fns';
import { es } from 'date-fns/locale';
import { PENDING_COLLECTION_BANNER } from './route-settlement';

/** Identificador del iframe de impresión, para poder limpiar el anterior. */
const PRINT_IFRAME_ID = 'print-receipt-iframe';
/** Margen de espera para que la ventana del iframe esté inicializada (~600 ms). */
const PRINT_MAX_ATTEMPTS = 24;
const PRINT_RETRY_DELAY_MS = 25;
/** Frame de espera antes de invocar print() para que el ticket esté pintado. */
const PRINT_SETTLE_DELAY_MS = 250;

/**
 * Aísla la impresión de tickets térmicos en un iframe dinámico e invisible.
 * Inyecta CSS dedicado que evita saltos de página forzados por Chromium
 * en tickets largos (>10 ítems) sobre papel térmico continuo.
 */
export function printReceiptHtml(htmlContent: string) {
    if (typeof document === 'undefined') return;

    // 1. Una impresión anterior que no llegó a eliminarse no debe acumularse.
    document.getElementById(PRINT_IFRAME_ID)?.remove();

    // 2. Iframe oculto: no debe alterar el flujo ni el estilo de la página.
    const iframe = document.createElement('iframe');
    iframe.id = PRINT_IFRAME_ID;
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.style.background = 'transparent';
    iframe.setAttribute('aria-hidden', 'true');
    iframe.setAttribute('title', 'impresion-ticket');

    // 3. El iframe es efímero: se elimina siempre, se imprima o no (diálogo
    //    cancelado, documento vacío, error al imprimir o ventana inaccesible).
    let removeTimer: number | undefined;
    const dispose = () => {
        window.clearTimeout(removeTimer);
        try {
            if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
        } catch {
            // El iframe ya fue desconectado.
        }
    };

    // 4. Se adjunta al DOM ANTES de leer contentWindow / contentDocument: fuera del
    //    documento el iframe no tiene ventana y el acceso devolvería null.
    (document.body || document.documentElement).appendChild(iframe);

    // 5. `contentWindow` puede seguir siendo null justo después de insertarlo si la
    //    ventana del iframe aún no se inicializó. Se espera el evento 'load' y, si no
    //    llegara, se reintenta con margen antes de abandonar; nunca se desreferencia.
    let attempts = 0;
    let settled = false;

    const emit = () => {
        if (settled) return;
        settled = true;
        window.clearTimeout(retryTimer);
        iframe.removeEventListener('load', emit);

        const frameWindow = iframe.contentWindow;
        const frameDoc = iframe.contentDocument || frameWindow?.document;
        if (!frameWindow || !frameDoc) {
            console.error('No se pudo acceder al documento del iframe de impresión.');
            dispose();
            return;
        }

        // Se escribe el documento COMPLETO (CSS de 80 mm + contenido). Escribir
        // únicamente el body dejaría el ticket sin su hoja de estilos.
        frameDoc.open();
        frameDoc.write(buildPrintDocument(htmlContent));
        frameDoc.close();

        if (!frameDoc.body || frameDoc.body.innerHTML.trim().length === 0) {
            dispose();
            return;
        }

        // Un frame de espera garantiza que el ticket esté pintado antes de imprimir.
        window.setTimeout(() => {
            try {
                frameWindow.focus();
                frameWindow.print();
            } catch {
                // Diálogo de impresión cancelado o bloqueado por el navegador.
            }
            removeTimer = window.setTimeout(dispose, 1000);
        }, PRINT_SETTLE_DELAY_MS);
    };

    let retryTimer: number | undefined;
    const waitForFrame = () => {
        if (settled) return;
        if (iframe.contentWindow) {
            emit();
            return;
        }
        if (++attempts >= PRINT_MAX_ATTEMPTS) {
            console.error('No se pudo acceder al documento del iframe de impresión.');
            settled = true;
            dispose();
            return;
        }
        retryTimer = window.setTimeout(waitForFrame, PRINT_RETRY_DELAY_MS);
    };

    iframe.addEventListener('load', emit, { once: true });
    waitForFrame();
}

/**
 * Envuelve el contenido del ticket en un documento completo con la hoja de estilos
 * de 80 mm. Debe escribirse el documento entero (y no sólo el body) para que el
 * ticket conserve su formato térmico.
 */
function buildPrintDocument(htmlContent: string): string {
    return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
<style>
  @page {
    margin: 0 !important;
    size: auto !important; /* Mantiene la bobina de papel como rollo continuo */
  }
  @media print {
    html, body {
      width: 80mm !important;
      max-width: 80mm !important;
      height: auto !important;
      min-height: 100% !important;
      max-height: none !important;
      margin: 0 !important;
      padding: 0 !important;
      overflow: visible !important;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .ticket-container {
      width: 100% !important;
      max-width: 80mm !important;
      height: auto !important;
      min-height: 100% !important;
      max-height: none !important;
      overflow: visible !important;
    }
    .item-row {
      page-break-inside: avoid !important; /* Evita que un producto individual se corte a la mitad */
      break-inside: avoid !important;
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
    min-height: 100% !important;
    max-height: none !important;
    margin: 0 !important;
    padding: 0 !important;
    overflow: visible !important;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
    font-size: 12px;
    line-height: 1.2;
    background: #fff;
    color: #000;
  }

  .ticket-container,
  .ticket-item,
  .item-row,
  .ticket-container tr,
  .ticket-container td,
  .ticket-totals,
  .total-row,
  .payment-info,
  .ticket-footer {
    page-break-inside: avoid !important;
    break-inside: avoid !important;
  }

  .ticket-container {
    width: 100% !important;
    height: auto !important;
    min-height: 100% !important;
    max-height: none !important;
    overflow: visible !important;
    padding: 4mm 2mm;
  }

  .text-center { text-align: center; }
  .text-right { text-align: right; }
  .bold { font-weight: bold; }
  .dashed-line {
    border-bottom: 1px dashed #000;
    margin: 6px 0;
  }

  .detalle-factura-header {
    text-align: center;
    font-weight: bold;
    text-transform: uppercase;
    font-size: 13px;
    letter-spacing: 0.5px;
    border-top: 1px solid #000;
    border-bottom: 1px solid #000;
    padding: 3px 0;
    margin: 8px 0 6px 0;
  }

  .col-cant { width: 12%; text-align: left; font-weight: bold; }
  .col-prod { width: 48%; word-break: break-word; overflow-wrap: break-word; }
  .col-price { width: 20%; text-align: right; }
  .col-total { width: 20%; text-align: right; }

  .ticket-table {
    width: 100%;
    border-collapse: collapse;
    table-layout: auto;
    font-size: 12px;
  }

  .ticket-table th {
    font-weight: bold;
    padding: 3px 1px;
    border-bottom: 1px solid #000;
  }

  .ticket-table td {
    vertical-align: top;
    padding: 4px 1px;
  }

  .item-row {
    border-top: 1px dashed #000;
    page-break-inside: avoid !important;
    break-inside: avoid !important;
  }

  .flex-row {
    display: flex;
    justify-content: space-between;
    font-size: 13px;
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
    font-size: 19px;
    margin-top: 4px;
    line-height: 1.2;
  }

  .usd-row {
    display: flex;
    justify-content: space-between;
    font-size: 12px;
    font-style: italic;
  }

  .info-line {
    font-size: 12px;
    line-height: 1.2;
    margin: 0;
  }

  .pharmacy-name {
    font-size: 18px;
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
    font-size: 12px;
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
</html>`;
}

/**
 * Escapa HTML tolerando null/undefined. Cualquier campo de texto que llegue nulo
 * desde la base de datos (nombre de empresa, producto, usuario, etc.) se
 * imprimiría como cadena vacía en lugar de romper el ticket con un TypeError.
 */
function escapeHtml(value: string | number | null | undefined): string {
    if (value === null || value === undefined) return '';
    return String(value)
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

const GENERIC_UNITS = ['ud', 'unidad', 'unid', 'un', 'pza', 'pz'];

/**
 * Presentación para la línea secundaria (Abajo del Nombre): se envuelve en
 * paréntesis para separarla visualmente del nombre del producto.
 */
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

/**
 * Presentación para la línea continua (En Línea con la Cantidad): sin
 * paréntesis ni cursiva, para que el texto fluya junto a la cantidad y al
 * nombre dentro de la misma línea. Los paréntesis que ya venían en el dato se
 * eliminan y las unidades genéricas ("ud", "unidad", "pza"...) se omiten.
 */
function formatInlinePresentation(unit?: string): string | null {
    if (!unit) return null;
    const unwrapped = unit.trim().replace(/^\((.*)\)$/, '$1').trim();
    if (!unwrapped) return null;
    if (GENERIC_UNITS.includes(unwrapped.toLowerCase())) {
        return null;
    }
    return unwrapped;
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
    /** Teléfono del cliente (cotizaciones y factura en hoja normal). */
    clientPhone?: string;
    /** Dirección de entrega del cliente. Solo se imprime en la factura Hoja Normal. */
    clientAddress?: string;
    items: Array<{
        quantity: number;
        description: string;
        price: number;
        total: number;
        unit?: string;
        /** Código / código de barras del producto. Solo se imprime en Hoja Normal. */
        code?: string;
    }>;
    subtotal: number;
    tax: number;
    total: number;
    paymentMethod: string;
    amountPaid: number;
    change: number;
    /** Solo cotizaciones: días de vigencia -> línea "Vigencia". */
    validityDays?: number;
    /** Solo cotizaciones: nota al pie del detalle. */
    notes?: string;
    footerMessage?: string;
    website?: string;
    logoSvg?: string | null;
    currencySymbol?: string;
    exchangeRate?: number;
    showTotalUSD?: boolean;
    isReprint?: boolean;
    /** 'sale' (por defecto) o 'quotation'. Define encabezado, metadatos y leyenda. */
    documentKind?: 'sale' | 'quotation';
    /** 'counter' (mostrador, por defecto) o 'route' (pedido para ruta / domicilio). */
    deliveryType?: 'counter' | 'route';
    /** Estado de entrega legible, p. ej. "Pendiente de entrega". Solo Hoja Normal. */
    deliveryStatus?: string;
    /** Nombre de la hoja de ruta asignada. Solo Hoja Normal. */
    routeName?: string;
    /** Nombre del repartidor que entrega. Solo Hoja Normal. */
    deliveredByName?: string;
    /** Cobro contra entrega: imprime la leyenda de pago pendiente. */
    pendingCollection?: boolean;
}

export interface DynamicReceiptSettings {
    fontFamily?: string;
    ticketWidth?: string;
    lineHeight?: number;
    paddingX?: number;
    fontSizeTitle?: number;
    fontSizeHeader?: number;
    fontSizeBody?: number;
    fontSizePresentation?: number;
    fontSizeTotals?: number;
    fontSizeFooter?: number;
    presentationLayout?: string;
    showLogo?: boolean;
    showClientInfo?: boolean;
    showEquivalenceUsd?: boolean;
    footerMessage?: string | null;
}

export function buildReceiptHtml(data: ReceiptHtmlData, receiptSettings?: DynamicReceiptSettings): string {
    const {
        pharmacyName, address, phone, rfc, ticketId, date,
        cashierName, clientName, clientPhone, items, subtotal, tax, total,
        paymentMethod, amountPaid, change, validityDays, notes,
        footerMessage, website,
        logoSvg, currencySymbol = 'C$', exchangeRate = 36.5,
        showTotalUSD = false, isReprint = false,
        documentKind = 'sale',
    } = data;

    // Dynamic settings with fallbacks to defaults
    const rs = receiptSettings || {};
    const dynFontFamily = rs.fontFamily === 'sans-serif' ? "Arial, 'Helvetica Neue', sans-serif" : "'Courier New', Courier, monospace";
    const dynTicketWidth = rs.ticketWidth || '80mm';
    const dynLineHeight = rs.lineHeight ?? 1.2;
    const dynPaddingX = rs.paddingX ?? 0;
    const dynFontSizeTitle = rs.fontSizeTitle ?? 18;
    const dynFontSizeHeader = rs.fontSizeHeader ?? 12;
    const dynFontSizeBody = rs.fontSizeBody ?? 12;
    const dynFontSizePresentation = rs.fontSizePresentation ?? 10;
    const dynFontSizeTotals = rs.fontSizeTotals ?? 12;
    const dynFontSizeFooter = rs.fontSizeFooter ?? 12;
    const isInlinePresentation = rs.presentationLayout === 'INLINE_QTY';
    const dynShowClientInfo = rs.showClientInfo !== false;
    const dynShowEquivUSD = rs.showEquivalenceUsd !== false;
    const dynShowLogo = rs.showLogo !== false;
    const resolvedFooterMessage = rs.footerMessage !== undefined ? (rs.footerMessage || '') : (footerMessage || '');

    // La plantilla unificada de 80 mm cubre venta y cotización: sólo cambian
    // el rótulo del encabezado, las líneas de metadatos y la leyenda final.
    const isQuotation = documentKind === 'quotation';

    const totalUSD = total / exchangeRate;
    const dateStr = format(date, 'dd/MM/yyyy HH:mm', { locale: es });

    const logoHtml = (dynShowLogo && logoSvg)
        ? `<div class="logo-img" style="display:flex;align-items:center;justify-content:center;">${logoSvg}</div>`
        : '';

    const reprintHtml = isReprint
        ? `<p class="reprint-badge">*** REIMPRESIÓN DE TICKET ***</p>`
        : '';

    // Cobro contra entrega: el rutero lleva el dinero, por eso el ticket lo avisa.
    const pendingCollectionHtml = data.pendingCollection
        ? `<p class="pending-collection-badge" style="font-weight:900;font-size:${Math.max(9, dynFontSizeBody - 1)}px;border:2px solid #000;border-radius:3px;padding:1px 3px;display:inline-block;margin-top:2px;">${escapeHtml(PENDING_COLLECTION_BANNER)}</p>`
        : '';

    const usdHtml = (showTotalUSD && dynShowEquivUSD)
        ? `<div class="usd-row" style="font-size:${dynFontSizeFooter}px;">
            <span>Equiv. USD (Tasa: ${escapeHtml(String(exchangeRate))}):</span>
            <span>$ ${fmtNum(totalUSD)}</span>
          </div>`
        : '';

    // Las columnas de precio y total se imprimen sin símbolo de moneda,
    // tal como se muestra en el diseño del ticket.
    const itemsTableRowsHtml = items.map(item => {
        const priceCellStyle = `vertical-align:top;text-align:right;padding:4px 1px;white-space:nowrap;font-size:${dynFontSizeBody}px;`;
        const qtyCell = `<td class="col-cant" style="vertical-align:top;text-align:left;padding:4px 1px;font-weight:bold;white-space:nowrap;font-size:${dynFontSizeBody}px;">${escapeHtml(item.quantity)}</td>`;
        const priceCell = `<td class="col-price" style="${priceCellStyle}">${fmtNum(item.price)}</td>`;
        const totalCell = `<td class="col-total" style="${priceCellStyle}">${fmtNum(item.total)}</td>`;

        // EN LÍNEA CON LA CANTIDAD → [Cantidad] [Presentación] [Nombre] [P.U.] [Total]
        if (isInlinePresentation) {
            const presentationText = formatInlinePresentation(item.unit);
            const presentationSpan = presentationText
                ? `<span class="item-presentation" style="font-size:${dynFontSizePresentation}px;margin:0 3px;">${escapeHtml(presentationText)}</span>`
                : '';
            return `<tr class="item-row" style="border-top:1px dashed #000;">
            ${qtyCell}
            <td class="col-prod" style="vertical-align:top;text-align:left;padding:4px 1px;word-break:break-word;overflow-wrap:break-word;">
                <div style="font-size:${dynFontSizeBody}px;">${presentationSpan}<span class="item-name">${escapeHtml(item.description)}</span></div>
            </td>
            ${priceCell}
            ${totalCell}
        </tr>`;
        }

        // ABAJO DEL NOMBRE → [Cantidad] [Nombre] [P.U.] [Total] + presentación en 2.ª línea
        const unitLabel = formatUnitLabel(item.unit);
        const unitHtml = unitLabel
            ? `<div style="font-size:${dynFontSizePresentation}px;font-style:italic;font-weight:normal;color:#444;">${escapeHtml(unitLabel)}</div>`
            : '';
        return `<tr class="item-row" style="border-top:1px dashed #000;">
            ${qtyCell}
            <td class="col-prod" style="vertical-align:top;text-align:left;padding:4px 1px;word-break:break-word;overflow-wrap:break-word;">
                <div style="font-size:${dynFontSizeBody}px;">${escapeHtml(item.description)}</div>
                ${unitHtml}
            </td>
            ${priceCell}
            ${totalCell}
        </tr>`;
    }).join('\n');

    // --- Metadatos del documento (difieren entre venta y cotización) ---
    const validityHtml = isQuotation && validityDays
        ? `<p class="info-line">Vigencia: ${format(addDays(date, validityDays), 'dd/MM/yyyy', { locale: es })} (${validityDays} días)</p>`
        : '';

    const metaHtml = isQuotation
        ? `<p class="info-line">No. Cotización: ${escapeHtml(ticketId)}</p>
           <p class="info-line">Fecha: ${dateStr}</p>
           ${validityHtml}
           <p class="info-line">Atendido por: ${escapeHtml(cashierName)}</p>
           <p class="info-line">Cliente: ${escapeHtml(clientName || 'Cliente Genérico')}</p>
           ${clientPhone ? `<p class="info-line">Tel: ${escapeHtml(clientPhone)}</p>` : ''}`
        : `<p class="info-line">Ticket: ${escapeHtml(ticketId)}</p>
           <p class="info-line">Fecha: ${dateStr}</p>
           <p class="info-line">Cajero: ${escapeHtml(cashierName)}</p>
           <p class="info-line">Cliente: ${escapeHtml(clientName || 'Cliente Genérico')}</p>`;

    const sectionTitleHtml = isQuotation ? 'PRESUPUESTO / COTIZACIÓN' : 'Detalle Factura';

    // La cotización no registra pago ni cambio.
    const paymentHtml = isQuotation
        ? ''
        : `<div class="payment-info">
             <div class="flex-row">
               <span>Pago (${escapeHtml(paymentMethod)}):</span>
               <span>${currencySymbol} ${fmtNum(amountPaid)}</span>
             </div>
             <div class="flex-row">
               <span>Cambio:</span>
               <span>${currencySymbol} ${fmtNum(change)}</span>
             </div>
           </div>`;

    const notesHtml = isQuotation && notes
        ? `<p class="info-line" style="font-style:italic;margin-top:6px;white-space:pre-line;">Nota: ${escapeHtml(notes)}</p>`
        : '';

    const thanksHtml = isQuotation
        ? '<p class="thanks">*** PRESUPUESTO NO VALIDO COMO FACTURA ***</p>'
        : '<p class="thanks">*** GRACIAS POR SU COMPRA ***</p>';

    return `<div class="ticket-container" style="font-family:${dynFontFamily};font-size:${dynFontSizeBody}px;line-height:${dynLineHeight};padding:4mm ${dynPaddingX + 2}px;">
  <div class="ticket-header text-center">
    ${logoHtml}
    <p class="pharmacy-name" style="font-size:${dynFontSizeTitle}px;">${escapeHtml(pharmacyName)}</p>
    <p class="info-line" style="white-space:pre-line;font-size:${dynFontSizeHeader}px;">${escapeHtml(address)}</p>
    ${phone ? `<p class="info-line" style="font-size:${dynFontSizeHeader}px;">${escapeHtml(phone)}</p>` : ''}
    ${rfc ? `<p class="info-line" style="font-size:${dynFontSizeHeader}px;">RFC: ${escapeHtml(rfc)}</p>` : ''}
    ${reprintHtml}
    ${pendingCollectionHtml}
  </div>

  ${dynShowClientInfo ? `<div style="margin-top:8px;">
    ${metaHtml.replace(/class="info-line"/g, `class="info-line" style="font-size:${dynFontSizeHeader}px;"`)}
  </div>` : `<div style="margin-top:4px;font-size:${dynFontSizeHeader}px;">
    <p style="margin:0;">Ticket: ${escapeHtml(ticketId)}</p>
    <p style="margin:0;">Fecha: ${dateStr}</p>
    <p style="margin:0;">Cajero: ${escapeHtml(cashierName)}</p>
  </div>`}

  <div class="detalle-factura-header">${sectionTitleHtml}</div>

  <table class="ticket-table">
    <thead>
      <tr>
        <th class="col-cant" style="text-align:left;padding:3px 1px;width:12%;font-weight:bold;font-size:${dynFontSizeBody}px;">Cant</th>
        <th class="col-prod" style="text-align:left;padding:3px 1px;width:48%;font-size:${dynFontSizeBody}px;">Producto</th>
        <th class="col-price" style="text-align:right;padding:3px 1px;width:20%;font-size:${dynFontSizeBody}px;">P. Unit</th>
        <th class="col-total" style="text-align:right;padding:3px 1px;width:20%;font-size:${dynFontSizeBody}px;">Total</th>
      </tr>
    </thead>
    <tbody>
      ${itemsTableRowsHtml}
    </tbody>
  </table>

  <div class="dashed-line"></div>

  <div class="ticket-totals">
    <div class="flex-row sum-row" style="font-size:${dynFontSizeTotals}px;">
      <span>Subtotal:</span>
      <span>${currencySymbol} ${fmtNum(subtotal)}</span>
    </div>
    <div class="flex-row sum-row" style="font-size:${dynFontSizeTotals}px;">
      <span>IVA:</span>
      <span>${currencySymbol} ${fmtNum(tax)}</span>
    </div>
    <div class="total-row" style="font-size:${dynFontSizeTotals + 6}px;">
      <span>TOTAL:</span>
      <span>${currencySymbol} ${fmtNum(total)}</span>
    </div>
    ${usdHtml}
  </div>

  ${notesHtml}

  <div class="dashed-line"></div>

  ${paymentHtml}

  <div class="ticket-footer text-center" style="margin-top:16px;font-size:${dynFontSizeFooter}px;">
    ${resolvedFooterMessage ? `<p class="footer-msg">${escapeHtml(resolvedFooterMessage)}</p>` : ''}
    ${website ? `<p class="info-line">${escapeHtml(website)}</p>` : ''}
    ${thanksHtml}
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
        /** Presentación (LIBRA, QUINTAL, CAJA...) mostrada en 2.ª línea. */
        unit?: string;
    }>;
    subtotal: number;
    total: number;
    /** IVA de la cotización. Si se omite se deduce como total - subtotal. */
    tax?: number;
    notes?: string;
    footerMessage?: string;
    website?: string;
    logoSvg?: string | null;
    currencySymbol?: string;
    exchangeRate?: number;
    showTotalUSD?: boolean;
}

/**
 * Adaptador de compatibilidad: delega en la plantilla unificada de 80 mm
 * (`buildReceiptHtml`) con `documentKind: 'quotation'`, de modo que las
 * cotizaciones se impriman con el mismo layout, columnas y estilos que el POS.
 * `receiptSettings` se reenvía para respetar el diseño elegido en /settings/ticket.
 */
export function buildQuoteReceiptHtml(data: QuoteReceiptHtmlData, receiptSettings?: DynamicReceiptSettings): string {
    const {
        businessName, address, phone, rfc, quoteNumber, date,
        expirationDays, customerName, customerPhone, cashierName,
        items, subtotal, total, notes, footerMessage, website,
        logoSvg, currencySymbol, exchangeRate, showTotalUSD,
    } = data;

    return buildReceiptHtml({
        pharmacyName: businessName,
        address,
        phone,
        rfc,
        ticketId: quoteNumber,
        date,
        cashierName,
        clientName: customerName,
        clientPhone: customerPhone,
        items,
        subtotal,
        tax: data.tax ?? Math.max(0, total - subtotal),
        total,
        paymentMethod: '',
        amountPaid: 0,
        change: 0,
        validityDays: expirationDays,
        notes,
        footerMessage,
        website,
        logoSvg,
        currencySymbol,
        exchangeRate,
        showTotalUSD,
        documentKind: 'quotation',
    }, receiptSettings);
}
