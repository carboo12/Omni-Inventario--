"use client";

import { useMemo, useState } from "react";
import { Percent, PiggyBank, Scale, ShoppingBag, ThumbsDown, ThumbsUp, TrendingDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ReportCard, ReportKpi, ReportTable, ReportViewProps, ReportViewState } from "./report-primitives";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { cn } from "@/lib/utils";

const BAND_COLORS: Record<string, string> = {
  "Pérdida": "bg-red-100 text-red-600",
  "0 – 10%": "bg-amber-100 text-amber-600",
  "10 – 20%": "bg-yellow-100 text-yellow-700",
  "20 – 30%": "bg-emerald-100 text-emerald-700",
  "30 – 50%": "bg-green-100 text-green-700",
  "+ 50%": "bg-sky-100 text-sky-700",
};

export function ProfitMarginReport({ data, isLoading, isError, onRetry }: ReportViewProps) {
  const [showAll, setShowAll] = useState(false);
  const items: any[] = data?.items || [];
  const visible = showAll ? items : items.slice(0, 30);
  const summary = data?.summary || {};
  const totalRevenue = summary.totalRevenue ?? 0;
  const totalRevenueUSD = summary.totalRevenueUSD ?? 0;
  const totalCost = summary.totalCost ?? 0;
  const totalProfit = summary.totalProfit ?? 0;
  const totalProfitUSD = summary.totalProfitUSD ?? 0;
  const marginPct = summary.marginPct ?? 0;
  const positiveProducts = summary.positiveProducts ?? 0;
  const negativeProducts = summary.negativeProducts ?? 0;
  const bands: any[] = data?.bands || [];

  const totalUnits = useMemo(() => items.reduce((s, r) => s + r.units, 0), [items]);
  const avgMargin = useMemo(() => (items.length ? items.reduce((s, r) => s + r.marginPct, 0) / items.length : 0), [items]);

  return (
    <ReportViewState data={data} isLoading={isLoading} isError={isError} onRetry={onRetry}>
      <div className="grid gap-4 mb-4 sm:grid-cols-2 lg:grid-cols-4">
        <ReportKpi label="Ingresos del período" value={formatCurrency(totalRevenue)} sub={`≈ ${formatCurrency(totalRevenueUSD, "USD")}`} icon={<ShoppingBag className="h-4 w-4" />} tone="primary" />
        <ReportKpi label="Costo total" value={formatCurrency(totalCost)} icon={<Scale className="h-4 w-4" />} tone="slate" />
        <ReportKpi label="Utilidad neta" value={formatCurrency(totalProfit)} sub={`≈ ${formatCurrency(totalProfitUSD, "USD")}`} icon={<PiggyBank className="h-4 w-4" />} tone="green" />
        <ReportKpi label="Margen general" value={formatNumber(marginPct, 1) + "%"} sub={`Promedio simple: ${formatNumber(avgMargin, 1)}%`} icon={<Percent className="h-4 w-4" />} tone="violet" />
      </div>

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <ReportCard title="Productos con utilidad">
          <div className="flex items-center gap-2">
            <ThumbsUp className="h-5 w-5 text-emerald-500" />
            <span className="text-xl font-bold text-emerald-600">{formatNumber(positiveProducts, 0)}</span>
          </div>
        </ReportCard>
        <ReportCard title="Productos en pérdida">
          <div className="flex items-center gap-2">
            <ThumbsDown className="h-5 w-5 text-red-500" />
            <span className="text-xl font-bold text-red-600">{formatNumber(negativeProducts, 0)}</span>
          </div>
        </ReportCard>
        <ReportCard title="Unidades en rango">
          <div className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5 text-slate-500" />
            <span className="text-xl font-bold">{formatNumber(totalUnits, 1)}</span>
          </div>
        </ReportCard>
      </div>

      <ReportCard title="Distribución por rangos de margen" description="Productos según % de utilidad" className="mb-4">
        <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {bands.map((b: any) => (
            <div key={b.label} className="rounded-lg border border-slate-200 p-3 text-center">
              <p className={cn("mx-auto inline-block rounded-full px-2 py-0.5 text-[10px] font-black uppercase", BAND_COLORS[b.label] || "bg-slate-100")}>
                {b.label}
              </p>
              <p className="mt-2 text-lg font-bold">{formatNumber(b.count, 0)}</p>
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">productos</p>
            </div>
          ))}
        </div>
      </ReportCard>

      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-700">Desglose por producto</p>
        {items.length > 30 && (
          <Button variant="outline" size="sm" onClick={() => setShowAll((v) => !v)}>
            {showAll ? "Mostrar menos" : `Mostrar los ${items.length}`}
          </Button>
        )}
      </div>

      <ReportTable
        headers={["Producto", "Precio prom.", "Costo prom.", "Unidades", "Ingresos (C$)", "Costo (C$)", "Utilidad (C$)", "Utilidad (USD)", "Margen"]}
        emptyRows={visible.length}
      >
        {visible.map((r: any) => (
          <tr key={r.productId} className="border-b last:border-0 transition-colors hover:bg-slate-50">
            <td className="p-3 text-sm font-medium text-slate-900">{r.productName}</td>
            <td className="p-3 text-right text-sm">{formatCurrency(r.avgUnitPrice)}</td>
            <td className="p-3 text-right text-sm text-muted-foreground">{formatCurrency(r.avgUnitCost)}</td>
            <td className="p-3 text-right text-sm">{formatNumber(r.units, 1)}</td>
            <td className="p-3 text-right text-sm">{formatCurrency(r.totalRevenue)}</td>
            <td className="p-3 text-right text-sm text-muted-foreground">{formatCurrency(r.totalCost)}</td>
            <td className={cn("p-3 text-right text-sm font-semibold", r.profit >= 0 ? "text-emerald-600" : "text-red-600")}>{formatCurrency(r.profit)}</td>
            <td className="p-3 text-right text-sm text-muted-foreground">{formatCurrency(r.profitUSD, "USD")}</td>
            <td className={cn("p-3 text-right text-sm font-medium", r.marginPct >= 0 ? "" : "text-red-600")}>{formatNumber(r.marginPct, 1)}%</td>
          </tr>
        ))}
      </ReportTable>
      {visible.length === 0 && (
        <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
          <TrendingDown className="h-4 w-4" /> Sin productos en el rango seleccionado.
        </p>
      )}
    </ReportViewState>
  );
}