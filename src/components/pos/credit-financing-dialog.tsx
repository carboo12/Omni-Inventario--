"use client";

import React, { useEffect, useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { CalendarClock, Loader2 } from 'lucide-react';
import type { SaleFinancing } from '@/lib/actions/sales';

interface CreditFinancingDialogProps {
  isOpen: boolean;
  onClose: () => void;
  total: number;
  onConfirm: (financing: SaleFinancing) => void;
}

const FREQUENCIES = [
  { value: 'SEMANAL', label: 'Semanal' },
  { value: 'QUINCENAL', label: 'Quincenal' },
  { value: 'MENSUAL', label: 'Mensual' },
];

export function CreditFinancingDialog({ isOpen, onClose, total, onConfirm }: CreditFinancingDialogProps) {
  const [installments, setInstallments] = useState(3);
  const [frequency, setFrequency] = useState<'SEMANAL' | 'QUINCENAL' | 'MENSUAL'>('SEMANAL');
  const [interestRate, setInterestRate] = useState('0');
  const [isConfirming, setIsConfirming] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setInstallments(3);
      setFrequency('SEMANAL');
      setInterestRate('0');
      setIsConfirming(false);
    }
  }, [isOpen]);

  const summary = useMemo(() => {
    const baseTotal = Number(total) || 0;
    const interestPct = parseFloat(interestRate) || 0;
    const interestAmount = (baseTotal * interestPct) / 100;
    const totalWithInterest = baseTotal + interestAmount;
    const perInstallment = installments > 0 ? totalWithInterest / installments : 0;
    return {
      baseTotal,
      interestAmount,
      totalWithInterest,
      perInstallment,
    };
  }, [total, interestRate, installments]);

  const handleConfirm = () => {
    if (isConfirming) return;
    setIsConfirming(true);
    const financing: SaleFinancing = {
      installments: Math.min(Math.max(1, Math.floor(installments)), 24),
      frequency,
      interestRate: parseFloat(interestRate) || 0,
    };
    onConfirm(financing);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarClock className="h-5 w-5 text-violet-600" />
            Financiamiento del Crédito
          </DialogTitle>
          <DialogDescription>
            Divida el total en cuotas fijas. El interés se suma al monto a deber.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase text-muted-foreground">Cantidad de cuotas</Label>
            <Input
              type="number"
              min={1}
              max={24}
              value={installments}
              onChange={(e) => setInstallments(Math.max(1, Math.floor(Number(e.target.value) || 1)))}
              className="no-spinner"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase text-muted-foreground">Frecuencia de pago</Label>
            <Tabs value={frequency} onValueChange={(v) => setFrequency(v as any)} className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                {FREQUENCIES.map((f) => (
                  <TabsTrigger key={f.value} value={f.value}>{f.label}</TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase text-muted-foreground">Porcentaje de interés (%)</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              placeholder="Ej: 5, 10.5"
              value={interestRate}
              onChange={(e) => setInterestRate(e.target.value)}
              className="no-spinner"
            />
          </div>

          <Separator />

          <div className="space-y-1.5 text-sm rounded-lg bg-violet-50 border border-violet-200 p-4">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total de la venta</span>
              <span className="font-medium">C$ {summary.baseTotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Interés ({interestRate || '0'}%)</span>
              <span className="font-medium">C$ {summary.interestAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-semibold text-violet-700">
              <span>Total con interés</span>
              <span>C$ {summary.totalWithInterest.toFixed(2)}</span>
            </div>
            <div className="flex justify-between border-t border-violet-200 pt-1.5 mt-1.5">
              <span className="text-muted-foreground">Monto por cuota ({installments} cuotas)</span>
              <span className="font-bold">C$ {summary.perInstallment.toFixed(2)}</span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={isConfirming}>
            Cancelar
          </Button>
          <Button type="button" onClick={handleConfirm} disabled={isConfirming} className="bg-violet-600 hover:bg-violet-700">
            {isConfirming ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Procesando...</> : 'Confirmar Financiamiento'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}