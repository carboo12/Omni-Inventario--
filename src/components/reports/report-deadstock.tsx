"use client";

import { PackageX, Boxes, TrendingDown } from "lucide-react";
import { ReportKpi, ReportTable, ReportViewProps, ReportViewState } from "./report-primitives";
import { formatCurrency, formatNumber } from "@/lib/utils";

export function DeadStockReport({ data, isLoading, isError, onRetry }: ReportViewProps) {
  const rows: any[] = data?.rows || [];
  const count = data?.count ?? 0;
  const days = data?.days ?? 0;
  const stockInactiveUnits = data?.stockInactiveUnits ?? 0;
  const costValueInactive = data?.costValueInactive ?? 0;

  return (
    <ReportViewState data={data} isLoading={isLoading} isError={isError} onRetry={onRetry}>
      {rows.length === 0 ? (
        <ReportTable headers={["Producto", "Barras", "Categoría", "Stock (C$)", "Valor (C$)"]} emptyRows={0} />
      ) : (
        <>
          <div className="grid gap-4 mb-4 sm:grid-cols-2 lg:grid-cols-3">
            <ReportKpi label="Productos sin rotación" value={formatNumber(count, 0)} sub={`Sin ventas en ${days} días`} icon={<PackageX className="h-4 w-4" />} tone="red" />
            <ReportKpi label="Unidades inactivas" value={formatNumber(stockInactiveUnits, 1)} icon={<Boxes className="h-4 w-4" />} tone="amber" />
            <ReportKpi label="Capital inmovilizado" value={formatCurrency(costValueInactive)} sub="Costo de inventario (C$)" icon={<TrendingDown className="h-4 w-4" />} tone="violet" />
          </div>

          <ReportTable
            headers={["Producto", "Código de barras", "Categoría", "Stock disponible", "Valor en stock (C$)", "Estado"]}
            emptyRows={rows.length}
          >
            {rows.map((r: any) => (
              <tr key={r.productId} className="border-b last:border-0 transition-colors hover:bg-slate-50">
                <td className="p-3 text-sm font-medium text-slate-900">{r.productName}</td>
                <td className="p-3 text-sm font-mono text-muted-foreground">{r.barcode || "—"}</td>
                <td className="p-3 text-sm">{r.categoryName}</td>
                <td className="p-3 text-right text-sm font-semibold">{formatNumber(r.stockQuantity, 1)}</td>
                <td className="p-3 text-right text-sm text-red-600 font-semibold">{formatCurrency(r.costNIO)}</td>
                <td className="p-3 text-sm">
                  <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-black uppercase text-red-600">Sin ventas</span>
                </td>
              </tr>
            ))}
          </ReportTable>
        </>
      )}
    </ReportViewState>
  );
}