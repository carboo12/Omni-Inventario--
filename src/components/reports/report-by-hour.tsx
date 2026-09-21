"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltipContent } from "@/components/ui/chart";
import { Clock, Hourglass, TrendingUp } from "lucide-react";
import { ReportCard, ReportKpi, ReportTable, ReportViewProps, ReportViewState } from "./report-primitives";
import { formatCurrency, formatNumber } from "@/lib/utils";
import type { ValueType } from "recharts/types/component/DefaultTooltipContent";

export const config = {
  sales: { label: "Ventas (C$)", color: "var(--primary)" },
};

export function SalesByHourReport({ data, isLoading, isError, onRetry }: ReportViewProps) {
  const hours: any[] = data?.hours || [];
  const peak = data?.peak || {};
  const totalSales = data?.totalSales ?? 0;
  const activeHours = hours.filter((h: any) => h.count > 0);

  return (
    <ReportViewState data={data} isLoading={isLoading} isError={isError} onRetry={onRetry}>
      <div className="grid gap-4 mb-4 sm:grid-cols-2 lg:grid-cols-3">
        <ReportKpi label="Hora pico" value={peak.label || "—"} sub={`${formatCurrency(peak.sales)} en ${formatNumber(peak.count, 0)} facturas`} icon={<Clock className="h-4 w-4" />} tone="amber" />
        <ReportKpi label="Ventas del período" value={formatCurrency(totalSales)} icon={<TrendingUp className="h-4 w-4" />} tone="primary" />
        <ReportKpi label="Horas con actividad" value={`${activeHours.length} de 24`} icon={<Hourglass className="h-4 w-4" />} tone="blue" />
      </div>

      <ReportCard title="Ventas por Hora" description="Horas pico de actividad comercial" className="mb-4">
        <ChartContainer config={config} className="h-[280px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={hours}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="label" tickLine={false} tickMargin={8} axisLine={false} interval={1} />
              <YAxis tickLine={false} axisLine={false} tickFormatter={(v) => `C$${formatNumber(Number(v) / 1000, 0)}k`} />
              <Tooltip cursor={false} content={<ChartTooltipContent formatter={(value: ValueType) => formatCurrency(value as number)} />} />
              <Bar dataKey="sales" fill="var(--color-sales)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </ReportCard>

      <ReportTable headers={["Hora", "Ventas (C$)", "Facturas", "Participación"]} emptyRows={activeHours.length}>
        {activeHours
          .map((h: any) => (
            <tr key={h.hour} className="border-b last:border-0 transition-colors hover:bg-slate-50">
              <td className="p-3 text-sm font-semibold">{h.label}</td>
              <td className="p-3 text-right text-sm">{formatCurrency(h.sales)}</td>
              <td className="p-3 text-right text-sm">{formatNumber(h.count, 0)}</td>
              <td className="p-3 text-right text-sm">{formatNumber(h.sharePct, 1)}%</td>
            </tr>
          ))}
      </ReportTable>
    </ReportViewState>
  );
}