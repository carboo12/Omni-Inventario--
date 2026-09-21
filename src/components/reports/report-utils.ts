"use client";

// Utilidades compartidas del módulo de Reportes y Analítica Avanzada.

export interface ReportFilters {
  preset: string;
  from?: string;
  to?: string;
  categoryId: string;
  location: string;
  cashierId: string;
  days: number;
}

export const DEFAULT_FILTERS: ReportFilters = {
  preset: "mes",
  from: undefined,
  to: undefined,
  categoryId: "all",
  location: "all",
  cashierId: "all",
  days: 30,
};

export const DAYS_PRESETS = [
  { value: 30, label: "Últimos 30 días" },
  { value: 60, label: "Últimos 60 días" },
  { value: 90, label: "Últimos 90 días" },
];

export const RANGE_PRESETS = [
  { value: "hoy", label: "Hoy" },
  { value: "ayer", label: "Ayer" },
  { value: "semana", label: "Esta semana" },
  { value: "mes", label: "Este mes" },
  { value: "custom", label: "Rango personalizado" },
];

const startOfDay = (d: Date): Date => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const endOfDay = (d: Date): Date => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);

export function toISO(d?: Date | string): string | undefined {
  if (!d) return undefined;
  const date = d instanceof Date ? d : new Date(d);
  return isNaN(date.getTime()) ? undefined : date.toISOString();
}

/** Convierte un preset de rango de fechas en { from, to } ISO. */
export function presetToRange(preset: string, custom: { from?: Date; to?: Date } | undefined): { from?: string; to?: string } {
  const now = new Date();
  switch (preset) {
    case "hoy":
      return { from: toISO(startOfDay(now)), to: toISO(now) };
    case "ayer": {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      return { from: toISO(startOfDay(y)), to: toISO(endOfDay(y)) };
    }
    case "semana": {
      const dow = (now.getDay() + 6) % 7; // lunes = 0
      const monday = new Date(startOfDay(now));
      monday.setDate(monday.getDate() - dow);
      return { from: toISO(monday), to: toISO(now) };
    }
    case "mes":
      return { from: toISO(new Date(now.getFullYear(), now.getMonth(), 1)), to: toISO(now) };
    case "custom":
      if (custom?.from) {
        return {
          from: toISO(startOfDay(custom.from)),
          to: toISO(custom.to ? endOfDay(custom.to) : endOfDay(custom.from)),
        };
      }
      return { from: undefined, to: undefined };
    case "todo":
      return { from: toISO(new Date(2000, 0, 1)), to: toISO(now) };
    default:
      return { from: undefined, to: undefined };
  }
}

export function formatRangeLabel(filters: ReportFilters): string {
  if (filters.preset === "custom") {
    if (filters.from && filters.to) {
      return `${new Date(filters.from).toLocaleDateString("es-NI")} – ${new Date(filters.to).toLocaleDateString("es-NI")}`;
    }
    return "Personalizado";
  }
  return RANGE_PRESETS.find((p) => p.value === filters.preset)?.label || "Este mes";
}

export function pct(value?: number | null): string {
  return `${Number(value ?? 0).toLocaleString("es-NI", { maximumFractionDigits: 1 })}%`;
}

export function num(value?: number | null, digits = 2): string {
  return Number(value ?? 0).toLocaleString("es-NI", { minimumFractionDigits: digits, maximumFractionDigits: 2 });
}

export function moneyNIO(value?: number | null): string {
  return `C$ ${num(value)}`;
}

export function moneyUSD(value?: number | null): string {
  return `$ ${num(value)}`;
}

// ---------------------------------------------------------------------------
// Exportación a CSV / Excel
// ---------------------------------------------------------------------------

function escapeCell(v: string | number): string {
  const s = String(v ?? "");
  return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function toCSV(headers: string[], rows: (string | number)[][]): string {
  const lines = [headers.map(escapeCell).join(";")];
  for (const row of rows) lines.push(row.map(escapeCell).join(";"));
  return "\uFEFF" + lines.join("\n");
}

export function downloadTextFile(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function downloadCSV(filename: string, headers: string[], rows: (string | number)[][]) {
  downloadTextFile(filename.endsWith(".csv") ? filename : `${filename}.csv`, toCSV(headers, rows), "text/csv;charset=utf-8;");
}

export async function downloadXLSX(filename: string, sheetName: string, headers: string[], rows: (string | number)[][]) {
  const XLSX = await import("xlsx");
  const sheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  sheet["!cols"] = headers.map(() => ({ wch: 18 }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, sheet, (sheetName || "Reporte").slice(0, 31));
  XLSX.writeFile(wb, filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`);
}

// ---------------------------------------------------------------------------
// Utilidades para impresión / PDF
// ---------------------------------------------------------------------------

const PRINT_CSS = `
@page { margin: 10mm; size: A4 landscape; }
@media print {
  body { background: #fff !important; }
  body * { visibility: hidden !important; }
  #report-print-area, #report-print-area * { visibility: visible !important; }
  #report-print-area {
    position: absolute;
    left: 0; top: 0;
    width: 100%;
    color: #000 !important;
    print-color-adjust: exact !important;
    -webkit-print-color-adjust: exact !important;
  }
  #report-print-area .print-header { display: flex !important; }
  #report-print-area table th { background: #f1f5f9 !important; color: #000 !important; }
  .no-print { display: none !important; }
}
`;

export function printHTML(html: string, title = "Reporte") {
  const iframe = document.createElement("iframe");
  iframe.setAttribute("style", "position:fixed;width:0;height:0;border:0;visibility:hidden;");
  document.body.appendChild(iframe);
  iframe.contentDocument?.open();
  iframe.contentDocument?.write(
    `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title><style>${PRINT_CSS}</style></head><body><div id="report-print-area">${html}</div></body></html>`
  );
  iframe.contentDocument?.close();
  const doPrint = () => {
    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    }, 150);
  };
  iframe.onload = () => doPrint();
  setTimeout(() => {
    iframe.contentDocument;
    doPrint();
  }, 300);
  setTimeout(() => {
    document.body.removeChild(iframe);
  }, 30000);
}