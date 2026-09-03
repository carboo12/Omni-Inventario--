"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Check, Delete } from 'lucide-react';
import { cn, formatNumber } from '@/lib/utils';
import { useSettings } from '@/hooks/use-settings';

interface PaymentGridProps {
    total: number;
    onCancel: () => void;
    onComplete: (amountPaid: number, change: number, method: string) => void;
    customerName?: string;
}

type PaymentStep = 'method-selection' | 'currency-selection' | 'cash-entry';
type Currency = 'NIO' | 'USD';

export function PaymentGrid({ total, onCancel, onComplete, customerName }: PaymentGridProps) {
    const { settings } = useSettings();
    const [step, setStep] = useState<PaymentStep>('method-selection');
    const [paymentMethod, setPaymentMethod] = useState<string>('');
    const [currency, setCurrency] = useState<Currency>('NIO');
    const [amountInputs, setAmountInputs] = useState<string>('');

    const handleMethodSelect = (method: string) => {
        if (method === 'Efectivo') {
            setPaymentMethod('Efectivo');
            // Si no se permiten dólares, ir directo a entrada de córdobas
            if (!settings.allowDollars) {
                setCurrency('NIO');
                setStep('cash-entry');
                setAmountInputs('');
            } else {
                setStep('currency-selection');
            }
        } else if (method === 'Credito') {
            onComplete(total, 0, 'Credito');
        } else {
            // Instant complete for non-cash methods for now (can expand later)
            onComplete(total, 0, method);
        }
    };

    const handleCurrencySelect = (selectedCurrency: Currency) => {
        setCurrency(selectedCurrency);
        setStep('cash-entry');
        setAmountInputs('');
    };

    const handleNumpadInput = (value: string) => {
        if (value === '.' && amountInputs.includes('.')) return;
        setAmountInputs(prev => prev + value);
    };

    const handleBackspace = () => {
        setAmountInputs(prev => prev.slice(0, -1));
    };

    const handleClear = () => {
        setAmountInputs('');
    };

    const handleExactPay = () => {
        if (currency === 'USD') {
            const totalInUSD = total / parseFloat(settings.exchangeRate);
            setAmountInputs(totalInUSD.toFixed(2));
        } else {
            setAmountInputs(total.toString());
        }
    };

    const handleDenomination = (amount: number) => {
        setAmountInputs(prev => {
            const current = parseFloat(prev) || 0;
            return (current + amount).toString();
        });
    };

    const handleTotalizar = () => {
        const paid = parseFloat(amountInputs) || 0;
        let paidInNIO = paid;

        // Convert to NIO if paying in USD
        if (currency === 'USD') {
            paidInNIO = paid * parseFloat(settings.exchangeRate);
        }

        if (paidInNIO < total) {
            if (paid === 0) {
                handleExactPay();
                return;
            }
            
            // Only block if the setting is enabled
            if (settings.blockInsufficientCash) {
                alert("Monto insuficiente: El pago debe ser igual o mayor al total.");
                return;
            }
        }

        const change = paidInNIO - total;
        const methodLabel = currency === 'USD' ? 'Efectivo $' : 'Efectivo C$';
        onComplete(paidInNIO, change, methodLabel);
    };

    const formatCurrency = (amount: number, curr: Currency = 'NIO') => {
        const symbol = curr === 'USD' ? '$' : 'C$';
        return `${symbol} ${formatNumber(amount)}`;
    };

    if (step === 'method-selection') {
        return (
            <div className="w-full h-full flex flex-col bg-white">
                {/* Header / Info Area */}
                <div className="h-24 bg-gray-100 p-4 flex justify-between items-center border-b gap-4">
                    <div className="min-w-0">
                        <p className="text-sm font-bold text-muted-foreground">FACTURA: CONTADO</p>
                    </div>
                    <div className="text-right shrink-0">
                        <p className="text-sm font-bold text-muted-foreground">TOTAL A PAGAR</p>
                        <p className="text-3xl font-bold text-primary">{formatCurrency(total)}</p>
                    </div>
                </div>

                {/* Main Grid Buttons - llena todo el ancho, altura cómoda */}
                <div className="flex-1 p-4 grid grid-cols-2 xl:grid-cols-3 gap-4 w-full content-start min-h-0">
                    {/* Back Button */}
                    <div className="col-span-1 min-h-[110px] bg-[#FF5722] hover:bg-[#F4511E] text-white rounded-lg cursor-pointer flex flex-col items-center justify-center p-4 transition-colors" onClick={onCancel}>
                        <ArrowLeft className="w-12 h-12 mb-2" />
                        <span className="font-bold text-xl">VOLVER</span>
                    </div>

                    {/* Efectivo */}
                    {settings.allowCash && (
                        <div className="col-span-1 min-h-[110px] bg-[#673AB7] hover:bg-[#5E35B1] text-white rounded-lg cursor-pointer p-4 transition-colors flex flex-col justify-center" onClick={() => handleMethodSelect('Efectivo')}>
                            <span className="font-bold text-lg block">EFECTIVO</span>
                            <span className="text-sm opacity-80 block mt-1">F1</span>
                        </div>
                    )}

                    {/* Crédito */}
                    <div 
                        className={cn(
                            "col-span-1 min-h-[110px] text-white rounded-lg p-4 transition-colors flex flex-col justify-center",
                            customerName && customerName !== 'ANONIM' 
                                ? "bg-[#673AB7] hover:bg-[#5E35B1] cursor-pointer" 
                                : "bg-gray-300 cursor-not-allowed opacity-50"
                        )}
                        onClick={() => (customerName && customerName !== 'ANONIM') && handleMethodSelect('Credito')}
                    >
                        <span className="font-bold text-lg block">CRÉDITO</span>
                        <span className="text-sm opacity-80 block mt-1">{customerName && customerName !== 'ANONIM' ? 'F2' : 'Sin Cliente'}</span>
                    </div>

                    {/* Tarjeta */}
                    {settings.allowCard && (
                        <div className="col-span-1 min-h-[110px] bg-[#673AB7] hover:bg-[#5E35B1] text-white rounded-lg cursor-pointer p-4 transition-colors flex flex-col justify-center" onClick={() => handleMethodSelect('Tarjeta')}>
                            <span className="font-bold text-lg block uppercase">Tarjeta</span>
                            <span className="text-sm opacity-80 block mt-1">F3</span>
                        </div>
                    )}
                </div>

            </div>
        );
    }

    if (step === 'currency-selection') {
        return (
            <div className="w-full h-full flex flex-col bg-white">
                {/* Header */}
                <div className="h-24 bg-gray-100 p-4 flex justify-between items-center border-b">
                    <div>
                        <p className="text-sm font-bold text-muted-foreground">SELECCIONE MONEDA</p>
                        <p className="text-lg font-bold text-primary">PAGO EN EFECTIVO</p>
                    </div>
                    <div className="text-right">
                        <p className="text-sm font-bold text-muted-foreground">TOTAL A PAGAR</p>
                        <p className="text-3xl font-bold text-primary">{formatCurrency(total)}</p>
                    </div>
                </div>

                {/* Currency Selection Buttons */}
                <div className="flex-1 p-8 flex flex-col gap-4 items-center justify-center">
                    <div
                        className="w-full max-w-md h-32 bg-[#03A9F4] hover:bg-[#0288D1] text-white rounded-lg cursor-pointer flex flex-col items-center justify-center transition-colors shadow-lg"
                        onClick={() => handleCurrencySelect('NIO')}
                    >
                        <span className="font-bold text-4xl mb-2">C$</span>
                        <span className="text-xl">Córdobas</span>
                    </div>

                    <div
                        className="w-full max-w-md h-32 bg-[#03A9F4] hover:bg-[#0288D1] text-white rounded-lg cursor-pointer flex flex-col items-center justify-center transition-colors shadow-lg"
                        onClick={() => handleCurrencySelect('USD')}
                    >
                        <span className="font-bold text-4xl mb-2">$</span>
                        <span className="text-xl">Dólares</span>
                        <span className="text-sm opacity-80 mt-1">Tipo de cambio: C$ {settings.exchangeRate}</span>
                    </div>

                    <Button
                        variant="outline"
                        size="lg"
                        className="mt-4"
                        onClick={() => setStep('method-selection')}
                    >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Volver
                    </Button>
                </div>
            </div>
        );
    }

    if (step === 'cash-entry') {
        const currencySymbol = currency === 'USD' ? '$' : 'C$';
        const currencyLabel = currency === 'USD' ? 'DÓLARES' : 'CÓRDOBAS';

        return (
            <div className="w-full h-full flex flex-col bg-white">
                {/* Method Header */}
                <div className="bg-[#673AB7] text-white p-2 flex justify-between items-center">
                    <span className="font-bold">EFECTIVO - {currencyLabel}</span>
                    <span className="font-mono text-xl">{amountInputs ? formatCurrency(parseFloat(amountInputs), currency) : `${currencySymbol}0.00`}</span>
                </div>

                <div className="flex-1 p-2 grid grid-cols-4 grid-rows-4 gap-2">
                    {/* Column 1: Back Button & Numpad 1, 4, 7 */}
                    <div className="row-span-1 col-span-1 bg-[#FF5722] hover:bg-[#F4511E] text-white rounded-lg cursor-pointer flex flex-col items-center justify-center transition-colors" onClick={() => setStep('currency-selection')}>
                        <ArrowLeft className="w-8 h-8 mb-1" />
                        <span className="font-bold">VOLVER</span>
                    </div>
                    {[1, 4, 7].map(num => (
                        <div key={num} className="bg-[#03A9F4] hover:bg-[#0288D1] text-white rounded-lg cursor-pointer flex items-center justify-center font-bold text-3xl transition-colors" onClick={() => handleNumpadInput(num.toString())}>
                            {num}
                        </div>
                    ))}

                    {/* Column 2: Exact Pay & Numpad 2, 5, 8 */}
                    <div className="bg-[#8BC34A] hover:bg-[#7CB342] text-white rounded-lg cursor-pointer flex flex-col items-center justify-center font-bold text-lg leading-tight p-2 text-center transition-colors" onClick={handleExactPay}>
                        PAGO EXACTO
                    </div>
                    {[2, 5, 8].map(num => (
                        <div key={num} className="bg-[#03A9F4] hover:bg-[#0288D1] text-white rounded-lg cursor-pointer flex items-center justify-center font-bold text-3xl transition-colors" onClick={() => handleNumpadInput(num.toString())}>
                            {num}
                        </div>
                    ))}

                    {/* Column 3: Clear & Numpad 3, 6, 9 */}
                    <div className="bg-[#FF5722] hover:bg-[#F4511E] text-white rounded-lg cursor-pointer flex flex-col items-center justify-center font-bold text-lg transition-colors" onClick={handleClear}>
                        BORRAR
                    </div>
                    {[3, 6, 9].map(num => (
                        <div key={num} className="bg-[#03A9F4] hover:bg-[#0288D1] text-white rounded-lg cursor-pointer flex items-center justify-center font-bold text-3xl transition-colors" onClick={() => handleNumpadInput(num.toString())}>
                            {num}
                        </div>
                    ))}

                    {/* Column 4: OK, Denominations */}
                    <div className="bg-[#4CAF50] hover:bg-[#388E3C] text-white rounded-lg cursor-pointer flex items-center justify-center font-bold text-xl transition-colors" onClick={handleTotalizar}>
                        OK
                    </div>
                    {currency === 'NIO' ? (
                        <>
                            <div className="bg-[#FF9800] hover:bg-[#F57C00] text-white rounded-lg cursor-pointer flex items-center justify-center font-bold text-sm sm:text-lg transition-colors" onClick={() => handleDenomination(10)}>
                                C$ 10.00
                            </div>
                            <div className="bg-[#FF9800] hover:bg-[#F57C00] text-white rounded-lg cursor-pointer flex items-center justify-center font-bold text-sm sm:text-lg transition-colors" onClick={() => handleDenomination(50)}>
                                C$ 50.00
                            </div>
                            <div className="bg-[#FF9800] hover:bg-[#F57C00] text-white rounded-lg cursor-pointer flex items-center justify-center font-bold text-sm sm:text-lg transition-colors" onClick={() => handleDenomination(100)}>
                                C$ 100.00
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="bg-[#FF9800] hover:bg-[#F57C00] text-white rounded-lg cursor-pointer flex items-center justify-center font-bold text-sm sm:text-lg transition-colors" onClick={() => handleDenomination(1)}>
                                $ 1.00
                            </div>
                            <div className="bg-[#FF9800] hover:bg-[#F57C00] text-white rounded-lg cursor-pointer flex items-center justify-center font-bold text-sm sm:text-lg transition-colors" onClick={() => handleDenomination(5)}>
                                $ 5.00
                            </div>
                            <div className="bg-[#FF9800] hover:bg-[#F57C00] text-white rounded-lg cursor-pointer flex items-center justify-center font-bold text-sm sm:text-lg transition-colors" onClick={() => handleDenomination(20)}>
                                $ 20.00
                            </div>
                        </>
                    )}
                </div>

                {/* Bottom Row for 0, ., and Totalizar */}
                <div className="h-[20%] p-2 grid grid-cols-4 gap-2 pt-0">
                    <div className="col-span-1 bg-[#03A9F4] hover:bg-[#0288D1] text-white rounded-lg cursor-pointer flex items-center justify-center font-bold text-3xl transition-colors" onClick={() => handleNumpadInput('.')}>.</div>
                    <div className="col-span-1 bg-[#03A9F4] hover:bg-[#0288D1] text-white rounded-lg cursor-pointer flex items-center justify-center font-bold text-3xl transition-colors" onClick={() => handleNumpadInput('0')}>0</div>
                    <div className="col-span-2 bg-[#8BC34A] hover:bg-[#7CB342] text-white rounded-lg cursor-pointer flex items-center justify-center font-bold text-2xl transition-colors" onClick={handleTotalizar}>
                        TOTALIZAR
                    </div>
                </div>
            </div>
        );
    }

    return null;
}

