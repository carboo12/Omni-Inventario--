'use client';

import { Printer, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { PrintFormat } from '@/lib/print-format';

interface PrintFormatToggleProps {
    value: PrintFormat;
    onChange: (format: PrintFormat) => void;
    /** `sm` para diálogos, `default` para la barra del POS. */
    size?: 'sm' | 'default';
    className?: string;
}

/**
 * Selector de formato de impresión con las dos salidas soportadas:
 * ticket térmico de 80 mm y factura en hoja normal (Carta/A4).
 * El ticket térmico mantiene su tubería propia (`print-iframe.ts`).
 */
export function PrintFormatToggle({ value, onChange, size = 'sm', className }: PrintFormatToggleProps) {
    return (
        <div
            className={cn('flex items-center gap-2', className)}
            role="group"
            aria-label="Formato de impresión"
        >
            <Button
                size={size}
                type="button"
                variant={value === 'ticket' ? 'default' : 'outline'}
                onClick={() => onChange('ticket')}
                title="Ticket térmico de 80 mm"
                aria-pressed={value === 'ticket'}
            >
                <Printer className="h-4 w-4" />
                Ticket Térmico (80mm)
            </Button>
            <Button
                size={size}
                type="button"
                variant={value === 'invoice' ? 'default' : 'outline'}
                onClick={() => onChange('invoice')}
                title="Factura en hoja normal tamaño Carta/A4"
                aria-pressed={value === 'invoice'}
            >
                <FileText className="h-4 w-4" />
                Hoja Carta / A4
            </Button>
        </div>
    );
}
