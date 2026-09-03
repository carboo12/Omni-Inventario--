"use client";

import React, { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useSettings } from '@/hooks/use-settings';
import { cn } from '@/lib/utils';
import { Coins, CreditCard, DollarSign, Loader2, Wallet, ArrowLeft, Delete, Check } from 'lucide-react';
import { Separator } from '../ui/separator';
import { useToast } from '@/hooks/use-toast';
import { recordCreditPayment } from '@/lib/actions/customers';
import { CreditReceiptTemplate } from './credit-receipt-template';

interface CreditPaymentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  customer: {
    id: string;
    fullName: string;
    currentBalance: number;
  } | null;
  sessionId: string;
  userId: string;
  userName: string; // Added to show on receipt
  onSuccess: () => void;
}

const formatCurrency = (amount: number, currency: 'USD' | 'NIO' = 'NIO') => {
  if (currency === 'USD') {
    return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  return `C$${amount.toLocaleString('es-NI', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export function CreditPaymentDialog({ isOpen, onClose, customer, sessionId, userId, userName, onSuccess }: CreditPaymentDialogProps) {
  const { settings } = useSettings();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('cash-nio');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [receiptData, setReceiptData] = useState<any>(null);

  // States for inputs
  const [amountToPay, setAmountToPay] = useState('');
  const [cashReceived, setCashReceived] = useState('');
  const [activeField, setActiveField] = useState<'amount' | 'received'>('amount');

  useEffect(() => {
    if (isOpen) {
      setAmountToPay('');
      setCashReceived('');
      setIsProcessing(false);
      setShowReceipt(false);
      setReceiptData(null);
      setActiveTab('cash-nio');
      setActiveField('amount');
    }
  }, [isOpen]);

  if (!customer) return null;

  const amountToPayNum = parseFloat(amountToPay) || 0;
  const cashReceivedNum = parseFloat(cashReceived) || 0;
  
  let change = 0;
  if (activeTab === 'cash-nio') {
    change = cashReceivedNum - amountToPayNum;
  } else if (activeTab === 'cash-usd') {
    const cashInNIO = cashReceivedNum * parseFloat(settings.exchangeRate);
    change = cashInNIO - amountToPayNum;
  }

  const isValidAmount = amountToPayNum > 0 && amountToPayNum <= customer.currentBalance;
  const canFinalize = isValidAmount && (activeTab === 'card' || change >= 0);

  // Numpad Handlers
  const handleNumpadInput = (val: string) => {
    if (val === '.' && (activeField === 'amount' ? amountToPay : cashReceived).includes('.')) return;
    
    if (activeField === 'amount') {
      setAmountToPay(prev => prev + val);
    } else {
      setCashReceived(prev => prev + val);
    }
  };

  const handleBackspace = () => {
    if (activeField === 'amount') {
      setAmountToPay(prev => prev.slice(0, -1));
    } else {
      setCashReceived(prev => prev.slice(0, -1));
    }
  };

  const handleClear = () => {
    if (activeField === 'amount') setAmountToPay('');
    else setCashReceived('');
  };

  const handleExactPay = () => {
    if (activeField === 'amount') {
      setAmountToPay(customer.currentBalance.toFixed(2));
    } else {
      setCashReceived(amountToPayNum.toFixed(2));
    }
  };

  const handleDenomination = (denom: number) => {
    if (activeField === 'amount') {
      setAmountToPay(prev => ( (parseFloat(prev) || 0) + denom).toFixed(2));
    } else {
      setCashReceived(prev => ( (parseFloat(prev) || 0) + denom).toFixed(2));
    }
  };

  const handleProcessPayment = async () => {
    if (!isValidAmount || isProcessing) return;

    setIsProcessing(true);
    try {
      let paymentMethod = 'Efectivo C$';
      if (activeTab === 'cash-usd') paymentMethod = 'Efectivo $';
      if (activeTab === 'card') paymentMethod = 'Tarjeta';

      const result = await recordCreditPayment({
        customerId: customer.id,
        amount: amountToPayNum,
        paymentMethod,
        sessionId,
        userId
      });

      if (result.success) {
        // Prepare receipt data
        const newReceipt = {
            businessName: settings.ticketHeader.name,
            address: settings.ticketHeader.address,
            phone: settings.ticketHeader.phone,
            rfc: settings.ticketHeader.rfc,
            receiptId: `ABO-${Date.now().toString().slice(-6)}`,
            date: new Date(),
            cashierName: userName || 'Cajero',
            customerName: customer.fullName,
            previousBalance: customer.currentBalance,
            amountPaid: amountToPayNum,
            newBalance: customer.currentBalance - amountToPayNum,
            paymentMethod,
            footerMessage: settings.ticketFooter.message,
            website: settings.ticketFooter.website,
            logoSvg: settings.logoSvg
        };

        setReceiptData(newReceipt);
        setShowReceipt(true);
        onSuccess();
        
        toast({ title: "Abono Registrado", description: `Se ha aplicado un abono de ${formatCurrency(amountToPayNum)}` });
      } else {
        const errorMsg = (result as any).error || "No se pudo registrar el abono";
        toast({ title: "Error", description: errorMsg, variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error", description: "Ocurrió un error inesperado", variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePrint = () => {
    setTimeout(() => {
        window.print();
        onClose();
    }, 100);
  };

  if (showReceipt && receiptData) {
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-[#8BC34A]">
                        <Check className="h-6 w-6" />
                        Abono Registrado Exitosamente
                    </DialogTitle>
                </DialogHeader>
                
                <div className="flex flex-col items-center p-4 bg-gray-50 rounded-xl border border-dashed">
                    <CreditReceiptTemplate {...receiptData} previewMode />
                </div>

                <div className="grid grid-cols-2 gap-3 mt-4">
                    <Button 
                        variant="outline" 
                        onClick={onClose}
                        className="h-12 font-bold rounded-xl"
                    >
                        CERRAR
                    </Button>
                    <Button 
                        onClick={handlePrint}
                        className="h-12 font-black rounded-xl bg-[#673AB7] hover:bg-[#5E35B1] text-white shadow-lg"
                    >
                        IMPRIMIR TICKET
                    </Button>
                </div>
            </DialogContent>
            {/* The actual hidden print template */}
            <CreditReceiptTemplate {...receiptData} />
        </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={isProcessing ? undefined : onClose}>
      <DialogContent className="max-w-[95vw] sm:max-w-[1100px] p-0 overflow-hidden border-none shadow-2xl">
        <div className="flex flex-col md:flex-row h-[90vh] md:h-[750px] bg-white">
          
          {/* Left Side: Info & Inputs (40%) */}
          <div className="w-full md:w-[42%] p-6 flex flex-col border-r bg-gray-50/50">
            <DialogHeader className="mb-4">
              <DialogTitle className="flex items-center gap-2 text-2xl font-black text-[#673AB7]">
                <Wallet className="h-7 w-7" />
                ABONO DE CLIENTE
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 flex-1">
              {/* Customer Info Card */}
              <div className="p-4 rounded-xl bg-white border shadow-sm space-y-1">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Cliente Seleccionado</p>
                <p className="text-lg font-bold truncate">{customer.fullName}</p>
                <div className="pt-2 flex justify-between items-end">
                    <span className="text-xs font-bold text-destructive uppercase">Saldo Pendiente</span>
                    <span className="text-2xl font-black text-destructive">{formatCurrency(customer.currentBalance)}</span>
                </div>
              </div>

              {/* Amount to Pay Input */}
              <div 
                className={cn(
                    "p-4 rounded-xl border-2 transition-all cursor-pointer",
                    activeField === 'amount' ? "border-[#673AB7] bg-[#673AB7]/5 ring-4 ring-[#673AB7]/10" : "border-transparent bg-white shadow-sm"
                )}
                onClick={() => setActiveField('amount')}
              >
                <Label className="text-xs font-black uppercase mb-2 block">Monto a Abonar (C$)</Label>
                <div className="flex items-center justify-between">
                    <Coins className={cn("h-6 w-6", activeField === 'amount' ? "text-[#673AB7]" : "text-gray-300")} />
                    <span className="text-3xl font-mono font-black">{amountToPay || '0.00'}</span>
                </div>
                {amountToPayNum > customer.currentBalance && (
                    <p className="text-[10px] text-destructive font-bold mt-1 uppercase">Excede el saldo</p>
                )}
              </div>

              {/* Tabs for Payment Method */}
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-3 h-12 bg-gray-200 p-1 rounded-xl">
                  <TabsTrigger value="cash-nio" className="rounded-lg data-[state=active]:bg-white data-[state=active]:text-[#673AB7] font-bold">C$</TabsTrigger>
                  <TabsTrigger value="cash-usd" className="rounded-lg data-[state=active]:bg-white data-[state=active]:text-[#03A9F4] font-bold">$</TabsTrigger>
                  <TabsTrigger value="card" className="rounded-lg data-[state=active]:bg-white data-[state=active]:text-blue-600 font-bold">Tarjeta</TabsTrigger>
                </TabsList>

                <div className="mt-4">
                  {activeTab !== 'card' ? (
                    <div 
                      className={cn(
                        "p-4 rounded-xl border-2 transition-all cursor-pointer",
                        activeField === 'received' ? "border-[#03A9F4] bg-[#03A9F4]/5 ring-4 ring-[#03A9F4]/10" : "border-transparent bg-white shadow-sm"
                      )}
                      onClick={() => setActiveField('received')}
                    >
                      <Label className="text-xs font-black uppercase mb-2 block">Recibido ({activeTab === 'cash-nio' ? 'C$' : '$'})</Label>
                      <div className="flex items-center justify-between">
                          <DollarSign className={cn("h-6 w-6", activeField === 'received' ? "text-[#03A9F4]" : "text-gray-300")} />
                          <span className="text-3xl font-mono font-black">{cashReceived || '0.00'}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="p-8 border-2 border-dashed border-blue-200 rounded-xl bg-blue-50 flex flex-col items-center justify-center text-center">
                        <CreditCard className="h-12 w-12 text-blue-500 mb-2" />
                        <p className="text-sm font-bold text-blue-700">Confirmar pago con tarjeta</p>
                    </div>
                  )}
                </div>
              </Tabs>

              {/* Change/Result Area */}
              {activeTab !== 'card' && amountToPayNum > 0 && (
                <div className={cn(
                    "p-4 rounded-xl flex justify-between items-center animate-in zoom-in-95",
                    change < 0 ? "bg-red-50 text-red-700 border border-red-200" : "bg-green-50 text-green-700 border border-green-200"
                )}>
                    <span className="font-black text-xs uppercase">{change < 0 ? 'Faltante' : 'Cambio'}</span>
                    <span className="text-2xl font-black">{formatCurrency(Math.abs(change))}</span>
                </div>
              )}
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
                <Button variant="outline" onClick={onClose} className="h-12 font-bold rounded-xl">CANCELAR</Button>
                <Button 
                    className="h-12 font-black rounded-xl bg-[#8BC34A] hover:bg-[#7CB342] text-white shadow-lg disabled:opacity-50"
                    disabled={!canFinalize || isProcessing}
                    onClick={handleProcessPayment}
                >
                    {isProcessing ? <Loader2 className="animate-spin" /> : 'CONFIRMAR'}
                </Button>
            </div>
          </div>

          {/* Right Side: Numpad (60%) */}
          <div className="flex-1 bg-white p-2 flex flex-col">
            <div className={cn(
                "p-2 rounded-t-lg text-white font-black flex justify-between items-center transition-colors",
                activeField === 'amount' ? "bg-[#673AB7]" : "bg-[#03A9F4]"
            )}>
                <span className="text-sm uppercase tracking-widest">
                    {activeField === 'amount' ? 'Editando: MONTO ABONO' : 'Editando: EFECTIVO RECIBIDO'}
                </span>
                <span className="text-xs opacity-80">TOUCH INTERFACE</span>
            </div>

            <div className="flex-1 grid grid-cols-4 grid-rows-4 gap-2 mt-2">
                {/* Column 1 */}
                <div className="bg-[#FF5722] hover:bg-[#F4511E] text-white rounded-lg cursor-pointer flex flex-col items-center justify-center transition-all active:scale-95" onClick={handleClear}>
                    <ArrowLeft className="w-8 h-8 mb-1" />
                    <span className="font-black text-xs">BORRAR</span>
                </div>
                {[1, 4, 7].map(num => (
                    <div key={num} className="bg-[#03A9F4] hover:bg-[#0288D1] text-white rounded-lg cursor-pointer flex items-center justify-center font-black text-4xl transition-all active:scale-95" onClick={() => handleNumpadInput(num.toString())}>
                        {num}
                    </div>
                ))}

                {/* Column 2 */}
                <div className="bg-[#8BC34A] hover:bg-[#7CB342] text-white rounded-lg cursor-pointer flex flex-col items-center justify-center font-black text-center p-2 transition-all active:scale-95 leading-tight" onClick={handleExactPay}>
                    <span className="text-sm">PAGO<br/>EXACTO</span>
                </div>
                {[2, 5, 8].map(num => (
                    <div key={num} className="bg-[#03A9F4] hover:bg-[#0288D1] text-white rounded-lg cursor-pointer flex items-center justify-center font-black text-4xl transition-all active:scale-95" onClick={() => handleNumpadInput(num.toString())}>
                        {num}
                    </div>
                ))}

                {/* Column 3 */}
                <div className="bg-[#FF5722] hover:bg-[#F4511E] text-white rounded-lg cursor-pointer flex flex-col items-center justify-center font-black transition-all active:scale-95" onClick={handleBackspace}>
                    <Delete className="w-8 h-8" />
                </div>
                {[3, 6, 9].map(num => (
                    <div key={num} className="bg-[#03A9F4] hover:bg-[#0288D1] text-white rounded-lg cursor-pointer flex items-center justify-center font-black text-4xl transition-all active:scale-95" onClick={() => handleNumpadInput(num.toString())}>
                        {num}
                    </div>
                ))}

                {/* Column 4: Denominations or Actions */}
                <div className="bg-[#4CAF50] hover:bg-[#388E3C] text-white rounded-lg cursor-pointer flex items-center justify-center font-black text-2xl transition-all active:scale-95" onClick={handleProcessPayment}>
                    <Check className="w-10 h-10" />
                </div>
                
                {activeTab === 'cash-nio' ? (
                    <>
                        <div className="bg-[#FF9800] hover:bg-[#F57C00] text-white rounded-lg cursor-pointer flex flex-col items-center justify-center font-black transition-all active:scale-95" onClick={() => handleDenomination(10)}>
                            <span className="text-xs opacity-70">C$</span>
                            <span className="text-xl">10</span>
                        </div>
                        <div className="bg-[#FF9800] hover:bg-[#F57C00] text-white rounded-lg cursor-pointer flex flex-col items-center justify-center font-black transition-all active:scale-95" onClick={() => handleDenomination(50)}>
                            <span className="text-xs opacity-70">C$</span>
                            <span className="text-xl">50</span>
                        </div>
                        <div className="bg-[#FF9800] hover:bg-[#F57C00] text-white rounded-lg cursor-pointer flex flex-col items-center justify-center font-black transition-all active:scale-95" onClick={() => handleDenomination(100)}>
                            <span className="text-xs opacity-70">C$</span>
                            <span className="text-xl">100</span>
                        </div>
                    </>
                ) : (
                    <>
                        <div className="bg-[#FF9800] hover:bg-[#F57C00] text-white rounded-lg cursor-pointer flex flex-col items-center justify-center font-black transition-all active:scale-95" onClick={() => handleDenomination(1)}>
                            <span className="text-xs opacity-70">$</span>
                            <span className="text-xl">1</span>
                        </div>
                        <div className="bg-[#FF9800] hover:bg-[#F57C00] text-white rounded-lg cursor-pointer flex flex-col items-center justify-center font-black transition-all active:scale-95" onClick={() => handleDenomination(5)}>
                            <span className="text-xs opacity-70">$</span>
                            <span className="text-xl">5</span>
                        </div>
                        <div className="bg-[#FF9800] hover:bg-[#F57C00] text-white rounded-lg cursor-pointer flex flex-col items-center justify-center font-black transition-all active:scale-95" onClick={() => handleDenomination(20)}>
                            <span className="text-xs opacity-70">$</span>
                            <span className="text-xl">20</span>
                        </div>
                    </>
                )}
            </div>

            {/* Bottom Row Numpad */}
            <div className="h-20 grid grid-cols-4 gap-2 mt-2">
                <div className="bg-[#03A9F4] hover:bg-[#0288D1] text-white rounded-lg cursor-pointer flex items-center justify-center font-black text-4xl transition-all active:scale-95" onClick={() => handleNumpadInput('.')}>.</div>
                <div className="bg-[#03A9F4] hover:bg-[#0288D1] text-white rounded-lg cursor-pointer flex items-center justify-center font-black text-4xl transition-all active:scale-95" onClick={() => handleNumpadInput('0')}>0</div>
                <div className="col-span-2 bg-[#8BC34A] hover:bg-[#7CB342] text-white rounded-lg cursor-pointer flex items-center justify-center font-black text-xl transition-all active:scale-95" onClick={handleProcessPayment}>
                    TOTALIZAR ABONO
                </div>
            </div>
          </div>

        </div>
      </DialogContent>
    </Dialog>
  );
}
