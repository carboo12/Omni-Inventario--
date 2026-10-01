"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  getReportFilters,
  getReportSummary,
  getReportSalesByCategory,
  getReportSalesByProduct,
  getReportTopSelling,
  getReportPaymentMethods,
  getReportCashiers,
  getReportSalesByHour,
  getReportDeadStock,
  getReportProfitMargin,
  getAgingReport,
  getDispatcherProductivityReport,
} from "@/lib/actions-client/reports";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Download, FileSpreadsheet, FileText, FilterX, Printer } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import type { DateRange } from "react-day-picker";

import {
  DEFAULT_FILTERS,
  DAYS_PRESETS,
  RANGE_PRESETS,
  presetToRange,
  formatRangeLabel,
  downloadCSV,
  downloadXLSX,
  printHTML,
  type ReportFilters,
} from "./report-utils";
import { ResumenReport } from "./report-resumen";
import { SalesByCategoryReport } from "./report-sales-by-category";
import { SalesByProductReport } from "./report-sales-by-product";
import { TopSellingReport } from "./report-top-selling";
import { PaymentMethodsReport } from "./report-payment-methods";
import { CashiersReport } from "./report-cashiers";
import { SalesByHourReport } from "./report-by-hour";
import { DeadStockReport } from "./report-deadstock";
import { ProfitMarginReport } from "./report-profit-margin";
import { AgingReport } from "./report-aging";
import { DispatcherReport } from "./report-dispatcher";

type TabKey =
  | "resumen"
  | "categoria"
  | "producto"
  | "topselling"
  | "pagos"
  | "cajeros"
  | "hora"
  | "stock"
  | "utilidad"
  | "saldos"
  | "despachadores";

const TAB_LABELS: Record<TabKey, string> = {
  resumen: "Resumen",
  categoria: "Por Categoría",
  producto: "Por Producto",
  topselling: "Más Vendidos",
  pagos: "Método de Pago",
  cajeros: "Por Cajero",
  hora: "Por Hora",
  stock: "Stock Muerto",
  utilidad: "Utilidad",
  saldos: "Antigüedad",
  despachadores: "Por Despachador",
};

const TAB_EXPORT_TITLES: Record<TabKey, string> = {
  resumen: "Reporte de Resumen",
  categoria: "Ventas por Categoría",
  producto: "Ventas por Producto",
  topselling: "Productos Más Vendidos",
  pagos: "Ventas por Método de Pago",
  cajeros: "Ventas por Cajero / Turno",
  hora: "Ventas por Hora",
  stock: "Productos Sin Rotación (Stock Muerto)",
  utilidad: "Reporte de Utilidad / Margen",
  saldos: "Antigüedad de Saldos (CxC / CxP)",
  despachadores: "Productividad de Despachadores",
};

interface TabExport {
  filename: string;
  sheet: string;
  headers: string[];
  rows: (string | number)[][];
}

const BUCKET_LABELS: Record<string, string> = {
  current: "Corriente (0-30)",
  d31_60: "31-60 días",
  d61_90: "61-90 días",
  d90plus: "Más de 90",
};

