"use client";

import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertTriangle } from 'lucide-react';
import { ArrowLeft, Truck, Store, DollarSign, CreditCard, Banknote } from 'lucide-react';
import { cn, formatNumber } from '@/lib/utils';
import { useSettings } from '@/hooks/use-settings';
import { isGenericCustomerName } from '@/lib/route-settlement';

export interface PaymentDeliveryDetails {
    deliveryType: 'COUNTER' | 'ROUTE';
    deliveryStatus: 'PENDIENTE_ENTREGA' | 'EN_RUTA' | 'ENTREGADO' | 'COBRADO';
    deliveryAddress?: string;
    deliveryPhone?: string;
    isPaid: boolean;
}

interface PaymentGridProps {
    total: number;
    onCancel: () => void;
    onComplete: (amountPaid: number, change: number, method: string, deliveryDetails?: PaymentDeliveryDetails) => void;
    customerName?: string;
    /** Datos de contacto del cliente asignado: prellenan el despacho a ruta. */
    customerPhone?: string;
    customerAddress?: string;
}

type PaymentStep = 'method-selection' | 'currency-selection' | 'cash-entry';
type Currency = 'NIO' | 'USD';

/** Mensaje exigido para despachos en ruta sin dirección o teléfono. */
const ROUTE_CONTACT_ERROR = 'La dirección y teléfono son obligatorios para despachos en ruta';
const ROUTE_CUSTOMER_ERROR = 'Los pedidos para ruta requieren un cliente real, no se permite un cliente genérico o anónimo';

