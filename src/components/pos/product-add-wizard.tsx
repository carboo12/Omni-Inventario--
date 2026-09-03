"use client";

import React, { useState, useEffect } from 'react';
import type { Product } from '@/lib/types';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { cn, formatCurrency } from '@/lib/utils';
import { getBulkPresentationOptions } from '@/lib/presentations';

interface PendingAdd {
  product: Product;
  step: 'presentation' | 'quantity' | 'priceLevel';
  presentation: 'unit' | 'box' | string;
  presentationName?: string;
  presentationFactor?: number;
  quantity: number;
  priceLevel: number;
}

interface ProductAddWizardProps {
  product: Product | null;
  defaultPriceLevel?: number;
  onConfirm: (product: Product, presentation: 'unit' | 'box' | string, priceLevel: number, quantity: number, presentationName?: string, presentationFactor?: number) => void;
  onClose: () => void;
}

// Niveles de precio del producto (las presentaciones fijas no tienen precios propios).
const getAvailablePriceLevels = (product: Product | null): Array<{ level: number; label: string; price: number }> => {
  if (!product) return [];
  const levels = [{ level: 1, label: 'Detalle', price: product.priceNIO }];
  const p2 = Number((product as any).price2);
  const p3 = Number((product as any).price3);
  const p4 = Number((product as any).price4);
  if (p2 > 0) levels.push({ level: 2, label: 'Mayor', price: p2 });
  if (p3 > 0) levels.push({ level: 3, label: 'Paca / Bulto', price: p3 });
  if (p4 > 0) levels.push({ level: 4, label: 'Vol. Especial', price: p4 });
  return levels;
};

