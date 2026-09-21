"use client";

import { Banknote, Percent, ReceiptText, ShoppingBag, TrendingUp, WalletCards } from "lucide-react";
import { ReportKpi, ReportViewProps, ReportViewState } from "./report-primitives";
import { formatCurrency, formatNumber } from "@/lib/utils";

export function ResumenReport({ data, isLoading, isError, onRetry }: ReportViewProps) {
  const d = data || {};
  const totalRevenue = d.totalRevenue ?? 0;
  const revenueUSD = d.revenueUSD ?? 0;
  const totalProfit = d.totalProfit ?? 0;
  const profitUSD = d.profitUSD ?? 0;
  const marginPct = d.marginPct ?? 0;
  const totalCost = d.totalCost ?? 0;
  const totalUnits = d.totalUnits ?? 0;
  const invoiceCount = d.invoiceCount ?? 0;
  const avgTicket = d.avgTicket ?? 0;
  const exchangeRate = d.exchangeRate ?? 0;

  return (
    <ReportViewState data={data} isLoading={isLoading} isError={isError} onRetry={onRetry}>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <ReportKpi
          label="Ingresos (NIO)"
          value={formatCurrency(totalRevenue, "NIO")}
          sub={`≈ ${formatCurrency(revenueUSD, "USD")}`}
          icon={<Banknote className="h-4 w-4" />}
          tone="primary"
        />
        <ReportKpi
          label="Utilidad Bruta"
          value={formatCurrency(totalProfit, "NIO")}
          sub={`≈ ${formatCurrency(profitUSD, "USD")}`}
          icon={<TrendingUp className="h-4 w-4" />}
          tone="green"
        />
        <ReportKpi
          label="Margen de Ganancia"
          value={formatNumber(marginPct, 1) + "%"}
          sub={`Costo: ${formatCurrency(totalCost, "NIO")}`}
          icon={<Percent className="h-4 w-4" />}
          tone="violet"
        />
        <ReportKpi
          label="Unidades Vendidas"
          value={formatNumber(totalUnits, 1)}
          sub="Según unidades de presentación"
          icon={<ShoppingBag className="h-4 w-4" />}
          tone="blue"
        />
        <ReportKpi
          label="Transacciones"
          value={formatNumber(invoiceCount, 0)}
          sub="Facturas completadas"
          icon={<ReceiptText className="h-4 w-4" />}
          tone="slate"
        />
        <ReportKpi
          label="Ticket Promedio"
          value={formatCurrency(avgTicket, "NIO")}
          sub={`Tasa de cambio: ${formatNumber(exchangeRate)}`}
          icon={<WalletCards className="h-4 w-4" />}
          tone="amber"
        />
      </div>
    </ReportViewState>
  );
}