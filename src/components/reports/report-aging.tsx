"use client";

import { useState } from "react";
import { Wallet, Truck, AlertTriangle, CalendarClock, CheckCircle2 } from "lucide-react";
import { ReportKpi, ReportViewProps, ReportViewState, ReportTable } from "./report-primitives";
import { formatCurrency } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { useSettings } from '@/hooks/use-settings';
import { TableCell } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const n = (v: number | undefined | null) => (v == null ? 0 : Math.round(v * 100) / 100);

const BUCKET_LABELS: { key: string; label: string; tone: string }[] = [
  { key: "current", label: "Corriente (0-30)", tone: "bg-green-100 text-green-700" },
  { key: "d31_60", label: "31-60 días", tone: "bg-amber-100 text-amber-700" },
  { key: "d61_90", label: "61-90 días", tone: "bg-orange-100 text-orange-700" },
  { key: "d90plus", label: "Más de 90", tone: "bg-red-100 text-red-700" },
];

function BucketBadge({ bucket }: { bucket: string }) {
  const meta = BUCKET_LABELS.find((b) => b.key === bucket);
  if (!meta) return <Badge variant="secondary">—</Badge>;
  return <Badge className={meta.tone}>{meta.label}</Badge>;
}

function AgingTable({
  name,
  rows,
  totals,
}: {
  name: "customerName" | "supplierName";
  rows: any[];
  totals: any;
}) {
  const [openRow, setOpenRow] = useState<string | null>(null);
  return (
    <div className="space-y-3">
      <ReportTable
        emptyRows={rows.length}
        headers={[name === "customerName" ? "Cliente" : "Proveedor", "Facturas", "Corriente", "31-60", "61-90", "+90", "Total"]}
      >
        {rows.map((r) => {
          const isOpen = openRow === r[name];
          return (
            <AgingRow
              key={r[name]}
              row={r}
              name={name}
              isOpen={isOpen}
              onToggle={() => setOpenRow(isOpen ? null : r[name])}
            />
          );
        })}
      </ReportTable>
      {rows.length > 0 && (
        <div className="flex flex-wrap items-center justify-end gap-x-6 gap-y-1 px-2 text-sm">
          <span className="text-muted-foreground">Totales:</span>
          <span>Corriente <b>{formatCurrency(n(totals?.current), "NIO")}</b></span>
          <span>31-60 <b>{formatCurrency(n(totals?.d31_60), "NIO")}</b></span>
          <span>61-90 <b>{formatCurrency(n(totals?.d61_90), "NIO")}</b></span>
          <span>+90 <b>{formatCurrency(n(totals?.d90plus), "NIO")}</b></span>
          <span>Total <b>{formatCurrency(n(totals?.total), "NIO")}</b></span>
        </div>
      )}
    </div>
  );
}

