"use client";

import React, { useState, useMemo } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { sellJewelryPiece } from "@/lib/actions/jewelry-sales";
import { searchOrCreateCustomer } from "@/lib/actions/customers";
import { ShoppingCart, User, Gem, DollarSign, Loader2, Search, Hash, Scale, CheckCircle2, Coins, AlertTriangle } from "lucide-react";
import { useSettings } from "@/hooks/use-settings";
import Image from '@/components/ui/image';
import { ReceiptTemplate } from "@/components/pos/receipt-template";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useCashRegister } from "@/hooks/use-cash-register";
import { Alert, AlertDescription } from "@/components/ui/alert";
import Link from '@/lib/router-nav';
import { formatNumber, formatTicketNumber } from "@/lib/utils";

interface JewelryPiece {
    id: string;
    code?: string | null;
    name: string;
    weight: number;
    karat: number;
    calculatedPrice: number;
    photoUrl?: string | null;
}

export function JewelrySalesForm({ availablePieces }: { availablePieces: JewelryPiece[] }) {
    const { user } = useAuth();
    const { settings } = useSettings();
    const { toast } = useToast();
    const { isCashRegisterOpen, activeSession, refreshSessions } = useCashRegister();
    const cashRegisterReady = isCashRegisterOpen;
    const [loading, setLoading] = useState(false);
    const [lastSaleReceipt, setLastSaleReceipt] = useState<any>(null);

    // Form State
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedPieceId, setSelectedPieceId] = useState<string>("");
    const [customerName, setCustomerName] = useState("");
    const [customerPhone, setCustomerPhone] = useState("");
    const [salePrice, setSalePrice] = useState<number>(0);
    const [paymentMethod, setPaymentMethod] = useState("Efectivo");
    const [paymentCurrency, setPaymentCurrency] = useState<"USD" | "NIO">("USD");
    const [amountReceived, setAmountReceived] = useState<number>(0);

    const exchangeRate = parseFloat(settings.exchangeRate || "36.5");

    const selectedPiece = availablePieces.find((p) => p.id === selectedPieceId);

    // Filter pieces based on search term
    const filteredPieces = useMemo(() => {
        if (!searchTerm) return availablePieces;
        const lowerSearch = searchTerm.toLowerCase();
        return availablePieces.filter((piece) => {
            const pieceCode = piece.code ?? piece.id.slice(-8);
            return (
                piece.name.toLowerCase().includes(lowerSearch) ||
                pieceCode.toLowerCase().includes(lowerSearch) ||
                piece.karat.toString().includes(lowerSearch) ||
                piece.weight.toString().includes(lowerSearch)
            );
        });
    }, [availablePieces, searchTerm]);

    const handlePieceSelection = (piece: JewelryPiece) => {
        setSelectedPieceId(piece.id);
        setSalePrice(piece.calculatedPrice);
    };

    const handleSale = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !selectedPiece) return;

        if (!cashRegisterReady && !activeSession) {
            toast({ title: "Caja Cerrada", description: "Debe abrir una sesión de caja antes de realizar ventas.", variant: "destructive" });
            return;
        }

        setLoading(true);
        try {
            // 1. Resolve Customer
            const customer = await searchOrCreateCustomer(customerName, undefined, customerPhone);

            // 2. Process Sale
            const result = await sellJewelryPiece({
                userId: user.id,
                pieceId: selectedPiece.id,
                customerId: customer.id,
                salePrice,
                paymentMethod: paymentMethod === "Efectivo"
                    ? `Efectivo ${paymentCurrency === "USD" ? "$" : "C$"}`
                    : paymentMethod,
                sessionId: activeSession?.id ?? '',
            });

            if (result.success) {
                const soldPiece = result.data as any;

                const isNio = paymentCurrency === "NIO";
                const displayPrice = isNio ? salePrice * exchangeRate : salePrice;
                const displayAmountReceived = amountReceived; // User enters in the selected currency
                const displayChange = displayAmountReceived - displayPrice;
                const currencySymbol = isNio ? "C$" : "$";

                const receiptData = {
                    pharmacyName: settings.ticketHeader.name,
                    address: settings.ticketHeader.address,
                    phone: settings.ticketHeader.phone,
                    rfc: settings.ticketHeader.rfc,
                    ticketId: result.invoiceNumber ? formatTicketNumber(result.invoiceNumber) : `T-${Date.now().toString().slice(-6)}`,
                    date: new Date(),
                    cashierName: user.name || 'Vendedor',
                    items: [{
                        quantity: 1,
                        description: `Joya: ${selectedPiece.name} (${selectedPiece.karat}K)`,
                        price: displayPrice,
                        total: displayPrice,
                    }],
                    subtotal: displayPrice,
                    tax: 0,
                    total: displayPrice,
                    paymentMethod: paymentMethod === "Efectivo"
                        ? `Efectivo ${isNio ? "C$" : "$"}`
                        : paymentMethod,
                    amountPaid: displayAmountReceived,
                    change: displayChange > 0 ? displayChange : 0,
                    footerMessage: settings.ticketFooter.message,
                    website: settings.ticketFooter.website,
                    logoSvg: settings.logoSvg,
                    currencySymbol: currencySymbol
                };

                setLastSaleReceipt(receiptData);

                toast({ title: "Venta Exitosa", description: `La pieza ${selectedPiece.name} ha sido vendida.` });

                // Refresh session data to reflect new totals in closure
                refreshSessions();

                setSelectedPieceId("");
                setSearchTerm("");
                setCustomerName("");
                setCustomerPhone("");
                setSalePrice(0);
                setAmountReceived(0);
            } else {
                toast({ title: "Error", description: result.error, variant: "destructive" });
            }
        } catch {
            toast({ title: "Error", description: "Error al procesar la venta.", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card className="max-w-4xl mx-auto border-t-4 border-t-[#8BC34A] shadow-lg">
            <CardHeader className="bg-gray-50/50 border-b">
                <CardTitle className="flex items-center gap-2 text-2xl">
                    <ShoppingCart className="text-[#8BC34A] w-6 h-6" />
                    Punto de Venta Joyería
                </CardTitle>
                <CardDescription>Escoja una pieza del inventario y asigne un cliente para completar la venta.</CardDescription>
            </CardHeader>
            {!isCashRegisterOpen && (
                <div className="m-4 p-6 border-2 border-yellow-400 bg-yellow-50 rounded-xl flex flex-col items-center gap-4 text-center shadow-inner">
                    <AlertTriangle className="h-12 w-12 text-yellow-600 animate-bounce" />
                    <div className="space-y-1">
                        <h3 className="text-lg font-bold text-yellow-800">Caja Cerrada</h3>
                        <p className="text-yellow-700 max-w-md">
                            No hay una sesión de caja abierta. Debe abrir la caja para poder registrar ventas y que estas aparezcan en el cierre del día.
                        </p>
                    </div>
                    <Button asChild className="bg-[#8BC34A] hover:bg-[#7CB342] text-white font-bold px-8 shadow-md">
                        <Link href="/cash-register/open">Abrir Caja Ahora</Link>
                    </Button>
                </div>
            )}
            <CardContent className="pt-6">
                <form onSubmit={handleSale} className="space-y-8">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">

                        {/* LEFT COLUMN: PIECE SELECTION */}
                        <div className="space-y-5">
                            <div className="flex items-center gap-2 pb-2 border-b">
                                <span className="bg-[#673AB7] text-white p-1 rounded">
                                    <Gem className="w-4 h-4" />
                                </span>
                                <h3 className="font-bold text-sm text-gray-700 uppercase tracking-wider">
                                    Selección de Pieza
                                </h3>
                            </div>

                            {/* Search Filter */}
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                                <Input
                                    placeholder="🔍 Buscar por nombre, código o peso..."
                                    className="pl-10 h-11 border-[#673AB7]/30 focus-visible:ring-[#673AB7]"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>

                            {/* Results List */}
                            <Card className="border shadow-none">
                                <ScrollArea className="h-[260px]">
                                    {filteredPieces.length === 0 ? (
                                        <div className="p-8 text-center text-muted-foreground">
                                            <Gem className="w-8 h-8 opacity-20 mx-auto mb-2" />
                                            <p className="text-sm">No se encontraron piezas.</p>
                                        </div>
                                    ) : (
                                        <div className="p-1">
                                            {filteredPieces.map((piece) => {
                                                const isSelected = selectedPieceId === piece.id;
                                                const displayCode = piece.code ?? piece.id.slice(-8).toUpperCase();

                                                return (
                                                    <button
                                                        key={piece.id}
                                                        type="button"
                                                        onClick={() => handlePieceSelection(piece)}
                                                        className={`w-full text-left p-3 mb-1 rounded-md transition-all flex items-center justify-between border ${isSelected
                                                            ? "bg-[#673AB7]/10 border-[#673AB7] shadow-sm"
                                                            : "bg-white border-transparent hover:border-gray-200 hover:bg-gray-50"
                                                            }`}
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            {/* Thumbnail */}
                                                            <div className="w-10 h-10 rounded bg-gray-100 flex-shrink-0 relative overflow-hidden flex items-center justify-center border">
                                                                {piece.photoUrl ? (
                                                                    <Image src={piece.photoUrl} alt="" fill unoptimized={piece.photoUrl.startsWith("data:")} className="object-cover" />
                                                                ) : (
                                                                    <Gem className="w-5 h-5 text-gray-300" />
                                                                )}
                                                            </div>
                                                            {/* Info */}
                                                            <div>
                                                                <p className="font-semibold text-sm leading-tight text-gray-900">
                                                                    {piece.name}
                                                                </p>
                                                                <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                                                                    <span className="flex items-center text-[#673AB7] font-mono">
                                                                        <Hash className="w-3 h-3" />{displayCode}
                                                                    </span>
                                                                    <span>•</span>
                                                                    <span>{piece.karat}K</span>
                                                                    <span>•</span>
                                                                    <span>{piece.weight}g</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        {/* Price & Selection Indicator */}
                                                        <div className="flex flex-col items-end gap-1">
                                                            <span className="font-bold text-sm text-[#8BC34A]">
                                                                C$ {formatNumber(piece.calculatedPrice * exchangeRate)}
                                                            </span>
                                                            {isSelected && <CheckCircle2 className="w-4 h-4 text-[#673AB7]" />}
                                                        </div>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )}
                                </ScrollArea>
                            </Card>

                            {/* Selected Piece Preview */}
                            {selectedPiece && (
                                <div className="bg-purple-50 rounded-xl p-4 border border-purple-100 flex gap-4 animate-in fade-in slide-in-from-bottom-2">
                                    <div className="w-24 h-24 rounded-lg bg-white relative overflow-hidden border shadow-sm flex-shrink-0 flex items-center justify-center">
                                        {selectedPiece.photoUrl ? (
                                            <Image src={selectedPiece.photoUrl} alt="Joyas" fill unoptimized={selectedPiece.photoUrl.startsWith("data:")} className="object-cover" />
                                        ) : (
                                            <Gem className="w-8 h-8 text-gray-200" />
                                        )}
                                    </div>
                                    <div className="flex-1 space-y-1 py-1">
                                        <h4 className="font-bold text-gray-900">{selectedPiece.name}</h4>
                                        <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-sm mt-2">
                                            <span className="text-muted-foreground flex items-center gap-1"><Hash className="w-3 h-3" /> {selectedPiece.code ?? selectedPiece.id.slice(-8).toUpperCase()}</span>
                                            <span className="text-muted-foreground flex items-center gap-1"><Scale className="w-3 h-3" /> {selectedPiece.weight}g</span>
                                            <span className="font-medium text-[#673AB7]">{selectedPiece.karat} Quilates</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* RIGHT COLUMN: CHECKOUT */}
                        <div className="space-y-6">
                            <div className="flex items-center gap-2 pb-2 border-b">
                                <span className="bg-[#2196F3] text-white p-1 rounded">
                                    <User className="w-4 h-4" />
                                </span>
                                <h3 className="font-bold text-sm text-gray-700 uppercase tracking-wider">
                                    Datos de Facturación
                                </h3>
                            </div>

                            <div className="bg-gray-50/50 p-5 rounded-xl border space-y-5">
                                <div className="space-y-2">
                                    <Label htmlFor="customerName" className="font-semibold text-gray-700">Client Name</Label>
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                                        <Input
                                            id="customerName"
                                            placeholder="Buscar o crear cliente"
                                            className="pl-10 bg-white"
                                            value={customerName}
                                            onChange={(e) => setCustomerName(e.target.value)}
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="customerPhone" className="font-semibold text-gray-700">Phone</Label>
                                    <Input
                                        id="customerPhone"
                                        placeholder="Número de contacto (opcional)"
                                        className="bg-white"
                                        value={customerPhone}
                                        onChange={(e) => setCustomerPhone(e.target.value)}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Select onValueChange={setPaymentMethod} value={paymentMethod}>
                                        <SelectTrigger className="bg-white">
                                            <SelectValue placeholder="Seleccione método" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Efectivo">💵 Efectivo</SelectItem>
                                            <SelectItem value="Tarjeta">💳 Tarjeta</SelectItem>
                                            <SelectItem value="Transferencia">🏦 Transferencia</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                {paymentMethod === "Efectivo" && (
                                    <div className="space-y-2 animate-in fade-in slide-in-from-top-1">
                                        <Label className="text-xs font-bold text-gray-500 uppercase">Moneda de Pago</Label>
                                        <div className="flex p-1 bg-white border rounded-lg gap-1">
                                            <Button
                                                type="button"
                                                variant={paymentCurrency === "USD" ? "default" : "ghost"}
                                                size="sm"
                                                className={`flex-1 h-8 ${paymentCurrency === "USD" ? "bg-[#8BC34A] hover:bg-[#7CB342]" : ""}`}
                                                onClick={() => setPaymentCurrency("USD")}
                                            >
                                                <DollarSign className="w-3 h-3 mr-1" /> USD ($)
                                            </Button>
                                            <Button
                                                type="button"
                                                variant={paymentCurrency === "NIO" ? "default" : "ghost"}
                                                size="sm"
                                                className={`flex-1 h-8 ${paymentCurrency === "NIO" ? "bg-[#8BC34A] hover:bg-[#7CB342]" : ""}`}
                                                onClick={() => setPaymentCurrency("NIO")}
                                            >
                                                <Coins className="w-3 h-3 mr-1" /> NIO (C$)
                                            </Button>
                                        </div>
                                    </div>
                                )}

                                <div className="pt-4 mt-2 border-t">
                                    <div className="flex justify-between items-end">
                                        <Label htmlFor="salePrice" className="text-muted-foreground uppercase text-xs font-bold tracking-wider">
                                            Precio Final de Venta (USD)
                                        </Label>
                                        {paymentCurrency === "NIO" && (
                                            <span className="text-[10px] font-bold text-[#8BC34A] uppercase bg-[#8BC34A]/10 px-2 py-0.5 rounded-full mb-1">
                                                Tasa: {exchangeRate}
                                            </span>
                                        )}
                                    </div>
                                    <div className="relative mt-2 shadow-sm rounded-md">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                            <span className="text-[#8BC34A] text-2xl font-black">$</span>
                                        </div>
                                        <Input
                                            id="salePrice"
                                            type="number"
                                            step="0.01"
                                            className="pl-9 h-16 text-3xl font-black bg-white border-2 focus-visible:ring-[#8BC34A] border-[#8BC34A]/30 text-right pr-4 rounded-xl"
                                            value={salePrice || ""}
                                            onChange={(e) => setSalePrice(Number(e.target.value))}
                                            required
                                        />
                                    </div>
                                    {paymentCurrency === "NIO" && (
                                        <div className="mt-3 p-3 bg-white border-2 border-dashed border-[#8BC34A]/30 rounded-xl flex justify-between items-center animate-in slide-in-from-top-2">
                                            <span className="text-sm font-bold text-gray-500">Monto en Córdobas:</span>
                                            <span className="text-2xl font-black text-[#8BC34A]">
                                                C$ {formatNumber(salePrice * exchangeRate)}
                                            </span>
                                        </div>
                                    )}

                                    {/* Payment Section */}
                                    <div className="pt-4 mt-4 border-t space-y-4">
                                        <div className="space-y-2">
                                            <div className="flex justify-between items-center">
                                                <Label htmlFor="amountReceived" className="text-xs font-bold text-gray-500 uppercase">Monto Recibido ({paymentCurrency === "USD" ? "$" : "C$"})</Label>
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    className="h-6 px-2 text-[10px] font-bold border-[#8BC34A] text-[#8BC34A] hover:bg-[#8BC34A] hover:text-white"
                                                    onClick={() => {
                                                        const exactAmount = paymentCurrency === "NIO" ? salePrice * exchangeRate : salePrice;
                                                        setAmountReceived(Number(exactAmount.toFixed(2)));
                                                    }}
                                                >
                                                    PAGO EXACTO
                                                </Button>
                                            </div>
                                            <Input
                                                id="amountReceived"
                                                type="number"
                                                step="0.01"
                                                placeholder="0.00"
                                                className="h-12 text-xl font-bold bg-white"
                                                value={amountReceived || ""}
                                                onChange={(e) => setAmountReceived(Number(e.target.value))}
                                            />
                                        </div>

                                        {(amountReceived > 0) && (
                                            <div className="p-4 bg-[#8BC34A]/10 rounded-xl flex justify-between items-center border border-[#8BC34A]/20 transition-all animate-in fade-in zoom-in-95">
                                                <div>
                                                    <p className="text-xs font-bold text-gray-500 uppercase tracking-tight">Cambio a Entregar</p>
                                                    <p className={`text-2xl font-black ${(amountReceived - (paymentCurrency === "NIO" ? salePrice * exchangeRate : salePrice)) >= 0 ? "text-[#4CAF50]" : "text-red-500"}`}>
                                                        {paymentCurrency === "NIO" ? "C$" : "$"} {formatNumber(Math.max(0, amountReceived - (paymentCurrency === "NIO" ? salePrice * exchangeRate : salePrice)))}
                                                    </p>
                                                </div>
                                                {(amountReceived - (paymentCurrency === "NIO" ? salePrice * exchangeRate : salePrice)) < 0 && (
                                                    <p className="text-[10px] bg-red-100 text-red-600 px-2 py-1 rounded-full font-bold uppercase animate-pulse">
                                                        Pago Insuficiente
                                                    </p>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <Button
                                type="submit"
                                disabled={loading || !selectedPieceId || !customerName || !cashRegisterReady}
                                className="w-full bg-[#8BC34A] hover:bg-[#7CB342] h-14 text-lg font-black shadow-lg uppercase transition-all hover:shadow-xl active:scale-[0.98]"
                            >
                                {loading ? <Loader2 className="animate-spin mr-2" /> : <ShoppingCart className="mr-2 w-5 h-5" />}
                                {loading ? "Procesando Venta..." : "Completar Venta"}
                            </Button>
                        </div>
                    </div>
                </form>
            </CardContent>

            {/* Hidden ReceiptTemplate for actual printing */}
            {lastSaleReceipt && <ReceiptTemplate {...lastSaleReceipt} />}

            <Dialog open={!!lastSaleReceipt} onOpenChange={(open: boolean) => { if (!open) setLastSaleReceipt(null); }}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Vista Previa de Venta</DialogTitle>
                    </DialogHeader>
                    <div className="flex justify-center p-4 max-h-[60vh] overflow-y-auto">
                        {lastSaleReceipt && <ReceiptTemplate {...lastSaleReceipt} previewMode />}
                    </div>
                    <DialogFooter>
                        <Button onClick={() => {
                            setTimeout(() => {
                                window.print();
                                setLastSaleReceipt(null);
                            }, 100);
                        }}>Imprimir Ticket</Button>
                        <Button variant="outline" onClick={() => setLastSaleReceipt(null)}>Cerrar</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Card>
    );
}
