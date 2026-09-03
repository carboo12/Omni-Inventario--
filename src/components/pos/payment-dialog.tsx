
"use client";

import React, { useState, useMemo, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useSettings } from '@/hooks/use-settings';
import { cn } from '@/lib/utils';
import { Coins, CreditCard, DollarSign, ReceiptText, Loader2 } from 'lucide-react';
import { Separator } from '../ui/separator';
import { ScrollArea } from '../ui/scroll-area';

interface PaymentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  total: number;
  onSuccessfulPayment: (amountPaid: number, change: number, paymentMethod: string) => Promise<void>;
}

const formatCurrency = (amount: number, currency: 'USD' | 'NIO' = 'NIO') => {
  if (currency === 'USD') {
    return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  return `C$${amount.toLocaleString('es-NI', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export function PaymentDialog({ isOpen, onClose, total, onSuccessfulPayment }: PaymentDialogProps) {
  const { settings } = useSettings();
  const [activeTab, setActiveTab] = useState('cash-nio');
  const [isProcessing, setIsProcessing] = useState(false);

  const [nioReceived, setNioReceived] = useState('');
  const [usdReceived, setUsdReceived] = useState('');

  useEffect(() => {
    if (isOpen) {
      setNioReceived('');
      setUsdReceived('');
      setIsProcessing(false);
      // Set default tab based on enabled payment methods
      if (settings.allowCash) setActiveTab('cash-nio');
      else if (settings.allowDollars) setActiveTab('cash-usd');
      else if (settings.allowCard) setActiveTab('card');
      else setActiveTab('cash-nio');
    }
  }, [isOpen, settings]);

  const nioReceivedNum = parseFloat(nioReceived) || 0;
  const changeNIO = nioReceivedNum - total;

  const usdReceivedNum = parseFloat(usdReceived) || 0;
  const usdReceivedInNIO = usdReceivedNum * parseFloat(settings.exchangeRate);
  const changeUSDinNIO = usdReceivedInNIO - total;

  const canPayNIO = nioReceivedNum >= total;
  const canPayUSD = usdReceivedInNIO >= total;
  const canPayCard = true; // Always true for card

  const handleFinalizeSale = async () => {
    if (isProcessing) return;
    setIsProcessing(true);

    let amountPaid = 0;
    let change = 0;
    let paymentMethod = '';

    if (activeTab === 'cash-nio') {
      amountPaid = nioReceivedNum;
      change = changeNIO;
      paymentMethod = 'Efectivo C$';
    } else if (activeTab === 'cash-usd') {
      amountPaid = usdReceivedInNIO;
      change = changeUSDinNIO;
      paymentMethod = 'Efectivo $';
    } else if (activeTab === 'card') {
      amountPaid = total;
      change = 0;
      paymentMethod = 'Tarjeta';
    }

    try {
      await onSuccessfulPayment(amountPaid, change, paymentMethod);
    } catch (error) {
      console.error("Payment failed", error);
      setIsProcessing(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={isProcessing ? undefined : onClose}>
      <DialogContent className="sm:max-w-xl grid-rows-[auto,1fr,auto] p-0">
        <ScrollArea className="max-h-[90vh]">
          <div className="p-6 pb-0">
            <DialogHeader>
              <DialogTitle>Procesar Pago</DialogTitle>
              <DialogDescription>Seleccione el método de pago e ingrese el monto recibido.</DialogDescription>
            </DialogHeader>

            <div className="my-4">
              <div className="flex justify-between items-baseline p-4 rounded-lg bg-muted">
                <span className="text-lg font-medium text-muted-foreground">Total a Pagar:</span>
                <span className="text-4xl font-bold text-primary">{formatCurrency(total)}</span>
              </div>
            </div>
          </div>
          <div className='px-6'>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="cash-nio" disabled={isProcessing}><Coins className='mr-2 h-4 w-4' />Efectivo (C$)</TabsTrigger>
                <TabsTrigger value="cash-usd" disabled={!settings.allowDollars || isProcessing}><DollarSign className='mr-2 h-4 w-4' />Efectivo ($)</TabsTrigger>
                <TabsTrigger value="card" disabled={!settings.allowCard || isProcessing}><CreditCard className='mr-2 h-4 w-4' />Tarjeta</TabsTrigger>
                <TabsTrigger value="multi" disabled><ReceiptText className='mr-2 h-4 w-4' />Múltiple</TabsTrigger>
              </TabsList>

              {/* CÓRDOBAS */}
              <TabsContent value="cash-nio">
                <div className='p-1'>
                  <div className="grid gap-2">
                    <Label htmlFor="nio-received" className="text-lg font-semibold">Efectivo Recibido (C$)</Label>
                    <Input
                      id="nio-received"
                      type="number"
                      value={nioReceived}
                      onChange={(e) => setNioReceived(e.target.value)}
                      placeholder="0.00"
                      className="text-2xl h-14 text-right font-mono"
                      autoFocus
                      disabled={isProcessing}
                    />
                  </div>

                  {nioReceivedNum > 0 && (
                    <div className='mt-6 p-4 rounded-lg border space-y-4'>
                      <div className="flex justify-between items-center text-lg">
                        <span className="font-medium">Recibido</span>
                        <span>{formatCurrency(nioReceivedNum)}</span>
                      </div>
                      <div className="flex justify-between items-center text-lg">
                        <span className="font-medium">Total</span>
                        <span>- {formatCurrency(total)}</span>
                      </div>
                      <Separator />
                      <div className={cn("flex justify-between items-center text-2xl font-bold", changeNIO < 0 ? 'text-destructive' : 'text-green-600')}>
                        <span >{changeNIO < 0 ? 'Faltante' : 'Cambio'}</span>
                        <span >{formatCurrency(Math.abs(changeNIO))}</span>
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* DÓLARES */}
              <TabsContent value="cash-usd">
                <div className='p-1'>
                  <div className="grid gap-2">
                    <Label htmlFor="usd-received" className="text-lg font-semibold">Efectivo Recibido ($)</Label>
                    <Input
                      id="usd-received"
                      type="number"
                      value={usdReceived}
                      onChange={(e) => setUsdReceived(e.target.value)}
                      placeholder="0.00"
                      className="text-2xl h-14 text-right font-mono"
                      disabled={isProcessing}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground text-center mt-2">Tipo de cambio: C$ {settings.exchangeRate} por $1</p>

                  {usdReceivedNum > 0 && (
                    <div className='mt-6 p-4 rounded-lg border space-y-4'>
                      <div className="flex justify-between items-center text-lg">
                        <span className="font-medium">Recibido ($)</span>
                        <div className='text-right'>
                          <span>{formatCurrency(usdReceivedNum, 'USD')}</span>
                          <p className='text-xs text-muted-foreground'> (equiv. {formatCurrency(usdReceivedInNIO)})</p>
                        </div>
                      </div>
                      <div className="flex justify-between items-center text-lg">
                        <span className="font-medium">Total</span>
                        <span>- {formatCurrency(total)}</span>
                      </div>
                      <Separator />
                      <div className={cn("flex justify-between items-center text-2xl font-bold", changeUSDinNIO < 0 ? 'text-destructive' : 'text-green-600')}>
                        <span>{changeUSDinNIO < 0 ? 'Faltante (C$)' : 'Cambio (C$)'}</span>
                        <span>{formatCurrency(Math.abs(changeUSDinNIO))}</span>
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* TARJETA */}
              <TabsContent value="card">
                <div className='p-4 text-center space-y-4'>
                  <CreditCard className='w-24 h-24 mx-auto text-blue-500' />
                  <p className='text-lg'>Confirme el pago con tarjeta por el monto total de:</p>
                  <p className='text-3xl font-bold'>{formatCurrency(total)}</p>
                  <p className='text-sm text-muted-foreground'>Asegúrese de que la transacción sea aprobada en el datafono.</p>
                </div>
              </TabsContent>
            </Tabs>
          </div>

          <DialogFooter className='p-6 pt-4 mt-4 bg-background sticky bottom-0 border-t'>
            <Button variant="outline" onClick={onClose} disabled={isProcessing}>Cancelar</Button>
            <Button
              onClick={handleFinalizeSale}
              disabled={
                isProcessing ||
                (activeTab === 'cash-nio' && !canPayNIO) ||
                (activeTab === 'cash-usd' && !canPayUSD) ||
                (activeTab === 'card' && !canPayCard)
              }
              className='w-48'
            >
              {isProcessing ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Procesando...</> : 'Finalizar Venta'}
            </Button>
          </DialogFooter>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
