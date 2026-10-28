"use client";

import { useMemo, useState } from "react";
import { Search, Layers3, TrendingUp, PackageCheck } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ReportKpi, ReportTable, ReportViewProps, ReportViewState } from "./report-primitives";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { cn } from "@/lib/utils";

export function ProfitByPresentationReport({ data, isLoading, isError, onRetry }: ReportViewProps) {
  const [search, setSearch] = useState("");
  const rows: any[] = data?.rows || [];
  const summary = data?.summary || {};
  const filtered = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    if (!query) return rows;
    return rows.filter((row) =>
      String(row.productName || "").toLocaleLowerCase().includes(query) ||
      String(row.presentationName || "").toLocaleLowerCase().includes(query)
    );
  }, [rows, search]);

  return (
    <ReportViewState data={data} isLoading={isLoading} isError={isError} onRetry={onRetry}>
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <ReportKpi label="Ítems / presentaciones" value={formatNumber(summary.presentationCount || 0, 0)} icon={<Layers3 className="h-4 w-4" />} tone="slate" />
          <ReportKpi label="Cantidad vendida" value={formatNumber(summary.totalQuantity || 0, 2)} icon={<PackageCheck className="h-4 w-4" />} tone="blue" />
          <ReportKpi label="Ingreso total" value={formatCurrency(summary.totalRevenue || 0)} icon={<TrendingUp className="h-4 w-4" />} tone="primary" />
          <ReportKpi label="Ganancia neta / margen" value={formatCurrency(summary.totalProfit || 0)} sub={`${formatNumber(summary.marginPct || 0, 1)}% de margen`} icon={<TrendingUp className="h-4 w-4" />} tone="green" />
        </div>

        <div className="relative max-w-lg">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar producto o presentación…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="pl-9"
          />
        </div>

        <ReportTable
          headers={["Producto / Ítem", "Presentación", "Cantidad", "Equivalencia base", "Ingreso (C$)", "Costo (C$)", "Ganancia (C$)", "Margen"]}
          emptyRows={filtered.length}
        >
          {filtered.map((row: any, index: number) => (
            <tr key={`${row.productName}-${row.presentationName}-${index}`} className="border-b last:border-0 transition-colors hover:bg-slate-50">
              <td className="p-3 text-sm font-medium">{row.productName}</td>
              <td className="p-3 text-sm">{row.presentationName}</td>
              <td className="p-3 text-right text-sm">{formatNumber(row.quantity, 2)}</td>
              <td className="p-3 text-right text-sm text-muted-foreground">× {formatNumber(row.presentationFactor, 2)} {row.baseUnit}</td>
              <td className="p-3 text-right text-sm">{formatCurrency(row.revenue)}</td>
              <td className="p-3 text-right text-sm text-muted-foreground">{formatCurrency(row.cost)}</td>
              <td className={cn("p-3 text-right text-sm font-semibold", row.profit >= 0 ? "text-emerald-700" : "text-red-600")}>{formatCurrency(row.profit)}</td>
              <td className={cn("p-3 text-right text-sm", row.marginPct < 0 && "text-red-600")}>{formatNumber(row.marginPct, 1)}%</td>
            </tr>
          ))}
        </ReportTable>
        <p className="text-xs text-muted-foreground">El costo se calcula con el costo actual del producto por unidad base, multiplicado por el factor de conversión de la presentación.</p>
      </div>
    </ReportViewState>
  );
}
