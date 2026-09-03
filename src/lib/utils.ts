import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatNumber(value: number | string | null | undefined, minimumFractionDigits = 2) {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (num === null || num === undefined || isNaN(Number(num))) return '0.00';

  return Number(num).toLocaleString('es-NI', {
    minimumFractionDigits,
    maximumFractionDigits: 2,
  });
}

export function formatCurrency(amount: number | string | null | undefined, currency: 'NIO' | 'USD' | string = 'NIO') {
  const formatted = formatNumber(amount);
  const symbol = currency === 'USD' ? '$' : 'C$';
  return `${symbol} ${formatted}`;
}

export function formatTicketNumber(sequenceNumber: number): string {
  const PAD_LENGTH = 7;
  return String(sequenceNumber).padStart(PAD_LENGTH, '0');
}

export function parseTicketSearch(raw: string): number | null {
  const trimmed = raw.trim();
  const digitsOnly = trimmed.replace(/^0+/, '');
  if (digitsOnly === '') return 1;
  const parsed = parseInt(digitsOnly, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}
