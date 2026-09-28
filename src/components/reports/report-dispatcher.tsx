"use client";

import { useState } from "react";
import {
  Package,
  TrendingUp,
  Trophy,
  BarChart3,
  X,
  ChevronDown,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import {
  ReportKpi,
  ReportTable,
  ReportViewProps,
  ReportViewState,
} from "./report-primitives";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface DispatcherFiltersProps {
  products: { id: string; name: string; categoryId: string | null; categoryName: string }[];
  categories: { id: string; name: string }[];
  selectedProductIds: string[];
  selectedCategoryId: string;
  onProductsChange: (ids: string[]) => void;
  onCategoryChange: (id: string) => void;
}

function MultiProductCombobox({
  products,
  selectedIds,
  onChange,
}: {
  products: { id: string; name: string; categoryName: string }[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const toggle = (id: string) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((x) => x !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  const selectedProducts = products.filter((p) => selectedIds.includes(p.id));
  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        Producto(s) específico(s)
      </label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full max-w-xs justify-between font-normal"
          >
            <span className="truncate text-sm">
              {selectedIds.length === 0
                ? "Todos los productos"
                : selectedIds.length === 1
                ? selectedProducts[0]?.name
                : `${selectedIds.length} productos seleccionados`}
            </span>
            <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[320px] p-0" align="start">
          <div className="flex flex-col">
            <div className="border-b px-3 py-2">
              <input
                type="text"
                placeholder="Buscar producto…"
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <ScrollArea className="h-64">
              {filteredProducts.length === 0 ? (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  No se encontraron productos.
                </div>
              ) : (
                <div className="p-1">
                  {filteredProducts.map((p) => (
                    <div
                      key={p.id}
                      onClick={() => toggle(p.id)}
                      className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 gap-2 cursor-pointer"
                    >
                      <span
                        className={cn(
                          "flex h-4 w-4 shrink-0 items-center justify-center rounded border",
                          selectedIds.includes(p.id)
                            ? "bg-primary border-primary text-white"
                            : "border-slate-300"
                        )}
                      >
                        {selectedIds.includes(p.id) && (
                          <svg
                            className="h-2.5 w-2.5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={3}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        )}
                      </span>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">{p.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {p.categoryName}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </PopoverContent>
      </Popover>

      {selectedProducts.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selectedProducts.map((p) => (
            <Badge
              key={p.id}
              variant="secondary"
              className="gap-1 text-xs"
              onClick={() => toggle(p.id)}
            >
              {p.name}
              <X className="h-3 w-3 cursor-pointer" />
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

export function DispatcherReportFilters({
  products,
  categories,
  selectedProductIds,
  selectedCategoryId,
  onProductsChange,
  onCategoryChange,
}: DispatcherFiltersProps) {
  return (
    <div className="flex flex-col gap-4 rounded-lg border border-slate-200 bg-slate-50/80 p-4 no-print">
      <div className="flex items-center gap-2">
        <TrendingUp className="h-4 w-4 text-primary" />
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">
          Análisis de Impulso de Marca / Producto
        </span>
      </div>
      <div className="flex flex-wrap gap-6">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Categoría / Marca
          </label>
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => onCategoryChange("all")}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                selectedCategoryId === "all"
                  ? "bg-primary text-white"
                  : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"
              )}
            >
              Todas
            </button>
            {categories.map((c) => (
              <button
                key={c.id}
                onClick={() =>
                  onCategoryChange(selectedCategoryId === c.id ? "all" : c.id)
                }
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                  selectedCategoryId === c.id
                    ? "bg-primary text-white"
                    : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"
                )}
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>

        <MultiProductCombobox
          products={products}
          selectedIds={selectedProductIds}
          onChange={onProductsChange}
        />

        {(selectedProductIds.length > 0 || selectedCategoryId !== "all") && (
          <div className="flex items-end">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs text-muted-foreground"
              onClick={() => {
                onProductsChange([]);
                onCategoryChange("all");
              }}
            >
              <X className="mr-1 h-3 w-3" />
              Limpiar
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

interface DispatcherReportProps extends ReportViewProps {
  filterData?: {
    categories?: { id: string; name: string }[];
    products?: { id: string; name: string; categoryId: string | null; categoryName: string }[];
  };
  selectedProductIds: string[];
  selectedCategoryId: string;
  onProductsChange: (ids: string[]) => void;
  onCategoryChange: (id: string) => void;
}

export function DispatcherReport({
  data,
  isLoading,
  isError,
  onRetry,
  filterData,
  selectedProductIds,
  selectedCategoryId,
  onProductsChange,
  onCategoryChange,
}: DispatcherReportProps) {
  const rows: any[] = data?.rows || [];
  const total = data?.total || {};
  const topDispatcher = data?.topDispatcher;

  const categories: { id: string; name: string }[] =
    filterData?.categories || [];
  const products: { id: string; name: string; categoryId: string | null; categoryName: string }[] =
    filterData?.products || [];

  const hasActiveFilter =
    selectedProductIds.length > 0 || selectedCategoryId !== "all";

  return (
    <ReportViewState
      data={data}
      isLoading={isLoading}
      isError={isError}
      onRetry={onRetry}
    >
      {(categories.length > 0 || products.length > 0) && (
        <DispatcherReportFilters
          products={products}
          categories={categories}
          selectedProductIds={selectedProductIds}
          selectedCategoryId={selectedCategoryId}
          onProductsChange={onProductsChange}
          onCategoryChange={onCategoryChange}
        />
      )}

      {hasActiveFilter && (
        <div className="flex flex-wrap items-center gap-2 no-print">
          <span className="text-xs text-muted-foreground">Filtrando por:</span>
          {selectedCategoryId !== "all" && (
            <Badge className="bg-primary/10 text-primary text-xs">
              {categories.find((c) => c.id === selectedCategoryId)?.name ||
                selectedCategoryId}
            </Badge>
          )}
          {selectedProductIds.map((pid) => (
            <Badge key={pid} variant="secondary" className="text-xs">
              {products.find((p) => p.id === pid)?.name || pid}
            </Badge>
          ))}
        </div>
      )}

      <div className="grid gap-4 mb-4 sm:grid-cols-2 lg:grid-cols-4">
        <ReportKpi
          label="Despachadores activos"
          value={formatNumber(data?.activeDispatchers || 0, 0)}
          icon={<Package className="h-4 w-4" />}
          tone="slate"
        />
        <ReportKpi
          label="Ventas totales despachadas"
          value={formatCurrency(total.revenue)}
          sub={`≈ ${formatCurrency(total.revenueUSD, "USD")}`}
          icon={<BarChart3 className="h-4 w-4" />}
          tone="primary"
        />
        <ReportKpi
          label="Top Despachador"
          value={topDispatcher?.name || "—"}
          sub={
            topDispatcher
              ? `${formatCurrency(topDispatcher.revenue)} · ${Number(
                  topDispatcher.sharePct
                ).toFixed(1)}% del total`
              : "Sin datos"
          }
          icon={<Trophy className="h-4 w-4" />}
          tone="amber"
        />
        <ReportKpi
          label="Prom. ítems / despacho"
          value={formatNumber(total.avgItemsPerDispatch, 1)}
          icon={<TrendingUp className="h-4 w-4" />}
          tone="blue"
        />
      </div>

      <ReportTable
        headers={[
          "Despachador",
          "Nº Despachos",
          "Unidades",
          "Total Ventas (C$)",
          "Participación (%)",
          "Ticket Prom. (C$)",
        ]}
        emptyRows={rows.length}
      >
        {rows.map((r: any, i: number) => (
          <tr
            key={r.dispatcherId}
            className="border-b last:border-0 transition-colors hover:bg-slate-50"
          >
            <td className="p-3">
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-black",
                    i === 0
                      ? "bg-amber-100 text-amber-700"
                      : i === 1
                      ? "bg-slate-100 text-slate-600"
                      : i === 2
                      ? "bg-orange-100 text-orange-600"
                      : "bg-slate-50 text-slate-500"
                  )}
                >
                  {i + 1}
                </span>
                <span className="text-sm font-semibold uppercase text-slate-900">
                  {r.dispatcherName}
                </span>
              </div>
            </td>
            <td className="p-3 text-right text-sm">
              {formatNumber(r.dispatches, 0)}
            </td>
            <td className="p-3 text-right text-sm">
              {formatNumber(r.units, 1)}
            </td>
            <td className="p-3 text-right text-sm font-semibold">
              {formatCurrency(r.revenue)}
            </td>
            <td className="p-3 text-right text-sm">
              <div className="flex items-center justify-end gap-2">
                <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${Math.min(r.sharePct, 100)}%` }}
                  />
                </div>
                <span className="w-12 text-right text-xs font-medium text-slate-700">
                  {Number(r.sharePct).toFixed(1)}%
                </span>
              </div>
            </td>
            <td className="p-3 text-right text-sm">
              {formatCurrency(r.avgTicket)}
            </td>
          </tr>
        ))}
      </ReportTable>
    </ReportViewState>
  );
}
