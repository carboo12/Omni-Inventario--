"use client";

import React from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { formatCurrency } from '@/lib/utils';

interface PaymentSummaryDialogProps {
    isOpen: boolean;
    onClose: () => void;
    total: number;
    amountPaid: number;
    change: number;
    onConfirm: () => void;
}

export function PaymentSummaryDialog({
    isOpen,
    onClose,
    total,
    amountPaid,
    change,
    onConfirm,
}: PaymentSummaryDialogProps) {

    // Local formatCurrency removed in favor of unified lib/utils utility

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md bg-stone-900 text-white border-stone-800">
                <DialogHeader>
                    <DialogTitle className="text-center text-xl text-stone-300">Resumen de Pago</DialogTitle>
                </DialogHeader>

                <div className="py-6 space-y-6">
                    <div className="grid grid-cols-2 items-center gap-4 text-2xl font-bold">
                        <span className="text-stone-300 text-right">Total:</span>
                        <span className="text-white text-right">{formatCurrency(total)}</span>
                    </div>

                    <div className="grid grid-cols-2 items-center gap-4 text-2xl font-bold">
                        <span className="text-stone-300 text-right">Pagado:</span>
                        <span className="text-white text-right">{formatCurrency(amountPaid)}</span>
                    </div>

                    <Separator className="bg-stone-700" />

                    <div className="grid grid-cols-2 items-center gap-4 text-3xl font-bold">
                        <span className="text-stone-300 text-right">Cambio:</span>
                        <span className="text-green-500 text-right">{formatCurrency(change)}</span>
                    </div>
                </div>

                <div className="text-center space-y-4">
                    <p className="text-xl italic text-stone-300">Gracias por su Compra</p>
                    <Button
                        onClick={onConfirm}
                        className="w-full h-16 text-xl bg-[#673AB7] hover:bg-[#5E35B1] font-bold"
                    >
                        CONTINUAR &gt;
                    </Button>
                </div>
                {/* Assuming EditJewelryDialog is meant to be a sibling to the Button or within the DialogContent */}
                {/* Note: EditJewelryDialog component and its props (isEditDialogOpen, setIsEditDialogOpen, editingPiece)
                    are not defined in the provided context. This insertion is based on the instruction's snippet. */}
                {/* <EditJewelryDialog
                    open={isEditDialogOpen}
                    onOpenChange={setIsEditDialogOpen}
                    piece={editingPiece as any}
                /> */}
            </DialogContent>
        </Dialog>
    );
}