function AgingRow({
  row,
  name,
  isOpen,
  onToggle,
}: {
  row: any;
  name: "customerName" | "supplierName";
  isOpen: boolean;
  onToggle: () => void;
}) {
  const entity = row[name] || (name === "customerName" ? "(Cliente eliminado)" : "(Proveedor eliminado)");
  return (
    <>
      <tr className="cursor-pointer hover:bg-slate-50" onClick={onToggle}>
        <TableCell className="max-w-[240px]">
          <div className="flex flex-col">
            <span className="font-bold">{entity}</span>
            <span className="text-xs text-muted-foreground">{row.phone || row.documentId || ""}</span>
          </div>
        </TableCell>
        <TableCell>{row.invoiceCount}</TableCell>
        <TableCell className="text-right font-mono">{formatCurrency(n(row.current), "NIO")}</TableCell>
        <TableCell className="text-right font-mono">{formatCurrency(n(row.d31_60), "NIO")}</TableCell>
        <TableCell className="text-right font-mono">{formatCurrency(n(row.d61_90), "NIO")}</TableCell>
        <TableCell className="text-right font-mono text-red-600">{formatCurrency(n(row.d90plus), "NIO")}</TableCell>
        <TableCell className="text-right font-mono font-black">{formatCurrency(n(row.total), "NIO")}</TableCell>
      </tr>
      {isOpen && (
        <tr>
          <TableCell colSpan={7} className="bg-slate-50/70 p-0">
            <div className="px-4 py-3">
              <p className="mb-2 text-xs font-black uppercase tracking-wide text-muted-foreground">
                Detalle de facturas
              </p>
              <div className="flex flex-col gap-1.5">
                {row.detail?.map((d: any) => (
                  <div
                    key={d.invoiceId}
                    className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg bg-white px-3 py-2 text-xs shadow-sm"
                  >
                    <span className="font-bold">#{d.invoiceNumber}</span>
                    <span className="text-muted-foreground">
                      {d.date ? new Date(d.date).toLocaleDateString("es-NI") : "—"}
                    </span>
                    <BucketBadge bucket={d.bucket} />
                    <span className="ml-auto font-mono font-bold text-red-600">
                      {formatCurrency(n(d.pendingBalance ?? d.remaining), "NIO")}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </TableCell>
        </tr>
      )}
    </>
  );
}

export function AgingReport({ data, isLoading, isError, onRetry }: ReportViewProps) {
  const { settings } = useSettings();
  const d = data || {};
  const cxc = d.cxc || {};
  const cxp = d.cxp || {};

  const cxcOverdue = n(cxc.totals?.d31_60) + n(cxc.totals?.d61_90) + n(cxc.totals?.d90plus);
  const cxpOverdue = n(cxp.totals?.d31_60) + n(cxp.totals?.d61_90) + n(cxp.totals?.d90plus);

  return (
    <ReportViewState data={data} isLoading={isLoading} isError={isError} onRetry={onRetry}>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <ReportKpi
          label="CxC · Total por cobrar"
          value={formatCurrency(n(cxc.totals?.total), "NIO")}
          sub={`${n(cxc.totals?.count)} facturas pendientes`}
          icon={<Wallet className="h-4 w-4" />}
          tone="primary"
        />
        <ReportKpi
          label="CxC · En mora (+30)"
          value={formatCurrency(cxcOverdue, "NIO")}
          sub="Acumulado 31-60 / 61-90 / +90"
          icon={<AlertTriangle className="h-4 w-4" />}
          tone="red"
        />
        {settings.enableAccountsPayable !== false && (
        <ReportKpi
          label="CxP · Total por pagar"
          value={formatCurrency(n(cxp.totals?.total), "NIO")}
          sub={`${n(cxp.totals?.count)} facturas pendientes`}
          icon={<Truck className="h-4 w-4" />}
          tone="violet"
        />
        )}
        {settings.enableAccountsPayable !== false && (
        <ReportKpi
          label="CxP · Vencidas"
          value={formatCurrency(cxpOverdue, "NIO")}
          sub="Proveedores con saldo vencido"
          icon={<CalendarClock className="h-4 w-4" />}
          tone="orange"
        />
        )}
      </div>

      <Tabs defaultValue="cxc" className="mt-4">
        <TabsList className="no-print">
          <TabsTrigger value="cxc">Cuentas por Cobrar</TabsTrigger>
          {settings.enableAccountsPayable !== false && (
          <TabsTrigger value="cxp">Cuentas por Pagar</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="cxc">
          {cxc.rows?.length ? (
            <AgingTable name="customerName" rows={cxc.rows} totals={cxc.totals} />
          ) : (
            <EmptyMessage message="No hay cuentas por cobrar pendientes." />
          )}
        </TabsContent>

        <TabsContent value="cxp">
          {cxp.rows?.length ? (
            <AgingTable name="supplierName" rows={cxp.rows} totals={cxp.totals} />
          ) : (
            <EmptyMessage message="No hay cuentas por pagar pendientes." />
          )}
        </TabsContent>
      </Tabs>
    </ReportViewState>
  );
}

function EmptyMessage({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white py-10 text-center">
      <CheckCircle2 className="h-8 w-8 text-green-500" />
      <p className="text-sm font-medium text-muted-foreground">{message}</p>
    </div>
  );
}