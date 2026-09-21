"use client";

import { Banknote, Landmark, ReceiptText, CreditCard, DollarSign, ListOrdered } from "lucide-react";
import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";
import { ChartContainer } from "@/components/ui/chart";
import { ReportCard, ReportKpi, ReportTable, ReportViewProps, ReportViewState, StatusBadge } from "./report-primitives";
import { formatCurrency, formatNumber } from "@/lib/utils";

const COLORS = ["#0f766e", "#2563eb", "#7c3aed", "#d97706", "#dc2626", "#64748b"];

const ICONS: Record<string, any> = {
  efectivo: Banknote,
  tarjeta: CreditCard,
  transferencia: Landmark,
  credito: ReceiptText,
  usd: DollarSign,
  otro: ListOrdered,
};

export function PaymentMethodsReport({ data, isLoading, isError, onRetry }: ReportViewProps) {
  const rows: any[] = data?.rows || [];
  const total = data?.total ?? 0;
  const totalUSD = data?.totalUSD ?? 0;

  return (
    <ReportViewState data={data} isLoading={isLoading} isError={isError} onRetry={onRetry}>
      <div className="mb-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <ReportKpi label="Total del período" value={formatCurrency(total)} sub={`≈ ${formatCurrency(totalUSD, "USD")}`} icon={<Banknote className="h-4 w-4" />} tone="primary" />
        <ReportKpi label="Métodos usados" value={formatNumber(rows.length, 0)} sub="Además del efectivo" icon={<ListOrdered className="h-4 w-4" />} tone="slate" />
      </div>

      <ReportCard title="Distribución por Método de Pago" className="mb-4">
        <div className="grid gap-4 md:grid-cols-2">
          <ChartContainer config={{}} className="h-[260px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={rows} dataKey="total" nameKey="label" cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={2}>
                  {rows.map((_: any, i: number) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <text x="50%" y="47%" textAnchor="middle" dominantBaseline="middle" className="fill-slate-900 text-lg font-bold">
                  {formatNumber(total, 0)}
                </text>
                <text x="50%" y="58%" textAnchor="middle" dominantBaseline="middle" className="fill-muted-foreground text-xs">
                  C$ totales
                </text>
              </PieChart>
            </ResponsiveContainer>
          </ChartContainer>
          <div className="flex flex-col justify-center gap-2">
            {rows.map((r: any, i: number) => {
              const Icon = ICONS[r.key] || ListOrdered;
              return (
                <div key={r.key} className="flex items-center gap-3 rounded-lg border border-slate-200 px-3 py-2">
                  <span className="rounded-md p-1.5" style={{ backgroundColor: COLORS[i % COLORS.length] + "1a", color: COLORS[i % COLORS.length] }}>
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="flex-1">
                    <p className="text-sm font-semibold">{r.label}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatNumber(r.transactions, 0)} transacciones · {formatNumber(r.sharePct, 1)}%
                    </p>
                  </div>
                  <p className="text-sm font-bold">{formatCurrency(r.total)}</p>
                </div>
              );
            })}
          </div>
        </div>
      </ReportCard>

      <ReportTable
        headers={["Método", "Transacciones", "Monto (C$)", "Participación"]}
        emptyRows={rows.length}
      >
        {rows.map((r: any, i: number) => (
          <tr key={r.key} className="border-b last:border-0 transition-colors hover:bg-slate-50">
            <td className="p-3 text-sm font-medium text-slate-900">{r.label}</td>
            <td className="p-3 text-sm">{formatNumber(r.transactions, 0)}</td>
            <td className="p-3 text-right text-sm font-semibold">{formatCurrency(r.total)}</td>
            <td className="p-3 text-right">
              <StatusBadge value={`${formatNumber(r.sharePct, 1)}%`} good={r.sharePct >= 20} />
            </td>
          </tr>
        ))}
      </ReportTable>
    </ReportViewState>
  );
}