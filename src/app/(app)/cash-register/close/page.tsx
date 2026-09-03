"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useRouter } from '@/lib/router-nav';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { getSessionOutflows, closeCashSession } from "@/lib/actions/cash-register";
import { Loader2, Lock, Printer, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { useCashRegister } from "@/hooks/use-cash-register";
import { useSettings } from "@/hooks/use-settings";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

type Denomination = {
  value: number;
  label: string;
};

const DENOMINATIONS: Denomination[] = [
  { value: 0.01, label: "0.01" },
  { value: 0.05, label: "0.05" },
  { value: 0.10, label: "0.10" },
  { value: 0.25, label: "0.25" },
  { value: 0.50, label: "0.50" },
  { value: 1, label: "1" },
  { value: 5, label: "5" },
  { value: 10, label: "10" },
  { value: 20, label: "20" },
  { value: 50, label: "50" },
  { value: 100, label: "100" },
  { value: 200, label: "200" },
  { value: 500, label: "500" },
  { value: 1000, label: "1000" },
];

export default function CloseSessionPage() {
  const { user, logout } = useAuth();
  const { activeSession: session } = useCashRegister();
  const { settings } = useSettings();
  const router = useRouter();
  const { toast } = useToast();

  const [counts, setCounts] = useState<Record<number, string>>({});
  const [otherCurrency, setOtherCurrency] = useState("");
  const [actualUSD, setActualUSD] = useState("");
  // Efectivo FÃ­sico en Caja: cantidad total declarada por el cajero al final del turno.
  const [declaredCash, setDeclaredCash] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [totalOutflows, setTotalOutflows] = useState(0);
  const [outflows, setOutflows] = useState<any[]>([]);

  // Confirmation dialog state
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<'print' | 'no-print' | null>(null);

  // Report dialog state (used for both pre-close preview and post-close ticket)
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [isPreClosePreview, setIsPreClosePreview] = useState(false);
  const [closedSessionData, setClosedSessionData] = useState<any>(null);
  // Marcamos que la sesiÃ³n ya se cerrÃ³ para no mostrar el spinner (activeSession pasa a null).
  const [hasClosed, setHasClosed] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  // Tras un cierre real con impresiÃ³n, al terminar de imprimir se redirige automÃ¡ticamente
  // a la pantalla de Apertura de Caja (el guard detecta la caja cerrada).
  const [redirectAfterPrint, setRedirectAfterPrint] = useState(false);
  // Espejos en ref para que handlePrint (invocada tras awaits) lea datos SIEMPRE vigentes,
  // no los del render estancado (esto causaba la impresiÃ³n en blanco / spinner infinito).
  const closedDataRef = useRef<any>(null);
  const redirectRef = useRef(false);
  // === MODAL DE Ã‰XITO: cierre de turno exitoso / logout automÃ¡tico ===
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  // === FALLBACK: reintento de cierre ante fallo de red/API ===
  const [showRetryDialog, setShowRetryDialog] = useState(false);
  const setClosedData = (data: any) => {
    closedDataRef.current = data;
    setClosedSessionData(data);
  };
  const setRedirectFlag = (value: boolean) => {
    redirectRef.current = value;
    setRedirectAfterPrint(value);
  };

  useEffect(() => {
    if (session) {
      getSessionOutflows(session.id).then((outflows) => {
        setOutflows(outflows);
        const total = outflows.reduce((acc: number, curr: { amount: number }) => acc + curr.amount, 0);
        setTotalOutflows(total);
      });
    }
  }, [session]);

  const handleAuditChange = (value: number, quantity: string) => {
    setCounts(prev => ({
      ...prev,
      [value]: quantity
    }));
  };

  const totalCashAudit = useMemo(() => {
    let total = 0;
    DENOMINATIONS.forEach(d => {
      const qty = parseFloat(counts[d.value] || "0");
      if (!isNaN(qty)) {
        total += qty * d.value;
      }
    });
    return total;
  }, [counts]);

  const otherCurrencyAmount = parseFloat(otherCurrency || "0");
  const totalActualCash = totalCashAudit + (isNaN(otherCurrencyAmount) ? 0 : otherCurrencyAmount);

  // Efectivo FÃ­sico Declarado (entrada principal del cajero).
  // Si el usuario no lo ingresa manualmente, se usa el desglose de denominaciones.
  const declaredCashAmount = parseFloat(declaredCash || "0");
  const effectiveActualCash = (declaredCash || "").trim() === "" || isNaN(declaredCashAmount)
    ? totalActualCash
    : declaredCashAmount;

  if (!session && !hasClosed) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin" /></div>;

  const salesCash = session?.salesCash || 0;
  const salesCard = session?.salesCard || 0;
  const salesUSD = session?.salesUSD || 0;
  const salesServices = session?.salesServices || 0;
  const salesAbonos = (session as any)?.salesAbonos || 0;
  const initialAmount = session?.initialAmount || 0;
  const totalReturns = session?.totalReturns || 0;

  // === FORMULA: Expected Cash in Drawer (C$) ===
  // Initial Fund + Cash Sales + Credit Abonos - Outflows - Returns
  const expectedCashInDrawer = initialAmount + salesCash + salesAbonos - totalOutflows - totalReturns;
  // Diferencia = Efectivo FÃ­sico Declarado - Total Esperado en Caja
  const difference = effectiveActualCash - expectedCashInDrawer;

  // === FORMULA: Expected USD ===
  // Initial Fund USD + USD Sales
  const expectedUSD = (session?.initialAmountUSD || 0) + salesUSD;
  const actualUSDAmount = parseFloat(actualUSD || "0");
  const differenceUSD = actualUSDAmount - expectedUSD;

  const hasArqueo = Object.keys(counts).length > 0 || totalCashAudit > 0;

  // Build the report preview data (used by both Pre-Cierre and confirmation summary).
  // `totals` es el recÃ¡lculo autoritativo de ventas; si se provee, sobreescribe los
  // contadores de sesiÃ³n y recalcula el Esperado con el Efectivo real acumulado.
  const buildReportData = (totals?: any) => {
    const tCash = totals?.salesCash ?? salesCash;
    const tCard = totals?.salesCard ?? salesCard;
    const tUsd = totals?.salesUSD ?? salesUSD;
    const tServices = totals?.salesServices ?? salesServices;
    const tAbonos = totals?.salesAbonos ?? salesAbonos;
    const tReturns = totals?.totalReturns ?? totalReturns;
    const tTotal = totals?.totalSales ?? session?.totalSales ?? 0;
    const expected = initialAmount + tCash + tAbonos - totalOutflows - tReturns;
    const expectedUsd = (session?.initialAmountUSD || 0) + tUsd;
    return {
      ...(session ?? {}),
      totalSales: tTotal,
      closingTime: new Date().toISOString(),
      openingBalance: initialAmount,
      expectedCash: expected,
      finalAmount: expected,
      actualCash: effectiveActualCash,
      actualUSD: actualUSDAmount,
      difference: effectiveActualCash - expected,
      differenceUSD: actualUSDAmount - expectedUsd,
      salesCash: tCash,
      salesCard: tCard,
      salesUSD: tUsd,
      salesAbonos: tAbonos,
      salesServices: tServices,
      totalOutflows,
      totalReturns: tReturns,
      outflows,
    };
  };

  // === PRE-CIERRE: Opens report in preview mode (NO DB write) ===
  // El borrador usa SOLO los datos locales (el recÃ¡lculo autoritativo de ventas
  // se resuelve en el backend al momento del cierre definitivo, vÃ­a closeCashSession).
  const handlePreClose = () => {
    if (!session) return;
    if (!hasArqueo) {
      toast({ title: "Error", description: "Debe ingresar el desglose de efectivo antes de ver el borrador.", variant: "destructive" });
      return;
    }
    setRedirectFlag(false);
    setIsPreClosePreview(true);
    setClosedData(buildReportData());
    setIsReportOpen(true);
  };

  // === CIERRE DEFINITIVO: Opens confirmation dialog ===
  const handleRequestClose = () => {
    if (!hasArqueo) {
      toast({ title: "Error", description: "Debe ingresar el desglose de efectivo para cerrar la caja.", variant: "destructive" });
      return;
    }
    setIsPreClosePreview(false);
    setIsConfirmOpen(true);
  };

  // === CIERRE DEFINITIVO: Executes after confirmation ===
  const handleConfirmClose = async (shouldPrint: boolean) => {
    if (!session) return;
    setIsConfirmOpen(false);
    setIsLoading(true);
    setRedirectFlag(shouldPrint);
    try {
      // 1) SERVER ACTION ATÃ“MICA: resuelve ventas reales (efectivo/tarjeta/USD/
      //    crÃ©dito/servicios), salidas y diferencias Y marca la sesiÃ³n como CLOSED
      //    en UNA SOLA transacciÃ³n. Devuelve el reporte consolidado directamente.
      const result = await closeCashSession(session.id, {
        actualCash: effectiveActualCash,
        actualUSD: actualUSDAmount,
      });

      // 2) Reporte consolidado devuelto por el backend (source of truth).
      //    El spread de la sesiÃ³n provee nombres/cabecera; el report del servidor
      //    sobreescribe TODOS los montos calculados.
      const closeData = {
        ...(session ?? {}),
        ...(result.report ?? {}),
        closingTime: result.session?.closingTime ?? new Date().toISOString(),
        openingBalance: initialAmount,
        outflows,
        totalOutflows,
      };

      // 3) Se monta la rama post-cierre (hasClosed) con el reporte antes de imprimir.
      setClosedData(closeData);
      setHasClosed(true);
      setIsLoading(false);

      toast({
        title: "Caja Cerrada",
        description: `Diferencia C$: C$${closeData.difference.toFixed(2)} | Diferencia USD: $${closeData.differenceUSD.toFixed(2)}`,
      });

      if (shouldPrint) {
        // La rama post-cierre ya montÃ³ el #print-area con los datos del reporte.
        // Esperamos 2 frames para garantizar que React haya pintado antes de imprimir.
        await new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));
        handlePrint();
      } else {
        // Sin impresiÃ³n â†’ el cierre ya quedÃ³ registrado â†’ modal de Ã©xito.
        setRedirectFlag(false);
        setShowSuccessModal(true);
      }
    } catch (error) {
      console.error(error);
      toast({ title: "Error", description: "No se pudo cerrar la caja.", variant: "destructive" });
      setHasClosed(false);
      // Fallback: NO bloquear la interfaz. Se ofrece reintentar el cierre.
      setShowRetryDialog(true);
    } finally {
      // Apagar SIEMPRE el spinner (incluso si ocurre un error o se cancela la impresiÃ³n).
      setIsLoading(false);
    }
  };

  // Reintento del cierre tras un fallo de red/API (fallback no bloqueante).
  const handleRetryClose = () => {
    setShowRetryDialog(false);
    handleConfirmClose(false);
  };

  const handleFinishReport = () => {
    setRedirectFlag(false);
    setIsReportOpen(false);
    // Fue un cierre real (no pre-cierre) â†’ mostrar el modal de Ã©xito con logout.
    if (!isPreClosePreview) {
      setShowSuccessModal(true);
    }
    // Si pre-close preview, quedarse en la pÃ¡gina.
  };

  // === MODAL DE Ã‰XITO: Cerrar sesiÃ³n y volver al Login ===
  const handleSuccessAccept = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      // Server Action / hook de logout del sistema: limpia sesiÃ³n local + servidor,
      // cierra la caja si hiciera falta y resetea el usuario en memoria.
      await logout();
      // Redirigir a la pantalla de Inicio de SesiÃ³n.
      router.replace('/login');
    } catch (error) {
      console.error("Logout error:", error);
      setIsLoggingOut(false);
      toast({ title: "Error", description: "No se pudo cerrar la sesiÃ³n. IntÃ©ntelo de nuevo.", variant: "destructive" });
    }
  };

  const handlePrint = () => {
    // Leer los datos vigentes desde el ref (no del closure del render donde se invocÃ³):
    // la rama post-cierre ya los montÃ³ en el DOM antes de imprimir (evita hoja en blanco).
    const data = closedDataRef.current;
    if (!data) {
      toast({ title: "Error", description: "No hay datos del cierre para imprimir.", variant: "destructive" });
      return;
    }
    if (isPrinting) return;
    setIsPrinting(true);
    try {
      // Asegurar que el contenedor imprimible ya estÃ¡ montado en el DOM con contenido.
      const printArea = document.getElementById("print-area");
      if (!printArea || printArea.children.length === 0) {
        setIsPrinting(false);
        toast({ title: "Esperando datos", description: "El reporte aÃºn se estÃ¡ cargando. IntÃ©ntelo de nuevo.", variant: "destructive" });
        return;
      }

      // Limpiar ducto de impresiÃ³n previo (evita acumular listeners en cada impresiÃ³n).
      const handleAfterPrint = () => {
        window.removeEventListener('afterprint', handleAfterPrint);
        setIsPrinting(false);
        // Tras un cierre real con impresiÃ³n (se imprima o se cancele), mostrar el modal
        // de Ã©xito. El modal permanece visible aunque la impresiÃ³n falle o se cancele.
        if (redirectRef.current) {
          redirectRef.current = false;
          setRedirectAfterPrint(false);
          setShowSuccessModal(true);
        }
      };
      window.addEventListener('afterprint', handleAfterPrint);
      window.print();
    } catch (error) {
      console.error("Print error:", error);
      toast({
        title: "Impresora no responde",
        description: "El cierre de caja se guardÃ³ correctamente, pero no se pudo conectar con la impresora.",
        variant: "destructive"
      });
      setIsPrinting(false);
      // La impresiÃ³n fallÃ³ â†’ igual se muestra el modal de Ã©xito (no quedarse bloqueado).
      if (redirectRef.current) {
        redirectRef.current = false;
        setRedirectAfterPrint(false);
        setShowSuccessModal(true);
      }
    }
  };

  // === DIFFERENCE STATUS DISPLAY ===
  const diffVal = difference ?? 0;
  let diffBgColor = 'bg-green-600';
  let diffTextColor = 'text-white';
  let diffStatusText = 'CAJA CUADRADA / EQUILIBRADA';
  if (diffVal > 0) {
    diffBgColor = 'bg-blue-600';
    diffStatusText = 'SOBRANTE EN CAJA';
  } else if (diffVal < 0) {
    diffBgColor = 'bg-red-600';
    diffStatusText = 'FALTANTE EN CAJA';
  }

  // === POST-CIERRE: La sesiÃ³n quedÃ³ cerrada. Renderizamos el reporte de cierre para
  // permitir la impresiÃ³n y luego redirigimos a la pantalla de Apertura de Caja.
  // Se muestra con hasClosed Ãºnicamente: no depende de que activeSession ya haya
  // quedado en null (evita el spinner infinito y la impresiÃ³n en blanco).
  if (hasClosed) {
    return (
      <div className="min-h-screen bg-gray-100 p-4 md:p-8 flex flex-col items-center">
        {closedSessionData && (
          <div className="w-full max-w-3xl bg-white rounded-lg shadow-md p-6 space-y-6" id="print-area">
            <div className="text-center border-b pb-4">
              <h2 className="text-xl font-bold">{closedSessionData.pharmacyName || settings.ticketHeader.name}</h2>
              <h3 className="text-lg font-semibold mt-2">REPORTE DE CIERRE DE TURNO</h3>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="font-bold">Cajero:</span> {closedSessionData.cashierName}</div>
              <div className="text-right"><span className="font-bold">Fecha:</span> {new Date(closedSessionData.closingTime || Date.now()).toLocaleString()}</div>
            </div>
            <div className="mt-4 border-t pt-4">
              <div className="flex justify-between font-semibold mb-2">
                <span>Monto de Apertura (openingBalance):</span>
                <span>C${(closedSessionData.openingBalance ?? closedSessionData.initialAmount ?? 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold text-lg mb-2">
                <span>Total Esperado en Caja (expectedCash):</span>
                <span>C${(closedSessionData.expectedCash ?? closedSessionData.finalAmount ?? 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold text-lg mb-2">
                <span>Total Sistema (Ventas):</span>
                <span>C${(closedSessionData.totalSales ?? 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-semibold mb-2">
                <span>Ventas Efectivo:</span>
                <span>C${(closedSessionData.salesCash ?? 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-semibold mb-2">
                <span>Ventas Tarjeta:</span>
                <span>C${(closedSessionData.salesCard ?? 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-semibold mb-2">
                <span>Abonos a Creditos:</span>
                <span>C${(closedSessionData.salesAbonos ?? 0).toFixed(2)}</span>
              </div>
              {(closedSessionData.salesServices ?? 0) > 0 && (
                <div className="flex justify-between font-semibold mb-2 text-purple-600">
                  <span>Servicios Joyeria:</span>
                  <span>C${(closedSessionData.salesServices ?? 0).toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-lg mb-2 text-red-500">
                <span>Recibos/Salidas:</span>
                <span>-C${(closedSessionData.totalOutflows ?? 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold text-lg mb-2 text-red-500">
                <span>Devoluciones:</span>
                <span>-C${(closedSessionData.totalReturns ?? 0).toFixed(2)}</span>
              </div>
              {(closedSessionData.outflows?.length > 0) && (
                <div className="mb-2 border rounded-md p-2">
                  <div className="font-bold text-red-600 mb-1 text-sm uppercase">Detalle Salidas / Retiros</div>
                  <div className="space-y-1">
                    {closedSessionData.outflows.map((o: any) => (
                      <div key={o.id} className="flex items-start justify-between gap-2 text-xs">
                        <div className="flex-1">
                          <span className="font-semibold">{new Date(o.createdAt).toLocaleString()}</span>
                          <div>{o.reason}</div>
                          <div className="text-gray-500">Usuario: {closedSessionData.cashierName || 'Cajero'}</div>
                        </div>
                        <span className="font-bold text-red-600 whitespace-nowrap">-C${Number(o.amount).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex justify-between font-bold text-lg mb-2 border-t pt-2">
                <span>Esperado en Caja:</span>
                <span>C${(closedSessionData.finalAmount ?? 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold text-lg mb-2 text-blue-600">
                <span>Total Arqueo (C$):</span>
                <span>C${(closedSessionData.actualCash ?? 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold text-lg mb-2 text-green-700">
                <span>Fondo Inicial USD:</span>
                <span>${(closedSessionData.initialAmountUSD ?? 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold text-lg mb-2 text-green-700">
                <span>Ventas USD:</span>
                <span>${(closedSessionData.salesUSD ?? 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold text-lg mb-2 text-green-800 border-t border-green-200 pt-1">
                <span>Total Esperado USD:</span>
                <span>${((closedSessionData.initialAmountUSD ?? 0) + (closedSessionData.salesUSD ?? 0)).toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold text-lg mb-2 text-green-600">
                <span>USD Contado:</span>
                <span>${(closedSessionData.actualUSD ?? 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold text-lg mb-2 border-t pt-1">
                <span>Diferencia C$ (sobrante/faltante):</span>
                <span className={cn(
                  (closedSessionData.difference ?? 0) === 0 ? 'text-green-600' :
                  (closedSessionData.difference ?? 0) > 0 ? 'text-blue-600' : 'text-red-600'
                )}>
                  C${(closedSessionData.difference ?? 0).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between font-bold text-lg mb-2">
                <span>Diferencia USD:</span>
                <span className={(closedSessionData.differenceUSD ?? 0) === 0 ? 'text-green-600' : 'text-red-600'}>
                  ${(closedSessionData.differenceUSD ?? 0).toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        )}
        <div className="w-full max-w-3xl mt-6 flex justify-end gap-2">
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="mr-2 h-4 w-4" /> {isPrinting ? 'Imprimiendo...' : 'Imprimir'}
          </Button>
          <Button onClick={() => setShowSuccessModal(true)} disabled={isPrinting}>
            Finalizar
          </Button>
        </div>
{/* === MODAL: CIERRE DE TURNO EXITOSO (logout al siguiente turno) === */}
      <Dialog
        open={showSuccessModal}
        // Modal informativo NO bloqueante: permanece visible aunque el usuario cancele o
        // la impresora falle. Solo "Aceptar" cierra sesiÃ³n y redirige al Login.
        onOpenChange={() => {}}
      >
        <DialogContent className="max-w-md">
          <DialogHeader className="flex flex-col items-center text-center">
            <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto mb-2" />
            <DialogTitle className="text-2xl">Cierre de Caja Registrado</DialogTitle>
            <DialogDescription className="pt-2">
              El turno ha sido cerrado con Ã©xito en el sistema.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-center mt-4">
            <Button
              onClick={handleSuccessAccept}
              disabled={isLoggingOut}
              className="w-full sm:w-auto min-w-[160px]"
            >
              {isLoggingOut ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Cerrando sesiÃ³n...
                </>
              ) : (
                'Finalizar y Salir'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* === DIALOG: FALLO DE CIERRE â†’ REINTENTAR (fallback no bloqueante) === */}
      <Dialog open={showRetryDialog} onOpenChange={setShowRetryDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader className="flex flex-col items-center text-center">
            <AlertTriangle className="h-12 w-12 text-red-600 mx-auto mb-2" />
            <DialogTitle className="text-xl">No se pudo registrar el cierre</DialogTitle>
            <DialogDescription className="pt-2">
              OcurriÃ³ un error de red o del servidor. El cierre no se guardÃ³.
              Puede reintentar el cierre de caja.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-center flex-col sm:flex-row gap-2 mt-4">
            <Button
              variant="outline"
              onClick={() => setShowRetryDialog(false)}
              className="w-full sm:w-auto"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleRetryClose}
              className="w-full sm:w-auto min-w-[160px]"
            >
              Reintentar Cierre
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <style dangerouslySetInnerHTML={{ __html: `
          @media print {
            @page { margin: 0; size: 80mm auto !important; }
            body * { visibility: hidden; }
            #print-area, #print-area * {
              visibility: visible;
              color: #000000 !important;
              text-shadow: 0 0 0.3px #000 !important;
              print-color-adjust: exact !important;
              -webkit-print-color-adjust: exact !important;
            }
            #print-area {
              position: absolute; left: 0; top: 0;
              width: 100% !important;
              padding: 0 2mm 15mm 2mm !important;
              box-shadow: none !important;
              border: none !important;
              overflow: visible !important;
              page-break-inside: avoid !important;
              break-inside: avoid !important;
            }
          }
        `}} />
      </div>
    );
  }

  // Solo se renderiza el cuerpo principal si hay una sesiÃ³n activa (el caso post-cierre ya se manejÃ³ arriba).
  if (!session) return null;

  return (
    <div className="flex bg-gray-50">
      <div className="flex-1 p-4 md:p-6 flex flex-col md:flex-row gap-6">
        {/* Left Col: Desglose de Denominaciones */}
        <div className="flex-1 bg-white rounded-lg shadow-sm border flex flex-col h-[calc(100vh-8rem)] max-h-[750px] overflow-hidden">
          <h2 className="text-lg font-bold p-4 pb-2 text-gray-700 uppercase flex-shrink-0 border-b">Desglose de Efectivo</h2>
          <div className="flex-1 overflow-y-auto">
            <Table>
              <TableHeader className="bg-blue-600">
                <TableRow className="hover:bg-blue-600">
                  <TableHead className="text-white font-bold w-[100px]">Efectivo</TableHead>
                  <TableHead className="text-white font-bold text-center">Cantidad</TableHead>
                  <TableHead className="text-white font-bold text-right">C$ Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {DENOMINATIONS.map((denom) => {
                  const qty = counts[denom.value] || "";
                  const total = (parseFloat(qty || "0") * denom.value);
                  return (
                    <TableRow key={denom.value} className="hover:bg-blue-50">
                      <TableCell className="font-medium text-right pr-8">{denom.label}</TableCell>
                      <TableCell className="p-1">
                        <Input
                          type="number"
                          min="0"
                          className="h-8 text-center bg-blue-50/50 border-blue-200 focus:bg-white transition-colors"
                          value={qty}
                          onChange={(e) => handleAuditChange(denom.value, e.target.value)}
                        />
                      </TableCell>
                      <TableCell className="text-right font-bold text-gray-700">
                        {total > 0 ? total.toFixed(2) : "0.00"}
                      </TableCell>
                    </TableRow>
                  );
                })}
                <TableRow className="bg-yellow-50 hover:bg-yellow-100">
                  <TableCell className="font-medium text-right pr-8">Otra Moneda</TableCell>
                  <TableCell className="p-1" />
                  <TableCell className="p-1">
                    <Input
                      type="number"
                      placeholder="0.00"
                      className="h-8 text-right font-bold bg-transparent border-none focus:ring-0"
                      value={otherCurrency}
                      onChange={(e) => setOtherCurrency(e.target.value)}
                    />
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
          <div className="flex-shrink-0 border-t p-4 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm font-semibold text-gray-500">Total Desglose (Denominaciones + Otra Moneda)</span>
              <span className="text-sm font-bold text-gray-600">{totalActualCash.toLocaleString('es-NI', { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-600">
                Efectivo FÃ­sico en Caja (Declarado)
              </label>
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                className="h-12 text-right text-xl font-black border-primary/40 focus:border-primary"
                value={declaredCash}
                onChange={(e) => setDeclaredCash(e.target.value)}
              />
              {declaredCash.trim() === "" && (
                <p className="text-[11px] text-gray-400">
                  Si no lo ingresas, se tomarÃ¡ el total del desglose ({totalActualCash.toLocaleString('es-NI', { minimumFractionDigits: 2 })}).
                </p>
              )}
              <Button
                type="button"
                variant="outline"
                className="w-full text-xs"
                onClick={() => setDeclaredCash(totalActualCash.toFixed(2))}
              >
                Usar Desglose de Denominaciones
              </Button>
            </div>
            <Button
              variant="destructive"
              className="w-full bg-red-600 hover:bg-red-700"
              onClick={() => router.push('/cash-count')}
            >
              Cancelar
            </Button>
          </div>
        </div>

        {/* Right Col: FÃ³rmula, Totales y Acciones */}
        <div className="w-full md:w-[420px] flex flex-col gap-4 overflow-y-auto">

          {/* === SECCIÃ“N 1: ARQUEO FÃSICO === */}
          <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
            <div className="p-2 bg-gray-800 text-white font-bold text-center text-sm">ARQUEO FISICO</div>
            <div className="p-4 space-y-2 text-sm">
              <div className="flex justify-between items-center">
                <span className="font-bold text-gray-700">TOT. EFECTIVO (ARQUEO)</span>
                <span className="font-bold text-xl text-gray-900">{totalActualCash.toLocaleString('es-NI', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between items-center text-blue-600">
                <span className="font-semibold">INSTRUM. PAGO (TARJETAS)</span>
                <span>{salesCard.toLocaleString('es-NI', { minimumFractionDigits: 2 })}</span>
              </div>
              {salesServices > 0 && (
                <div className="flex justify-between items-center text-purple-600">
                  <span className="font-semibold">SERVICIOS JOYERIA</span>
                  <span>{salesServices.toLocaleString('es-NI', { minimumFractionDigits: 2 })}</span>
                </div>
              )}
            </div>
          </div>

          {/* === SECCIÃ“N 2: ARQUEO USD === */}
          <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
            <div className="p-2 bg-green-700 text-white font-bold text-center text-sm">DOLARES (USD)</div>
            <div className="p-4 space-y-2 text-sm">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-green-700">Fondo Inicial USD</span>
                <span>${(session.initialAmountUSD || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-semibold text-green-700">Ventas USD (Sistema)</span>
                <span>${salesUSD.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between items-center bg-green-50 p-1 rounded font-bold text-green-800">
                <span>Total Esperado USD</span>
                <span>${expectedUSD.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-semibold text-green-700">USD Contado (Arqueo)</span>
                <Input
                  type="number"
                  placeholder="0.00"
                  className="h-7 w-28 text-right font-bold border-green-300 focus:border-green-500"
                  value={actualUSD}
                  onChange={(e) => setActualUSD(e.target.value)}
                />
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold">DIFERENCIA USD</span>
                <span className={cn("font-bold", differenceUSD < 0 ? 'text-red-500' : differenceUSD > 0 ? 'text-green-600' : 'text-gray-500')}>
                  {differenceUSD > 0 ? '+' : ''}{differenceUSD.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>

          {/* === SECCIÃ“N 3: FÃ“RMULA ESPERADO C$ === */}
          <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
            <div className="p-2 bg-gray-100 border-b font-bold text-gray-700 text-center text-sm">
              TRANSPARENCIA: ESPERADO EN CAJA
            </div>
            <div className="p-4 space-y-1.5 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">(+) Monto de Apertura</span>
                <span className="font-medium">{initialAmount.toLocaleString('es-NI', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between items-center text-green-700">
                <span>(+) Ventas Efectivo del Turno</span>
                <span className="font-medium">+{salesCash.toLocaleString('es-NI', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between items-center text-blue-700">
                <span>(+) Abonos a Creditos</span>
                <span className="font-medium">+{salesAbonos.toLocaleString('es-NI', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between items-center text-red-500">
                <span>(-) Egresos / Salidas de Caja</span>
                <span className="font-medium">-{totalOutflows.toLocaleString('es-NI', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between items-center text-red-500 border-b pb-2">
                <span>(-) Devoluciones</span>
                <span className="font-medium">-{totalReturns.toLocaleString('es-NI', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between items-center bg-gray-100 p-2 rounded text-gray-800 mt-1 font-bold">
                <span className="text-xs">(=) Total Esperado en Caja</span>
                <span>{expectedCashInDrawer.toLocaleString('es-NI', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between items-center bg-gray-50 p-2 rounded mt-1">
                <span className="font-semibold text-gray-600">(-) Efectivo FÃ­sico Declarado</span>
                <span className="font-bold">{effectiveActualCash.toLocaleString('es-NI', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className={cn(
                "flex justify-between items-center p-2 rounded mt-1 font-bold",
                difference > 0 ? "bg-blue-50 text-blue-700" : difference < 0 ? "bg-red-50 text-red-600" : "bg-green-50 text-green-700"
              )}>
                <span className="text-xs">(=) DIFERENCIA (FALTANTE/SOBRANTE)</span>
                <span>{difference > 0 ? '+' : ''}{difference.toLocaleString('es-NI', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>

          {/* === SECCIÃ“N 4: DIFERENCIA === */}
          <div className={`w-full rounded-lg shadow-md p-4 flex flex-col items-center justify-center transition-colors duration-300 ${diffBgColor}`}>
            <span className={`text-3xl font-black tracking-tight mb-1 ${diffTextColor}`}>
              {diffVal > 0 ? '+' : ''}{diffVal.toLocaleString('es-NI', { minimumFractionDigits: 2 })}
            </span>
            <span className={`text-xs font-bold uppercase opacity-90 ${diffTextColor}`}>DIFERENCIA</span>
            <span className={`mt-2 text-xs font-bold uppercase px-3 py-1 rounded-full ${diffTextColor === 'text-white' ? 'bg-white/20 text-white' : 'bg-black/10 text-black'}`}>
              {diffStatusText}
            </span>
            {diffVal < 0 && (
              <div className={`mt-3 w-full rounded-md px-3 py-2 text-center text-xs font-bold ${diffTextColor === 'text-white' ? 'bg-white/15 text-white' : 'bg-black/10 text-black'}`}>
                Â¡ALERTA! Hay un faltante de C${Math.abs(diffVal).toLocaleString('es-NI', { minimumFractionDigits: 2 })} en caja.
              </div>
            )}
            {diffVal > 0 && (
              <div className={`mt-3 w-full rounded-md px-3 py-2 text-center text-xs font-bold ${diffTextColor === 'text-white' ? 'bg-white/15 text-white' : 'bg-black/10 text-black'}`}>
                Â¡Sobrante! Hay C${diffVal.toLocaleString('es-NI', { minimumFractionDigits: 2 })} de mÃ¡s en caja.
              </div>
            )}
          </div>

          {/* === SECCIÃ“N 5: BOTONES DE ACCION === */}
          <div className="flex flex-col gap-2 mt-auto">
            {/* Fila superior: Limpiar + Pre-Cierre */}
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="secondary"
                className="bg-yellow-600 hover:bg-yellow-700 text-white border-none"
                onClick={() => setCounts({})}
              >
                Limpiar
              </Button>
              <Button
                variant="secondary"
                className="bg-[#84b541] hover:bg-[#73a036] text-white border-none"
                onClick={handlePreClose}
              >
                Pre-Cierre
              </Button>
            </div>

            {/* BotÃ³n principal: CERRAR CAJA DEFINITIVAMENTE */}
            <Button
              className="w-full bg-green-600 hover:bg-green-700 h-14 text-lg font-bold shadow-lg"
              onClick={handleRequestClose}
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              ) : (
                <Lock className="mr-2 h-5 w-5" />
              )}
              {isLoading ? 'Cerrando...' : 'FINALIZAR Y CERRAR CAJA'}
            </Button>
          </div>
        </div>
      </div>

      {/* === DIALOG: CONFIRMACION DE CIERRE DEFINITIVO === */}
      <Dialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <DialogContent className="w-[95vw] sm:max-w-2xl p-6 overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Confirmar Cierre Definitivo
            </DialogTitle>
            <DialogDescription>
              Esta accion es <strong>irreversible</strong>. La sesion de caja se cerrara permanentemente.
            </DialogDescription>
          </DialogHeader>

          <div className="w-full space-y-3 text-sm">
            <div className="w-full bg-slate-50 rounded-lg p-4 space-y-2 border">
              <div className="flex justify-between">
                <span className="text-gray-600">Cajero:</span>
                <span className="font-bold">{session.cashierName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Efectivo FÃ­sico Declarado (C$):</span>
                <span className="font-bold">C$ {effectiveActualCash.toLocaleString('es-NI', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Esperado (C$):</span>
                <span className="font-bold">C$ {expectedCashInDrawer.toLocaleString('es-NI', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between border-t pt-2">
                <span className="font-bold">Diferencia:</span>
                <span className={cn("font-bold", diffVal < 0 ? 'text-red-600' : diffVal > 0 ? 'text-blue-600' : 'text-green-600')}>
                  C$ {diffVal.toLocaleString('es-NI', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Diferencia USD:</span>
                <span className={cn("font-bold", differenceUSD < 0 ? 'text-red-600' : 'text-green-600')}>
                  ${differenceUSD.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>

          <DialogFooter className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 pt-4 border-t mt-4 w-full">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsConfirmOpen(false)}
              className="text-slate-600 hover:bg-slate-100"
            >
              Cancelar
            </Button>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleConfirmClose(false)}
                className="px-4 text-sm font-medium"
              >
                Solo Cerrar Caja
              </Button>
              <Button
                type="button"
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 text-sm font-medium"
                onClick={() => handleConfirmClose(true)}
              >
                <Printer className="w-4 h-4 mr-2 shrink-0" />
                Cerrar e Imprimir Ticket Z
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* === DIALOG: REPORTE DE CIERRE (Pre-Cierre preview o Ticket post-cierre) === */}
      <Dialog open={isReportOpen} onOpenChange={(open) => !open && handleFinishReport()}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {isPreClosePreview ? 'Pre-Cierre (Borrador)' : 'Reporte de Cierre de Caja'}
            </DialogTitle>
            {isPreClosePreview && (
              <DialogDescription>
                Este es un borrador. Los datos NO se han guardado todavia.
              </DialogDescription>
            )}
          </DialogHeader>

          {closedSessionData && (
            <div className="space-y-6 p-4 border rounded-md" id="print-area">
              <div className="text-center border-b pb-4">
                <h2 className="text-xl font-bold">{settings.ticketHeader.name}</h2>
                <h3 className="text-lg font-semibold mt-2">REPORTE DE CIERRE DE TURNO</h3>
                {isPreClosePreview && (
                  <p className="text-xs text-amber-600 font-bold mt-1">*** BORRADOR - NO VALIDO ***</p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-bold">Cajero:</span> {closedSessionData.cashierName}
                </div>
                <div className="text-right">
                  <span className="font-bold">Fecha:</span> {new Date().toLocaleString()}
                </div>
              </div>

              <div className="mt-4 border-t pt-4">
                <div className="flex justify-between font-semibold mb-2">
                  <span>Monto de Apertura (openingBalance):</span>
                  <span>C${closedSessionData.openingBalance?.toFixed(2) || closedSessionData.initialAmount?.toFixed(2) || "0.00"}</span>
                </div>
                <div className="flex justify-between font-bold text-lg mb-2">
                  <span>Total Esperado en Caja (expectedCash):</span>
                  <span>C${closedSessionData.expectedCash?.toFixed(2) || closedSessionData.finalAmount?.toFixed(2) || "0.00"}</span>
                </div>
                <div className="flex justify-between font-bold text-lg mb-2">
                  <span>Total Sistema (Ventas):</span>
                  <span>C${closedSessionData.totalSales?.toFixed(2) || "0.00"}</span>
                </div>
                <div className="flex justify-between font-semibold mb-2">
                  <span>Ventas Efectivo:</span>
                  <span>C${closedSessionData.salesCash?.toFixed(2) || "0.00"}</span>
                </div>
                <div className="flex justify-between font-semibold mb-2">
                  <span>Ventas Tarjeta:</span>
                  <span>C${closedSessionData.salesCard?.toFixed(2) || "0.00"}</span>
                </div>
                <div className="flex justify-between font-semibold mb-2">
                  <span>Abonos a Creditos:</span>
                  <span>C${closedSessionData.salesAbonos?.toFixed(2) || "0.00"}</span>
                </div>
                {closedSessionData.salesServices > 0 && (
                  <div className="flex justify-between font-semibold mb-2 text-purple-600">
                    <span>Servicios Joyeria:</span>
                    <span>C${closedSessionData.salesServices?.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-lg mb-2 text-red-500">
                  <span>Recibos/Salidas:</span>
                  <span>-C${closedSessionData.totalOutflows?.toFixed(2) || "0.00"}</span>
                </div>
                <div className="flex justify-between font-bold text-lg mb-2 text-red-500">
                  <span>Devoluciones:</span>
                  <span>-C${closedSessionData.totalReturns?.toFixed(2) || "0.00"}</span>
                </div>
                {closedSessionData.outflows?.length > 0 && (
                  <div className="mb-2 border rounded-md p-2">
                    <div className="font-bold text-red-600 mb-1 text-sm uppercase">Detalle Salidas / Retiros</div>
                    <div className="space-y-1">
                      {closedSessionData.outflows.map((o: any) => (
                        <div key={o.id} className="flex items-start justify-between gap-2 text-xs">
                          <div className="flex-1">
                            <span className="font-semibold">{new Date(o.createdAt).toLocaleString()}</span>
                            <div>{o.reason}</div>
                            <div className="text-gray-500">Usuario: {closedSessionData.cashierName || 'Cajero'}</div>
                          </div>
                          <span className="font-bold text-red-600 whitespace-nowrap">-C${Number(o.amount).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div className="flex justify-between font-bold text-lg mb-2 border-t pt-2">
                  <span>Esperado en Caja:</span>
                  <span>C${closedSessionData.finalAmount?.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-lg mb-2 text-blue-600">
                  <span>Total Arqueo (C$):</span>
                  <span>C${closedSessionData.actualCash?.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-lg mb-2 text-green-700">
                  <span>Fondo Inicial USD:</span>
                  <span>${(closedSessionData.initialAmountUSD || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-lg mb-2 text-green-700">
                  <span>Ventas USD:</span>
                  <span>${closedSessionData.salesUSD?.toFixed(2) || "0.00"}</span>
                </div>
                <div className="flex justify-between font-bold text-lg mb-2 text-green-800 border-t border-green-200 pt-1">
                  <span>Total Esperado USD:</span>
                  <span>${((closedSessionData.initialAmountUSD || 0) + (closedSessionData.salesUSD || 0)).toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-lg mb-2 text-green-600">
                  <span>USD Contado:</span>
                  <span>${closedSessionData.actualUSD?.toFixed(2) || "0.00"}</span>
                </div>
                <div className="flex justify-between font-bold text-lg mb-2 border-t pt-1">
                  <span>Diferencia C$ (sobrante/faltante):</span>
                  <span className={cn(
                    closedSessionData.difference === 0 ? 'text-green-600' :
                    closedSessionData.difference > 0 ? 'text-blue-600' : 'text-red-600'
                  )}>
                    C${closedSessionData.difference?.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between font-bold text-lg mb-2">
                  <span>Diferencia USD:</span>
                  <span className={cn(
                    (closedSessionData.differenceUSD || 0) === 0 ? 'text-green-600' : 'text-red-600'
                  )}>
                    ${(closedSessionData.differenceUSD || 0).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="sm:justify-between">
            <div className="flex gap-2 w-full justify-end">
              <Button variant="outline" onClick={handlePrint}>
                <Printer className="mr-2 h-4 w-4" /> Imprimir
              </Button>
              <Button onClick={handleFinishReport}>
                {isPreClosePreview ? 'Cerrar Borrador' : 'Finalizar'}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <style dangerouslySetInnerHTML={{ __html: `
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
        @media print {
          @page { margin: 0; size: 80mm auto !important; }
          body * { visibility: hidden; }
          #print-area, #print-area * {
            visibility: visible;
            color: #000000 !important;
            text-shadow: 0 0 0.3px #000 !important;
            print-color-adjust: exact !important;
            -webkit-print-color-adjust: exact !important;
          }
          #print-area {
            position: absolute; left: 0; top: 0;
            width: 100% !important;
            padding: 0 2mm 15mm 2mm !important;
            box-shadow: none !important;
            border: none !important;
            overflow: visible !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
        }
      `}} />
    </div>
  );
}
