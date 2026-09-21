"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltipContent } from "@/components/ui/chart";
import { ReportCard, ReportTable, ReportViewProps, ReportViewState, StatusBadge } from "./report-primitives";
import { formatCurrency, formatNumber } from "@/lib/utils";
import type { ValueType } from "recharts/types/component/DefaultTooltipContent";

const config = {
  revenue: { label: "Ingresos (C$)", color: "var(--primary)" },
  profit: { label: "Utilidad (C$)", color: "#10b981" },
};

export function SalesByCategoryReport({ data, isLoading, isError, onRetry }: ReportViewProps) {
  const rows: any[] = data?.rows || [];
  const total = data?.total || {};
  const subcategories: any[] = data?.subcategories || [];

  return (
    <ReportViewState data={data} isLoading={isLoading} isError={isError} onRetry={onRetry}>
      <div className="grid gap-4 mb-4 sm:grid-cols-2 lg:grid-cols-4">
        <ReportCard title="Ingresos">
          <p className="text-xl font-bold">{formatCurrency(total.revenue)}</p>
        </ReportCard>
        <ReportCard title="Utilidad">
          <p className="text-xl font-bold text-emerald-600">{formatCurrency(total.profit)}</p>
        </ReportCard>
        <ReportCard title="Unidades">
          <p className="text-xl font-bold">{formatNumber(total.units, 1)}</p>
        </ReportCard>
        <ReportCard title="Facturas">
          <p className="text-xl font-bold">{formatNumber(total.invoiceCount, 0)}</p>
        </ReportCard>
      </div>

      {rows.length > 0 && (
        <ReportCard title="Ventas por Categoría" description="Participación en ingresos" className="mb-4">
          <ChartContainer config={config} className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={rows}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="categoryName" tickLine={false} tickMargin={10} axisLine={false} interval={0} angle={-20} textAnchor="end" height={70} tick={{ fontSize: 11 }} />
                <YAxis tickLine={false} axisLine={false} tickFormatter={(v) => `C$${formatNumber(Number(v) / 1000, 0)}k`} />
                <Tooltip cursor={false} content={<ChartTooltipContent formatter={(value: ValueType) => formatCurrency(value as number)} />} />
                <Bar dataKey="revenue" fill="var(--color-revenue)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </ReportCard>
      )}

      <ReportTable
        headers={[
          "Categoría",
          "Tipo",
          "Ventas (C$)",
          "Unidades",
          "Costo (C$)",
          "Utilidad (C$)",
          "Margen",
          "Facturas",
          "Participación",
        ]}
        emptyRows={rows.length}
      >
        {rows.map((r: any, i: number) => (
          <tr key={r.categoryId || i} className="border-b last:border-0 transition-colors hover:bg-slate-50">
            <td className="p-3 text-sm font-medium text-slate-900">{r.categoryName}</td>
            <td className="p-3">
              <StatusBadge value={r.inventoryType || "General"} warn={!r.inventoryType} />
            </td>
            <td className="p-3 text-right text-sm font-semibold">{formatCurrency(r.revenue)}</td>
            <td className="p-3 text-right text-sm">{formatNumber(r.units, 1)}</td>
            <td className="p-3 text-right text-sm text-muted-foreground">{formatCurrency(r.cost)}</td>
            <td className="p-3 text-right text-sm font-semibold text-emerald-600">{formatCurrency(r.profit)}</td>
            <td className="p-3 text-right text-sm">{formatNumber(r.marginPct, 1)}%</td>
            <td className="p-3 text-right text-sm">{formatNumber(r.invoiceCount, 0)}</td>
            <td className="p-3 text-right text-sm">{formatNumber(r.sharePct, 1)}%</td>
          </tr>
        ))}
      </ReportTable>

      {subcategories.length > 0 && (
        <div className="mt-4">
          <ReportTable
            headers={["Subcategoría", "Categoría padre", "Ventas (C$)", "Unidades", "Utilidad (C$)", "Margen"]}
            emptyRows={subcategories.length}
          >
            {subcategories.map((r: any) => (
              <tr key={r.categoryId} className="border-b last:border-0 transition-colors hover:bg-slate-50">
                <td className="p-3 text-sm font-medium">{r.categoryName}</td>
                <td className="p-3 text-sm text-muted-foreground">{rows.find((x: any) => x.categoryId === r.parentId)?.categoryName || "—"}</td>
                <td className="p-3 text-right text-sm">{formatCurrency(r.revenue)}</td>
                <td className="p-3 text-right text-sm">{formatNumber(r.units, 1)}</td>
                <td className="p-3 text-right text-sm text-emerald-600">{formatCurrency(r.profit)}</td>
                <td className="p-3 text-right text-sm">{formatNumber(r.marginPct, 1)}%</td>
              </tr>
            ))}
          </ReportTable>
        </div>
      )}
    </ReportViewState>
  );
}