"use client";

import * as React from "react";
import { ArrowUpRight } from "lucide-react";
import { Link } from "@/lib/router-nav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/** Acento visual aplicado al borde/sombra en hover. */
export type StatCardAccent = "primary" | "warning";

const ACCENT_HOVER_CLASSES: Record<StatCardAccent, string> = {
  primary: "hover:border-primary/40 hover:shadow-primary/10",
  warning: "hover:border-amber-400 hover:shadow-amber-500/10",
};

export type StatCardProps = {
  title: string;
  value: string | number;
  /** Texto secundario bajo la línea divisoria. */
  subtitle: string;
  icon: React.ElementType;
  /** Ruta interna. Si se omite, la tarjeta no es interactiva. */
  href?: string;
  accent?: StatCardAccent;
  className?: string;
};

/**
 * Tarjeta de métrica del panel de control. Conserva la tipografía y tamaños
 * originales; al recibir `href` se vuelve un enlace SPA (sin recargar la
 * página ni perder la sesión) con elevación y acento al hacer hover.
 */
export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  href,
  accent = "primary",
  className,
}: StatCardProps) {
  const card = (
    <Card
      className={cn(
        "group relative h-full overflow-hidden",
        href &&
          "cursor-pointer select-none transition-all duration-300 ease-in-out hover:-translate-y-1.5 hover:shadow-xl",
        href && ACCENT_HOVER_CLASSES[accent],
        className
      )}
    >
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
        <div className="space-y-1">
          <CardTitle className="text-sm font-semibold text-muted-foreground">{title}</CardTitle>
          <div className="text-2xl font-bold tracking-tight text-foreground">{value}</div>
        </div>
        <div className="metric-icon">
          <Icon className="h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <p className="border-t pt-3 text-xs font-medium text-muted-foreground">{subtitle}</p>
      </CardContent>
      {href && (
        <ArrowUpRight
          aria-hidden="true"
          className="pointer-events-none absolute bottom-4 right-5 h-4 w-4 text-muted-foreground/60 opacity-0 transition-all duration-300 ease-out group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-foreground group-hover:opacity-100"
        />
      )}
    </Card>
  );

  if (!href) return card;

  return (
    <Link
      to={href}
      className="block h-full rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      {card}
    </Link>
  );
}

export default StatCard;
