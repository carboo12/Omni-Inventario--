"use client";

import { useAuth } from "@/hooks/use-auth";
import { useRouter } from '@/lib/router-nav';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Wallet, Receipt, Ban, Printer, Lock, FileText } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { useState, useMemo } from "react";
import { useCashRegister } from "@/hooks/use-cash-register";
import { useCashRegisterSessions } from "@/hooks/use-cash-register-sessions";
import { createOutflowAction, getSessionOutflows } from "@/lib/actions/cash-register";
import { getInvoiceByNumber, getLastSale } from "@/lib/actions/sales";
import { buildReceiptDataFromInvoice } from "@/lib/ticket-data";
import { printReceiptHtml, buildReceiptHtml, buildZReportHtml } from "@/lib/print-iframe";
import { useSettings } from "@/hooks/use-settings";
import { AlertCircle } from "lucide-react";
import { formatTicketNumber, parseTicketSearch } from "@/lib/utils";
import AdminCashSupervision from "./admin-supervision";

const ADMIN_ROLES = ["master-admin", "admin"];


export default function CashCountPage() {
    const { user } = useAuth();
    const router = useRouter();
    const { toast } = useToast();
    const { activeSession } = useCashRegister();
    const { sessions } = useCashRegisterSessions();
    const { settings } = useSettings();

    const [isReciboOpen, setIsReciboOpen] = useState(false);
    const [amount, setAmount] = useState("");
    const [reason, setReason] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [docNumber, setDocNumber] = useState("");
    const [docType, setDocType] = useState("factura");

    if (user && ADMIN_ROLES.includes(user.role)) {
        return <AdminCashSupervision />;
    }

    const closedSessions = useMemo(() => {
        let list = (sessions || []).filter(s => s.status === 'closed');
        if (user?.role === 'cashier') {
            list = list.filter(s => s.cashierId === user.id);
        }
        return list.slice(0, 5);
    }, [sessions, user]);

    const handleNavigation = (path: string) => {
        router.push(path);
    };

    const handleNotImplemented = (feature: string) => {
        toast({
            title: "FunciÃ³n No Disponible",
            description: `La opciÃ³n ${feature} aÃºn no estÃ¡ implementada o estÃ¡ deshabilitada.`,
        });
    };

    const handleOpenDrawer = () => {
        toast({
            title: "Gaveta Abierta",
            description: "Se ha enviado la seÃ±al para abrir la gaveta.",
        });
        // In a real app, this would call an API endpoint to trigger the hardware
    };

    const handleCreateRecibo = async () => {
        if (!activeSession) {
            toast({
                title: "Error",
                description: "No hay una sesiÃ³n de caja activa.",
                variant: "destructive",
            });
            return;
        }

        if (!amount || !reason) {
            toast({
                title: "Error",
                description: "Por favor ingrese el monto y el motivo.",
                variant: "destructive",
            });
            return;
        }

        try {
            setIsLoading(true);
            const result = await createOutflowAction(activeSession.id, parseFloat(amount), reason);
            toast({
                title: "Recibo Creado",
                description: `Recibo #${result.receiptNumber}. Salida de C$${amount}.`,
            });
            setIsReciboOpen(false);
            setAmount("");
            setReason("");
        } catch (error) {
            console.error(error);
            toast({
                title: "Error",
                description: "No se pudo crear el recibo.",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleReprintSession = async (session: any) => {
        try {
            setIsLoading(true);
            const outflows = await getSessionOutflows(session.id);

            toast({ title: "Cierre Encontrado", description: `Reimprimiendo Reporte de Caja de ${session.cashierName}...` });

            const zReportData = {
                pharmacyName: settings.ticketHeader.name,
                address: settings.ticketHeader.address,
                phone: settings.ticketHeader.phone,
                rfc: settings.ticketHeader.rfc,
                cashierName: session.cashierName,
                openingTime: session.openingTime,
                closingTime: session.closingTime,
                initialAmount: session.initialAmount,
                salesCash: session.salesCash,
                salesCard: session.salesCard,
                salesServices: session.salesServices,
                salesAbonos: session.salesAbonos,
                outflows,
                totalReturns: session.totalReturns,
                totalSales: session.totalSales,
                finalAmount: session.finalAmount,
                actualCash: session.actualCash,
                difference: session.difference,
                initialAmountUSD: session.initialAmountUSD,
                salesUSD: session.salesUSD,
                actualUSD: session.actualUSD,
                differenceUSD: session.differenceUSD,
                footerMessage: settings.ticketFooter.message,
                website: settings.ticketFooter.website,
            };
            printReceiptHtml(buildZReportHtml(zReportData));
        } catch (error) {
            console.error(error);
            toast({ title: "Error", description: "No se pudo obtener el historial del cierre.", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    };

    const handleReprint = async () => {
        if (!docNumber) {
            toast({ title: "Error", description: "Ingrese un nÃºmero de documento.", variant: "destructive" });
            return;
        }

        if (docType === 'cierre') {
            const foundSession = (sessions || []).find(s => 
                s.id.toLowerCase() === docNumber.toLowerCase() ||
                s.cashierName.toLowerCase().includes(docNumber.toLowerCase())
            );
            if (foundSession) {
                handleReprintSession(foundSession);
            } else {
                toast({ title: "Error", description: "No se encontrÃ³ ningÃºn cierre de caja con ese cÃ³digo o cajero.", variant: "destructive" });
            }
            return;
        }

        if (docType !== 'factura') {
            handleNotImplemented(docType);
            return;
        }

        const parsed = parseTicketSearch(docNumber);
        if (!parsed) {
            toast({ title: "Error", description: "NÃºmero de documento invÃ¡lido.", variant: "destructive" });
            return;
        }

        try {
            setIsLoading(true);
            const result = await getInvoiceByNumber(parsed);
            if (result.success && result.data) {
                toast({ title: "Factura Encontrada", description: `Reimprimiendo factura #${formatTicketNumber(result.data.invoiceNumber)}...` });

                // Imprime el ticket térmico en un iframe aislado (sin window.print()
                // de la ventana principal) para evitar saltos de página en tickets largos.
                const ticketData = buildReceiptDataFromInvoice(result.data, settings, formatTicketNumber(result.data.invoiceNumber));
                printReceiptHtml(buildReceiptHtml(ticketData));
            } else {
                toast({ title: "Error", description: result.error || "No se encontrÃ³ la factura.", variant: "destructive" });
            }
        } catch (error) {
            toast({ title: "Error", description: "Error al buscar el documento.", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    };

    const handleReprintLast = async () => {
        try {
            setIsLoading(true);
            const result = await getLastSale(activeSession?.id);
            if (result.success && result.data) {
                toast({ title: "Última Venta", description: `Ticket #${formatTicketNumber(result.data.invoiceNumber)} listo para imprimir.` });

                // Imprime el ticket térmico en un iframe aislado (sin window.print()
                // de la ventana principal) para evitar saltos de página en tickets largos.
                const ticketData = buildReceiptDataFromInvoice(result.data, settings, formatTicketNumber(result.data.invoiceNumber));
                printReceiptHtml(buildReceiptHtml(ticketData));
            } else {
                toast({ title: "Error", description: result.error || "No se encontrÃ³ la Ãºltima venta.", variant: "destructive" });
            }
        } catch (error) {
            toast({ title: "Error", description: "Error al obtener la Ãºltima venta.", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="container mx-auto p-4 max-w-4xl h-[calc(100vh-100px)] flex flex-col">
            <h1 className="text-xl font-bold mb-4 text-center text-primary">GestiÃ³n de Efectivo</h1>

            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[300px]">
                {/* Columna Izquierda */}
                <div className="grid grid-rows-2 gap-4">
                    {!activeSession ? (
                        <Button
                            variant="default"
                            className="h-full w-full text-lg bg-[#8BC34A] hover:bg-[#7CB342] flex flex-col gap-1 shadow-lg border-2 border-[#8BC34A]/20"
                            onClick={() => handleNavigation("/cash-register/open")}
                        >
                            <Wallet className="h-8 w-8 text-white animate-pulse" />
                            <span className="font-bold">ABRIR CAJA</span>
                        </Button>
                    ) : (
                        <Button
                            variant="default"
                            className="h-full w-full text-lg bg-blue-500 hover:bg-blue-600 flex flex-col gap-1"
                            onClick={() => handleNavigation("/cash-count/x-report")}
                        >
                            <Receipt className="h-6 w-6" />
                            Cierre X
                        </Button>
                    )}
                    <Button
                        variant="default"
                        className="h-full w-full text-lg bg-blue-500 hover:bg-blue-600 flex flex-col gap-1"
                        onClick={() => handleNavigation("/cash-count/z-report")}
                    >
                        <Lock className="h-6 w-6" />
                        Cierre Z
                    </Button>
                </div>

                {/* Columna Derecha */}
                <div className="grid grid-rows-2 gap-4">
                    {/* Fila Superior Derecha - Cuadre de Caja (BotÃ³n Verde) */}
                    <Button
                        className="h-full w-full text-lg bg-[#84b541] hover:bg-[#73a036] flex flex-col gap-1"
                        onClick={() => handleNavigation("/cash-register/close")}
                    >
                        <Wallet className="h-6 w-6" />
                        Cuadre de Caja
                    </Button>

                    {/* Fila Inferior Derecha - Dividida en 2 */}
                    <div className="grid grid-rows-2 gap-4">
                        <Button
                            className="h-full w-full text-base bg-blue-500 hover:bg-blue-600 flex items-center justify-center gap-2"
                            onClick={handleOpenDrawer}
                        >
                            Abir Gaveta
                        </Button>
                        <Button
                            className="h-full w-full text-base bg-[#ff6b35] hover:bg-[#e85a25] flex items-center justify-center gap-2"
                            onClick={() => setIsReciboOpen(true)}
                        >
                            <FileText className="h-5 w-5" />
                            Recibo
                        </Button>
                    </div>
                </div>
            </div>

            <div className="mt-6 space-y-4">
                {/* Reimprimir Ãšltimo Ticket */}
                {activeSession && (
                    <Card className="shadow-sm border-green-200">
                        <CardContent className="py-3 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Printer className="h-5 w-5 text-green-600" />
                                <div>
                                    <p className="text-sm font-semibold">Reimprimir Ãšltimo Ticket</p>
                                    <p className="text-xs text-muted-foreground">Imprime la venta mÃ¡s reciente de esta sesiÃ³n</p>
                                </div>
                            </div>
                            <Button
                                className="bg-green-600 hover:bg-green-700 text-white h-8 text-xs"
                                onClick={handleReprintLast}
                                disabled={isLoading}
                            >
                                {isLoading ? "Buscando..." : "Reimprimir"}
                            </Button>
                        </CardContent>
                    </Card>
                )}

                {/* Reimprimir Documentos */}
                <Card className="shadow-sm">
                    <CardHeader className="py-2">
                        <CardTitle className="text-center text-sm font-medium text-gray-600">Reimprimir Documentos Fiscales y No Fiscales</CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col md:flex-row items-end gap-2 justify-center py-2">
                        <div className="grid w-full max-w-[200px] items-center gap-1">
                            <Label htmlFor="doc-type" className="text-xs">Tipo</Label>
                            <Select value={docType} onValueChange={setDocType}>
                                <SelectTrigger id="doc-type" className="h-8">
                                    <SelectValue placeholder="Seleccionar" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="factura">Factura</SelectItem>
                                    <SelectItem value="cierre">Cierre de Caja</SelectItem>
                                    <SelectItem value="devolucion">DevoluciÃ³n</SelectItem>
                                    <SelectItem value="recibo">Recibo</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid w-full max-w-[200px] items-center gap-1">
                            <Label htmlFor="doc-number" className="text-xs">NÃºmero</Label>
                            <Input
                                type="text"
                                id="doc-number"
                                placeholder="NÃºmero"
                                className="bg-blue-100/50 h-8"
                                value={docNumber}
                                onChange={(e) => setDocNumber(e.target.value)}
                            />
                        </div>
                        <Button
                            variant="destructive"
                            className="bg-red-700 hover:bg-red-800 h-8 text-xs"
                            onClick={handleReprint}
                            disabled={isLoading}
                        >
                            {isLoading ? "Buscando..." : "Reimprimir"}
                        </Button>
                    </CardContent>
                </Card>

                {/* Historial de Cierres Recientes */}
                <Card className="shadow-sm">
                    <CardHeader className="py-2">
                        <CardTitle className="text-center text-sm font-medium text-gray-600">Historial de Cierres Recientes (Ãšltimos 5)</CardTitle>
                    </CardHeader>
                    <CardContent className="py-2">
                        {closedSessions.length > 0 ? (
                            <div className="space-y-2">
                                {closedSessions.map((s) => (
                                    <div key={s.id} className="flex items-center justify-between p-2 border rounded-md hover:bg-slate-50 transition-colors">
                                        <div className="text-xs">
                                            <p className="font-semibold text-gray-700">{s.cashierName}</p>
                                            <p className="text-muted-foreground">
                                                {s.closingTime ? new Date(s.closingTime).toLocaleString() : new Date(s.openingTime).toLocaleString()}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <span className="text-sm font-bold text-gray-800">
                                                C$ {s.finalAmount?.toFixed(2) || "0.00"}
                                            </span>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="h-8 text-xs flex items-center gap-1.5"
                                                onClick={() => handleReprintSession(s)}
                                                disabled={isLoading}
                                            >
                                                <Printer className="h-3.5 w-3.5" /> Reimprimir Z
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-xs text-muted-foreground text-center py-2">No se encontraron cierres recientes.</p>
                        )}
                    </CardContent>
                </Card>
            </div>

            <Dialog open={isReciboOpen} onOpenChange={setIsReciboOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Crear Recibo de Salida</DialogTitle>
                        <DialogDescription>
                            Registre una salida de efectivo de la caja.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="amount" className="text-right">Monto</Label>
                            <Input
                                id="amount"
                                type="number"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                className="col-span-3"
                                placeholder="0.00"
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="reason" className="text-right">Motivo</Label>
                            <Input
                                id="reason"
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                className="col-span-3"
                                placeholder="Ej: Pago de luz"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsReciboOpen(false)}>Cancelar</Button>
                        <Button onClick={handleCreateRecibo} disabled={isLoading}>
                            {isLoading ? "Guardando..." : "Guardar Recibo"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            </div>
    );
}
