"use client";

import { ReactNode } from "react";
import { AlertCircle, Loader2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

export interface ReportViewProps {
  data?: any;
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
}

export function ReportError({ onRetry }: { onRetry?: () => void }) {
  return (
    <Alert variant="destructive" className="my-4">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Error al cargar el reporte</AlertTitle>
      <AlertDescription className="flex items-center justify-between gap-4">
        <span>No se pudieron cargar las métricas de reportes. Intente nuevamente.</span>
        {onRetry && (
          <Button variant="outline" size="sm" onClick={onRetry}>
            Reintentar
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
}

export function ReportEmpty({ message = "No hay datos para el período seleccionado." }: { message?: string }) {
  return (
    <div className="flex h-40 flex-col items-center justify-center gap-2 text-center">
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

export function ReportTableSkeleton({ rows = 6, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="space-y-2 p-4">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4">
          {Array.from({ length: cols }).map((__, j) => (
            <Skeleton key={j} className="h-8 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function ReportCard({
  title,
  description,
  actions,
  className,
  children,
}: {
  title?: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <Card className={cn("bg-white/80 shadow-sm border-slate-200", className)}>
      {(title || actions) && (
        <CardHeader className="flex-row items-start justify-between space-y-0 pb-3">
          <div>
            {title && <CardTitle className="text-sm font-headline font-bold uppercase tracking-wide text-slate-800">{title}</CardTitle>}
            {description && <CardDescription className="text-xs">{description}</CardDescription>}
          </div>
          {actions}
        </CardHeader>
      )}
      <CardContent className="pt-0">{children}</CardContent>
    </Card>
  );
}

const TONES: Record<string, string> = {
  slate: "bg-slate-100 text-slate-700",
  primary: "bg-primary/10 text-primary",
  green: "bg-emerald-50 text-emerald-700",
  red: "bg-red-50 text-red-600",
  amber: "bg-amber-50 text-amber-600",
  blue: "bg-sky-50 text-sky-700",
  violet: "bg-violet-50 text-violet-700",
  pink: "bg-pink-50 text-pink-600",
};

export function ReportKpi({
  label,
  value,
  sub,
  icon,
  tone = "primary",
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon?: ReactNode;
  tone?: keyof typeof TONES | string;
}) {
  return (
    <Card className="bg-white/80 shadow-sm border-slate-200">
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
        <CardDescription className="text-[10px] font-black uppercase tracking-wider">{label}</CardDescription>
        {icon && <span className={cn("rounded-lg p-1.5", TONES[tone] || TONES.primary)}>{icon}</span>}
      </CardHeader>
      <CardContent>
        <p className="text-xl font-headline font-bold text-slate-900">{value}</p>
        {sub && <p className="mt-1 text-xs font-medium text-muted-foreground">{sub}</p>}
      </CardContent>
    </Card>
  );
}

export function StatusBadge({ value, good, warn, bad }: { value: string; good?: boolean; warn?: boolean; bad?: boolean }) {
  return (
    <Badge
      className={cn(
        "text-[10px] font-black",
        bad ? "bg-red-500 text-white" : warn ? "bg-amber-500 text-white" : good ? "bg-emerald-500 text-white" : "bg-slate-200 text-slate-700"
      )}
    >
      {value}
    </Badge>
  );
}

export function ReportTable({
  headers,
  children,
  emptyRows = 0,
}: {
  headers: ReactNode[];
  children?: ReactNode;
  emptyRows?: number;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="bg-slate-50 hover:bg-slate-50">
            {headers.map((h, i) => (
              <TableHead key={i} className="whitespace-nowrap">
                {h}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {emptyRows === 0 ? (
            <TableRow>
              <TableCell colSpan={headers.length} className="h-24 text-center text-muted-foreground">
                No hay datos para el período seleccionado.
              </TableCell>
            </TableRow>
          ) : (
            children
          )}
        </TableBody>
      </Table>
    </div>
  );
}

export function LoadingView() {
  return (
    <div className="flex h-64 flex-col items-center justify-center gap-3 text-muted-foreground">
      <Loader2 className="h-6 w-6 animate-spin text-primary" />
      <p className="text-sm font-medium">Cargando reporte…</p>
    </div>
  );
}

export function ReportViewState({ data, isLoading, isError, onRetry, children }: ReportViewProps & { children: ReactNode }) {
  if (isLoading) return <LoadingView />;
  if (isError) return <ReportError onRetry={onRetry} />;
  if (!data) return <LoadingView />;
  return <>{children}</>;
}