function buildTabExport(tab: TabKey, data: any): TabExport | null {
  if (!data) return null;
  const n = (v: number | undefined | null) => (v == null ? 0 : Math.round(v * 100) / 100);
  switch (tab) {
    case "resumen":
      return {
        filename: "reporte-resumen",
        sheet: "Resumen",
        headers: ["Métrica", "Valor (C$)", "Valor (USD)"],
        rows: [
          ["Ingresos", n(data.totalRevenue), n(data.revenueUSD)],
          ["Costo", n(data.totalCost), ""],
          ["Utilidad bruta", n(data.totalProfit), n(data.profitUSD)],
          ["Margen (%)", n(data.marginPct), ""],
          ["Transacciones", data.invoiceCount, ""],
          ["Ticket promedio", n(data.avgTicket), ""],
          ["Unidades vendidas", n(data.totalUnits), ""],
          ["Tasa de cambio", n(data.exchangeRate), ""],
        ],
      };
    case "categoria":
      return {
        filename: "ventas-por-categoria",
        sheet: "Por Categoría",
        headers: ["Categoría", "Tipo", "Ventas (C$)", "Unidades", "Costo (C$)", "Utilidad (C$)", "Margen (%)", "Facturas", "Participación (%)"],
        rows: data.rows.map((r: any) => [
          r.categoryName,
          r.inventoryType || "General",
          n(r.revenue),
          n(r.units),
          n(r.cost),
          n(r.profit),
          n(r.marginPct),
          r.invoiceCount,
          n(r.sharePct),
        ]),
      };
    case "producto":
      return {
        filename: "ventas-por-producto",
        sheet: "Por Producto",
        headers: [
          "Producto",
          "Código de barras",
          "Categoría",
          "Unidades",
          "Ingresos (C$)",
          "Ingresos (USD)",
          "Costo (C$)",
          "Utilidad (C$)",
          "Utilidad (USD)",
          "Margen (%)",
          "Ticket promedio",
          "Facturas",
        ],
        rows: data.rows.map((r: any) => [
          r.productName,
          r.barcode || "",
          r.categoryName,
          n(r.units),
          n(r.revenue),
          n(r.revenueUSD),
          n(r.cost),
          n(r.profit),
          n(r.profitUSD),
          n(r.marginPct),
          n(r.avgUnitPrice),
          r.invoices,
        ]),
      };
    case "topselling": {
      const rows = data.byRevenue.map((r: any) => [
        r.productName,
        n(r.units),
        n(r.revenue),
        n(r.revenueSharePct),
        n(r.cumulativeSharePct),
        r.isPareto80 ? "SÍ" : "NO",
        n(r.profit),
      ]);
      rows.push(["", "", n(data.totalRevenue), 100, 100, "", ""]);
      return {
        filename: "productos-mas-vendidos",
        sheet: "Más Vendidos",
        headers: ["Producto", "Unidades", "Ingresos (C$)", "Participación (%)", "Acumulado (%)", "Pareto 80/20", "Utilidad (C$)"],
        rows,
      };
    }
    case "pagos":
      return {
        filename: "ventas-por-metodo-pago",
        sheet: "Método de Pago",
        headers: ["Método", "Transacciones", "Monto (C$)", "Participación (%)"],
        rows: data.rows.map((r: any) => [r.label, r.transactions, n(r.total), n(r.sharePct)]),
      };
    case "despachadores":
      return {
        filename: "productividad-despachadores",
        sheet: "Despachadores",
        headers: ["Despachador", "Nº Despachos", "Total Ventas (C$)", "Participación (%)", "Ticket Prom. (C$)"],
        rows: data.rows.map((r: any) => [
          r.dispatcherName || "Desconocido",
          r.dispatches,
          n(r.revenue),
          n(r.sharePct),
          n(r.avgTicket),
        ]),
      };
    case "cajeros":
      return {
        filename: "ventas-por-cajero",
        sheet: "Por Cajero",
        headers: ["Cajero", "Facturas", "Ventas (C$)", "Ventas (USD)", "Unidades", "Ticket promedio", "Turnos", "Diferencia (C$)"],
        rows: data.rows.map((r: any) => [
          r.name,
          r.invoiceCount,
          n(r.revenue),
          n(r.revenueUSD),
          n(r.units),
          n(r.avgTicket),
          r.sessions || 0,
          n(r.difference),
        ]),
      };
    case "hora":
      return {
        filename: "ventas-por-hora",
        sheet: "Por Hora",
        headers: ["Hora", "Ventas (C$)", "Facturas", "Participación (%)"],
        rows: data.hours
          .filter((h: any) => h.count > 0)
          .map((h: any) => [h.label, n(h.sales), h.count, n(h.sharePct)]),
      };
    case "stock":
      return {
        filename: "stock-muerto",
        sheet: "Stock Muerto",
        headers: ["Producto", "Código de barras", "Categoría", "Unidades", "Valor (C$)", "Estado"],
        rows: data.rows.map((r: any) => [r.productName, r.barcode || "", r.categoryName, n(r.stockQuantity), n(r.costNIO), r.status]),
      };
    case "utilidad":
      return {
        filename: "reporte-utilidad-margen",
        sheet: "Utilidad",
        headers: [
          "Producto",
          "Precio prom. (C$)",
          "Costo prom. (C$)",
          "Unidades",
          "Ingresos (C$)",
          "Costo (C$)",
          "Utilidad (C$)",
          "Utilidad (USD)",
          "Margen (%)",
        ],
        rows: data.items.map((r: any) => [
          r.productName,
          n(r.avgUnitPrice),
          n(r.avgUnitCost),
          n(r.units),
          n(r.totalRevenue),
          n(r.totalCost),
          n(r.profit),
          n(r.profitUSD),
          n(r.marginPct),
        ]),
      };
    case "saldos": {
      const cxcRows = (data?.cxc?.rows || []).flatMap((r: any) =>
        ["current", "d31_60", "d61_90", "d90plus"].map((b) => [
          "CxC",
          r.customerName,
          r.phone || "",
          BUCKET_LABELS[b],
          r.invoiceCount,
          n(r[b]),
        ])
      );
      const cxpRows = (data?.cxp?.rows || []).flatMap((r: any) =>
        ["current", "d31_60", "d61_90", "d90plus"].map((b) => [
          "CxP",
          r.supplierName,
          "",
          BUCKET_LABELS[b],
          r.invoiceCount,
          n(r[b]),
        ])
      );
      return {
        filename: "antiguedad-de-saldos",
        sheet: "Antigüedad",
        headers: ["Cuenta", "Cliente / Proveedor", "Teléfono", "Rango", "Facturas", "Monto (C$)"],
        rows: [...cxcRows, ...cxpRows],
      };
    }
    default:
      return null;
  }
}

