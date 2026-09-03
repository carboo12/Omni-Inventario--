"use client";

// Combobox buscable para seleccionar una categoría.
// Usa Popover + Input con filtro en tiempo real (sin dependencias extra).
// Deduplica categorías por nombre (case-insensitive) para evitar repetidos.

import React, { useMemo, useRef, useState } from "react";
import { Check, ChevronsUpDown, Loader2, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";

export interface CategoryOption {
  id: string;
  name: string;
  inventoryType?: string | null;
}

interface CategoryComboboxProps {
  options: CategoryOption[];
  value?: string | null;
  onChange: (value: string) => void;
  disabled?: boolean;
  loading?: boolean;
  placeholder?: string;
  searchPlaceholder?: string;
}

export function CategoryCombobox({
  options,
  value,
  onChange,
  disabled = false,
  loading = false,
  placeholder = "Seleccionar categoría...",
  searchPlaceholder = "Buscar categoría...",
}: CategoryComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Deduplicar por nombre (case-insensitive), priorizando la primera aparición.
  const uniqueOptions = useMemo(() => {
    const seen = new Map<string, CategoryOption>();
    for (const opt of options) {
      const key = (opt.name || "").trim().toLowerCase();
      if (!key) continue;
      if (!seen.has(key)) seen.set(key, opt);
    }
    return Array.from(seen.values());
  }, [options]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return uniqueOptions;
    return uniqueOptions.filter(
      (opt) =>
        opt.name.toLowerCase().includes(q) ||
        (opt.inventoryType || "").toLowerCase().includes(q)
    );
  }, [uniqueOptions, query]);

  const selected = uniqueOptions.find((opt) => opt.id === value);

  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (o) setQuery(""); }}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled || loading}
          className="w-full justify-between font-normal"
        >
          {selected ? (
            <span className="truncate">
              {selected.name}
              {selected.inventoryType ? ` (${selected.inventoryType})` : ""}
            </span>
          ) : loading ? (
            <span className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Cargando categorías...
            </span>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <div className="flex items-center border-b px-3">
          <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
          <Input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={searchPlaceholder}
            className="border-0 shadow-none focus-visible:ring-0 h-11"
            autoFocus
          />
        </div>
        <ScrollArea className="h-64">
          {loading ? (
            <div className="flex items-center justify-center py-6 text-sm text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Cargando...
            </div>
          ) : filtered.length === 0 ? (
            <div className="px-4 py-6 text-sm text-muted-foreground text-center">
              No se encontraron categorías
              {query.trim() ? ` para "${query.trim()}"` : ""}.
            </div>
          ) : (
            <div className="p-1">
              {filtered.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    onChange(opt.id);
                    setOpen(false);
                  }}
                  className={cn(
                    "relative flex w-full cursor-pointer select-none items-center rounded-sm py-2 pl-8 pr-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground",
                    value === opt.id && "bg-accent text-accent-foreground"
                  )}
                >
                  <span className="truncate">
                    {opt.name}
                    {opt.inventoryType ? ` (${opt.inventoryType})` : ""}
                  </span>
                  {value === opt.id && (
                    <Check className="absolute left-2 h-4 w-4" />
                  )}
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}