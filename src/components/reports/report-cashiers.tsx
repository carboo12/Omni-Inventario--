"use client";

import { UserRound, ClipboardCheck, Hourglass } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ReportKpi, ReportTable, ReportViewProps, ReportViewState } from "./report-primitives";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { cn } from "@/lib/utils";

export function CashiersReport({ data, isLoading, isError, onRetry }: ReportViewProps) {
  const rows: any[] = data?.rows || [];
  const total = data?.total || {};

  return (
    <ReportViewState data={data} isLoading={isLoading} isError={isError} onRetry={onRetry}>
      <div className="grid gap-4 mb-4 sm:grid-cols-2 lg:grid-cols-4">
        <ReportKpi label="Cajeros activos" value={formatNumber(rows.length, 0)} icon={<UserRound className="h-4 w-4" />} tone="slate" />
        <ReportKpi label="Ventas del período" value={formatCurrency(total.revenue)} sub={`≈ ${formatCurrency(total.revenueUSD, "USD")}`} icon={<ClipboardCheck className="h-4 w-4" />} tone="primary" />
        <ReportKpi label="Turnos cerrados" value={formatNumber(rows.reduce((s: number, r: any) => s + (r.sessions || 0), 0), 0)} icon={<Hourglass className="h-4 w-4" />} tone="blue" />
        <ReportKpi label="Diferencia de caja" value={formatCurrency(total.difference)} icon={<ClipboardCheck className="h-4 w-4" />} tone={total.difference < 0 ? "red" : "green"} />
      </div>

      <ReportTable
        headers={["Cajero", "Facturas", "Ventas (C$)", "Ventas (USD)", "Unidades", "Ticket promedio", "Turnos", "Diferencia (C$)"]}
        emptyRows={rows.length}
      >
        {rows.map((r: any) => (
          <tr key={r.userId} className="border-b last:border-0 transition-colors hover:bg-slate-50">
            <td className="p-3 text-sm font-semibold uppercase text-slate-900">{r.name}</td>
            <td className="p-3 text-right text-sm">{formatNumber(r.invoiceCount, 0)}</td>
            <td className="p-3 text-right text-sm font-semibold">{formatCurrency(r.revenue)}</td>
            <td className="p-3 text-right text-sm text-muted-foreground">{formatCurrency(r.revenueUSD, "USD")}</td>
            <td className="p-3 text-right text-sm">{formatNumber(r.units, 1)}</td>
            <td className="p-3 text-right text-sm">{formatCurrency(r.avgTicket)}</td>
            <td className="p-3 text-right text-sm">{formatNumber(r.sessions, 0)}</td>
            <td className="p-3 text-right text-sm font-medium">
              <Badge className={cn("font-black text-[10px]", r.difference < 0 ? "bg-red-500 text-white" : r.difference > 0 ? "bg-emerald-500 text-white" : "bg-slate-200 text-slate-700")}>
                {formatNumber(r.difference)}
              </Badge>
            </td>
          </tr>
        ))}
      </ReportTable>
    </ReportViewState>
  );
}