// Normaliza la clasificación de métodos de pago para el arqueo de caja.
// El POS emite strings variantes ('Efectivo C$', 'Efectivo $', 'Tarjeta', 'Dolares',
// 'Credito') además de los valores canónicos del prompt ('CASH', 'EFECTIVO',
// 'CONTADO', 'CASH_NIO', 'CASH_USD', 'CARD', 'TARJETA', 'TRANSFER', 'TRANSFERENCIA').

const normalize = (value: string): string =>
    (value || '')
        .toUpperCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');

export type PaymentBucket = 'cash' | 'card' | 'usd' | 'credit' | 'other';

export const getPaymentBucket = (paymentMethod: string): PaymentBucket => {
    const m = normalize(paymentMethod);

    // USD (efectivo en dólares o venta en dólares): 'USD', 'DOLARES', 'CASH_USD', 'EFECTIVO $'
    // 'C$' (córdoba) no se debe confundir con dólar.
    const isUsd =
        /USD|DOLAR/.test(m) ||
        (m.includes('$') && !m.includes('C$'));

    if (isUsd) return 'usd';
    // Efectivo: 'CASH', 'EFECTIVO', 'CONTADO', 'CASH_NIO', 'EFECTIVO C$'
    if (/CASH|EFECTIVO|CONTADO/.test(m)) return 'cash';
    // Tarjeta / Transferencia: 'CARD', 'TARJETA', 'TRANSFER', 'TRANSFERENCIA'
    if (/CARD|TARJETA|TRANSF|PAGO MOVIL|SINPE/.test(m)) return 'card';
    // Crédito
    if (/CREDIT|FIADO/.test(m)) return 'credit';

    return 'other';
};

export const isCashPayment = (paymentMethod: string): boolean =>
    getPaymentBucket(paymentMethod) === 'cash';

export const isCardPayment = (paymentMethod: string): boolean =>
    getPaymentBucket(paymentMethod) === 'card';

export const isUsdPayment = (paymentMethod: string): boolean =>
    getPaymentBucket(paymentMethod) === 'usd';

export const isCreditPayment = (paymentMethod: string): boolean =>
    getPaymentBucket(paymentMethod) === 'credit';