function tableToHTML(title: string, subtitle: string, headers: string[], rows: (string | number)[][]): string {
  const head = headers.map((h) => `<th style="background:#f1f5f9;border:1px solid #cbd5e1;padding:6px 10px;font-size:11px;text-align:left;">${h}</th>`).join("");
  const body = rows
    .map((r) => `<tr>${r.map((c) => `<td style="border:1px solid #e2e8f0;padding:5px 10px;font-size:11px;">${String(c)}</td>`).join("")}</tr>`)
    .join("");
  return `
    <h1 style="font-size:16px;color:#0f172a;margin:0;">${title}</h1>
    <p style="font-size:11px;color:#64748b;margin:4px 0 14px;">${subtitle}</p>
    <table style="border-collapse:collapse;width:100%;">
      <thead><tr>${head}</tr></thead>
      <tbody>${body}</tbody>
    </table>`;
}

export function ReportsHub() {
  const [tab, setTab] = useState<TabKey>("resumen");
  const [filters, setFilters] = useState<ReportFilters>(DEFAULT_FILTERS);
  const [customRange, setCustomRange] = useState<DateRange | undefined>();
  const [dispProductIds, setDispProductIds] = useState<string[]>([]);
  const [dispCategoryId, setDispCategoryId] = useState<string>("all");

  const effective = useMemo(() => {
    let from = filters.from;
    let to = filters.to;
    if (filters.preset !== "custom" || !filters.from) {
      const range = presetToRange(filters.preset, {
        from: filters.from ? new Date(filters.from) : undefined,
        to: filters.to ? new Date(filters.to) : undefined,
      });
      from = range.from;
      to = range.to;
    }
    return { ...filters, from, to };
  }, [filters]);

  const filtersQuery = useQuery({
    queryKey: ["reports", "filters"],
    queryFn: () => getReportFilters(),
    staleTime: 5 * 60 * 1000,
  });
  const filterData = filtersQuery.data;

  const queries: Record<TabKey, { data: any; isLoading: boolean; isError: boolean; refetch: any }> = {
    resumen: useQuery({
      queryKey: ["reports", "summary", effective.from, effective.to],
      queryFn: () => getReportSummary(effective.from, effective.to),
      enabled: tab === "resumen",
    }),
    categoria: useQuery({
      queryKey: ["reports", "category", effective.from, effective.to, effective.categoryId],
      queryFn: () => getReportSalesByCategory(effective.from, effective.to, effective.categoryId),
      enabled: tab === "categoria",
    }),
    producto: useQuery({
      queryKey: ["reports", "product", effective.from, effective.to, effective.categoryId, effective.location],
      queryFn: () => getReportSalesByProduct(effective.from, effective.to, effective.categoryId, effective.location),
      enabled: tab === "producto",
    }),
    topselling: useQuery({
      queryKey: ["reports", "topselling", effective.from, effective.to],
      queryFn: () => getReportTopSelling(effective.from, effective.to),
      enabled: tab === "topselling",
    }),
    pagos: useQuery({
      queryKey: ["reports", "payment", effective.from, effective.to],
      queryFn: () => getReportPaymentMethods(effective.from, effective.to),
      enabled: tab === "pagos",
    }),
    cajeros: useQuery({
      queryKey: ["reports", "cashiers", effective.from, effective.to],
      queryFn: () => getReportCashiers(effective.from, effective.to),
      enabled: tab === "cajeros",
    }),
    hora: useQuery({
      queryKey: ["reports", "hour", effective.from, effective.to],
      queryFn: () => getReportSalesByHour(effective.from, effective.to),
      enabled: tab === "hora",
    }),
    stock: useQuery({
      queryKey: ["reports", "deadstock", effective.days, effective.to],
      queryFn: () => getReportDeadStock(effective.days),
      enabled: tab === "stock",
    }),
    utilidad: useQuery({
      queryKey: ["reports", "profit", effective.from, effective.to],
      queryFn: () => getReportProfitMargin(effective.from, effective.to),
      enabled: tab === "utilidad",
    }),
    saldos: useQuery({
      queryKey: ["reports", "aging"],
      queryFn: () => getAgingReport(),
      enabled: tab === "saldos",
    }),
    despachadores: useQuery({
      queryKey: ["reports", "dispatchers", effective.from, effective.to, dispProductIds, dispCategoryId],
      queryFn: () => getDispatcherProductivityReport(effective.from, effective.to, dispProductIds, dispCategoryId),
      enabled: tab === "despachadores",
    }),
  };

  const active = queries[tab];

  const subtitle = `${formatRangeLabel(effective)} · ${TAB_EXPORT_TITLES[tab]}`;

  const handleExport = async (kind: "csv" | "excel" | "pdf") => {
    const exportData = buildTabExport(tab, active.data);
    if (!exportData) return;
    const stamp = new Date().toISOString().slice(0, 10);
    const base = `${exportData.filename}-${stamp}`;
    if (kind === "csv") {
      downloadCSV(base, exportData.headers, exportData.rows);
    } else if (kind === "excel") {
      await downloadXLSX(base, exportData.sheet, exportData.headers, exportData.rows);
    } else {
      printHTML(
        tableToHTML(TAB_EXPORT_TITLES[tab], subtitle, exportData.headers, exportData.rows),
        TAB_EXPORT_TITLES[tab]
      );
    }
  };

  const resetFilters = () => {
    setFilters(DEFAULT_FILTERS);
    setCustomRange(undefined);
  };

  const categories = filterData?.categories || [];
  const locations = filterData?.locations || [];

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-headline font-bold tracking-tight md:text-3xl">Reportes y Analítica Avanzada</h1>
          <p className="text-muted-foreground">
            Ventas, rendimiento, utilidad y rotación de inventario para la administración de su tienda.
          </p>
        </div>
        <div className="no-print flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => handleExport("pdf")} className="gap-1.5" disabled={active.isLoading}>
            <Printer className="h-4 w-4" /> Imprimir PDF
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleExport("excel")} className="gap-1.5" disabled={active.isLoading}>
            <FileSpreadsheet className="h-4 w-4" /> Excel
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleExport("csv")} className="gap-1.5" disabled={active.isLoading}>
            <Download className="h-4 w-4" /> CSV
          </Button>
        </div>
      </div>

      {/* Barra de filtros */}
      <Card className="bg-white/80 shadow-sm border-slate-200 no-print">
        <CardContent className="pt-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:flex-wrap">
            <div className="flex items-center gap-2">
              <Select
                value={filters.preset}
                onValueChange={(v) => setFilters((f) => ({ ...f, preset: v }))}
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Rango de fechas" />
                </SelectTrigger>
                <SelectContent>
                  {RANGE_PRESETS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {filters.preset === "custom" && (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="default" className="w-[260px] justify-start gap-2 text-left font-normal">
                      <CalendarIcon className="h-4 w-4" />
                      {customRange?.from ? (
                        customRange.to ? (
                          `${format(customRange.from, "dd MMM yy", { locale: es })} – ${format(customRange.to, "dd MMM yy", { locale: es })}`
                        ) : (
                          format(customRange.from, "dd MMM yy", { locale: es })
                        )
                      ) : (
                        <span className="text-muted-foreground">Seleccionar rango</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      initialFocus
                      mode="range"
                      defaultMonth={customRange?.from}
                      selected={customRange}
                      onSelect={(r) => {
                        setCustomRange(r);
                        setFilters((f) => ({
                          ...f,
                          from: r?.from ? r.from.toISOString() : undefined,
                          to: r?.to ? r.to.toISOString() : undefined,
                        }));
                      }}
                      numberOfMonths={2}
                      locale={es}
                    />
                  </PopoverContent>
                </Popover>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Select value={effective.categoryId} onValueChange={(v) => setFilters((f) => ({ ...f, categoryId: v }))}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Categoría" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las categorías</SelectItem>
                  {categories.map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={effective.location} onValueChange={(v) => setFilters((f) => ({ ...f, location: v }))}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Sucursal" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las sucursales</SelectItem>
                  {locations.map((loc: any) => (
                    <SelectItem key={loc} value={loc}>
                      {loc}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {tab === "stock" && (
                <Select value={String(effective.days)} onValueChange={(v) => setFilters((f) => ({ ...f, days: Number(v) }))}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Ventana" />
                  </SelectTrigger>
                  <SelectContent>
                    {DAYS_PRESETS.map((d) => (
                      <SelectItem key={d.value} value={String(d.value)}>
                        {d.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <Button variant="ghost" size="icon" title="Limpiar filtros" onClick={resetFilters}>
                <FilterX className="h-4 w-4" />
              </Button>
            </div>

            <div className="ml-auto hidden items-center gap-2 lg:flex">
              <Badge className="bg-slate-100 text-slate-700">
                {formatRangeLabel(effective)}
              </Badge>
              {categories.length > 0 && effective.categoryId !== "all" && (
                <Badge className="bg-primary/10 text-primary">
                  {categories.find((c: any) => c.id === effective.categoryId)?.name}
                </Badge>
              )}
              {effective.location !== "all" && (
                <Badge className="bg-sky-100 text-sky-700">{effective.location}</Badge>
              )}
            </div>
          </div>

          <p className="mt-3 text-xs text-muted-foreground no-print">
            Rango aplicado: {new Date(effective.from || "").toLocaleDateString("es-NI")} – {new Date(effective.to || "").toLocaleDateString("es-NI")}
          </p>
        </CardContent>
      </Card>

      {/* Pestañas */}
      <Tabs value={tab} onValueChange={(v) => setTab(v as TabKey)}>
        <TabsList className="no-print flex h-auto flex-wrap gap-1">
          {Object.entries(TAB_LABELS).map(([key, label]) => {
            if (key === "despachadores" && queries.despachadores.data?.isDispatcherMode === false) return null;
            return (
              <TabsTrigger key={key} value={key} className="text-xs">
                {label}
              </TabsTrigger>
            );
          })}
        </TabsList>

        <TabsContent value="resumen">
          <ResumenReport data={queries.resumen.data} isLoading={queries.resumen.isLoading} isError={queries.resumen.isError} onRetry={queries.resumen.refetch} />
        </TabsContent>
        <TabsContent value="categoria">
          <SalesByCategoryReport data={queries.categoria.data} isLoading={queries.categoria.isLoading} isError={queries.categoria.isError} onRetry={queries.categoria.refetch} />
        </TabsContent>
        <TabsContent value="producto">
          <SalesByProductReport data={queries.producto.data} isLoading={queries.producto.isLoading} isError={queries.producto.isError} onRetry={queries.producto.refetch} />
        </TabsContent>
        <TabsContent value="topselling">
          <TopSellingReport data={queries.topselling.data} isLoading={queries.topselling.isLoading} isError={queries.topselling.isError} onRetry={queries.topselling.refetch} />
        </TabsContent>
        <TabsContent value="pagos">
          <PaymentMethodsReport data={queries.pagos.data} isLoading={queries.pagos.isLoading} isError={queries.pagos.isError} onRetry={queries.pagos.refetch} />
        </TabsContent>
        <TabsContent value="cajeros">
          <CashiersReport data={queries.cajeros.data} isLoading={queries.cajeros.isLoading} isError={queries.cajeros.isError} onRetry={queries.cajeros.refetch} />
        </TabsContent>
        <TabsContent value="hora">
          <SalesByHourReport data={queries.hora.data} isLoading={queries.hora.isLoading} isError={queries.hora.isError} onRetry={queries.hora.refetch} />
        </TabsContent>
        <TabsContent value="stock">
          <DeadStockReport data={queries.stock.data} isLoading={queries.stock.isLoading} isError={queries.stock.isError} onRetry={queries.stock.refetch} />
        </TabsContent>
        <TabsContent value="utilidad">
          <ProfitMarginReport data={queries.utilidad.data} isLoading={queries.utilidad.isLoading} isError={queries.utilidad.isError} onRetry={queries.utilidad.refetch} />
        </TabsContent>
        <TabsContent value="saldos">
          <AgingReport data={queries.saldos.data} isLoading={queries.saldos.isLoading} isError={queries.saldos.isError} onRetry={queries.saldos.refetch} />
        </TabsContent>
        <TabsContent value="despachadores">
          <DispatcherReport
            data={queries.despachadores.data}
            isLoading={queries.despachadores.isLoading}
            isError={queries.despachadores.isError}
            onRetry={queries.despachadores.refetch}
            filterData={filterData}
            selectedProductIds={dispProductIds}
            selectedCategoryId={dispCategoryId}
            onProductsChange={setDispProductIds}
            onCategoryChange={setDispCategoryId}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
