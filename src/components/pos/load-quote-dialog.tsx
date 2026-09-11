"use client";

import React, { useState, useMemo, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ClipboardList, Search, FileText, Inbox } from 'lucide-react';
import { format } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import { getPendingQuotes } from '@/lib/actions/quotations';
import { formatCurrency } from '@/lib/utils';

interface LoadQuoteDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onLoadQuote: (quote: any) => void;
}

export function LoadQuoteDialog({
    isOpen,
    onClose,
    onLoadQuote,
}: LoadQuoteDialogProps) {
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        if (isOpen) setSearchTerm('');
    }, [isOpen]);

    const { data, isLoading } = useQuery({
        queryKey: ['pending-quotes'],
        queryFn: async () => {
            const res = await getPendingQuotes();
            return res.success ? (res.data as any[]) : [];
        },
        enabled: isOpen,
        staleTime: 0,
    });

    const pendingQuotes = data ?? [];

    const filteredQuotes = useMemo(() => {
        if (!searchTerm.trim()) return pendingQuotes;
        const term = searchTerm.trim().toLowerCase();
        return pendingQuotes.filter((q: any) => {
            const quoteNumber = q?.quoteNumber;
            const quoteLabel = `COT-${String(quoteNumber ?? '').padStart(7, '0')}`.toLowerCase();
            return (
                quoteLabel.includes(term) ||
                String(quoteNumber ?? '').includes(term) ||
                (q?.customerName || '').toLowerCase().includes(term) ||
                (q?.customerPhone || '').toLowerCase().includes(term) ||
                (q?.customer?.fullName || '').toLowerCase().includes(term)
            );
        });
    }, [pendingQuotes, searchTerm]);

    const handleLoad = (quote: any) => {
        onLoadQuote(quote);
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[760px] h-[80vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <ClipboardList className="w-5 h-5" />
                        Cargar Cotización
                    </DialogTitle>
                </DialogHeader>

                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        autoFocus
                        placeholder="Buscar por nombre de cliente o # de cotización..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9"
                    />
                </div>

                <div className="flex-1 min-h-0 flex flex-col border rounded-md overflow-hidden">
                    <div className="rounded-none border-b">
                        <Table className="table-fixed">
                            <TableHeader>
                                <TableRow className="hover:bg-transparent">
                                    <TableHead className="w-[130px]"># Cotización</TableHead>
                                    <TableHead>Cliente</TableHead>
                                    <TableHead className="w-[150px]">Fecha</TableHead>
                                    <TableHead className="w-[110px] text-right">Total</TableHead>
                                    <TableHead className="w-[120px] text-right">Acción</TableHead>
                                </TableRow>
                            </TableHeader>
                        </Table>
                    </div>
                    <ScrollArea className="flex-1 min-h-0">
                        {isLoading ? (
                            <div className="space-y-2 p-4">
                                <Skeleton className="h-12 w-full" />
                                <Skeleton className="h-12 w-full" />
                                <Skeleton className="h-12 w-full" />
                            </div>
                        ) : pendingQuotes.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-14 text-muted-foreground">
                                <Inbox className="w-12 h-12 mb-3 opacity-40" />
                                <p className="font-medium text-base text-foreground">No hay cotizaciones pendientes</p>
                                <p className="text-sm">Guardá una cotización para poder cargarla aquí.</p>
                            </div>
                        ) : filteredQuotes.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-14 text-muted-foreground">
                                <Search className="w-12 h-12 mb-3 opacity-40" />
                                <p className="font-medium text-base text-foreground">Sin resultados</p>
                                <p className="text-sm">Ninguna cotización coincide con "{searchTerm}".</p>
                            </div>
                        ) : (
                            <Table className="table-fixed">
                                <TableBody>
                                    {filteredQuotes.map((quote: any) => (
                                        <TableRow
                                            key={quote.id}
                                            className="cursor-pointer"
                                            onDoubleClick={() => handleLoad(quote)}
                                        >
                                            <TableCell className="w-[130px] font-mono font-bold">
                                                COT-{String(quote.quoteNumber).padStart(7, '0')}
                                            </TableCell>
                                            <TableCell>
                                                {quote.customer?.fullName || quote.customerName || 'Cliente General'}
                                                {quote.customerPhone && (
                                                    <span className="block text-xs text-muted-foreground">
                                                        {quote.customerPhone}
                                                    </span>
                                                )}
                                            </TableCell>
                                            <TableCell className="w-[150px] whitespace-nowrap">
                                                {format(new Date(quote.createdAt), 'dd/MM/yyyy hh:mm a')}
                                            </TableCell>
                                            <TableCell className="w-[110px] text-right font-semibold">
                                                {formatCurrency(quote.total)}
                                            </TableCell>
                                            <TableCell className="w-[120px] text-right">
                                                <Button
                                                    size="sm"
                                                    className="h-8 bg-green-600 hover:bg-green-700 text-white font-bold"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleLoad(quote);
                                                    }}
                                                    onDoubleClick={(e) => e.stopPropagation()}
                                                >
                                                    <FileText className="w-3.5 h-3.5 mr-1" />
                                                    Cargar
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </ScrollArea>
                </div>

                <div className="flex justify-end pt-4 border-t">
                    <Button variant="outline" onClick={onClose}>
                        Cerrar
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}