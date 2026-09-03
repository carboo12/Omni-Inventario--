"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { TrendingUp, WifiOff, RefreshCw } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { getLatestGoldPrice } from "@/lib/actions/gold-purchase";

interface MarketAnalysisProps {
    exchangeRate: number;
}

export function MarketAnalysis({ exchangeRate }: MarketAnalysisProps) {
    const [price, setPrice] = useState<number | null>(null);
    const [lastSync, setLastSync] = useState<Date | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isOffline, setIsOffline] = useState(false);

    const fetchPrice = useCallback(async () => {
        if (!window.navigator.onLine) {
            setIsOffline(true);
            setError("Sin conexión a internet");
            setPrice(0);
            setLoading(false);
            return;
        }

        setIsOffline(false);
        setLoading(true);
        try {
            const result = await getLatestGoldPrice();

            if (result.success && result.price) {
                setPrice(result.price);
                setLastSync(new Date());
                setError(null);
            } else {
                setError(result.error || "Error de sincronización");
                setPrice(0);
            }
        } catch (err) {
            console.error("Error fetching gold price:", err);
            setError("Fallo en la conexión local");
            setPrice(0);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchPrice();

        const handleOffline = () => {
            setIsOffline(true);
            setError("Modo offline");
            setPrice(0);
        };
        const handleOnline = () => {
            setIsOffline(false);
            fetchPrice();
        };

        window.addEventListener("offline", handleOffline);
        window.addEventListener("online", handleOnline);

        // Auto-refresh every 5 minutes on the client too
        const interval = setInterval(fetchPrice, 300000);

        return () => {
            window.removeEventListener("offline", handleOffline);
            window.removeEventListener("online", handleOnline);
            clearInterval(interval);
        };
    }, [fetchPrice]);

    const displayPriceNio = price && price > 0 ? price * exchangeRate : 0;

    return (
        <Card className="shadow-md border-gray-100">
            <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    <CardTitle className="text-base font-bold text-gray-700">Análisis de Mercado</CardTitle>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className={`p-5 rounded-xl border transition-all ${error
                        ? "bg-red-50 border-red-100"
                        : "bg-blue-50 border-blue-100"
                    }`}>
                    <p className={`text-[10px] font-bold uppercase tracking-widest mb-1 ${error ? "text-red-700" : "text-blue-700"
                        }`}>
                        Precio Referencial
                    </p>

                    <div className="space-y-1">
                        <div className="flex items-baseline gap-2">
                            <p className={`text-3xl font-black tracking-tight ${error ? "text-red-600" : "text-blue-900"
                                }`}>
                                ${price !== null ? price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "?.??"}
                                <span className="text-xs font-normal ml-1 opacity-70">USD/oz</span>
                            </p>
                        </div>

                        {price !== null && price > 0 && (
                            <p className="text-lg font-bold text-blue-700/80">
                                C$ {displayPriceNio.toLocaleString("es-NI", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                <span className="text-[10px] font-normal ml-1">NIO/oz</span>
                            </p>
                        )}
                    </div>

                    <div className="mt-3 flex items-center justify-between">
                        <div className="flex items-center gap-1.5 overflow-hidden">
                            {loading ? (
                                <RefreshCw className="h-3 w-3 animate-spin text-blue-500" />
                            ) : error ? (
                                <WifiOff className="h-3 w-3 text-red-500 shrink-0" />
                            ) : null}
                            <p className={`text-[10px] font-medium truncate ${error ? "text-red-600" : "text-blue-600"
                                }`}>
                                {isOffline
                                    ? "Sin conexión / Datos desactualizados"
                                    : error
                                        ? error
                                        : lastSync
                                            ? `Sincronizado hace ${formatDistanceToNow(lastSync, { locale: es })}`
                                            : "Conectando..."}
                            </p>
                        </div>

                        <button
                            onClick={fetchPrice}
                            disabled={loading}
                            className="text-[10px] font-bold text-blue-700 hover:underline disabled:opacity-50"
                        >
                            Actualizar
                        </button>
                    </div>
                </div>

                <div className="text-[11px] text-muted-foreground leading-relaxed bg-gray-50 p-3 rounded-lg border border-gray-100">
                    <p>
                        El sistema utiliza la **Onza Troy (31.1035g)** como base oficial.
                        Precios actualizados en tiempo real mediante Commodity API.
                    </p>
                </div>
            </CardContent>
        </Card>
    );
}
