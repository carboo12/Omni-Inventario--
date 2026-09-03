"use client";

import React, { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useSettings } from "@/hooks/use-settings";
import { createJewelryService, getSessionServices, JewelryServiceData } from "@/lib/actions/jewelry-services";
import { Wrench, Plus, Loader2, ShoppingCart, CreditCard, ArrowLeft, Trash2, Check, Printer } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { ReceiptTemplate } from "@/components/pos/receipt-template";
import { formatNumber } from "@/lib/utils";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface PendingService {
    tempId: string;
    description: string;
    amount: number;
}

interface ServiceRegistrationDialogProps {
    isOpen: boolean;
    onClose: () => void;
    sessionId: string;
    userId: string;
    cashierName?: string;
    onServiceAdded?: () => void;
}

type Step = "form" | "payment" | "receipt";
type Currency = "NIO" | "USD";
type PaymentStep = "method" | "currency" | "cash-entry";

// ─── Component ──────────────────────────────────────────────────────────────────

export function ServiceRegistrationDialog({
    isOpen,
    onClose,
    sessionId,
    userId,
    cashierName = "Cajero",
    onServiceAdded,
}: ServiceRegistrationDialogProps) {
    const { toast } = useToast();
    const { settings } = useSettings();

    // — Form state
    const [description, setDescription] = useState("");
    const [amount, setAmount] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    // — Services state (pending queue not yet paid)
    const [pendingServices, setPendingServices] = useState<PendingService[]>([]);

    // — Session history (already paid)
    const [sessionServices, setSessionServices] = useState<JewelryServiceData[]>([]);
    const [isFetching, setIsFetching] = useState(false);

    // — Dialog step
    const [step, setStep] = useState<Step>("form");

    // — Payment sub-state
    const [payStep, setPayStep] = useState<PaymentStep>("method");
    const [currency, setCurrency] = useState<Currency>("NIO");
    const [amountInput, setAmountInput] = useState("");

    // — Receipt
    const [receiptData, setReceiptData] = useState<any | null>(null);

    const exchangeRate = parseFloat(settings.exchangeRate || "36.5");

    // Load session history when dialog opens
    useEffect(() => {
        if (isOpen && sessionId) {
            setIsFetching(true);
            getSessionServices(sessionId).then((data) => {
                setSessionServices(data);
                setIsFetching(false);
            });
        }
        if (!isOpen) {
            // Reset all state on close
            setStep("form");
            setPayStep("method");
            setDescription("");
            setAmount("");
            setAmountInput("");
            setCurrency("NIO");
            setReceiptData(null);
            setPendingServices([]);
        }
    }, [isOpen, sessionId]);

    // ─── Computed ─────────────────────────────────────────────────────────────

    const pendingTotal = pendingServices.reduce((s, p) => s + p.amount, 0);
    const sessionTotal = sessionServices.reduce((s, p) => s + p.amount, 0);

    // ─── Form handlers ────────────────────────────────────────────────────────

    const handleAddToPending = () => {
        const parsed = parseFloat(amount);
        if (!description.trim()) {
            toast({ title: "Error", description: "Ingrese el nombre del servicio.", variant: "destructive" });
            return;
        }
        if (isNaN(parsed) || parsed <= 0) {
            toast({ title: "Error", description: "Ingrese un precio válido mayor a 0.", variant: "destructive" });
            return;
        }
        setPendingServices((prev) => [
            ...prev,
            { tempId: Date.now().toString(), description: description.trim(), amount: parsed },
        ]);
        setDescription("");
        setAmount("");
    };

    const handleRemovePending = (tempId: string) => {
        setPendingServices((prev) => prev.filter((s) => s.tempId !== tempId));
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !isLoading) handleAddToPending();
    };

    // ─── Payment handlers ─────────────────────────────────────────────────────

    const handleNumpadInput = (val: string) => {
        if (val === "." && amountInput.includes(".")) return;
        setAmountInput((prev) => prev + val);
    };

    const handleExactPay = () => {
        if (currency === "USD") {
            setAmountInput((pendingTotal / exchangeRate).toFixed(2));
        } else {
            setAmountInput(pendingTotal.toString());
        }
    };

    const handleDenomination = (val: number) => {
        setAmountInput((prev) => ((parseFloat(prev) || 0) + val).toString());
    };

    const handleTotalizar = async () => {
        const paid = parseFloat(amountInput) || 0;
        const paidInNIO = currency === "USD" ? paid * exchangeRate : paid;

        if (paidInNIO < pendingTotal) {
            if (paid === 0) { handleExactPay(); return; }
            toast({ title: "Monto insuficiente", description: `Se requieren C$ ${formatNumber(pendingTotal)}`, variant: "destructive" });
            return;
        }

        const change = paidInNIO - pendingTotal;
        const methodLabel = currency === "USD" ? "Efectivo $" : "Efectivo C$";

        await confirmPayment(paidInNIO, change, methodLabel);
    };

    const handleInstantMethod = async (method: string) => {
        await confirmPayment(pendingTotal, 0, method);
    };

    const confirmPayment = async (paidInNIO: number, change: number, method: string) => {
        setIsLoading(true);
        try {
            // Save all pending services to DB
            for (const svc of pendingServices) {
                const result = await createJewelryService(sessionId, userId, svc.description, svc.amount);
                if (!result.success) throw new Error(result.error);
            }

            // Build receipt
            const ticket: any = {
                pharmacyName: settings.ticketHeader.name,
                address: settings.ticketHeader.address,
                phone: settings.ticketHeader.phone,
                rfc: settings.ticketHeader.rfc,
                ticketId: `SVC-${Date.now().toString().slice(-6)}`,
                date: new Date(),
                cashierName,
                items: pendingServices.map((s) => ({
                    quantity: 1,
                    description: s.description,
                    price: s.amount,
                    total: s.amount,
                })),
                subtotal: pendingTotal,
                tax: 0,
                total: pendingTotal,
                paymentMethod: method,
                amountPaid: paidInNIO,
                change,
                footerMessage: settings.ticketFooter.message,
                website: settings.ticketFooter.website,
                logoSvg: settings.logoSvg,
            };

            setReceiptData(ticket);

            // Refresh session services
            const updated = await getSessionServices(sessionId);
            setSessionServices(updated);
            setPendingServices([]);
            setAmountInput("");
            setStep("receipt");
            onServiceAdded?.();
        } catch (err: any) {
            toast({ title: "Error", description: err.message || "No se pudo registrar el pago.", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    };

    // ─── Render: FORM ─────────────────────────────────────────────────────────

    const renderForm = () => (
        <>
            {/* Input section */}
            <div className="space-y-4 pt-2">
                <div className="space-y-1.5">
                    <Label htmlFor="service-desc" className="text-sm font-semibold text-gray-700">
                        Nombre del Servicio
                    </Label>
                    <Input
                        id="service-desc"
                        placeholder="Ej: Limpieza de cadena de oro"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        onKeyDown={handleKeyDown}
                        disabled={isLoading}
                        className="focus-visible:ring-[#673AB7]"
                        autoFocus
                    />
                </div>

                <div className="space-y-1.5">
                    <Label htmlFor="service-amount" className="text-sm font-semibold text-gray-700">
                        Precio (C$)
                    </Label>
                    <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold text-sm">C$</span>
                        <Input
                            id="service-amount"
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="0.00"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            onKeyDown={handleKeyDown}
                            disabled={isLoading}
                            className="pl-9 focus-visible:ring-[#673AB7]"
                        />
                    </div>
                </div>

                <Button
                    onClick={handleAddToPending}
                    disabled={isLoading}
                    className="w-full bg-[#673AB7] hover:bg-[#5E35B1] text-white h-11 text-sm font-bold"
                >
                    <Plus className="w-4 h-4 mr-2" />
                    Agregar a la Factura
                </Button>
            </div>

            {/* Pending cart */}
            {pendingServices.length > 0 && (
                <>
                    <Separator />
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <h4 className="text-sm font-bold text-gray-700 uppercase tracking-wide flex items-center gap-1.5">
                                <ShoppingCart className="w-4 h-4 text-[#673AB7]" />
                                Por Cobrar
                            </h4>
                            <span className="text-xs font-bold text-[#673AB7] bg-[#673AB7]/10 px-2 py-0.5 rounded-full">
                                {pendingServices.length} {pendingServices.length === 1 ? "servicio" : "servicios"}
                            </span>
                        </div>

                        <div className="space-y-1.5 mb-3">
                            {pendingServices.map((svc) => (
                                <div
                                    key={svc.tempId}
                                    className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-lg px-3 py-2"
                                >
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-gray-800 truncate">{svc.description}</p>
                                    </div>
                                    <div className="flex items-center gap-3 ml-3">
                                        <span className="text-sm font-bold text-[#673AB7] whitespace-nowrap">
                                            C$ {formatNumber(svc.amount)}
                                        </span>
                                        <button
                                            onClick={() => handleRemovePending(svc.tempId)}
                                            className="text-red-400 hover:text-red-600 transition-colors"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Total + Cobrar button */}
                        <div className="bg-[#673AB7]/10 border border-[#673AB7]/20 rounded-lg px-3 py-2 flex justify-between items-center mb-3">
                            <span className="text-sm font-bold text-[#673AB7]">TOTAL A COBRAR:</span>
                            <span className="text-lg font-black text-[#673AB7]">
                                C$ {formatNumber(pendingTotal)}
                            </span>
                        </div>

                        <Button
                            onClick={() => { setPayStep("method"); setStep("payment"); }}
                            className="w-full bg-green-600 hover:bg-green-700 text-white h-12 text-base font-bold shadow-lg shadow-green-600/20"
                        >
                            <CreditCard className="w-5 h-5 mr-2" />
                            COBRAR SERVICIOS
                        </Button>
                    </div>
                </>
            )}

            {/* Session history */}
            {sessionServices.length > 0 && (
                <>
                    <Separator />
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wide">
                                Historial del turno
                            </h4>
                            <span className="text-xs font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                                {sessionServices.length} cobrados
                            </span>
                        </div>
                        <ScrollArea className="max-h-36">
                            <div className="space-y-1">
                                {isFetching ? (
                                    <div className="flex justify-center py-4">
                                        <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                                    </div>
                                ) : (
                                    sessionServices.map((service) => (
                                        <div
                                            key={service.id}
                                            className="flex items-center justify-between bg-gray-50 rounded px-3 py-1.5 border"
                                        >
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs font-semibold text-gray-700 truncate">{service.description}</p>
                                                <p className="text-[10px] text-gray-400">
                                                    {new Date(service.createdAt).toLocaleTimeString("es-NI", { hour: "2-digit", minute: "2-digit" })}
                                                </p>
                                            </div>
                                            <span className="text-xs font-bold text-green-600 ml-3 whitespace-nowrap flex items-center gap-1">
                                                <Check className="w-3 h-3" />
                                                C$ {formatNumber(service.amount)}
                                            </span>
                                        </div>
                                    ))
                                )}
                            </div>
                        </ScrollArea>
                        <div className="mt-2 flex justify-between items-center px-3 py-1.5 bg-gray-100 rounded text-xs font-bold text-gray-600">
                            <span>TOTAL TURNO:</span>
                            <span>C$ {formatNumber(sessionTotal)}</span>
                        </div>
                    </div>
                </>
            )}

            <DialogFooter>
                <Button variant="outline" onClick={onClose}>Cerrar</Button>
            </DialogFooter>
        </>
    );

    // ─── Render: PAYMENT ──────────────────────────────────────────────────────

    const renderPayment = () => {
        if (payStep === "method") {
            return (
                <div className="py-2 flex flex-col gap-3">
                    {/* Total banner */}
                    <div className="bg-[#673AB7] text-white rounded-xl p-4 flex justify-between items-center">
                        <span className="font-bold text-sm">TOTAL A PAGAR</span>
                        <span className="font-black text-2xl">C$ {formatNumber(pendingTotal)}</span>
                    </div>

                    <p className="text-sm font-semibold text-gray-600 text-center pt-1">Seleccione forma de pago</p>

                    <div className="grid grid-cols-2 gap-3">
                        {/* Efectivo */}
                        <button
                            onClick={() => {
                                if (!settings.allowDollars) { setCurrency("NIO"); setAmountInput(""); setPayStep("cash-entry"); }
                                else setPayStep("currency");
                            }}
                            className="h-28 bg-[#673AB7] hover:bg-[#5E35B1] text-white rounded-xl flex flex-col items-center justify-center gap-2 transition-all hover:scale-105 shadow-lg shadow-[#673AB7]/20 font-bold text-lg"
                        >
                            <span className="text-3xl">💵</span>
                            EFECTIVO
                        </button>

                        {/* Tarjeta */}
                        <button
                            onClick={() => handleInstantMethod("Tarjeta")}
                            disabled={isLoading}
                            className="h-28 bg-blue-600 hover:bg-blue-700 text-white rounded-xl flex flex-col items-center justify-center gap-2 transition-all hover:scale-105 shadow-lg shadow-blue-600/20 font-bold text-lg disabled:opacity-50"
                        >
                            <span className="text-3xl">💳</span>
                            TARJETA
                        </button>

                        {/* Transferencia */}
                        <button
                            onClick={() => handleInstantMethod("Transferencia")}
                            disabled={isLoading}
                            className="h-28 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl flex flex-col items-center justify-center gap-2 transition-all hover:scale-105 shadow-lg shadow-emerald-600/20 font-bold text-lg disabled:opacity-50"
                        >
                            <span className="text-3xl">📲</span>
                            TRANSFERENCIA
                        </button>

                        {/* Volver */}
                        <button
                            onClick={() => setStep("form")}
                            className="h-28 bg-red-500 hover:bg-red-600 text-white rounded-xl flex flex-col items-center justify-center gap-2 transition-all hover:scale-105 font-bold text-lg"
                        >
                            <ArrowLeft className="w-8 h-8" />
                            VOLVER
                        </button>
                    </div>

                    {isLoading && (
                        <div className="flex justify-center py-2">
                            <Loader2 className="w-6 h-6 animate-spin text-[#673AB7]" />
                        </div>
                    )}
                </div>
            );
        }

        if (payStep === "currency") {
            return (
                <div className="py-2 flex flex-col gap-4 items-center">
                    <div className="bg-[#673AB7] text-white rounded-xl p-4 flex justify-between items-center w-full">
                        <span className="font-bold text-sm">TOTAL A PAGAR</span>
                        <span className="font-black text-2xl">C$ {formatNumber(pendingTotal)}</span>
                    </div>
                    <p className="text-sm font-semibold text-gray-600">Seleccione la moneda</p>
                    <button
                        onClick={() => { setCurrency("NIO"); setAmountInput(""); setPayStep("cash-entry"); }}
                        className="w-full h-20 bg-sky-500 hover:bg-sky-600 text-white rounded-xl font-bold text-2xl transition-all hover:scale-105"
                    >
                        C$ Córdobas
                    </button>
                    <button
                        onClick={() => { setCurrency("USD"); setAmountInput(""); setPayStep("cash-entry"); }}
                        className="w-full h-20 bg-sky-500 hover:bg-sky-600 text-white rounded-xl font-bold text-2xl transition-all hover:scale-105"
                    >
                        $ Dólares
                        <span className="block text-sm opacity-80">Cambio: C$ {settings.exchangeRate}</span>
                    </button>
                    <Button variant="outline" onClick={() => setPayStep("method")}>
                        <ArrowLeft className="w-4 h-4 mr-2" />Volver
                    </Button>
                </div>
            );
        }

        // cash-entry
        const symbol = currency === "USD" ? "$" : "C$";
        const label = currency === "USD" ? "DÓLARES" : "CÓRDOBAS";
        const totalDisplay = currency === "USD"
            ? `$ ${formatNumber(pendingTotal / exchangeRate)}`
            : `C$ ${formatNumber(pendingTotal)}`;

        return (
            <div className="py-1 flex flex-col gap-2">
                {/* Header */}
                <div className="bg-[#673AB7] text-white rounded-xl px-4 py-2 flex justify-between items-center">
                    <span className="font-bold text-sm">EFECTIVO — {label}</span>
                    <span className="font-black text-xl">
                        {amountInput ? `${symbol} ${formatNumber(parseFloat(amountInput))}` : `${symbol} 0.00`}
                    </span>
                </div>

                {/* Entry info */}
                <div className="text-center text-xs text-gray-500">
                    Total a pagar: <span className="font-bold text-gray-800">{totalDisplay}</span>
                </div>

                {/* Numpad */}
                <div className="grid grid-cols-4 gap-2" style={{ gridTemplateRows: "repeat(4, 3rem)" }}>
                    {/* col 1 */}
                    <button onClick={() => setPayStep("currency")} className="bg-red-500 hover:bg-red-600 text-white rounded-lg font-bold flex items-center justify-center transition-all">
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    {[1, 4, 7].map(n => (
                        <button key={n} onClick={() => handleNumpadInput(n.toString())} className="bg-sky-500 hover:bg-sky-600 text-white rounded-lg font-bold text-xl flex items-center justify-center transition-all">{n}</button>
                    ))}

                    {/* col 2 */}
                    <button onClick={handleExactPay} className="bg-green-500 hover:bg-green-600 text-white rounded-lg font-bold text-xs leading-tight flex items-center justify-center text-center transition-all px-1">
                        PAGO EXACTO
                    </button>
                    {[2, 5, 8].map(n => (
                        <button key={n} onClick={() => handleNumpadInput(n.toString())} className="bg-sky-500 hover:bg-sky-600 text-white rounded-lg font-bold text-xl flex items-center justify-center transition-all">{n}</button>
                    ))}

                    {/* col 3 */}
                    <button onClick={() => setAmountInput("")} className="bg-red-400 hover:bg-red-500 text-white rounded-lg font-bold text-sm flex items-center justify-center transition-all">
                        BORRAR
                    </button>
                    {[3, 6, 9].map(n => (
                        <button key={n} onClick={() => handleNumpadInput(n.toString())} className="bg-sky-500 hover:bg-sky-600 text-white rounded-lg font-bold text-xl flex items-center justify-center transition-all">{n}</button>
                    ))}

                    {/* col 4 */}
                    <button onClick={handleTotalizar} disabled={isLoading} className="row-span-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold text-lg flex items-center justify-center transition-all disabled:opacity-50">
                        {isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : "OK"}
                    </button>
                    {currency === "NIO" ? (
                        <>
                            <button onClick={() => handleDenomination(10)} className="bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-bold text-sm flex items-center justify-center transition-all">C$ 10</button>
                            <button onClick={() => handleDenomination(50)} className="bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-bold text-sm flex items-center justify-center transition-all">C$ 50</button>
                            <button onClick={() => handleDenomination(100)} className="bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-bold text-sm flex items-center justify-center transition-all">C$ 100</button>
                        </>
                    ) : (
                        <>
                            <button onClick={() => handleDenomination(1)} className="bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-bold text-sm flex items-center justify-center transition-all">$ 1</button>
                            <button onClick={() => handleDenomination(5)} className="bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-bold text-sm flex items-center justify-center transition-all">$ 5</button>
                            <button onClick={() => handleDenomination(20)} className="bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-bold text-sm flex items-center justify-center transition-all">$ 20</button>
                        </>
                    )}
                </div>

                {/* Bottom row */}
                <div className="grid grid-cols-4 gap-2 h-12">
                    <button onClick={() => handleNumpadInput(".")} className="col-span-1 bg-sky-500 hover:bg-sky-600 text-white rounded-lg font-bold text-xl flex items-center justify-center transition-all">.</button>
                    <button onClick={() => handleNumpadInput("0")} className="col-span-1 bg-sky-500 hover:bg-sky-600 text-white rounded-lg font-bold text-xl flex items-center justify-center transition-all">0</button>
                    <button onClick={handleTotalizar} disabled={isLoading} className="col-span-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold text-lg flex items-center justify-center transition-all disabled:opacity-50">
                        {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "TOTALIZAR"}
                    </button>
                </div>
            </div>
        );
    };

    // ─── Render: RECEIPT ──────────────────────────────────────────────────────

    const renderReceipt = () => {
        if (!receiptData) return null;
        return (
            <div className="flex flex-col gap-4">
                {/* Success banner */}
                <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                        <Check className="w-7 h-7 text-green-600" />
                    </div>
                    <p className="font-bold text-green-800 text-lg">¡Pago Registrado!</p>
                    <p className="text-green-600 text-sm">
                        Total cobrado: <strong>C$ {formatNumber(receiptData.total)}</strong>
                    </p>
                    {receiptData.change > 0 && (
                        <p className="text-sm text-green-600">
                            Cambio: <strong>C$ {formatNumber(receiptData.change)}</strong>
                        </p>
                    )}
                </div>

                {/* Receipt preview */}
                <div className="border rounded-xl overflow-hidden">
                    <div className="bg-gray-50 px-4 py-2 text-xs font-bold text-gray-500 uppercase tracking-wider">
                        Vista Previa del Comprobante
                    </div>
                    <div className="p-4 max-h-64 overflow-y-auto">
                        <ReceiptTemplate {...receiptData} previewMode />
                    </div>
                </div>

                {/* Buttons */}
                <div className="flex gap-3">
                    <Button
                        onClick={() => {
                            setTimeout(() => { window.print(); }, 100);
                        }}
                        className="flex-1 bg-[#673AB7] hover:bg-[#5E35B1] text-white h-12 font-bold"
                    >
                        <Printer className="w-5 h-5 mr-2" />
                        Imprimir Baucher
                    </Button>
                    <Button
                        variant="outline"
                        onClick={() => { setStep("form"); setReceiptData(null); }}
                        className="flex-1 h-12 font-bold"
                    >
                        Nuevo Servicio
                    </Button>
                </div>

                {/* Hidden print template */}
                <ReceiptTemplate {...receiptData} />
            </div>
        );
    };

    // ─── Title per step ───────────────────────────────────────────────────────

    const titles: Record<Step, string> = {
        form: "Registrar Servicio de Joyería",
        payment: "Cobrar Servicios",
        receipt: "Comprobante de Servicio",
    };

    // ─── Main render ──────────────────────────────────────────────────────────

    return (
        <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-[#673AB7]">
                        <div className="bg-[#673AB7] p-1.5 rounded-lg">
                            {step === "receipt" ? (
                                <Check className="w-4 h-4 text-white" />
                            ) : step === "payment" ? (
                                <CreditCard className="w-4 h-4 text-white" />
                            ) : (
                                <Wrench className="w-4 h-4 text-white" />
                            )}
                        </div>
                        {titles[step]}
                    </DialogTitle>
                </DialogHeader>

                {step === "form" && renderForm()}
                {step === "payment" && renderPayment()}
                {step === "receipt" && renderReceipt()}
            </DialogContent>
        </Dialog>
    );
}
