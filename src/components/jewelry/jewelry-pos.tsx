"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useCashRegister } from "@/hooks/use-cash-register";
import { useCashRegisterSessions } from "@/hooks/use-cash-register-sessions";
import { useToast } from "@/hooks/use-toast";
import { useSettings } from "@/hooks/use-settings";
import { useBusinessMode } from "@/hooks/use-business-mode";
import { searchOrCreateCustomer } from "@/lib/actions/customers";
import { sellMultipleJewelryPieces } from "@/lib/actions/jewelry-sales";
import type { CartItem, Product } from "@/lib/types";

// Components
import { CartTicket } from "@/components/pos/cart-ticket";
import { PaymentGrid } from "@/components/pos/payment-grid";
import { PaymentSummaryDialog } from "@/components/pos/payment-summary-dialog";
import { AssignClientDialog } from "@/components/pos/assign-client-dialog";
import { ReceiptTemplate } from "@/components/pos/receipt-template";
import { ServiceRegistrationDialog } from "@/components/jewelry/service-registration-dialog";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Trash2, UserPlus, CreditCard, Gem, CheckCircle2, ChevronRight, Home, Search, AlertTriangle, X, Wrench } from "lucide-react";
import Image from '@/components/ui/image';
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

interface JewelryPOSProps {
    availablePieces: JewelryPiece[];
}

// Convert JewelryPiece to a minimal Product format for CartTicket
const pieceToProduct = (p: JewelryPiece, exchangeRate: number): Product => {
    const product: any = {
        id: p.id,
        name: `${p.name} - ${p.karat}k - ${p.weight}g`,
        barcode: p.code || p.id.slice(-6),
        priceNIO: p.calculatedPrice * exchangeRate, // Convert USD calculated price to NIO for CartTicket
        categoryId: 'jewelry',
        category: 'Joyería',
        supplierId: 'none',
        supplier: 'none',
        createdAt: new Date(),
        updatedAt: new Date(),
        stockWarningThreshold: 0,
        unitOfMeasure: 'unit',
        description: '',
        priceUSD: p.calculatedPrice, // Store USD price cleanly
    };
    return product as Product;
};

