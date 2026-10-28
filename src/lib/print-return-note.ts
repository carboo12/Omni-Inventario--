export interface ReturnNotePrintData {
  noteNumber: number | string;
  invoiceNumber: number | string;
  date: Date;
  cashierName: string;
  customerName: string;
  reason: string;
  resolution: 'REFUND' | 'CREDIT';
  items: Array<{ name: string; quantity: number; unitPrice: number; total: number; restocked: boolean }>;
  total: number;
}

const escapeHtml = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[char] as string));

const formatMoney = (value: number) => `C$${Number(value || 0).toLocaleString('es-NI', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** Documento de impresión independiente para una devolución; no modifica tiquetes de venta. */
export function buildReturnNoteHtml(data: ReturnNotePrintData): string {
  const rows = data.items.map((item) => `
    <tr>
      <td>${escapeHtml(item.quantity)}</td>
      <td>${escapeHtml(item.name)}<small>${item.restocked ? 'Regresa a stock' : 'Merma / dañado'}</small></td>
      <td class="numeric">${formatMoney(item.unitPrice)}</td>
      <td class="numeric">${formatMoney(item.total)}</td>
    </tr>`).join('');
  const dateText = Number.isNaN(data.date.getTime()) ? '' : data.date.toLocaleString('es-NI');
  const resolutionText = data.resolution === 'REFUND' ? 'Reembolso en efectivo de caja' : 'Saldo a favor / vale de crédito';

  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Nota de devolución #${escapeHtml(data.noteNumber)}</title>
    <style>
      @page { size: 80mm auto; margin: 4mm; }
      * { box-sizing: border-box; }
      body { width: 72mm; margin: 0 auto; color: #111; font: 12px/1.4 Arial, sans-serif; }
      h1 { margin: 0 0 3px; text-align: center; font-size: 17px; }
      .subtitle { margin: 0 0 12px; text-align: center; font-size: 13px; font-weight: 700; }
      .meta { border-block: 1px dashed #555; padding: 7px 0; }
      .meta p { margin: 2px 0; }
      table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 10px; }
      th { text-align: left; border-bottom: 1px solid #333; padding: 4px 2px; }
      td { vertical-align: top; border-bottom: 1px dotted #aaa; padding: 5px 2px; }
      td small { display: block; color: #555; }
      .numeric { text-align: right; white-space: nowrap; }
      .reason { margin-top: 10px; }
      .total { margin-top: 10px; border-top: 1px solid #333; padding-top: 7px; text-align: right; font-size: 16px; font-weight: 700; }
      .footer { margin-top: 18px; text-align: center; font-size: 10px; }
    </style></head><body>
    <h1>NOTA DE CRÉDITO</h1><p class="subtitle">Devolución #${escapeHtml(data.noteNumber)}</p>
    <section class="meta"><p>Factura original: #${escapeHtml(data.invoiceNumber)}</p><p>Fecha: ${escapeHtml(dateText)}</p><p>Cajero: ${escapeHtml(data.cashierName)}</p><p>Cliente: ${escapeHtml(data.customerName)}</p></section>
    <table><thead><tr><th>Cant.</th><th>Producto</th><th class="numeric">P. Unit.</th><th class="numeric">Total</th></tr></thead><tbody>${rows}</tbody></table>
    <p class="reason"><b>Motivo:</b> ${escapeHtml(data.reason)}</p><p><b>Resolución:</b> ${escapeHtml(resolutionText)}</p>
    <p class="total">Total devolución: ${formatMoney(data.total)}</p><p class="footer">Conserve este comprobante.</p>
    </body></html>`;
}
