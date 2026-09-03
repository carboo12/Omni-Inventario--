"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';

interface RetiroDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (amount: number, reason: string) => void;
    isLoading?: boolean;
}

// Modal de "Retiro / Salida de Efectivo": registra un movimiento de salida
// de la caja activa (Monto + Concepto/Motivo).
export const RetiroDialog: React.FC<RetiroDialogProps> = ({ isOpen, onClose, onConfirm, isLoading = false }) => {
    const [amount, setAmount] = useState('');
    const [reason, setReason] = useState('');

    useEffect(() => {
        if (isOpen) {
            setAmount('');
            setReason('');
        }
    }, [isOpen]);

    const parsedAmount = parseFloat(amount);

    const handleConfirm = () => {
        if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
            return;
        }
        if (!reason.trim()) {
            return;
        }
        onConfirm(parsedAmount, reason.trim());
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => { if (!open && !isLoading) onClose(); }}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Retiro / Salida de Efectivo</DialogTitle>
                    <DialogDescription>
                        Registre una salida de efectivo de la caja activa. Se imprimirá un comprobante.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-2">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="retiro-monto" className="text-right">Monto</Label>
                        <Input
                            id="retiro-monto"
                            type="number"
                            min="0"
                            step="0.01"
                            autoFocus
                            placeholder="0.00"
                            className="col-span-3"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') handleConfirm(); }}
                        />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="retiro-concepto" className="text-right">Concepto / Motivo</Label>
                        <Input
                            id="retiro-concepto"
                            placeholder="Ej: Pago de luz, compra de suministros..."
                            className="col-span-3"
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') handleConfirm(); }}
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={isLoading}>Cancelar</Button>
                    <Button
                        className="bg-[#FF5722] hover:bg-[#F4511E] text-white"
                        onClick={handleConfirm}
                        disabled={isLoading || !Number.isFinite(parsedAmount) || parsedAmount <= 0 || !reason.trim()}
                    >
                        {isLoading ? 'Guardando...' : 'Guardar Retiro'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};