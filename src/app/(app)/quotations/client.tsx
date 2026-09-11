"use client";

import React, { useState, useMemo } from 'react';
import type { Quotation } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Search, Eye, Trash2, FileText, Printer, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn, formatCurrency, formatTicketNumber } from '@/lib/utils';
import { cancelQuote, getQuoteByNumber } from '@/lib/actions/quotations';
import dynamic from '@/lib/dynamic';

const QuoteReceiptTemplate = dynamic(
    () => import('@/components/pos/quote-receipt-template').then((mod) => ({ default: mod.QuoteReceiptTemplate })),
    { ssr: false }
);

interface QuotationsClientProps {
    initialQuotes: Quotation[];
}

export default function QuotationsClient({ initialQuotes }: QuotationsClientProps) {
    const [quotes, setQuotes] = useState<Quotation[]>(initialQuotes);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedQuote, setSelectedQuote] = useState<Quotation | null>(null);
    const [isDetailOpen, setIsDetailOpen] = useState(false);
    const [lastPrintedQuote, setLastPrintedQuote] = useState<any>(null);
    const { toast } = useToast();

    const filteredQuotes = useMemo(() => {
        if (!searchTerm.trim()) return quotes;
        const term = searchTerm.toLowerCase();
        return quotes.filter(q =>
            `COT-${String(q.quoteNumber).padStart(7, '0')}`.toLowerCase().includes(term) ||
            (q.customerName || '').toLowerCase().includes(term) ||
            (q.status || '').toLowerCase().includes(term)
        );
    }, [quotes, searchTerm]);

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'PENDING':
                return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">Pendiente</Badge>;
            case 'CONVERTED':
                return <Badge className="bg-green-100 text-green-800 border-green-300">Convertida</Badge>;
            case 'EXPIRED':
                return <Badge className="bg-red-100 text-red-800 border-red-300">Vencida</Badge>;
            case 'CANCELLED':
                return <Badge className="bg-gray-100 text-gray-600 border-gray-300">Cancelada</Badge>;
            default:
                return <Badge>{status}</Badge>;
        }
    };

    const handleViewDetail = (quote: Quotation) => {
        setSelectedQuote(quote);
        setIsDetailOpen(true);
    };

    const handleReprint = (quote: Quotation) => {
        const quoteData = {
            businessName: 'Mi Negocio',
            address: '',
            phone: '',
            quoteNumber: `COT-${String(quote.quoteNumber).padStart(7, '0')}`,
            date: new Date(quote.createdAt),
            expirationDays: quote.expirationDays,
            customerName: quote.customerName,
            customerPhone: quote.customerPhone,
            cashierName: quote.user?.name || 'Cajero',
            items: (quote.items || []).map((item: any) => ({
                quantity: item.quantity,
                description: item.productName,
                price: item.unitPrice,
                total: item.totalPrice,
            })),
            subtotal: quote.subtotal,
            total: quote.total,
            logoSvg: null,
        };
        setLastPrintedQuote(quoteData);
        setTimeout(() => {
            window.print();
            setLastPrintedQuote(null);
        }, 200);
    };

    const handleCancel = async (quoteId: string) => {
        const result = await cancelQuote(quoteId);
        if (result.success) {
            setQuotes(prev => prev.map(q => q.id === quoteId ? { ...q, status: 'CANCELLED' } : q));
            toast({ title: 'Cotización Cancelada', description: 'La cotización fue cancelada exitosamente.' });
        } else {
            toast({ title: 'Error', description: result.error || 'No se pudo cancelar.', variant: 'destructive' });
        }
        setIsDetailOpen(false);
    };

    return (
        <div className="p-4 md:p-6 space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        Cotizaciones / Presupuestos
                    </CardTitle>
                    <CardDescription>Gestión de cotizaciones emitidas. Busque por número (COT-0000001) o cliente.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center gap-2 mb-4">
                        <Search className="h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Buscar por número o cliente..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="max-w-sm"
                        />
                    </div>

                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>No. Cotización</TableHead>
                                    <TableHead>Cliente</TableHead>
                                    <TableHead>Fecha</TableHead>
                                    <TableHead>Vigencia</TableHead>
                                    <TableHead className="text-right">Total</TableHead>
                                    <TableHead>Estado</TableHead>
                                    <TableHead className="text-right">Acciones</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredQuotes.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                                            No se encontraron cotizaciones.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredQuotes.map((quote) => (
                                        <TableRow key={quote.id}>
                                            <TableCell className="font-mono font-bold">
                                                COT-{String(quote.quoteNumber).padStart(7, '0')}
                                            </TableCell>
                                            <TableCell>{quote.customerName}</TableCell>
                                            <TableCell>
                                                {format(new Date(quote.createdAt), 'dd/MM/yyyy', { locale: es })}
                                            </TableCell>
                                            <TableCell>
                                                {quote.expirationDays} días
                                            </TableCell>
                                            <TableCell className="text-right font-semibold">
                                                {formatCurrency(quote.total)}
                                            </TableCell>
                                            <TableCell>{getStatusBadge(quote.status)}</TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleViewDetail(quote)}
                                                        title="Ver detalle"
                                                    >
                                                        <Eye className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleReprint(quote)}
                                                        title="Reimprimir"
                                                    >
                                                        <Printer className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            {/* Detail Dialog */}
            <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>
                            Cotización #COT-{selectedQuote ? String(selectedQuote.quoteNumber).padStart(7, '0') : ''}
                        </DialogTitle>
                    </DialogHeader>
                    {selectedQuote && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-3 text-sm">
                                <div>
                                    <span className="text-muted-foreground">Cliente:</span>
                                    <p className="font-medium">{selectedQuote.customerName}</p>
                                </div>
                                <div>
                                    <span className="text-muted-foreground">Teléfono:</span>
                                    <p className="font-medium">{selectedQuote.customerPhone || '-'}</p>
                                </div>
                                <div>
                                    <span className="text-muted-foreground">Fecha:</span>
                                    <p className="font-medium">{format(new Date(selectedQuote.createdAt), 'dd/MM/yyyy HH:mm', { locale: es })}</p>
                                </div>
                                <div>
                                    <span className="text-muted-foreground">Vigencia:</span>
                                    <p className="font-medium">{selectedQuote.expirationDays} días</p>
                                </div>
                                <div>
                                    <span className="text-muted-foreground">Estado:</span>
                                    <p>{getStatusBadge(selectedQuote.status)}</p>
                                </div>
                                <div>
                                    <span className="text-muted-foreground">Creado por:</span>
                                    <p className="font-medium">{selectedQuote.user?.name || '-'}</p>
                                </div>
                            </div>

                            <div className="border rounded-md">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Producto</TableHead>
                                            <TableHead className="text-right">Cant.</TableHead>
                                            <TableHead className="text-right">P.Unit</TableHead>
                                            <TableHead className="text-right">Total</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {(selectedQuote.items || []).map((item) => (
                                            <TableRow key={item.id}>
                                                <TableCell>{item.productName}</TableCell>
                                                <TableCell className="text-right">{item.quantity}</TableCell>
                                                <TableCell className="text-right">{formatCurrency(item.unitPrice)}</TableCell>
                                                <TableCell className="text-right">{formatCurrency(item.totalPrice)}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>

                            <div className="flex justify-end text-lg font-bold">
                                Total: {formatCurrency(selectedQuote.total)}
                            </div>

                            {selectedQuote.notes && (
                                <div className="text-sm text-muted-foreground">
                                    <span className="font-medium">Nota:</span> {selectedQuote.notes}
                                </div>
                            )}
                        </div>
                    )}
                    <DialogFooter>
                        {selectedQuote?.status === 'PENDING' && (
                            <Button variant="destructive" onClick={() => handleCancel(selectedQuote.id)}>
                                <Trash2 className="h-4 w-4 mr-1" /> Cancelar Cotización
                            </Button>
                        )}
                        <Button variant="outline" onClick={() => setIsDetailOpen(false)}>Cerrar</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {lastPrintedQuote && <QuoteReceiptTemplate {...lastPrintedQuote} />}
        </div>
    );
}
