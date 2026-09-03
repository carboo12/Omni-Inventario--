"use client";

import React, { useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useCashRegisterSessions } from "@/hooks/use-cash-register-sessions";
import { closeSession, getSessionOutflows } from "@/lib/actions/cash-register";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, Lock, Wallet, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

const fmtC = (n: number | null | undefined) =>
  `C$${Number(n || 0).toLocaleString("es-NI", { minimumFractionDigits: 2 })}`;
const fmtUSD = (n: number | null | undefined) =>
  `$${Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}`;

interface ActiveSessionRow {
  id: string;
  cashierName: string;
  openingTime: string;
  initialAmount: number;
  initialAmountUSD: number;
  salesCash: number;
  salesCard: number;
  salesUSD: number;
  salesAbonos: number;
  totalSales: number;
  totalReturns: number;
  closingTime?: string | null;
  finalAmount?: number | null;
  actualCash?: number | null;
  actualUSD?: number | null;
  difference?: number | null;
  differenceUSD?: number | null;
  status: "open" | "closed";
}

export default function AdminCashSupervision() {
  const { sessions, refreshSessions } = useCashRegisterSessions();
  const { toast } = useToast();

  const [arqueoSession, setArqueoSession] = useState<ActiveSessionRow | null>(null);
  const [actualCash, setActualCash] = useState("");
  const [actualUSD, setActualUSD] = useState("");
  const [isClosing, setIsClosing] = useState(false);

  const activeSessions = useMemo(
    () => (sessions || []).filter((s: any) => s.status === "open"),
    [sessions]
  );

  const openArqueo = async (s: ActiveSessionRow) => {
    setArqueoSession(s);
    setActualCash("");
    setActualUSD("");
    try {
      const outflows = await getSessionOutflows(s.id);
      setExpectedOutflows(
        outflows.reduce((acc: number, o: { amount: number }) => acc + o.amount, 0)
      );
    } catch {
      setExpectedOutflows(0);
    }
  };

  const [expectedOutflows, setExpectedOutflows] = useState(0);

  const expectedCash = arqueoSession
    ? (arqueoSession.initialAmount || 0) +
      (arqueoSession.salesCash || 0) +
      (arqueoSession.salesAbonos || 0) -
      expectedOutflows -
      (arqueoSession.totalReturns || 0)
    : 0;
  const expectedUSD = arqueoSession
    ? (arqueoSession.initialAmountUSD || 0) + (arqueoSession.salesUSD || 0)
    : 0;

  const cashValue = parseFloat(actualCash || "0");
  const usdValue = parseFloat(actualUSD || "0");
  const diffC = cashValue - expectedCash;
  const diffUSD = usdValue - expectedUSD;

  const handleClose = async () => {
    if (!arqueoSession) return;
    setIsClosing(true);
    try {
      await closeSession(arqueoSession.id, expectedCash, cashValue, usdValue);
      toast({
        title: "Cierre administrativo",
        description: `Caja de ${arqueoSession.cashierName} cerrada. Diferencia C$: ${diffC.toFixed(2)}`,
      });
      setArqueoSession(null);
      await refreshSessions();
    } catch (error) {
      console.error(error);
      toast({
        title: "Error",
        description: "No se pudo cerrar la caja del turno.",
        variant: "destructive",
      });
    } finally {
      setIsClosing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Wallet className="h-7 w-7 text-primary" />
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Supervisión de Cajas</h1>
          <p className="text-muted-foreground">
            Turnos de caja activos en el sistema y arqueos administrativos.
          </p>
        </div>
        <Badge className="ml-auto" variant="outline">
          <ShieldCheck className="mr-1 h-3 w-3" /> Modo Administración
        </Badge>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Turnos de Caja Activos ({activeSessions.length})</CardTitle>
          <CardDescription>
            Cajas abiertas por los cajeros con su monto inicial, ventas del turno y
            acciones de arqueo.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {activeSessions.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              No hay turnos de caja activos en este momento.
            </p>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Cajero</TableHead>
                    <TableHead>Apertura</TableHead>
                    <TableHead className="text-right">Monto Inicial</TableHead>
                    <TableHead className="text-right">Ventas Efectivo</TableHead>
                    <TableHead className="text-right">Ventas Tarjeta</TableHead>
                    <TableHead className="text-right">Total Ventas</TableHead>
                    <TableHead className="text-right">USD</TableHead>
                    <TableHead className="text-right">Acción</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activeSessions.map((s: any) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.cashierName}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(s.openingTime).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">{fmtC(s.initialAmount)}</TableCell>
                      <TableCell className="text-right">{fmtC(s.salesCash)}</TableCell>
                      <TableCell className="text-right">{fmtC(s.salesCard)}</TableCell>
                      <TableCell className="text-right font-semibold">
                        {fmtC(s.totalSales)}
                      </TableCell>
                      <TableCell className="text-right">{fmtUSD(s.salesUSD)}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1.5"
                          onClick={() => openArqueo(s as ActiveSessionRow)}
                        >
                          <Lock className="h-3.5 w-3.5" /> Arqueo
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog de arqueo administrativo */}
      <Dialog open={!!arqueoSession} onOpenChange={(o) => !o && setArqueoSession(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              Arqueo administrativo — {arqueoSession?.cashierName}
            </DialogTitle>
            <DialogDescription>
              Capture el efectivo físico y los dólares contados para cerrar este turno
              de forma administrativa.
            </DialogDescription>
          </DialogHeader>

          {arqueoSession && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2 rounded-lg bg-muted/40 p-3 text-sm">
                <span className="text-muted-foreground">Esperado en caja (C$)</span>
                <span className="text-right font-bold">{fmtC(expectedCash)}</span>
                <span className="text-muted-foreground">Esperado USD</span>
                <span className="text-right font-bold">{fmtUSD(expectedUSD)}</span>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="actual-cash">Efectivo contado (C$)</Label>
                <Input
                  id="actual-cash"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={actualCash}
                  onChange={(e) => setActualCash(e.target.value)}
                />
                <Label htmlFor="actual-usd">USD contado</Label>
                <Input
                  id="actual-usd"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={actualUSD}
                  onChange={(e) => setActualUSD(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-2 text-sm">
                <span className="text-muted-foreground">Diferencia C$</span>
                <span
                  className={cn(
                    "text-right font-bold",
                    diffC < 0 ? "text-red-600" : diffC > 0 ? "text-blue-600" : "text-green-600"
                  )}
                >
                  {diffC > 0 ? "+" : ""}
                  {diffC.toFixed(2)}
                </span>
                <span className="text-muted-foreground">Diferencia USD</span>
                <span
                  className={cn(
                    "text-right font-bold",
                    diffUSD < 0 ? "text-red-600" : diffUSD > 0 ? "text-blue-600" : "text-green-600"
                  )}
                >
                  {diffUSD > 0 ? "+" : ""}
                  {diffUSD.toFixed(2)}
                </span>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setArqueoSession(null)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleClose} disabled={isClosing}>
              {isClosing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Cerrando...
                </>
              ) : (
                <>
                  <Lock className="mr-2 h-4 w-4" /> Cerrar Turno
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