export function JewelryPOS({ availablePieces }: JewelryPOSProps) {
    const { user } = useAuth();
    const { mode } = useBusinessMode();
    const { isCashRegisterOpen, activeSession, refreshSessions } = useCashRegister();
    const { toast } = useToast();
    const { settings } = useSettings();

    const [cart, setCart] = useState<CartItem[]>([]);
    const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<'products' | 'payment'>('products');
    const [isPaymentSummaryOpen, setIsPaymentSummaryOpen] = useState(false);
    const [paymentData, setPaymentData] = useState<{ paid: number, change: number, method: string } | null>(null);
    
    const [isAssignClientOpen, setIsAssignClientOpen] = useState(false);
    const [isServiceDialogOpen, setIsServiceDialogOpen] = useState(false);
    const [customerName, setCustomerName] = useState('');
    const [lastSaleReceipt, setLastSaleReceipt] = useState<any>(null);

    const [searchTerm, setSearchTerm] = useState('');

    const exchangeRate = parseFloat(settings.exchangeRate || "36.5");

    // Filter pieces
    const filteredPieces = useMemo(() => {
        if (!searchTerm) return availablePieces;
        const lowerTerm = searchTerm.toLowerCase();
        return availablePieces.filter(p => 
            p.name.toLowerCase().includes(lowerTerm) || 
            (p.code && p.code.toLowerCase().includes(lowerTerm)) ||
            p.id.toLowerCase().includes(lowerTerm)
        );
    }, [availablePieces, searchTerm]);

    const addToCart = (piece: JewelryPiece) => {
        // Only allow 1 of each piece since they are unique
        if (cart.find(item => item.id === piece.id)) {
            toast({ title: 'Pieza ya agregada', description: 'Esta pieza ya se encuentra en el carrito.', variant: 'default' });
            return;
        }

        const product = pieceToProduct(piece, exchangeRate);
        setCart(prev => [...prev, { id: piece.id, product, quantity: 1 }]);
    };

    const removeFromCart = (pieceId: string) => {
        setCart(prev => prev.filter(item => item.id !== pieceId));
    };

    const cartSubtotal = useMemo(() => cart.reduce((total, item) => total + item.product.priceNIO * item.quantity, 0), [cart]);
    const cartTotal = cartSubtotal; // Assuming IVA is not applied by default in joyeria, or already included

    const handleClearCart = () => {
        if (cart.length > 0 && confirm('¿Está seguro de limpiar el carrito?')) {
            setCart([]);
            setCustomerName('');
        }
    };

    const handlePayment = () => {
        if (cart.length === 0) {
            toast({ title: 'Carrito Vacío', description: 'Agregue joyas antes de cobrar.', variant: 'destructive' });
            return;
        }
        if (!customerName.trim() || customerName === 'Cliente General') {
            setIsAssignClientOpen(true);
            toast({ title: 'Cliente Requerido', description: 'Por favor asigne un nombre de cliente real para esta venta.', variant: 'destructive' });
            return;
        }
        setViewMode('payment');
    };

    const handlePrePaymentComplete = (amountPaid: number, change: number, method: string) => {
        setPaymentData({ paid: amountPaid, change, method });
        setIsPaymentSummaryOpen(true);
    };

    const confirmPayment = async () => {
        if (!paymentData) return;
        await handleSuccessfulPayment(paymentData.paid, paymentData.change, paymentData.method);
    };

    const handleSuccessfulPayment = async (amountPaid: number, change: number, paymentMethod: string) => {
        if (!user || !activeSession) return;
        
        let customerId: string | undefined = undefined;
        try {
            const customer = await searchOrCreateCustomer(customerName.trim());
            customerId = customer.id;
        } catch (e) {
            toast({ title: 'Error', description: 'No se pudo crear/validar el cliente en la BD', variant: 'destructive' });
            return;
        }

        // Map cart items back to format expected by backend (price in USD usually for jewelry)
        const cartItemsData = cart.map(item => ({
            pieceId: item.id,
            salePrice: (item.product as any).priceUSD // USD price
        }));

        const totalUSD = cartItemsData.reduce((acc, curr) => acc + curr.salePrice, 0);

        const result = await sellMultipleJewelryPieces({
            userId: user.id,
            cartItems: cartItemsData,
            customerId: customerId,
            totalSalePrice: totalUSD,
            paymentMethod: paymentMethod,
            sessionId: activeSession.id
        });

        if (!result.success) {
            toast({ title: 'Error', description: result.error, variant: 'destructive' });
            return;
        }

        // Prepare receipt
        const ticketLabel = result.invoiceNumber ? `Factura ${formatTicketNumber(result.invoiceNumber)}` : undefined;
        const receiptData = {
            pharmacyName: settings.ticketHeader.name,
            address: settings.ticketHeader.address,
            phone: settings.ticketHeader.phone,
            rfc: settings.ticketHeader.rfc,
            ticketId: ticketLabel || `T-${Date.now().toString().slice(-6)}`,
            date: new Date(),
            cashierName: user?.name || 'Cajero',
            items: cart.map(item => ({
                quantity: item.quantity,
                description: item.product.name,
                price: item.product.priceNIO,
                total: item.product.priceNIO * item.quantity
            })),
            subtotal: cartSubtotal,
            tax: 0,
            total: cartTotal,
            paymentMethod,
            amountPaid,
            change,
            footerMessage: settings.ticketFooter.message,
            website: settings.ticketFooter.website,
            logoSvg: settings.logoSvg
        };
        setLastSaleReceipt(receiptData);

        setCart([]);
        setViewMode('products');
        setPaymentData(null);
        setIsPaymentSummaryOpen(false);
        refreshSessions();
        toast({ title: 'Venta Completada', description: 'Las joyas han sido registradas exitosamente.' });
    };

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyPress = (e: KeyboardEvent) => {
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
            switch (e.key) {
                case 'F1':
                    e.preventDefault();
                    if (viewMode === 'products') handlePayment();
                    break;
                case 'Delete':
                    e.preventDefault();
                    handleClearCart();
                    break;
            }
        };
        window.addEventListener('keydown', handleKeyPress);
        return () => window.removeEventListener('keydown', handleKeyPress);
    }, [handlePayment, handleClearCart, viewMode]);

    if (!isCashRegisterOpen) {
        return (
            <div className="flex flex-col items-center justify-center p-12 bg-gray-50 h-full border rounded-xl m-6">
                <AlertTriangle className="h-16 w-16 text-yellow-600 mb-4 animate-bounce" />
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Caja Cerrada</h2>
                <p className="text-gray-500 mb-6 max-w-md text-center">Debe aperturar la sesión de caja antes de realizar transacciones en el Punto de Venta.</p>
                <Button asChild className="bg-[#8BC34A] hover:bg-[#7CB342] text-white">
                    <Link href="/cash-register/open">Abrir Caja Ahora</Link>
                </Button>
            </div>
        );
    }

    return (
        <div className="flex h-full bg-gray-100">
            {/* LEFT PANEL: CART */}
            <div className="w-[30%] h-full flex flex-col border-r border-gray-200 bg-white">
                <div className="bg-white p-3 border-b flex justify-between items-center h-14 shrink-0">
                    <div className="flex items-center gap-3">
                        <SidebarTrigger className="h-8 w-8" />
                        <span className="font-bold text-xl">POS Joyería</span>
                    </div>
                </div>

                <div className="flex-1 overflow-hidden flex flex-col">
                    <CartTicket
                        cart={cart}
                        subtotal={cartSubtotal}
                        tax={0}
                        total={cartTotal}
                        currency="NIO"
                        selectedItemId={selectedItemId}
                        onSelectItem={(id) => setSelectedItemId(id === selectedItemId ? null : id)}
                    />
                </div>

                <div className="bg-white border-t p-2 shrink-0">
                    <div className="mb-2 flex items-center justify-between bg-gray-100 p-1.5 rounded">
                        <div className="flex flex-col">
                            <span className="text-[10px] text-muted-foreground uppercase">Cliente:</span>
                            <span className="font-bold text-sm text-primary truncate max-w-[120px]">
                                {customerName || 'ANONIM'}
                            </span>
                        </div>
                        <Button variant="outline" size="sm" className="h-7 px-2" onClick={() => setIsAssignClientOpen(true)}>
                            <UserPlus className="w-3 h-3 text-[#673AB7]" />
                        </Button>
                    </div>

                    <div className="grid grid-cols-2 gap-1.5 mb-1.5">
                        <Button
                            className="h-10 flex gap-1.5 bg-[#FF5722] hover:bg-[#F4511E] text-white font-bold text-xs p-1 rounded-sm shadow-sm"
                            onClick={handleClearCart}
                        >
                            <Trash2 className="w-4 h-4" />
                            LIMPIAR
                        </Button>
                        <Button
                            className="h-10 flex gap-1.5 bg-[#8BC34A] hover:bg-[#7CB342] text-white font-bold text-lg p-1 rounded-sm shadow-sm"
                            onClick={handlePayment}
                        >
                            <CreditCard className="w-5 h-5" />
                            COBRAR
                        </Button>
                    </div>
                    {/* Botón SERVICIOS - exclusivo modo Joyería */}
                    <Button
                        className="w-full h-10 flex gap-2 bg-[#673AB7] hover:bg-[#5E35B1] text-white font-bold text-sm rounded-sm shadow-sm"
                        onClick={() => setIsServiceDialogOpen(true)}
                    >
                        <Wrench className="w-4 h-4" />
                        REGISTRAR SERVICIO
                    </Button>
                </div>
            </div>

            {/* RIGHT PANEL: GRID OR PAYMENT */}
            <div className="w-[70%] h-full flex flex-col bg-gray-50/50">
                {viewMode === 'products' ? (
                    <div className="flex flex-col h-full overflow-hidden">
                        {/* Premium Header */}
                        <div className="flex items-center justify-between p-3 gap-4 bg-white border-b shadow-sm z-10">
                            <div className="flex items-center gap-2">
                                <div className="bg-[#673AB7] p-2 rounded-lg shadow-md shadow-[#673AB7]/20">
                                    <Home className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <h2 className="font-black text-gray-800 text-sm tracking-tight uppercase">Piezas en Stock</h2>
                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest leading-none">Inventario Real</p>
                                </div>
                            </div>

                            <div className="flex-1 max-w-md relative group">
                                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-[#673AB7] transition-colors" />
                                <Input
                                    className="h-10 w-full bg-gray-50 border-gray-200 rounded-xl pl-10 focus-visible:ring-2 focus-visible:ring-[#673AB7]/20 focus-visible:border-[#673AB7] transition-all"
                                    placeholder="Buscar por nombre, código o ID..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                                {searchTerm && (
                                    <button 
                                        onClick={() => setSearchTerm('')}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                )}
                            </div>

                            <div className="hidden sm:flex items-center gap-2 text-[#673AB7] bg-[#673AB7]/5 px-3 py-1.5 rounded-full border border-[#673AB7]/10">
                                <Gem className="w-4 h-4 animate-pulse" />
                                <span className="text-[10px] font-black uppercase tracking-tighter">{filteredPieces.length} Disponibles</span>
                            </div>
                        </div>

                        <ScrollArea className="flex-1 p-4">
                            <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
                                {filteredPieces.length === 0 ? (
                                    <div className="col-span-full py-20 text-center text-gray-400">
                                        <Gem className="w-12 h-12 mx-auto mb-4 opacity-20" />
                                        <p className="text-lg">No se encontraron piezas en el inventario.</p>
                                    </div>
                                ) : (
                                    filteredPieces.map((piece) => {
                                        const isSelected = !!cart.find((c) => c.id === piece.id);
                                        return (
                                            <div
                                                key={piece.id}
                                                onClick={() => isSelected ? removeFromCart(piece.id) : addToCart(piece)}
                                                className={`group relative flex flex-col bg-white rounded-xl overflow-hidden border transition-all duration-300 shadow-sm hover:shadow-xl hover:-translate-y-1 ${
                                                    isSelected 
                                                    ? 'ring-2 ring-[#673AB7] border-transparent shadow-[#673AB7]/20 scale-[0.98]' 
                                                    : 'hover:border-[#673AB7]/30'
                                                }`}
                                            >
                                                {/* Image/Icon Area */}
                                                <div className="relative aspect-[4/3] bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center overflow-hidden border-b">
                                                    {piece.photoUrl ? (
                                                        <Image 
                                                            src={piece.photoUrl} 
                                                            alt={piece.name} 
                                                            fill 
                                                            unoptimized={piece.photoUrl.startsWith('data:')} 
                                                            className="object-cover transition-transform duration-500 group-hover:scale-110" 
                                                        />
                                                    ) : (
                                                        <div className="flex flex-col items-center gap-1 opacity-20 group-hover:opacity-40 transition-opacity">
                                                            <Gem className="w-10 h-10 text-[#673AB7]" />
                                                            <span className="text-[10px] font-bold tracking-widest uppercase">Luxury</span>
                                                        </div>
                                                    )}
                                                    
                                                    {/* Selection Overlay */}
                                                    {isSelected && (
                                                        <div className="absolute inset-0 bg-[#673AB7]/10 flex justify-center items-center backdrop-blur-[2px]">
                                                            <div className="bg-white rounded-full p-1.5 shadow-lg border-2 border-[#673AB7]">
                                                                <CheckCircle2 className="w-8 h-8 text-[#673AB7]" />
                                                            </div>
                                                        </div>
                                                    )}
                                                    
                                                    {/* Price Badge on Image - en Córdobas */}
                                                    <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-md text-white px-2 py-0.5 rounded-full text-[10px] font-black tracking-tight border border-white/20">
                                                        C${formatNumber(piece.calculatedPrice * exchangeRate)}
                                                    </div>
                                                </div>
                                                
                                                {/* Content Area */}
                                                <div className="p-2.5 flex flex-col justify-between flex-1">
                                                    <div className="space-y-0.5">
                                                        <div className="text-[8px] font-bold text-[#673AB7]/60 tracking-wider uppercase truncate">
                                                            {piece.code || 'NO-CODE'}
                                                        </div>
                                                        <div className="text-[11px] font-bold leading-tight line-clamp-2 text-gray-800 group-hover:text-[#673AB7] transition-colors h-8">
                                                            {piece.name}
                                                        </div>
                                                    </div>
                                                    
                                                    <div className="flex justify-between items-center mt-2 pt-2 border-t border-gray-50">
                                                        <div className="flex gap-1.5">
                                                            <span className="bg-gray-100 text-[9px] px-1.5 py-0.5 rounded text-gray-600 font-medium">
                                                                {piece.karat}k
                                                            </span>
                                                            <span className="bg-gray-100 text-[9px] px-1.5 py-0.5 rounded text-gray-600 font-medium">
                                                                {piece.weight}g
                                                            </span>
                                                        </div>
                                                        <ChevronRight className="w-3 h-3 text-gray-300 group-hover:text-[#673AB7] transition-transform group-hover:translate-x-0.5" />
                                                    </div>
                                                </div>

                                                {/* Hover Glow effect */}
                                                <div className="absolute inset-0 bg-gradient-to-t from-[#673AB7]/5 to-transparent opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-300" />
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </ScrollArea>
                    </div>
                ) : (
                    <div className="flex-1 overflow-hidden">
                        <PaymentGrid
                            total={cartTotal}
                            onCancel={() => setViewMode('products')}
                            onComplete={handlePrePaymentComplete}
                        />
                    </div>
                )}
            </div>

            <AssignClientDialog
                isOpen={isAssignClientOpen}
                onClose={() => setIsAssignClientOpen(false)}
                onAssign={(client) => setCustomerName(client.name)}
                currentName={customerName}
            />

            {/* Dialog de Servicios de Joyería */}
            {activeSession && (
                <ServiceRegistrationDialog
                    isOpen={isServiceDialogOpen}
                    onClose={() => setIsServiceDialogOpen(false)}
                    sessionId={activeSession.id}
                    userId={user?.id || ''}
                    cashierName={user?.name || 'Cajero'}
                    onServiceAdded={refreshSessions}
                />
            )}

            <PaymentSummaryDialog
                isOpen={isPaymentSummaryOpen}
                onClose={() => setIsPaymentSummaryOpen(false)}
                total={cartTotal}
                amountPaid={paymentData?.paid || 0}
                change={paymentData?.change || 0}
                onConfirm={confirmPayment}
            />

            {/* Hidden ReceiptTemplate for preview & print */}
            {lastSaleReceipt && (
                <Dialog open={!!lastSaleReceipt} onOpenChange={(open: boolean) => { if (!open) setLastSaleReceipt(null); }}>
                    <DialogContent className="max-w-md">
                        <DialogHeader>
                            <DialogTitle>Vista Previa de Factura</DialogTitle>
                        </DialogHeader>
                        <div className="flex justify-center p-4 max-h-[60vh] overflow-y-auto">
                            <ReceiptTemplate {...lastSaleReceipt} previewMode />
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
            )}
            
            {/* Real off-screen template for actual printing */}
            {lastSaleReceipt && (
                <ReceiptTemplate {...lastSaleReceipt} />
            )}
        </div>
    );
}

