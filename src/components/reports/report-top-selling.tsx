"use client";

import { useMemo, useState } from "react";
import { Award, Flame, PackageSearch, Trophy } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ReportKpi, ReportTable, ReportViewProps, ReportViewState, StatusBadge } from "./report-primitives";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { cn } from "@/lib/utils";

const LIMIT = 50;

export function TopSellingReport({ data, isLoading, isError, onRetry }: ReportViewProps) {
  const [mode, setMode] = useState<"units" | "revenue">("revenue");
  const [limit, setLimit] = useState(15);

  const rows: any[] = useMemo(
    () => (mode === "revenue" ? data?.byRevenue || [] : data?.byUnits || []),
    [data, mode]
  );
  const visible = rows.slice(0, limit);

  const totalRevenue = data?.totalRevenue ?? 0;
  const totalUnits = data?.totalUnits ?? 0;
  const pareto = data?.pareto || {};
  const paretoCount = pareto.count ?? 0;
  const paretoHeadCount = pareto.headCount ?? 0;
  const paretoRevenue = pareto.revenue ?? 0;
  const paretoRevenueSharePct = pareto.revenueSharePct ?? 0;

  return (
    <ReportViewState data={data} isLoading={isLoading} isError={isError} onRetry={onRetry}>
      <div className="grid gap-4 mb-4 sm:grid-cols-2 lg:grid-cols-4">
        <ReportKpi label="Ingresos totales" value={formatCurrency(totalRevenue)} icon={<Trophy className="h-4 w-4" />} tone="primary" />
        <ReportKpi label="Unidades vendidas" value={formatNumber(totalUnits, 1)} icon={<PackageSearch className="h-4 w-4" />} tone="blue" />
        <ReportKpi
          label="Productos Pareto (80/20)"
          value={`${paretoCount} de ${rows.length}`}
          sub={`≈ 20% del catálogo esperado: ${paretoHeadCount}`}
          icon={<Award className="h-4 w-4" />}
          tone="amber"
        />
        <ReportKpi
          label="Ingresos del grupo Pareto"
          value={formatCurrency(paretoRevenue)}
          sub={`${formatNumber(paretoRevenueSharePct, 1)}% del total`}
          icon={<Flame className="h-4 w-4" />}
          tone="red"
        />
      </div>

      <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-medium text-amber-800">
            <span className="font-black">Análisis Pareto (80/20):</span> el{" "}
            <span className="font-black">{formatNumber(paretoRevenueSharePct, 1)}%</span> de los ingresos proviene
            de solo <span className="font-black">{paretoCount}</span> productos del total de{" "}
            <span className="font-black">{rows.length}</span>.
          </p>
        </div>
        <Progress value={Math.min(100, paretoRevenueSharePct)} className="mt-2 h-2 bg-amber-200" />
      </div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs value={mode} onValueChange={(v) => setMode(v as "units" | "revenue")}>
          <TabsList>
            <TabsTrigger value="revenue">Por ingresos</TabsTrigger>
            <TabsTrigger value="units">Por unidades</TabsTrigger>
          </TabsList>
        </Tabs>
        <Button variant="outline" size="sm" onClick={() => setLimit((l) => (l === LIMIT ? 15 : LIMIT))}>
          {limit === LIMIT ? "Mostrar menos" : `Mostrar hasta ${LIMIT}`}
        </Button>
      </div>

      {visible.length === 0 ? (
        <ReportTable headers={["#", "Producto", "Unidades", "Ingresos (C$)", "Participación", "Acumulado", "Utilidad"]} emptyRows={0} />
      ) : (
        <ReportTable
          headers={[
            "#",
            "Producto",
            "Unidades",
            "Ingresos (C$)",
            "Participación",
            mode === "revenue" ? "Acumulado" : "",
            "Utilidad (C$)",
          ].filter(Boolean) as any}
          emptyRows={visible.length}
        >
          {visible.map((r: any, i: number) => (
            <tr
              key={r.productId}
              className={cn(
                "border-b last:border-0 transition-colors hover:bg-slate-50",
                r.isPareto80 && mode === "revenue" && "bg-amber-50/70 hover:bg-amber-50"
              )}
            >
              <td className="p-3 text-sm font-bold text-slate-400">{i + 1}</td>
              <td className="p-3 text-sm font-medium text-slate-900">
                <div className="flex items-center gap-2">
                  {r.productName}
                  {r.isPareto80 && mode === "revenue" && <StatusBadge value="PARETO" warn />}
                </div>
              </td>
              <td className="p-3 text-right text-sm">{formatNumber(r.units, 1)}</td>
              <td className="p-3 text-right text-sm font-semibold">{formatCurrency(r.revenue)}</td>
              <td className="p-3 text-right text-sm">{formatNumber(r.revenueSharePct, 1)}%</td>
              {mode === "revenue" && <td className="p-3 text-right text-sm text-muted-foreground">{formatNumber(r.cumulativeSharePct, 1)}%</td>}
              <td className="p-3 text-right text-sm text-emerald-600">{formatCurrency(r.profit)}</td>
            </tr>
          ))}
        </ReportTable>
      )}
    </ReportViewState>
  );
}