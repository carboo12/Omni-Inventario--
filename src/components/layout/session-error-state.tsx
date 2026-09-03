"use client";

import React from "react";
import { AlertTriangle, DoorClosed, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { forceSessionExpiry } from "@/lib/session-expiry";

type SessionErrorStateProps = {
  /** true si el error viene de una red/desconexión (no de sesión). */
  offline?: boolean;
  className?: string;
  title?: string;
  message?: string;
};

/**
 * Estado visual claro para errores de carga de listas: sesión expirada o sin
 * conexión. Ofrece un botón directo a login (reingresar) para evitar pantallas
 * blancas o listas vacías sin explicación.
 */
export function SessionErrorState({
  offline = false,
  className,
  title,
  message,
}: SessionErrorStateProps) {
  const Icon = offline ? WifiOff : DoorClosed;
  return (
    <div
      className={cn(
        "flex min-h-[240px] w-full flex-col items-center justify-center gap-4 rounded-lg border border-dashed border-destructive/40 bg-destructive/5 p-6 text-center",
        className
      )}
    >
      <div className="rounded-full bg-destructive/10 p-3">
        <Icon className="h-8 w-8 text-destructive" />
      </div>
      <div className="space-y-1">
        <h3 className="text-base font-semibold text-foreground">
          {title || (offline ? "Sin conexión" : "Sesión expirada")}
        </h3>
        <p className="max-w-sm text-sm text-muted-foreground">
          {message ||
            (offline
              ? "No se pudo contactar con el servidor. Verifica tu conexión e inténtalo de nuevo."
              : "Tu sesión ha expirado. Haz clic aquí para volver a ingresar a tu cuenta.")}
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <Button onClick={() => forceSessionExpiry()} size="sm">
          <DoorClosed className="mr-2 h-4 w-4" />
          Reingresar
        </Button>
        {offline && (
          <Button size="sm" variant="outline" onClick={() => window.location.reload()}>
            <AlertTriangle className="mr-2 h-4 w-4" />
            Reintentar
          </Button>
        )}
      </div>
    </div>
  );
}
