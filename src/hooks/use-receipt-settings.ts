"use client";

import { useEffect, useState } from 'react';
import { getReceiptSettings } from '@/lib/actions-client/receipt-settings';
import type { DynamicReceiptSettings } from '@/lib/print-iframe';

/**
 * Caché a nivel de módulo: los distintos puntos de impresión (POS, rutas,
 * cotizaciones, reimpresiones) comparten una única llamada al servidor por
 * sesión de navegador en lugar de pedir el diseño del ticket en cada uno.
 */
let cachedSettings: DynamicReceiptSettings | null = null;
let inFlight: Promise<DynamicReceiptSettings | null> | null = null;

function loadReceiptSettings(): Promise<DynamicReceiptSettings | null> {
    if (cachedSettings) return Promise.resolve(cachedSettings);
    if (!inFlight) {
        inFlight = getReceiptSettings()
            .then((result: any) => {
                // La action puede responder 200 con success:false (sin sesión,
                // módulo no registrado, error de BD). Sin este chequeo el hook
                // caería en null igual que un fallo de red, y ambos casos
                // terminaban imprimiendo con los defaults de print-iframe.ts.
                if (!result?.success) {
                    console.error(
                        '[receipt-settings] El servidor no devolvió el diseño del ticket (%s). La impresión usará los valores por defecto (BELOW_NAME).',
                        result?.error ?? 'sin motivo informado'
                    );
                    return null;
                }
                const data = result?.data ?? null;
                cachedSettings = data && typeof data === 'object' ? (data as DynamicReceiptSettings) : null;
                return cachedSettings;
            })
            .catch((error: unknown) => {
                // Un 404 del dispatcher (módulo no registrado en el bundle) o un
                // fallo de red deben quedar registrados: antes este catch devolvía
                // null en silencio y el POS imprimía con el diseño anterior sin
                // dejar ninguna señal en consola.
                console.error(
                    '[receipt-settings] No se pudo cargar el diseño del ticket. La impresión usará los valores por defecto (BELOW_NAME).',
                    error
                );
                return null;
            })
            .finally(() => { inFlight = null; });
    }
    return inFlight;
}

/**
 * Ajuste de diseño del ticket guardado en /settings/ticket (fuentes, ancho,
 * disposición de la presentación, etc.) listo para pasarse a los constructores
 * de impresión: `buildReceiptHtml(data, receiptSettings)`.
 *
 * Blindaje: devuelve `undefined` mientras carga o si la petición falla; en ese
 * caso el constructor aplica sus propios valores por defecto y la venta nunca
 * se bloquea por un fallo de configuración.
 */
export function useReceiptSettings(): DynamicReceiptSettings | undefined {
    const [settings, setSettings] = useState<DynamicReceiptSettings | undefined>(
        () => cachedSettings ?? undefined
    );

    useEffect(() => {
        if (cachedSettings) return;
        let active = true;
        loadReceiptSettings().then(data => {
            if (active && data) setSettings(data);
        });
        return () => { active = false; };
    }, []);

    return settings;
}

/**
 * Vacía la caché del módulo. La invoca `/settings/ticket` tras guardar para que
 * el siguiente punto de impresión de la misma pestaña (POS, rutas, cotizaciones)
 * pida el diseño recién guardado en vez de reutilizar el de la carga inicial.
 */
export function resetReceiptSettingsCache(): void {
    cachedSettings = null;
    inFlight = null;
}