export function ProductAddWizard({
  product,
  defaultPriceLevel = 1,
  onConfirm,
  onClose,
}: ProductAddWizardProps) {
  const [pending, setPending] = useState<PendingAdd | null>(null);
  const [qtyText, setQtyText] = useState('');

  // Al recibir un producto, inicializa el wizard en el primer paso.
  useEffect(() => {
    if (product) {
      const options = getBulkPresentationOptions(product);
      const firstStep: 'presentation' | 'quantity' = options.length > 0 ? 'presentation' : 'quantity';
      setPending({
        product,
        step: firstStep,
        presentation: 'unit',
        quantity: 1,
        priceLevel: defaultPriceLevel,
      });
    } else {
      setPending(null);
    }
  }, [product, defaultPriceLevel]);

  // Sincroniza el texto del input al abrir el paso de cantidad.
  useEffect(() => {
    if (pending?.step === 'quantity') {
      setQtyText(String(pending.quantity));
    }
  }, [pending?.step]);

  const selectPresentation = (presentation: PendingAdd['presentation'], presentationName?: string, presentationFactor?: number) => {
    setPending(prev => prev ? { ...prev, presentation, presentationName, presentationFactor, step: 'quantity' } : prev);
  };

  const setQuantityInput = (value: number) => {
    setPending(prev => prev ? { ...prev, quantity: Math.max(0, Number.isFinite(value) ? value : 0) } : prev);
  };

  const confirmQuantity = () => {
    if (!pending) return;
    const { product: prod, quantity } = pending;
    if (quantity <= 0) return;
    if (getAvailablePriceLevels(prod).length > 1) {
      setPending(prev => prev ? { ...prev, step: 'priceLevel' } : prev);
      return;
    }
    // Sin niveles extra: confirmar con precio nivel 1.
    onConfirm(prod, pending.presentation, pending.priceLevel, quantity, pending.presentationName, pending.presentationFactor);
    setPending(null);
    onClose();
  };

  const pickPriceLevel = (level: number) => {
    if (!pending) return;
    onConfirm(pending.product, pending.presentation, level, pending.quantity, pending.presentationName, pending.presentationFactor);
    setPending(null);
    onClose();
  };

  const handleDialogChange = (open: boolean) => {
    if (!open) {
      setPending(null);
      onClose();
    }
  };

  const bulkOptions = getBulkPresentationOptions(pending?.product ?? null);

  return (
    <>
      {/* Paso 1: Selección de presentación/unidad */}
      <Dialog open={pending?.step === 'presentation'} onOpenChange={handleDialogChange}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Elegir presentación</DialogTitle>
            <DialogDescription>
              ¿Cómo desea agregar <span className="font-semibold">{pending?.product.name}</span>?
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => selectPresentation('unit')}
              className="flex flex-col items-center justify-center gap-1 rounded-2xl border-2 border-slate-200 bg-white p-4 text-center transition-all active:scale-[0.97] active:border-primary"
            >
              <span className="text-2xl">{pending?.product.isFractional ? '⚖️' : '📦'}</span>
              <span className="font-black">
                {pending?.product.isFractional ? (pending.product.baseUnit || 'Libra') : 'Unidad'}
              </span>
            </button>
            {bulkOptions.map((option) => (
              <button
                key={option.key}
                onClick={() => selectPresentation(option.key, option.name, option.factor)}
                className="flex flex-col items-center justify-center gap-1 rounded-2xl border-2 border-primary bg-primary/5 p-4 text-center transition-all active:scale-[0.97] active:border-primary-foreground"
              >
                <span className="text-2xl">{pending?.product.isFractional ? '🛒' : '📦'}</span>
                <span className="font-black">{option.name}</span>
                <span className="text-xs text-slate-500">
                  x{option.factor} {pending?.product.baseUnit || 'uds'}
                </span>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Paso 2: Entrada de cantidad (decimal) */}
      <Dialog open={pending?.step === 'quantity'} onOpenChange={handleDialogChange}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Ingresar cantidad</DialogTitle>
            <DialogDescription>
              ¿Cuánto desea vender de <span className="font-semibold">{pending?.product.name}</span>
              {pending?.presentationName ? ` (${pending.presentationName})` : ''}?
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center gap-2 py-6">
            <input
              autoFocus
              type="number"
              inputMode="decimal"
              step="any"
              min="0"
              placeholder="0.00"
              value={qtyText}
              onChange={(e) => {
                const raw = e.target.value;
                if (/^\d*\.?\d*$/.test(raw)) {
                  setQtyText(raw);
                  const parsed = parseFloat(raw);
                  setQuantityInput(Number.isFinite(parsed) ? parsed : 0);
                }
              }}
              className="w-full max-w-[220px] text-center text-4xl font-black border border-slate-200 rounded-xl py-3 tabular-nums focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
            />
            {pending?.presentationFactor && Number(pending.presentationFactor) > 1 && (
              <p className="text-xs text-slate-400">
                {pending.product.baseUnit || 'Unidad'} base: {pending.quantity} × {pending.presentationFactor} = {pending.quantity * pending.presentationFactor}
              </p>
            )}
          </div>
          <Button onClick={confirmQuantity} className="w-full h-12 text-base font-black">
            Confirmar cantidad
          </Button>
        </DialogContent>
      </Dialog>

      {/* Paso 3: Selección del nivel de precio (niveles del producto) */}
      <Dialog open={pending?.step === 'priceLevel'} onOpenChange={handleDialogChange}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Elegir nivel de precio</DialogTitle>
            <DialogDescription>
              ¿Qué precio aplica a <span className="font-semibold">{pending?.product.name}</span>?
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-3">
            {pending && getAvailablePriceLevels(pending.product).map(({ level, label, price }) => {
              const isDefault = level === pending.priceLevel;
              return (
                <button
                  key={level}
                  onClick={() => pickPriceLevel(level)}
                  className={cn(
                    'flex items-center justify-between gap-3 rounded-2xl border-2 p-4 text-left transition-all active:scale-[0.98]',
                    isDefault ? 'border-primary bg-primary/5' : 'border-slate-200 bg-white'
                  )}
                >
                  <div>
                    <p className="font-black">
                      Nivel {level} – {label}
                    </p>
                    {isDefault && <p className="text-xs font-semibold text-primary">Nivel del cliente</p>}
                  </div>
                  <span className="shrink-0 font-black text-primary">{formatCurrency(price)}</span>
                </button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}