"use client";

import React, { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { usePendingSales } from "@/hooks/use-pending-sales";
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { Clock, ShoppingCart, Lock, FileText, Trash2 } from 'lucide-react';
import { PendingSale } from '@/lib/types';
import { formatNumber } from '@/lib/utils';

interface HeldBillsDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onSelectSale: (sale: PendingSale) => void;
    currentUserId?: string;
}

export function HeldBillsDialog({
    isOpen,
    onClose,
    onSelectSale,
    currentUserId,
}: HeldBillsDialogProps) {
    const { pendingSales, deletePendingSale } = usePendingSales();
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const formatCurrency = (amount: number) => {
        return `C$${formatNumber(amount)}`;
    };

    const pendingCount = pendingSales.length;

    const getLockInfo = (sale: PendingSale) => {
        if (!sale.lockedBy) return null;
        if (sale.lockedBy === currentUserId) return { text: 'Tu comanda', isOwn: true };
        return { text: 'En atención', isOwn: false };
    };

    const handleDelete = async (sale: PendingSale) => {
        if (!confirm(`¿Deseas cancelar y eliminar esta comanda de ${sale.customerName || 'Cliente General'}?`)) return;
        setDeletingId(sale.id);
        try {
            await deletePendingSale(sale.id);
        } finally {
            setDeletingId(null);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[600px] h-[80vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-3">
                        <span>Comandas Pendientes</span>
                        {pendingCount > 0 && (
                            <Badge variant="destructive" className="h-6 px-2 text-sm">
                                {pendingCount}
                            </Badge>
                        )}
                    </DialogTitle>
                </DialogHeader>
                <ScrollArea className="flex-1 pr-4">
                    <div className="space-y-4">
                        {pendingCount > 0 ? (
                            pendingSales.map((sale, index) => {
                                const lockInfo = getLockInfo(sale);
                                const isDeleting = deletingId === sale.id;
                                return (
                                    <div
                                        key={sale.id}
                                        className={`
                                            p-4 rounded-lg border flex items-center justify-between transition-colors
                                            ${lockInfo?.isOwn ? 'border-green-300 bg-green-50' : 'border-slate-200 bg-white hover:bg-slate-50'}
                                            ${lockInfo && !lockInfo.isOwn ? 'opacity-60' : 'cursor-pointer'}
                                            ${isDeleting ? 'opacity-40 pointer-events-none' : ''}
                                        `}
                                        onClick={() => {
                                            if (!lockInfo || lockInfo.isOwn) {
                                                onSelectSale(sale);
                                                onClose();
                                            }
                                        }}
                                    >
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="font-black text-primary">
                                                    #{index + 1}
                                                </span>
                                                {lockInfo && (
                                                    <span className={`flex items-center gap-1 text-xs font-semibold ${lockInfo.isOwn ? 'text-green-600' : 'text-amber-600'}`}>
                                                        <Lock className="w-3 h-3" />
                                                        {lockInfo.text}
                                                    </span>
                                                )}
                                            </div>
                                            <p className="font-bold text-base text-slate-900 truncate">
                                                {sale.customerName || 'Cliente General'}
                                            </p>
                                            <p className="text-sm text-slate-500">
                                                Despachador: {sale.dispatcherName}
                                            </p>
                                            <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                                                <Clock className="w-3 h-3" />
                                                {formatDistanceToNow(new Date(sale.createdAt), {
                                                    locale: es,
                                                    addSuffix: false,
                                                })}
                                            </p>
                                        </div>
                                        <div className="text-right shrink-0 ml-3 flex flex-col items-end gap-2">
                                            <p className="font-black text-lg text-primary">
                                                {formatCurrency(sale.total)}
                                            </p>
                                            <p className="text-xs text-slate-500">
                                                {sale.items.length} {sale.items.length === 1 ? 'artículo' : 'artículos'}
                                            </p>
                                            <div className="flex items-center gap-1">
                                                {!lockInfo && (
                                                    <Button
                                                        size="sm"
                                                        className="h-8 text-xs font-bold"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            onSelectSale(sale);
                                                            onClose();
                                                        }}
                                                    >
                                                        <FileText className="w-3 h-3 mr-1" />
                                                        Facturar
                                                    </Button>
                                                )}
                                                <Button
                                                    size="sm"
                                                    variant="destructive"
                                                    className="h-8 w-8 p-0"
                                                    disabled={isDeleting}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDelete(sale);
                                                    }}
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                                <ShoppingCart className="w-16 h-16 mb-4 opacity-40" />
                                <p className="text-lg font-medium">No hay comandas pendientes</p>
                                <p className="text-sm mt-1">Las comandas de los despachadores aparecerán aquí</p>
                            </div>
                        )}
                    </div>
                </ScrollArea>
                <div className="flex justify-end pt-4 border-t">
                    <Button variant="outline" onClick={onClose}>
                        Cerrar
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
