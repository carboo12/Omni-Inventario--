"use client";

import React, { useState, useEffect, useId } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface RetiroDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (amount: number, reason: string, employeeId?: string) => void;
    employees?: { id: string; fullName: string }[];
    isLoading?: boolean;
}

// Modal de "Retiro / Salida de Efectivo": registra un movimiento de salida
// de la caja activa (Monto + Concepto/Motivo).
export const RetiroDialog: React.FC<RetiroDialogProps> = ({ isOpen, onClose, onConfirm, employees = [], isLoading = false }) => {
    const [amount, setAmount] = useState('');
    const [reason, setReason] = useState('');
    const [isEmployeeLoan, setIsEmployeeLoan] = useState(false);
    const [employeeId, setEmployeeId] = useState('');
    const descriptionId = useId();

    useEffect(() => {
        if (isOpen) {
            setAmount('');
            setReason('');
            setIsEmployeeLoan(false);
            setEmployeeId('');
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
        if (isEmployeeLoan && !employeeId) return;
        onConfirm(parsedAmount, reason.trim(), isEmployeeLoan ? employeeId : undefined);
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => { if (!open && !isLoading) onClose(); }}>
            <DialogContent aria-describedby={descriptionId}>
                <DialogHeader>
                    <DialogTitle>Retiro / Salida de Efectivo</DialogTitle>
                    <DialogDescription id={descriptionId}>
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
                    <div className="flex items-center gap-2 pl-1">
                        <Checkbox id="retiro-prestamo" checked={isEmployeeLoan} onCheckedChange={(checked) => setIsEmployeeLoan(checked === true)} />
                        <Label htmlFor="retiro-prestamo">¿Es un préstamo/adelanto a trabajador?</Label>
                    </div>
                    {isEmployeeLoan && <div className="space-y-2">
                        <Label htmlFor="retiro-empleado">Trabajador</Label>
                        <Select value={employeeId} onValueChange={setEmployeeId}>
                            <SelectTrigger id="retiro-empleado"><SelectValue placeholder="Seleccione un trabajador" /></SelectTrigger>
                            <SelectContent>{employees.map((employee) => <SelectItem key={employee.id} value={employee.id}>{employee.fullName}</SelectItem>)}</SelectContent>
                        </Select>
                        {employees.length === 0 && <p className="text-sm text-muted-foreground">No hay trabajadores activos disponibles.</p>}
                    </div>}
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
                        disabled={isLoading || !Number.isFinite(parsedAmount) || parsedAmount <= 0 || !reason.trim() || (isEmployeeLoan && (!employeeId || employees.length === 0))}
                    >
                        {isLoading ? 'Guardando...' : 'Guardar Retiro'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
