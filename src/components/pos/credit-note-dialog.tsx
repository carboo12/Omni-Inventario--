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
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { printReceiptHtml } from "@/lib/print-iframe";
import { buildReturnNoteHtml } from "@/lib/print-return-note";

interface CreditNoteDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (creditNote?: any) => void;
}

export function CreditNoteDialog({ isOpen, onClose, onSuccess }: CreditNoteDialogProps) {
    const { toast } = useToast();
    const { activeSession } = useCashRegister();
    const [step, setStep] = useState<'search' | 'selection'>('search');
    const [invoiceNumber, setInvoiceNumber] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [invoice, setInvoice] = useState<any>(null);
    const [selectedItems, setSelectedItems] = useState<{ productId: string, quantity: number, max: number, price: number, name: string }[]>([]);
    const [reason, setReason] = useState('');
    const [resolution, setResolution] = useState<'REFUND' | 'CREDIT'>('REFUND');
    const [restockIds, setRestockIds] = useState<string[]>([]);

    const handleSearch = async () => {
        if (!invoiceNumber) return;
        const parsed = parseTicketSearch(invoiceNumber);
        if (!parsed) {
            toast({ title: "Error", description: "Número de factura inválido", variant: "destructive" });
            return;
        }
        setIsLoading(true);
        try {
            const result = await getInvoiceByNumber(parsed);
            if (result.success && result.invoice) {
                setInvoice({ ...result.invoice, items: result.invoice.salesInvoiceItem || [] });
                setStep('selection');
                setSelectedItems([]);
                setReason('');
                setResolution('REFUND');
                setRestockIds([]);
            } else {
                toast({ title: "Error", description: result.error || "Factura no encontrada", variant: "destructive" });
            }
        } catch (error) {
            toast({ title: "No se pudo buscar la factura", description: error instanceof Error ? error.message : "Error de comunicación con el servidor.", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    };

    const toggleItem = (item: any, checked: boolean) => {
        if (checked) {
            setSelectedItems(prev => [...prev, {
                productId: item.id,
                quantity: item.quantity,
                max: item.quantity,
                price: item.unitPrice,
                name: item.productName
            }]);
        } else {
            setSelectedItems(prev => prev.filter(i => i.productId !== item.id));
            setRestockIds(prev => prev.filter(id => id !== item.id && id !== item.productId));
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
        setReason('');
        setRestockIds([]);
        onClose();
    };

    const handleSubmit = async () => {
        if (selectedItems.length === 0) {
            toast({ title: "Error", description: "Seleccione al menos un producto para devolver", variant: "destructive" });
            return;
        }

        if (!reason.trim()) {
            toast({ title: "Motivo requerido", description: "Indique la razón de la devolución.", variant: "destructive" });
            return;
        }

        if (resolution === 'REFUND' && !activeSession) {
            toast({ title: "Error", description: "No hay sesión de caja activa", variant: "destructive" });
            return;
        }

        if (!confirm(`¿Confirmar devolución por C$${formatNumber(calculateTotalRefund())}?`)) return;

        setIsLoading(true);
        try {
            const result = await createCreditNote(
                invoice.id,
                reason.trim(),
                selectedItems.map(i => ({ productId: i.productId, quantity: i.quantity })),
                activeSession?.id || '',
                { resolution, restockProductIds: restockIds }
            );

            if (!result?.success) {
                toast({ title: "No se pudo guardar la devolución", description: result?.error || "El servidor no confirmó el registro.", variant: "destructive" });
                return;
            }

            const creditNote = result.creditNote;
            const selected = selectedItems.map((item) => ({
                name: item.name,
                quantity: item.quantity,
                unitPrice: item.price,
                total: item.quantity * item.price,
                restocked: restockIds.includes(item.productId),
            }));
            const total = selected.reduce((sum, item) => sum + item.total, 0);
            const html = buildReturnNoteHtml({
                noteNumber: creditNote?.noteNumber ?? creditNote?.id ?? 'Pendiente',
                invoiceNumber: invoice.invoiceNumber,
                date: new Date(creditNote?.createdAt || Date.now()),
                cashierName: activeSession?.cashierName || 'Caja',
                customerName: invoice.customer?.fullName || 'Cliente General',
                reason: reason.trim(),
                resolution,
                items: selected,
                total,
            });

            toast({ title: "Devolución registrada", description: "La nota quedó guardada. Abriendo el comprobante para imprimir." });
            try {
                printReceiptHtml(html);
            } catch (printError) {
                toast({ title: "Devolución registrada", description: `No se pudo abrir la impresión. Puede reimprimir la nota después. ${printError instanceof Error ? printError.message : ''}`, variant: "destructive" });
            }
            onSuccess(creditNote);
            handleClose();
        } catch (error) {
            toast({ title: "No se pudo guardar la devolución", description: error instanceof Error ? error.message : "Error de comunicación con el servidor.", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="flex max-h-[90vh] max-w-4xl flex-col overflow-hidden p-6">
                <DialogHeader className="shrink-0">
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
                    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden">
                        <div className="mb-1 max-h-[300px] shrink overflow-y-auto rounded-md border pr-1">
                        <Table className="w-full text-sm">
                            <TableHeader className="sticky top-0 z-10 bg-gray-100">
                                <TableRow>
                                    <TableHead className="w-[50px]"></TableHead>
                                    <TableHead>Producto</TableHead>
                                    <TableHead>Cant. Orig</TableHead>
                                    <TableHead>Precio U.</TableHead>
                                    <TableHead>A Devolver</TableHead>
                                    <TableHead>Inventario</TableHead>
                                    <TableHead className="text-right">Total Dev.</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {(invoice.salesInvoiceItem || invoice.items || []).map((item: any) => {
                                    const isSelected = selectedItems.find(i => i.productId === item.id);
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
                                                        max={item.quantity - ((invoice.creditNote || []).flatMap((n: any) => n.items || []).filter((r: any) => r.invoiceItemId === item.id).reduce((sum: number, r: any) => sum + r.quantity, 0))}
                                                        className="w-20 h-8"
                                                        value={isSelected.quantity}
                                                        onChange={(e) => updateQuantity(item.id, e.target.value)}
                                                    />
                                                ) : "-"}
                                            </TableCell>
                                            <TableCell className="text-right font-bold">
                                                {isSelected ? `C$${formatNumber(isSelected.quantity * isSelected.price)}` : "-"}
                                            </TableCell>
                                            <TableCell>
                                                {isSelected && <label className="flex items-center gap-2 text-xs"><Checkbox checked={restockIds.includes(item.id)} onCheckedChange={(checked) => setRestockIds(prev => checked ? [...prev, item.id] : prev.filter(id => id !== item.id))} />Regresar a stock</label>}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                        </div>

                        <div className="shrink-0 space-y-4">
                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2"><Label htmlFor="return-reason">Motivo de devolución *</Label><Textarea id="return-reason" value={reason} onChange={e => setReason(e.target.value)} placeholder="Producto defectuoso, cambio, vencimiento…" /></div>
                            <div className="space-y-2"><Label>Resolución</Label><RadioGroup value={resolution} onValueChange={v => setResolution(v as 'REFUND' | 'CREDIT')}><label className="flex items-center gap-2"><RadioGroupItem value="REFUND" />Reembolso en efectivo de caja</label><label className="flex items-center gap-2"><RadioGroupItem value="CREDIT" />Saldo a favor / vale de crédito</label></RadioGroup></div>
                        </div>

                        <div className="flex justify-end items-center bg-gray-100 p-4 rounded text-xl font-bold">
                            Total Devolución: C${formatNumber(calculateTotalRefund())}
                        </div>

                        <div className="mt-auto flex shrink-0 justify-end gap-3 border-t pt-4">
                            <Button variant="outline" onClick={() => step === 'selection' ? setStep('search') : handleClose()}>Cancelar</Button>
                            <Button onClick={handleSubmit} disabled={isLoading} className="bg-red-600 hover:bg-red-700">
                                {isLoading ? <Loader2 className="animate-spin mr-2" /> : null}
                                Procesar Devolución
                            </Button>
                        </div>
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
