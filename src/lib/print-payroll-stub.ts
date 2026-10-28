import { printReceiptHtml } from '@/lib/print-iframe';

export type PayrollStubData = {
  employeeName: string;
  startDate: Date | string;
  endDate: Date | string;
  paidAt: Date | string;
  workdays: number;
  grossSalary: number;
  absenceCount: number;
  absenceDeductions: number;
  loanDeductions: number;
  netSalary: number;
};

const escapeHtml = (value: string | number) => String(value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

const formatDate = (value: Date | string) => {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('es-NI');
};

const money = (value: number) => Number(value || 0).toLocaleString('es-NI', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function buildPayrollStubHtml(data: PayrollStubData) {
  return `<div class="ticket-container" style="width:280px;max-width:100%;margin:0 auto;padding:8px;font-family:monospace;font-size:12px;text-align:center;color:#000;background:#fff;">
    <h3 style="margin:2px 0;font-size:15px;">OMNI INVENTARIO +</h3>
    <p style="margin:2px 0;font-size:10px;">COMPROBANTE DE PAGO DE NÓMINA</p>
    <hr style="border:0;border-top:1px dashed #000;margin:8px 0;" />
    <div style="text-align:left;line-height:1.5;">
      <b>Empleado:</b> ${escapeHtml(data.employeeName)}<br />
      <b>Período:</b> ${escapeHtml(formatDate(data.startDate))} al ${escapeHtml(formatDate(data.endDate))}<br />
      <b>Fecha de Pago:</b> ${escapeHtml(formatDate(data.paidAt))}
    </div>
    <hr style="border:0;border-top:1px dashed #000;margin:8px 0;" />
    <table style="width:100%;font-size:11px;text-align:left;border-collapse:collapse;">
      <tbody>
        <tr><td>Días trabajados:</td><td style="text-align:right;">${escapeHtml(data.workdays)}</td></tr>
        <tr><td>Salario Bruto:</td><td style="text-align:right;">C$ ${money(data.grossSalary)}</td></tr>
        <tr><td>Desc. Faltas (${escapeHtml(data.absenceCount)}):</td><td style="text-align:right;">- C$ ${money(data.absenceDeductions)}</td></tr>
        <tr><td>Abono Préstamo:</td><td style="text-align:right;">- C$ ${money(data.loanDeductions)}</td></tr>
      </tbody>
    </table>
    <hr style="border:0;border-top:1px dashed #000;margin:8px 0;" />
    <div style="font-size:14px;text-align:right;margin:5px 0;"><b>NETO RECIBIDO: C$ ${money(data.netSalary)}</b></div>
    <div style="text-align:center;margin-top:36px;padding-bottom:16px;">
      ____________________________<br />Firma de Conformidad
    </div>
  </div>`;
}

export function printPayrollStub(data: PayrollStubData) {
  printReceiptHtml(buildPayrollStubHtml(data));
}
