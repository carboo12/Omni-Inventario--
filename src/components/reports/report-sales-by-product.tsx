"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronUp, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ReportCard, ReportKpi, ReportTable, ReportViewProps, ReportViewState, StatusBadge } from "./report-primitives";
import { cn, formatCurrency, formatNumber } from "@/lib/utils";
import { PackageSearch, ShoppingBag, TrendingDown, TrendingUp } from "lucide-react";

const PAGE_SIZE = 25;

export function SalesByProductReport({ data, isLoading, isError, onRetry }: ReportViewProps) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [onlyLoss, setOnlyLoss] = useState(false);

  const rows: any[] = data?.rows || [];
  const total = data?.total || {};

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const rowsF: any[] = rows.filter((r: any) => {
      if (onlyLoss && r.profit >= 0) return false;
      if (!q) return true;
      return (
        r.productName.toLowerCase().includes(q) ||
        (r.barcode && String(r.barcode).toLowerCase().includes(q)) ||
        (r.categoryName || "").toLowerCase().includes(q)
      );
    });
    return rowsF;
  }, [rows, search, onlyLoss]);

  const visible = filtered.slice(0, Math.min(page * PAGE_SIZE, filtered.length));
  const totalRevenue = useMemo(() => filtered.reduce((s: number, r: any) => s + r.revenue, 0), [filtered]);

  return (
    <ReportViewState data={data} isLoading={isLoading} isError={isError} onRetry={onRetry}>
      {rows.length === 0 ? (
        <ReportTable headers={["Producto", "Barras", "Categoría", "Unidades", "Ingresos (C$)", "Utilidad (C$)", "Margen"]} emptyRows={0} />
      ) : (
        <>
          <div className="grid gap-3 mb-4 sm:grid-cols-2 lg:grid-cols-4">
            <ReportKpi label="Productos vendidos" value={formatNumber(rows.length, 0)} icon={<PackageSearch className="h-4 w-4" />} tone="slate" />
            <ReportKpi label="Ingresos en rango" value={formatCurrency(filtered.length === rows.length ? total.revenue : totalRevenue)} sub={`≈ ${formatCurrency(total.revenueUSD, "USD")}`} icon={<ShoppingBag className="h-4 w-4" />} tone="primary" />
            <ReportKpi label="Utilidad del filtro" value={formatCurrency(filtered.reduce((s: number, r: any) => s + r.profit, 0))} icon={<TrendingUp className="h-4 w-4" />} tone="green" />
            <ReportKpi
              label="Productos sin utilidad"
              value={formatNumber(rows.filter((r: any) => r.profit <= 0).length, 0)}
              icon={<TrendingDown className="h-4 w-4" />}
              tone="red"
            />
          </div>

          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre, código de barras o categoría…"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="pl-9"
              />
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setOnlyLoss((v) => !v);
                  setPage(1);
                }}
                className={cn(onlyLoss && "border-red-300 bg-red-50 text-red-600 hover:bg-red-50 hover:text-red-600")}
              >
                Solo sin utilidad
              </Button>
              <p className="text-xs text-muted-foreground">{filtered.length} productos</p>
            </div>
          </div>

          <ReportTable
            headers={[
              "Producto",
              "Código de barras",
              "Categoría",
              "Unidades",
              "Ingresos (C$)",
              "Ingresos (USD)",
              "Costo (C$)",
              "Utilidad (C$)",
              "Margen",
              "Ticket",
            ]}
            emptyRows={visible.length}
          >
            {visible.map((r: any) => (
              <tr key={r.productId} className="border-b last:border-0 transition-colors hover:bg-slate-50">
                <td className="p-3 text-sm font-medium text-slate-900">{r.productName}</td>
                <td className="p-3 text-sm font-mono text-muted-foreground">{r.barcode || "—"}</td>
                <td className="p-3 text-sm">{r.categoryName}</td>
                <td className="p-3 text-right text-sm">{formatNumber(r.units, 1)}</td>
                <td className="p-3 text-right text-sm font-semibold">{formatCurrency(r.revenue)}</td>
                <td className="p-3 text-right text-sm text-muted-foreground">{formatCurrency(r.revenueUSD, "USD")}</td>
                <td className="p-3 text-right text-sm text-muted-foreground">{formatCurrency(r.cost)}</td>
                <td className={cn("p-3 text-right text-sm font-semibold", r.profit >= 0 ? "text-emerald-600" : "text-red-600")}>{formatCurrency(r.profit)}</td>
                <td className={cn("p-3 text-right text-sm font-medium", r.marginPct >= 0 ? "" : "text-red-600")}>{formatNumber(r.marginPct, 1)}%</td>
                <td className="p-3 text-right text-sm text-muted-foreground">{formatNumber(r.avgUnitPrice)}</td>
              </tr>
            ))}
          </ReportTable>

          {filtered.length > visible.length && (
            <div className="mt-3 flex justify-center">
              <Button variant="outline" size="sm" onClick={() => setPage((p) => p + 1)}>
                <ChevronDown className="mr-1 h-4 w-4" />
                Mostrar más ({filtered.length - visible.length} restantes)
              </Button>
            </div>
          )}
          {page > 1 && filtered.length > visible.length && (
            <div className="mt-1 flex justify-center">
              <Button variant="ghost" size="sm" onClick={() => setPage(1)}>
                <ChevronUp className="mr-1 h-4 w-4" />
                Volver al inicio
              </Button>
            </div>
          )}
          {filtered.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center justify-end gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-semibold">
              <StatusBadge value={`Unidades: ${formatNumber(filtered.reduce((s: number, r: any) => s + r.units, 0), 1)}`} />
              <StatusBadge value={`Ingresos: ${formatCurrency(filtered.reduce((s: number, r: any) => s + r.revenue, 0))}`} />
              <StatusBadge value={`Utilidad: ${formatCurrency(filtered.reduce((s: number, r: any) => s + r.profit, 0))}`} good />
            </div>
          )}
        </>
      )}
    </ReportViewState>
  );
}