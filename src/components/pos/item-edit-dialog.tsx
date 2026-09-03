"use client";

import React, { useState, useEffect } from 'react';
import type { CartItem, Product } from '@/lib/types';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { cn, formatCurrency } from '@/lib/utils';
import { Trash2 } from 'lucide-react';
import { getBulkPresentationOptions } from '@/lib/presentations';

// Niveles de precio del producto (las presentaciones fijas no tienen precios propios).
const getProductPriceLevels = (product: Product): Array<{ level: number; label: string; price: number }> => {
  const levels = [{ level: 1, label: 'Detalle', price: product.priceNIO }];
  const p2 = Number((product as any).price2);
  const p3 = Number((product as any).price3);
  const p4 = Number((product as any).price4);
  if (p2 > 0) levels.push({ level: 2, label: 'Mayor', price: p2 });
  if (p3 > 0) levels.push({ level: 3, label: 'Paca / Bulto', price: p3 });
  if (p4 > 0) levels.push({ level: 4, label: 'Vol. Especial', price: p4 });
  return levels;
};

// Precio directo del nivel elegido del producto.
const getProductPrice = (product: Product, priceLevel: number): number => {
  if (priceLevel === 2 && Number((product as any).price2) > 0) return Number((product as any).price2);
  if (priceLevel === 3 && Number((product as any).price3) > 0) return Number((product as any).price3);
  if (priceLevel === 4 && Number((product as any).price4) > 0) return Number((product as any).price4);
  return product.priceNIO;
};

export interface ItemEditUpdates {
  quantity?: number;
  priceLevel?: number;
  presentationId?: string;
  presentationName?: string;
  presentationFactor?: number;
}

interface ItemEditDialogProps {
  item: CartItem | null;
  onClose: () => void;
  onSave: (itemId: string, updates: ItemEditUpdates) => void;
  onRemove: (itemId: string) => void;
}

export function ItemEditDialog({ item, onClose, onSave, onRemove }: ItemEditDialogProps) {
  const [qtyText, setQtyText] = useState('');
  const [priceLevel, setPriceLevel] = useState(1);
  const [presentationId, setPresentationId] = useState<string>('unit');
  const [presentationName, setPresentationName] = useState<string | undefined>(undefined);
  const [presentationFactor, setPresentationFactor] = useState<number | undefined>(undefined);

  // Sincroniza el estado interno al abrir el modal con un ítem.
  useEffect(() => {
    if (item) {
      setQtyText(String(item.quantity));
      setPriceLevel(item.priceLevel ?? 1);
      setPresentationId(item.presentation ?? 'unit');
      setPresentationName(item.presentationName ?? undefined);
      setPresentationFactor((typeof item.presentationFactor === 'number' && item.presentationFactor > 0) ? item.presentationFactor : undefined);
    }
  }, [item]);

  if (!item) return null;

  const bulkOptions = getBulkPresentationOptions(item.product);
  const levels = getProductPriceLevels(item.product);
  const unitPrice = getProductPrice(item.product, priceLevel);
  const hasMultiLevel = levels.length > 1;

  const handleSave = () => {
    const parsed = parseFloat(qtyText);
    const quantity = Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
    if (quantity <= 0) return;
    const updates: ItemEditUpdates = { quantity, priceLevel, presentationId, presentationName, presentationFactor };
    onSave(item.id, updates);
    onClose();
  };

  return (
    <Dialog open={!!item} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Ítem</DialogTitle>
          <DialogDescription>
            <span className="font-semibold">{item.product.name}</span>
            {item.product.barcode ? ` · ${item.product.barcode}` : ''}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Cantidad */}
          <div className="space-y-2">
            <p className="text-sm font-semibold text-slate-700">Cantidad</p>
            <div className="flex items-center justify-center gap-2">
              <input
                autoFocus
                type="number"
                inputMode="decimal"
                step="any"
                min="0"
                value={qtyText}
                onChange={(e) => {
                  const raw = e.target.value;
                  if (/^\d*\.?\d*$/.test(raw)) setQtyText(raw);
                }}
                className="w-full max-w-[180px] text-center text-3xl font-black border border-slate-200 rounded-xl py-2 tabular-nums focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
              />
            </div>
            {item.product.isFractional && (
              <p className="text-center text-xs text-slate-400">Puede ingresar fracciones, ej. 0.5 · 1.25</p>
            )}
          </div>

          {/* Presentación / Unidad */}
          {bulkOptions.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-semibold text-slate-700">Presentación</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => { setPresentationId('unit'); setPresentationName(undefined); setPresentationFactor(undefined); }}
                  className={cn(
                    'rounded-xl border-2 p-3 text-center font-black transition-all active:scale-[0.98]',
                    presentationId === 'unit' ? 'border-primary bg-primary/5' : 'border-slate-200 bg-white'
                  )}
                >
                  <span className="block text-lg">{item.product.isFractional ? '⚖️' : '📦'}</span>
                  {item.product.isFractional ? (item.product.baseUnit || 'Libra') : 'Unidad'}
                </button>
                {bulkOptions.map((option) => (
                  <button
                    key={option.key}
                    onClick={() => { setPresentationId(option.key); setPresentationName(option.name); setPresentationFactor(option.factor); }}
                    className={cn(
                      'rounded-xl border-2 p-3 text-center font-black transition-all active:scale-[0.98]',
                      presentationId === option.key ? 'border-primary bg-primary/5' : 'border-slate-200 bg-white'
                    )}
                  >
                    <span className="block text-lg">📦</span>
                    {option.name}
                    <span className="block text-[10px] text-slate-500">x{option.factor} {item.product.baseUnit || 'uds'}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Nivel de precio */}
          {hasMultiLevel && (
            <div className="space-y-2">
              <p className="text-sm font-semibold text-slate-700">Nivel de Precio</p>
              <div className="grid grid-cols-1 gap-2">
                {levels.map(({ level, label, price }) => (
                  <button
                    key={level}
                    onClick={() => setPriceLevel(level)}
                    className={cn(
                      'flex items-center justify-between gap-3 rounded-xl border-2 p-3 text-left transition-all active:scale-[0.98]',
                      priceLevel === level ? 'border-primary bg-primary/5' : 'border-slate-200 bg-white'
                    )}
                  >
                    <div>
                      <p className="font-black text-sm">Nivel {level} – {label}</p>
                      {priceLevel === level && <p className="text-[10px] font-semibold text-primary">Aplicado</p>}
                    </div>
                    <span className="shrink-0 font-black text-primary">{formatCurrency(price)}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex items-center justify-between gap-2">
          <Button
            variant="destructive"
            size="sm"
            onClick={() => { onRemove(item.id); onClose(); }}
          >
            <Trash2 className="w-4 h-4 mr-1" />
            Eliminar
          </Button>
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-500">
              Subtotal: <span className="font-black text-primary">{formatCurrency(unitPrice * (Number.isFinite(parseFloat(qtyText)) ? parseFloat(qtyText) : 0))}</span>
            </span>
            <Button onClick={handleSave} disabled={!(Number.isFinite(parseFloat(qtyText)) && parseFloat(qtyText) > 0)}>
              Guardar
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}