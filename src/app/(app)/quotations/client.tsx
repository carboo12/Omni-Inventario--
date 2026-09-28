"use client";

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useRouter } from '@/lib/router-nav';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { Quotation, Product } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Search, Eye, Trash2, FileText, Printer, RefreshCw, ShoppingCart } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn, formatCurrency } from '@/lib/utils';
import { cancelQuote, getQuoteByNumber, getQuotes } from '@/lib/actions/quotations';
import { getProducts } from '@/lib/actions/products';
import { QUOTATIONS_LIST_QUERY_KEY, formatQuoteNumber, stageQuoteForPOS } from '@/lib/quotations-nav';
import { printReceiptHtml, buildQuoteReceiptHtml } from '@/lib/print-iframe';
import { useReceiptSettings } from '@/hooks/use-receipt-settings';
import { formatQuotationForPrint } from '@/lib/quotation-print';
import type { QuotationPrintSource } from '@/lib/quotation-print';
import { resolvePresentationUnitLabel } from '@/lib/presentations';
import { useSettings } from '@/hooks/use-settings';

interface QuotationsClientProps {
    initialQuotes: Quotation[];
}

export default function QuotationsClient({ initialQuotes }: QuotationsClientProps) {
    const router = useRouter();
    const queryClient = useQueryClient();
    const [quotes, setQuotes] = useState<Quotation[]>(initialQuotes ?? []);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedQuote, setSelectedQuote] = useState<Quotation | null>(null);
    const [isDetailOpen, setIsDetailOpen] = useState(false);
    const [quoteToCancel, setQuoteToCancel] = useState<Quotation | null>(null);
    // Diseño del ticket elegido en /settings/ticket.
    const receiptSettings = useReceiptSettings();
    const { settings } = useSettings();
    const { toast } = useToast();

    /**
     * Revalidación de datos al navegar.
     *
     * La lista se pide al backend en cada montaje (staleTime 0 +
     * refetchOnMount 'always'), de modo que entrar al módulo después de guardar
     * una cotización en el POS siempre muestre el registro recién creado. Antes
     * el componente congelaba `initialQuotes` en un useState y devolvía la caché
     * persistida (posiblemente vacía) sin volver a sincronizarse.
     */
    const { data: liveQuotes, isFetching, isError, error, refetch } = useQuery({
        queryKey: QUOTATIONS_LIST_QUERY_KEY,
        queryFn: async () => {
            const result = await getQuotes();
            if (!result?.success) {
                throw new Error(result?.error || 'No se pudieron cargar las cotizaciones.');
            }
            return (result.data ?? []) as Quotation[];
        },
        staleTime: 0,
        refetchOnMount: 'always',
    });

    // Sincroniza el estado local con los datos frescos del backend; mientras la
    // consulta viva no responde se conserva lo que entregó el wrapper de la página.
    useEffect(() => {
        if (liveQuotes) {
            setQuotes(liveQuotes);
        } else if (initialQuotes) {
            setQuotes(initialQuotes);
        }
    }, [liveQuotes, initialQuotes]);

    // Si la consulta falla no se muestra una lista vacía silenciosa: se avisa para
    // que el cajero distinga "no hay cotizaciones" de un error de carga.
    const notifiedErrorRef = useRef<string | null>(null);
    useEffect(() => {
        if (!isError) {
            notifiedErrorRef.current = null;
            return;
        }
        const message = error instanceof Error ? error.message : 'No se pudieron cargar las cotizaciones.';
        if (notifiedErrorRef.current === message) return;
        notifiedErrorRef.current = message;
        toast({
            title: 'No se pudieron cargar las cotizaciones',
            description: message,
            variant: 'destructive',
        });
    }, [isError, error, toast]);

    const filteredQuotes = useMemo(() => {
        if (!searchTerm.trim()) return quotes;
        const term = searchTerm.trim().toLowerCase();
        return quotes.filter(q =>
            formatQuoteNumber(q.quoteNumber).toLowerCase().includes(term) ||
            (q.customerName || '').toLowerCase().includes(term) ||
            (q.customerPhone || '').toLowerCase().includes(term) ||
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
                return <Badge className="bg-gray-100 text-gray-600 border-gray-300">Anulada</Badge>;
            default:
                return <Badge>{status}</Badge>;
        }
    };

    const handleViewDetail = (quote: Quotation) => {
        setSelectedQuote(quote);
        setIsDetailOpen(true);
    };

    /**
     * Impresión de la cotización con la plantilla oficial de 80 mm del POS.
     *
     * Reutiliza `printReceiptHtml` (iframe oculto) y el mismo constructor
     * centralizado, en vez de `window.print()`, para no imprimir la página
     * entera ni abrir pestañas vacías.
     */
    const handleReprint = async (quote: Quotation) => {
        try {
            // 1) Hidratación on-demand: si la cotización llega de la lista y no
            // trae líneas, se recupera la versión completa desde el backend antes
            // de mapear, en lugar de imprimir un ticket sin productos.
            let source = quote as unknown as QuotationPrintSource;
            if (!Array.isArray(source.items) || source.items.length === 0) {
                const result = await getQuoteByNumber(quote.quoteNumber);
                if (result?.success && result.data) {
                    source = result.data as unknown as QuotationPrintSource;
                }
            }

            // 2) La presentación (LIBRA, QUINTAL, CAJA...) no se guarda en la
            // cotización: se resuelve del catálogo sólo al momento de imprimir,
            // reutilizando la caché de productos que ya carga el POS.
            const products = await queryClient.fetchQuery<Product[]>({
                queryKey: ['products'],
                queryFn: async () => {
                    const result = await getProducts();
                    return result.success ? ((result.data as any[]) ?? []) : [];
                },
                staleTime: 2000,
            });
            const unitByProductId = new Map<string, string | undefined>();
            for (const product of products ?? []) {
                if (product?.id) {
                    unitByProductId.set(product.id, resolvePresentationUnitLabel(product));
                }
            }

            // 3) Normalización al esquema de la plantilla (ver quotation-print.ts).
            const printData = formatQuotationForPrint(source, settings, {
                resolveUnitByProductId: (productId) => unitByProductId.get(productId),
            });

            printReceiptHtml(buildQuoteReceiptHtml(printData, receiptSettings));
        } catch (error) {
            console.error('Error al imprimir la cotización:', error);
            toast({
                title: 'Error de impresión',
                description: 'No se pudo preparar la cotización para imprimir.',
                variant: 'destructive',
            });
        }
    };

    /** Carga la cotización en el carrito del Punto de Venta. */
    const handleLoadInPOS = (quote: Quotation) => {
        if (quote.status === 'CONVERTED') {
            toast({ title: 'Cotización facturada', description: 'Esta cotización ya fue convertida en factura.', variant: 'destructive' });
            return;
        }
        if (quote.status === 'CANCELLED') {
            toast({ title: 'Cotización anulada', description: 'Esta cotización fue anulada.', variant: 'destructive' });
            return;
        }
        stageQuoteForPOS(quote.quoteNumber);
        toast({ title: 'Cotización seleccionada', description: `Cargando ${formatQuoteNumber(quote.quoteNumber)} en el Punto de Venta...` });
        router.push('/pos');
    };

    const handleCancel = async (quoteId: string) => {
        const result = await cancelQuote(quoteId);
        if (result.success) {
            setQuotes(prev => prev.map(q => q.id === quoteId ? { ...q, status: 'CANCELLED' } : q));
            setSelectedQuote(prev => (prev && prev.id === quoteId ? { ...prev, status: 'CANCELLED' } : prev));
            // Invalida la caché para que el POS y la próxima visita vean el estado real.
            queryClient.invalidateQueries({ queryKey: QUOTATIONS_LIST_QUERY_KEY });
            toast({ title: 'Cotización Anulada', description: 'La cotización fue anulada exitosamente.' });
        } else {
            toast({ title: 'Error', description: result.error || 'No se pudo anular.', variant: 'destructive' });
        }
        setQuoteToCancel(null);
        setIsDetailOpen(false);
    };

    const handleRefresh = async () => {
        try {
            await refetch();
        } catch (e) {
            toast({
                title: 'No se pudieron cargar las cotizaciones',
                description: e instanceof Error ? e.message : 'Intente nuevamente.',
                variant: 'destructive',
            });
        }
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
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleRefresh}
                            disabled={isFetching}
                            title="Actualizar cotizaciones"
                        >
                            <RefreshCw className={cn('h-4 w-4', isFetching && 'animate-spin')} />
                        </Button>
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
                                            {isFetching && !quotes.length
                                                ? 'Cargando cotizaciones...'
                                                : 'No se encontraron cotizaciones.'}
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredQuotes.map((quote) => (
                                        <TableRow key={quote.id}>
                                            <TableCell className="font-mono font-bold">
                                                {formatQuoteNumber(quote.quoteNumber)}
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
                                                        title="Ver / Imprimir"
                                                    >
                                                        <Printer className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleLoadInPOS(quote)}
                                                        title="Cargar en POS"
                                                        disabled={quote.status !== 'PENDING'}
                                                    >
                                                        <ShoppingCart className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => setQuoteToCancel(quote)}
                                                        title="Anular cotización"
                                                        disabled={quote.status === 'CANCELLED' || quote.status === 'CONVERTED'}
                                                    >
                                                        <Trash2 className="h-4 w-4 text-destructive" />
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
                            Cotización #{selectedQuote ? formatQuoteNumber(selectedQuote.quoteNumber) : ''}
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
                            <Button
                                variant="outline"
                                onClick={() => handleLoadInPOS(selectedQuote)}
                            >
                                <ShoppingCart className="h-4 w-4 mr-1" /> Cargar en POS
                            </Button>
                        )}
                        {selectedQuote?.status === 'PENDING' && (
                            <Button variant="destructive" onClick={() => setQuoteToCancel(selectedQuote)}>
                                <Trash2 className="h-4 w-4 mr-1" /> Anular Cotización
                            </Button>
                        )}
                        <Button variant="outline" onClick={() => setIsDetailOpen(false)}>Cerrar</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Confirmación de anulación */}
            <AlertDialog open={!!quoteToCancel} onOpenChange={(open) => !open && setQuoteToCancel(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Anular esta cotización?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Se anulará la cotización{' '}
                            <span className="font-semibold">
                                {quoteToCancel ? formatQuoteNumber(quoteToCancel.quoteNumber) : ''}
                            </span>{' '}
                            de {quoteToCancel?.customerName}. La cotización dejará de estar vigente y no podrá
                            cargarse en el Punto de Venta.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={() => quoteToCancel && handleCancel(quoteToCancel.id)}
                        >
                            Anular Cotización
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
