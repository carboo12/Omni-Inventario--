"use client";

export type PrintFormat = 'ticket' | 'invoice';

const STORAGE_KEY = 'print-format-preference';

export function getPreferredPrintFormat(): PrintFormat {
    if (typeof window === 'undefined') return 'ticket';
    try {
        const stored = window.localStorage.getItem(STORAGE_KEY);
        if (stored === 'ticket' || stored === 'invoice') return stored;
    } catch {
        // ignore storage errors
    }
    return 'ticket';
}

export function savePreferredPrintFormat(format: PrintFormat) {
    if (typeof window === 'undefined') return;
    try {
        window.localStorage.setItem(STORAGE_KEY, format);
    } catch {
        // ignore storage errors
    }
}
