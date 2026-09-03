"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Search, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getInvoiceByNumber, createCreditNote } from "@/lib/actions/credit-notes";
import { useCashRegister } from "@/hooks/use-cash-register";
import { formatNumber, formatTicketNumber, parseTicketSearch, cn } from "@/lib/utils";

interface CreditNoteDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export function CreditNoteDialog({ isOpen, onClose, onSuccess }: CreditNoteDialogProps) {
    const { toast } = useToast();
    const { activeSession } = useCashRegister();
    const [step, setStep] = useState<'search' | 'selection'>('search');
    const [invoiceNumber, setInvoiceNumber] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [invoice, setInvoice] = useState<any>(null);
    const [selectedItems, setSelectedItems] = useState<{ productId: string, quantity: number, max: number, price: number, name: string }[]>([]);

    const handleSearch = async () => {
        if (!invoiceNumber) return;
        const parsed = parseTicketSearch(invoiceNumber);
        if (!parsed) {
            toast({ title: "Error", description: "Número de factura inválido", variant: "destructive" });
            return;
        }
        setIsLoading(true);
        const result = await getInvoiceByNumber(parsed);
        setIsLoading(false);

        if (result.success && result.invoice) {
            setInvoice(result.invoice);
            setStep('selection');
            setSelectedItems([]);
        } else {
            toast({ title: "Error", description: result.error || "Factura no encontrada", variant: "destructive" });
        }
    };

    const toggleItem = (item: any, checked: boolean) => {
        if (checked) {
            setSelectedItems(prev => [...prev, {
                productId: item.productId,
                quantity: item.quantity,
                max: item.quantity,
                price: item.unitPrice,
                name: item.productName
            }]);
        } else {
            setSelectedItems(prev => prev.filter(i => i.productId !== item.productId));
        }
    };

    const updateQuantity = (productId: string, val: string) => {
        const qty = parseInt(val);
        if (isNaN(qty) || qty < 1) return;

        setSelectedItems(prev => prev.map(item => {
            if (item.productId === productId) {
                return { ...item, quantity: Math.min(qty, item.max) };
            }
            return item;
        }));
    };

    const calculateTotalRefund = () => {
        return selectedItems.reduce((acc, item) => acc + (item.quantity * item.price), 0);
    };

    const handleClose = () => {
        setStep('search');
        setInvoiceNumber("");
        setInvoice(null);
        setSelectedItems([]);
        onClose();
    };

    const handleSubmit = async () => {
        if (selectedItems.length === 0) {
            toast({ title: "Error", description: "Seleccione al menos un producto para devolver", variant: "destructive" });
            return;
        }

        if (!activeSession) {
            toast({ title: "Error", description: "No hay sesión de caja activa", variant: "destructive" });
            return;
        }

        if (!confirm(`¿Confirmar devolución por C$${formatNumber(calculateTotalRefund())}?`)) return;

        setIsLoading(true);
        const result = await createCreditNote(
            invoice.id,
            "Devolución solicitada por cliente",
            selectedItems.map(i => ({ productId: i.productId, quantity: i.quantity })),
            activeSession.id
        );
        setIsLoading(false);

        if (result.success) {
            toast({ title: "Éxito", description: "Nota de Crédito creada y productos devueltos al inventario." });
            onSuccess();
            handleClose();
        } else {
            toast({ title: "Error", description: result.error, variant: "destructive" });
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="max-w-3xl">
                <DialogHeader>
                    <DialogTitle>Nota de Crédito (Devolución)</DialogTitle>
                    <DialogDescription>
                        {step === 'search' ? "Ingrese el número de la factura original." : `Factura #${formatTicketNumber(invoice?.invoiceNumber)} - Seleccione productos a devolver`}
                    </DialogDescription>
                </DialogHeader>

                {step === 'search' && (
                    <div className="flex gap-2 py-4">
                        <Input
                            placeholder="Número de Factura (ej. 1045)"
                            value={invoiceNumber}
                            onChange={(e) => setInvoiceNumber(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                        />
                        <Button onClick={handleSearch} disabled={isLoading}>
                            {isLoading ? <Loader2 className="animate-spin" /> : <Search />}
                        </Button>
                    </div>
                )}

                {step === 'selection' && invoice && (
                    <div className="space-y-4">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[50px]"></TableHead>
                                    <TableHead>Producto</TableHead>
                                    <TableHead>Cant. Orig</TableHead>
                                    <TableHead>Precio U.</TableHead>
                                    <TableHead>A Devolver</TableHead>
                                    <TableHead className="text-right">Total Dev.</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {invoice.items.map((item: any) => {
                                    const isSelected = selectedItems.find(i => i.productId === item.productId);
                                    return (
                                        <TableRow key={item.id}>
                                            <TableCell>
                                                <Checkbox
                                                    checked={!!isSelected}
                                                    onCheckedChange={(checked) => toggleItem(item, checked as boolean)}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-1.5">
                                                    <span>{item.productName}</span>
                                                    {typeof item.priceLevel === 'number' && (
                                                        <Badge variant="secondary" className={cn(
                                                            "text-[10px] font-black px-1.5 py-0",
                                                            item.priceLevel === 0 ? "bg-amber-500 text-white" : "bg-primary/10 text-primary"
                                                        )}>
                                                            {item.priceLevel === 0 ? 'MANUAL' : `P${item.priceLevel}`}
                                                        </Badge>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell>{item.quantity}</TableCell>
                                            <TableCell>C${formatNumber(item.unitPrice)}</TableCell>
                                            <TableCell>
                                                {isSelected ? (
                                                    <Input
                                                        type="number"
                                                        min="1"
                                                        max={item.quantity}
                                                        className="w-20 h-8"
                                                        value={isSelected.quantity}
                                                        onChange={(e) => updateQuantity(item.productId, e.target.value)}
                                                    />
                                                ) : "-"}
                                            </TableCell>
                                            <TableCell className="text-right font-bold">
                                                {isSelected ? `C$${formatNumber(isSelected.quantity * isSelected.price)}` : "-"}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>

                        <div className="flex justify-end items-center bg-gray-100 p-4 rounded text-xl font-bold">
                            Total Devolución: C${formatNumber(calculateTotalRefund())}
                        </div>

                        <DialogFooter>
                            <Button variant="outline" onClick={() => setStep('search')}>Atrás</Button>
                            <Button onClick={handleSubmit} disabled={isLoading} className="bg-red-600 hover:bg-red-700">
                                {isLoading ? <Loader2 className="animate-spin mr-2" /> : null}
                                Confirmar Devolución
                            </Button>
                        </DialogFooter>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