export function PaymentGrid({ total, onCancel, onComplete, customerName, customerPhone, customerAddress }: PaymentGridProps) {
    const { settings } = useSettings();
    const [step, setStep] = useState<PaymentStep>('method-selection');
    const [paymentMethod, setPaymentMethod] = useState<string>('');
    const [currency, setCurrency] = useState<Currency>('NIO');
    const [amountInputs, setAmountInputs] = useState<string>('');

    // Delivery Routing State
    const [dispatchType, setDispatchType] = useState<'COUNTER' | 'ROUTE'>('COUNTER');
    const [deliveryAddress, setDeliveryAddress] = useState<string>('');
    const [deliveryPhone, setDeliveryPhone] = useState<string>('');
    const [routeError, setRouteError] = useState<string | null>(null);
    const hasMissingSavedContact = !customerAddress?.trim() || !customerPhone?.trim();
    const enableDeliveryRoute = settings.enableDeliveryRoute === true;

    useEffect(() => {
        if (!enableDeliveryRoute) {
            setDispatchType('COUNTER');
            setRouteError(null);
        }
    }, [enableDeliveryRoute]);

    // El contacto del cliente asignado se ofrece como valor inicial: si el cajero
    // escribe otro, manda lo que se escribió.
    useEffect(() => {
        if (customerAddress) setDeliveryAddress(prev => (prev.trim() ? prev : customerAddress));
        if (customerPhone) setDeliveryPhone(prev => (prev.trim() ? prev : customerPhone));
    }, [customerAddress, customerPhone]);

    // Un cliente genérico o anónimo nunca puede generar un pedido para ruta.
    const hasRealCustomer = !isGenericCustomerName(customerName);
    const missingContact = !deliveryAddress.trim() || !deliveryPhone.trim();
    const routeCustomerError = !hasRealCustomer ? ROUTE_CUSTOMER_ERROR : null;
    const routeBlockedReason = routeCustomerError || ((missingContact || hasMissingSavedContact) ? ROUTE_CONTACT_ERROR : null);

    const validateRouteDispatch = (): boolean => {
        if (dispatchType !== 'ROUTE') return true;
        const customerError = !hasRealCustomer;
        const contactError = !deliveryAddress.trim() || !deliveryPhone.trim();
        if (customerError || contactError) {
            setRouteError(customerError ? ROUTE_CUSTOMER_ERROR : ROUTE_CONTACT_ERROR);
            return false;
        }
        setRouteError(null);
        return true;
    };

    const buildDeliveryDetails = (isPaid: boolean): PaymentDeliveryDetails | undefined => {
        if (dispatchType === 'COUNTER') {
            return {
                deliveryType: 'COUNTER',
                deliveryStatus: 'ENTREGADO',
                isPaid,
            };
        }
        return {
            deliveryType: 'ROUTE',
            deliveryStatus: 'PENDIENTE_ENTREGA',
            deliveryAddress: deliveryAddress.trim() || undefined,
            deliveryPhone: deliveryPhone.trim() || undefined,
            isPaid,
        };
    };

    const handleMethodSelect = (method: string) => {
        if (!validateRouteDispatch()) return;
        if (method === 'Efectivo') {
            setPaymentMethod('Efectivo');
            if (!settings.allowDollars || settings.enableMultiCurrency === false) {
                setCurrency('NIO');
                setStep('cash-entry');
                setAmountInputs('');
            } else {
                setStep('currency-selection');
            }
        } else if (method === 'Credito') {
            onComplete(total, 0, 'Credito', buildDeliveryDetails(true));
        } else if (method === 'Cobro contra entrega') {
            onComplete(0, 0, 'Cobro contra entrega', buildDeliveryDetails(false));
        } else {
            onComplete(total, 0, method, buildDeliveryDetails(true));
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

        if (currency === 'USD') {
            paidInNIO = paid * parseFloat(settings.exchangeRate);
        }

        if (paidInNIO < total) {
            if (paid === 0) {
                handleExactPay();
                return;
            }
            if (settings.blockInsufficientCash) {
                alert("Monto insuficiente: El pago debe ser igual o mayor al total.");
                return;
            }
        }

        const change = paidInNIO - total;
        const methodLabel = currency === 'USD' ? 'Efectivo $' : 'Efectivo C$';
        onComplete(paidInNIO, change, methodLabel, buildDeliveryDetails(true));
    };

    const formatCurrency = (amount: number, curr: Currency = 'NIO') => {
        const symbol = curr === 'USD' ? '$' : 'C$';
        return `${symbol} ${formatNumber(amount)}`;
    };

    if (step === 'method-selection') {
        return (
            <div className="w-full h-full flex flex-col bg-white">
                {/* Header / Info Area */}
                <div className="h-20 bg-gray-100 p-4 flex justify-between items-center border-b gap-4">
                    <div className="min-w-0">
                        <p className="text-xs font-bold text-muted-foreground uppercase">Cliente: {customerName || 'Cliente General'}</p>
                        <p className="text-sm font-black text-gray-800">TIPO DE DESPACHO & PAGO</p>
                    </div>
                    <div className="text-right shrink-0">
                        <p className="text-xs font-bold text-muted-foreground uppercase">Total a Pagar</p>
                        <p className="text-2xl font-black text-primary">{formatCurrency(total)}</p>
                    </div>
                </div>

                {/* Selector de Tipo de Despacho (Mostrador vs Ruta/Domicilio) */}
                {enableDeliveryRoute && <div className="p-3 bg-amber-50/70 border-b border-amber-200">
                    <p className="text-xs font-bold text-amber-900 mb-2 uppercase tracking-wide">Tipo de Despacho:</p>
                    <div className="grid grid-cols-2 gap-3">
                        <Button
                            type="button"
                            variant={dispatchType === 'COUNTER' ? 'default' : 'outline'}
                            className={cn(
                                "h-11 justify-start gap-2 font-bold text-xs",
                                dispatchType === 'COUNTER' ? "bg-slate-900 text-white" : "bg-white"
                            )}
                            onClick={() => setDispatchType('COUNTER')}
                        >
                            <Store className="w-4 h-4" />
                            [ ] Venta Directa (Mostrador)
                        </Button>
                        <Button
                            type="button"
                            variant={dispatchType === 'ROUTE' ? 'default' : 'outline'}
                            className={cn(
                                "h-11 justify-start gap-2 font-bold text-xs",
                                dispatchType === 'ROUTE' ? "bg-amber-600 text-white hover:bg-amber-700" : "bg-white text-amber-800 border-amber-300"
                            )}
                            onClick={() => setDispatchType('ROUTE')}
                        >
                            <Truck className="w-4 h-4" />
                            [x] Pedido para Ruta / Entrega a Domicilio
                        </Button>
                    </div>

                    {dispatchType === 'ROUTE' && (
                        <div className="mt-3 pt-3 border-t border-amber-200/80 grid grid-cols-2 gap-3">
                            <div>
                                <Label className="text-[11px] font-bold text-amber-900">Dirección de Entrega:</Label>
                                <Input
                                    size={30}
                                    placeholder="Dirección exacta para el repartidor"
                                    value={deliveryAddress}
                                    onChange={(e) => { setDeliveryAddress(e.target.value); setRouteError(null); }}
                                    aria-invalid={!!routeError && missingContact}
                                    className={cn("h-8 text-xs bg-white mt-1", routeError && missingContact ? "border-red-600 ring-1 ring-red-600" : "border-amber-300")}
                                />
                            </div>
                            <div>
                                <Label className="text-[11px] font-bold text-amber-900">Teléfono de Contacto:</Label>
                                <Input
                                    size={20}
                                    placeholder="Teléfono del cliente"
                                    value={deliveryPhone}
                                    onChange={(e) => { setDeliveryPhone(e.target.value); setRouteError(null); }}
                                    aria-invalid={!!routeError && missingContact}
                                    className={cn("h-8 text-xs bg-white mt-1", routeError && missingContact ? "border-red-600 ring-1 ring-red-600" : "border-amber-300")}
                                />
                            </div>
                        </div>
                    )}

                    {dispatchType === 'ROUTE' && routeError && (
                        <div
                            role="alert"
                            className="mt-3 flex items-start gap-2 rounded-md border-2 border-red-600 bg-red-50 px-3 py-2 text-red-700"
                        >
                            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                            <p className="text-xs font-bold leading-snug">{routeError}</p>
                        </div>
                    )}
                </div>}

                {/* Main Grid Buttons */}
                <div className="flex-1 p-4 grid grid-cols-2 xl:grid-cols-3 gap-4 w-full content-start min-h-0">
                    {/* Back Button */}
                    <div className="col-span-1 min-h-[100px] bg-[#FF5722] hover:bg-[#F4511E] text-white rounded-lg cursor-pointer flex flex-col items-center justify-center p-4 transition-colors" onClick={onCancel}>
                        <ArrowLeft className="w-10 h-10 mb-1" />
                        <span className="font-bold text-lg">VOLVER</span>
                    </div>

                    {/* Efectivo */}
                    {settings.allowCash && (
                        <div className="col-span-1 min-h-[100px] bg-[#673AB7] hover:bg-[#5E35B1] text-white rounded-lg cursor-pointer p-4 transition-colors flex flex-col justify-center" onClick={() => handleMethodSelect('Efectivo')}>
                            <span className="font-bold text-lg block flex items-center gap-2"><Banknote className="w-5 h-5" /> EFECTIVO</span>
                            <span className="text-xs opacity-80 block mt-1">Pago inmediato de contado</span>
                        </div>
                    )}

                    {/* Cobro contra entrega (Solo para ruta) */}
                    {dispatchType === 'ROUTE' && (
                        <div
                            className={cn(
                                "col-span-1 min-h-[100px] rounded-lg p-4 transition-colors flex flex-col justify-center",
                                routeBlockedReason
                                    ? "bg-gray-300 text-gray-500 cursor-not-allowed opacity-60"
                                    : "bg-amber-600 hover:bg-amber-700 text-white cursor-pointer"
                            )}
                            onClick={() => handleMethodSelect('Cobro contra entrega')}
                        >
                            <span className="font-bold text-base block flex items-center gap-2"><Truck className="w-5 h-5" /> COBRO CONTRA ENTREGA</span>
                            <span className="text-xs opacity-90 block mt-1">
                                {routeBlockedReason ? 'Complete los datos del cliente' : 'Pendiente de cobro por repartidor'}
                            </span>
                        </div>
                    )}

                    {/* Crédito */}
                    {settings.allowCreditSales !== false && (
                        <div 
                            className={cn(
                                "col-span-1 min-h-[100px] text-white rounded-lg p-4 transition-colors flex flex-col justify-center",
                                hasRealCustomer
                                    ? "bg-[#673AB7] hover:bg-[#5E35B1] cursor-pointer" 
                                    : "bg-gray-300 cursor-not-allowed opacity-50"
                            )}
                            onClick={() => hasRealCustomer && handleMethodSelect('Credito')}
                        >
                            <span className="font-bold text-lg block">CRÉDITO</span>
                            <span className="text-xs opacity-80 block mt-1">{hasRealCustomer ? 'Cargo a cuenta' : 'Requiere Cliente'}</span>
                        </div>
                    )}

                    {/* Tarjeta */}
                    {settings.allowCard && (
                        <div className="col-span-1 min-h-[100px] bg-[#673AB7] hover:bg-[#5E35B1] text-white rounded-lg cursor-pointer p-4 transition-colors flex flex-col justify-center" onClick={() => handleMethodSelect('Tarjeta')}>
                            <span className="font-bold text-lg block uppercase flex items-center gap-2"><CreditCard className="w-5 h-5" /> Tarjeta / Transf.</span>
                            <span className="text-xs opacity-80 block mt-1">Pago POS / Banco</span>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    if (step === 'currency-selection') {
        return (
            <div className="w-full h-full flex flex-col bg-white">
                <div className="h-20 bg-gray-100 p-4 flex justify-between items-center border-b">
                    <div>
                        <p className="text-xs font-bold text-muted-foreground uppercase">SELECCIONE MONEDA</p>
                        <p className="text-base font-bold text-primary">PAGO EN EFECTIVO</p>
                    </div>
                    <div className="text-right">
                        <p className="text-xs font-bold text-muted-foreground uppercase">TOTAL A PAGAR</p>
                        <p className="text-2xl font-bold text-primary">{formatCurrency(total)}</p>
                    </div>
                </div>

                <div className="flex-1 p-8 flex flex-col gap-4 items-center justify-center">
                    <div
                        className="w-full max-w-md h-28 bg-[#03A9F4] hover:bg-[#0288D1] text-white rounded-lg cursor-pointer flex flex-col items-center justify-center transition-colors shadow-lg"
                        onClick={() => handleCurrencySelect('NIO')}
                    >
                        <span className="font-bold text-3xl mb-1">C$</span>
                        <span className="text-lg">Córdobas</span>
                    </div>

                    <div
                        className="w-full max-w-md h-28 bg-[#03A9F4] hover:bg-[#0288D1] text-white rounded-lg cursor-pointer flex flex-col items-center justify-center transition-colors shadow-lg"
                        onClick={() => handleCurrencySelect('USD')}
                    >
                        <span className="font-bold text-3xl mb-1">$</span>
                        <span className="text-lg">Dólares</span>
                        <span className="text-xs opacity-80 mt-1">Tipo de cambio: C$ {settings.exchangeRate}</span>
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
                <div className="bg-[#673AB7] text-white p-2 flex justify-between items-center">
                    <span className="font-bold text-sm">EFECTIVO - {currencyLabel} ({dispatchType === 'ROUTE' ? 'RUTA' : 'MOSTRADOR'})</span>
                    <span className="font-mono text-xl">{amountInputs ? formatCurrency(parseFloat(amountInputs), currency) : `${currencySymbol}0.00`}</span>
                </div>

                <div className="flex-1 p-2 grid grid-cols-4 grid-rows-4 gap-2">
                    <div className="row-span-1 col-span-1 bg-[#FF5722] hover:bg-[#F4511E] text-white rounded-lg cursor-pointer flex flex-col items-center justify-center transition-colors" onClick={() => setStep('currency-selection')}>
                        <ArrowLeft className="w-6 h-6 mb-1" />
                        <span className="font-bold text-xs">VOLVER</span>
                    </div>
                    {[1, 4, 7].map(num => (
                        <div key={num} className="bg-[#03A9F4] hover:bg-[#0288D1] text-white rounded-lg cursor-pointer flex items-center justify-center font-bold text-2xl transition-colors" onClick={() => handleNumpadInput(num.toString())}>
                            {num}
                        </div>
                    ))}

                    <div className="bg-[#8BC34A] hover:bg-[#7CB342] text-white rounded-lg cursor-pointer flex flex-col items-center justify-center font-bold text-sm leading-tight p-2 text-center transition-colors" onClick={handleExactPay}>
                        PAGO EXACTO
                    </div>
                    {[2, 5, 8].map(num => (
                        <div key={num} className="bg-[#03A9F4] hover:bg-[#0288D1] text-white rounded-lg cursor-pointer flex items-center justify-center font-bold text-2xl transition-colors" onClick={() => handleNumpadInput(num.toString())}>
                            {num}
                        </div>
                    ))}

                    <div className="bg-[#FF5722] hover:bg-[#F4511E] text-white rounded-lg cursor-pointer flex flex-col items-center justify-center font-bold text-sm transition-colors" onClick={handleClear}>
                        BORRAR
                    </div>
                    {[3, 6, 9].map(num => (
                        <div key={num} className="bg-[#03A9F4] hover:bg-[#0288D1] text-white rounded-lg cursor-pointer flex items-center justify-center font-bold text-2xl transition-colors" onClick={() => handleNumpadInput(num.toString())}>
                            {num}
                        </div>
                    ))}

                    <div className="bg-[#4CAF50] hover:bg-[#388E3C] text-white rounded-lg cursor-pointer flex items-center justify-center font-bold text-lg transition-colors" onClick={handleTotalizar}>
                        OK
                    </div>
                    {currency === 'NIO' ? (
                        <>
                            <div className="bg-[#FF9800] hover:bg-[#F57C00] text-white rounded-lg cursor-pointer flex items-center justify-center font-bold text-xs sm:text-base transition-colors" onClick={() => handleDenomination(10)}>
                                C$ 10.00
                            </div>
                            <div className="bg-[#FF9800] hover:bg-[#F57C00] text-white rounded-lg cursor-pointer flex items-center justify-center font-bold text-xs sm:text-base transition-colors" onClick={() => handleDenomination(50)}>
                                C$ 50.00
                            </div>
                            <div className="bg-[#FF9800] hover:bg-[#F57C00] text-white rounded-lg cursor-pointer flex items-center justify-center font-bold text-xs sm:text-base transition-colors" onClick={() => handleDenomination(100)}>
                                C$ 100.00
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="bg-[#FF9800] hover:bg-[#F57C00] text-white rounded-lg cursor-pointer flex items-center justify-center font-bold text-xs sm:text-base transition-colors" onClick={() => handleDenomination(1)}>
                                $ 1.00
                            </div>
                            <div className="bg-[#FF9800] hover:bg-[#F57C00] text-white rounded-lg cursor-pointer flex items-center justify-center font-bold text-xs sm:text-base transition-colors" onClick={() => handleDenomination(5)}>
                                $ 5.00
                            </div>
                            <div className="bg-[#FF9800] hover:bg-[#F57C00] text-white rounded-lg cursor-pointer flex items-center justify-center font-bold text-xs sm:text-base transition-colors" onClick={() => handleDenomination(20)}>
                                $ 20.00
                            </div>
                        </>
                    )}
                </div>

                <div className="h-[18%] p-2 grid grid-cols-4 gap-2 pt-0">
                    <div className="col-span-1 bg-[#03A9F4] hover:bg-[#0288D1] text-white rounded-lg cursor-pointer flex items-center justify-center font-bold text-2xl transition-colors" onClick={() => handleNumpadInput('.')}>.</div>
                    <div className="col-span-1 bg-[#03A9F4] hover:bg-[#0288D1] text-white rounded-lg cursor-pointer flex items-center justify-center font-bold text-2xl transition-colors" onClick={() => handleNumpadInput('0')}>0</div>
                    <div className="col-span-2 bg-[#8BC34A] hover:bg-[#7CB342] text-white rounded-lg cursor-pointer flex items-center justify-center font-bold text-xl transition-colors" onClick={handleTotalizar}>
                        TOTALIZAR
                    </div>
                </div>
            </div>
        );
    }

    return null;
}
