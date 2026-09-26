import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';

/**
 * Confirmación de venta bajo encargo.
 *
 * Se ofrece cuando el producto tiene `allowNegativeStock = true` y la cantidad
 * solicitada supera las existencias disponibles. La venta deja el inventario en
 * negativo a propósito (entrega pendiente), por lo que el POS debe pedir
 * confirmación explícita al cajero.
 *
 * Se implementa con un único registro global para que los handlers puedan
 * esperar la respuesta sin duplicar estado en cada copia del POS.
 */
export type EncargoConfirmation = {
    /** Nombre del producto que se venderá bajo encargo. */
    productName: string;
    /** Unidades físicas que quedarán en negativo. */
    units: number;
    /** Existencias disponibles ahora mismo. */
    available: number;
};

type Resolver = (confirmed: boolean) => void;

let resolver: Resolver | null = null;

/** Solicita la confirmación del cajero. Resuelve `true` si acepta el encargo. */
export function requestEncargoConfirmation(details: EncargoConfirmation): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
        if (resolver) {
            // Ya hay una confirmación abierta: se cancela la anterior.
            resolver(false);
        }
        resolver = resolve;
        window.dispatchEvent(new CustomEvent<EncargoConfirmation>('pos:encargo-request', { detail: details }));
    });
}

export function EncargoConfirmDialog() {
    const [details, setDetails] = useState<EncargoConfirmation | null>(null);

    useEffect(() => {
        const onRequest = (event: Event) => {
            setDetails((event as CustomEvent<EncargoConfirmation>).detail);
        };
        window.addEventListener('pos:encargo-request', onRequest);
        return () => window.removeEventListener('pos:encargo-request', onRequest);
    }, []);

    const close = (confirmed: boolean) => {
        const resolve = resolver;
        resolver = null;
        setDetails(null);
        resolve?.(confirmed);
    };

    return (
        <Dialog open={!!details} onOpenChange={(open) => { if (!open) close(false); }}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        Venta bajo encargo
                    </DialogTitle>
                    <DialogDescription>
                        Este producto se quedará sin existencias y la venta generará inventario negativo
                        con entrega pendiente.
                    </DialogDescription>
                </DialogHeader>

                {details && (
                    <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm space-y-1">
                        <div className="font-black uppercase text-[10px] text-amber-700">Producto</div>
                        <div className="font-semibold text-amber-900">{details.productName}</div>
                        <div className="text-amber-800">
                            Existencias disponibles: <strong>{details.available}</strong> unidades
                        </div>
                        <div className="text-amber-800">
                            Se venderán <strong>{details.units}</strong> unidades
                        </div>
                    </div>
                )}

                <DialogFooter>
                    <Button variant="outline" onClick={() => close(false)}>
                        Cancelar
                    </Button>
                    <Button onClick={() => close(true)}>
                        Confirmar venta bajo encargo
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
