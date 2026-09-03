'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from '@/lib/router-nav';
import { Trash2, Save, Search, ShoppingCart, ScanLine, ClipboardList, Printer, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { createOrder } from '@/lib/actions/orders';
import { getAllCustomers } from '@/lib/actions/customers';
import { getProducts } from '@/lib/actions/products';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { useSettings } from '@/hooks/use-settings';
import type { Product } from '@/lib/types';
import { ProductAddWizard } from '@/components/pos/product-add-wizard';

interface ProductItem {
  id: string;
  name: string;
  barcode?: string;
  priceNIO: number;
  price2?: number | null;
  price3?: number | null;
  price4?: number | null;
  stock: number;
  /** Producto completo (presentaciones, factor, niveles) para el wizard del POS. */
  raw: Product;
}

interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  stock: number;
  prices: { p1: number; p2: number | null; p3: number | null; p4: number | null };
  /** Presentación elegida ('unit', o key de presentación bulk/box). */
  presentation?: string;
  /** Nombre legible de la presentación (ej. Caja, Fardo, Unidad). */
  presentationName?: string;
  /** Factor de equivalencia en unidades base. */
  presentationFactor?: number;
  /** Nivel de precio aplicado (1-4). */
  priceLevel?: number;
}

function resolvePrice(prices: OrderItem['prices'], level: number): number {
  switch (level) {
    case 2: return prices.p2 ?? prices.p1;
    case 3: return prices.p3 ?? prices.p1;
    case 4: return prices.p4 ?? prices.p1;
    default: return prices.p1;
  }
}

interface ProductSearchProps {
  onSelect: (product: ProductItem) => void;
  inputRef?: React.RefObject<HTMLInputElement>;
}

function ProductSearch({ onSelect, inputRef: externalRef }: ProductSearchProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [highlightIdx, setHighlightIdx] = useState(0);
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number; width: number } | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const internalRef = useRef<HTMLInputElement>(null);
  const inputRef = externalRef || internalRef;

  const updateDropdownPosition = useCallback(() => {
    if (inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect();
      setDropdownPos({
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width,
      });
    }
  }, [inputRef]);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 50);
  }, [inputRef]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        wrapperRef.current && !wrapperRef.current.contains(e.target as Node) &&
        dropdownRef.current && !dropdownRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    const handleScroll = () => { if (isOpen) updateDropdownPosition(); };
    const handleResize = () => { if (isOpen) updateDropdownPosition(); };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', handleResize);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleResize);
    };
  }, [isOpen, updateDropdownPosition]);

  useEffect(() => {
    setLoading(true);
    getProducts().then((res) => {
      if (res.success && res.data) {
        setProducts(res.data.map((p: any) => ({
          id: p.id, name: p.name, barcode: p.barcode,
          priceNIO: p.priceNIO, price2: p.price2 ?? null,
          price3: p.price3 ?? null, price4: p.price4 ?? null, stock: p.stock ?? 0,
          raw: p,
        })));
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    if (!searchTerm.trim()) return [];
    const term = searchTerm.toLowerCase();
    return products.filter(p =>
      p.name.toLowerCase().includes(term) || (p.barcode && p.barcode.toLowerCase().includes(term))
    ).slice(0, 40);
  }, [searchTerm, products]);

  const findExactMatch = useCallback((term: string): ProductItem | null => {
    const t = term.trim().toLowerCase();
    if (!t) return null;
    return products.find(p => p.barcode && p.barcode.toLowerCase() === t)
      || products.find(p => p.name.toLowerCase() === t)
      || null;
  }, [products]);

  const openDropdown = useCallback(() => {
    updateDropdownPosition();
    setIsOpen(true);
  }, [updateDropdownPosition]);

  const handleSelect = useCallback((product: ProductItem) => {
    onSelect(product);
    setSearchTerm('');
    setIsOpen(false);
    setHighlightIdx(0);
    setTimeout(() => inputRef.current?.focus(), 10);
  }, [onSelect, inputRef]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered.length === 1) { handleSelect(filtered[0]); return; }
      if (filtered.length > 1 && highlightIdx < filtered.length) { handleSelect(filtered[highlightIdx]); return; }
      const exact = findExactMatch(searchTerm);
      if (exact) { handleSelect(exact); return; }
      if (searchTerm.trim()) openDropdown();
      return;
    }
    if (e.key === 'ArrowDown') { e.preventDefault(); setHighlightIdx(p => Math.min(p + 1, filtered.length - 1)); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setHighlightIdx(p => Math.max(p - 1, 0)); }
    if (e.key === 'Escape') setIsOpen(false);
  };

  useEffect(() => { setHighlightIdx(0); }, [searchTerm]);

  const showDropdown = isOpen && searchTerm.trim();

  return (
    <div ref={wrapperRef} className="relative w-full">
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          ref={inputRef} value={searchTerm}
          onChange={(e) => { setSearchTerm(e.target.value); openDropdown(); }}
          onFocus={() => searchTerm.trim() && openDropdown()}
          onKeyDown={handleKeyDown}
          placeholder="Escanear código o buscar producto..."
          className="pl-8 h-12 text-sm md:h-10" autoComplete="off"
          inputMode="search"
        />
      </div>
      {showDropdown && dropdownPos && (
        <div
          ref={dropdownRef}
          className="fixed z-[9999] max-h-80 w-full overflow-auto rounded-md border border-border bg-popover text-popover-foreground shadow-xl"
          style={{ top: dropdownPos.top, left: dropdownPos.left, width: dropdownPos.width }}
        >
          {loading ? (
            <div className="p-3 text-sm text-muted-foreground text-center">Cargando productos...</div>
          ) : filtered.length === 0 ? (
            <div className="p-3 text-sm text-muted-foreground text-center">Sin resultados para &quot;{searchTerm}&quot;</div>
          ) : (
            filtered.map((product, idx) => (
              <div key={product.id}
                className={cn(
                  "flex items-center justify-between px-3 py-3 md:py-2 cursor-pointer text-sm hover:bg-accent hover:text-accent-foreground",
                  idx === highlightIdx && "bg-accent text-accent-foreground",
                  product.stock <= 0 && "opacity-50"
                )}
                onMouseEnter={() => setHighlightIdx(idx)}
                onClick={() => handleSelect(product)}
              >
                <div className="flex flex-col min-w-0">
                  <span className="font-medium truncate">{product.name}</span>
                  {product.barcode && <span className="text-xs text-muted-foreground font-mono">{product.barcode}</span>}
                </div>
                <div className="flex items-center gap-3 shrink-0 ml-2">
                  <span className="text-xs text-muted-foreground">Stock: {product.stock}</span>
                  <span className="font-bold text-primary">C${product.priceNIO.toFixed(2)}</span>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function CartItemMobile({ item, onRemove }: { item: OrderItem; onRemove: () => void }) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-lg border bg-card p-3">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate">{item.productName}</p>
        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
          <span>{item.presentationName ? `${item.presentationName} · ` : ''}x{item.quantity}</span>
          <span>·</span>
          <span>C${item.unitPrice.toFixed(2)}/u</span>
        </div>
      </div>
      <div className="flex flex-col items-end gap-1 shrink-0">
        <span className="text-sm font-bold text-primary">C${(item.quantity * item.unitPrice).toFixed(2)}</span>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onRemove}>
          <Trash2 className="h-3.5 w-3.5 text-destructive" />
        </Button>
      </div>
    </div>
  );
}

export default function NewOrderClient() {
  const router = useRouter();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const { settings } = useSettings();
  const [customers, setCustomers] = useState<any[]>([]);
  const [customerId, setCustomerId] = useState('');
  const [items, setItems] = useState<OrderItem[]>([]);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [priceLevel, setPriceLevel] = useState<number>(1);
  const [wizardProduct, setWizardProduct] = useState<Product | null>(null);
  const [savedOrder, setSavedOrder] = useState<any>(null);
  const [printFormat, setPrintFormat] = useState<'ticket' | 'invoice'>('ticket');
  const [printReady, setPrintReady] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [mobileTab, setMobileTab] = useState('capture');

  useEffect(() => {
    getAllCustomers().then((res) => setCustomers(res || []));
  }, []);

  const selectedCustomer = useMemo(() => customers.find((c: any) => c.id === customerId) || null, [customers, customerId]);

  useEffect(() => {
    if (selectedCustomer?.priceLevel && selectedCustomer.priceLevel >= 1 && selectedCustomer.priceLevel <= 4) {
      setPriceLevel(selectedCustomer.priceLevel);
    } else {
      setPriceLevel(1);
    }
  }, [selectedCustomer]);

  const recalcAllPrices = useCallback((level: number, currentItems: OrderItem[]) => {
    return currentItems.map(item => {
      if (!item.productId) return item;
      return { ...item, unitPrice: resolvePrice(item.prices, level), priceLevel: level };
    });
  }, []);

  useEffect(() => {
    setItems(prev => recalcAllPrices(priceLevel, prev));
  }, [priceLevel, recalcAllPrices]);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }, 60);
  }, []);

  const total = useMemo(() => items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0), [items]);

  const handleProductSelect = useCallback((product: ProductItem) => {
    // Abre el mismo wizard de presentación/cantidad/nivel que usa el POS.
    setWizardProduct(product.raw);
  }, []);

  const handleWizardConfirm = useCallback((
    product: Product,
    presentation: 'unit' | 'box' | string,
    priceLevel: number,
    quantity: number,
    presentationName?: string,
    presentationFactor?: number,
  ) => {
    const qty = Math.max(0, Number.isFinite(quantity) ? quantity : 0);
    if (qty <= 0 || !product) return;
    const prices = {
      p1: product.priceNIO,
      p2: (product as any).price2 ?? null,
      p3: (product as any).price3 ?? null,
      p4: (product as any).price4 ?? null,
    };
    const stock = Number((product as any).stock) || 0;
    const unitPrice = resolvePrice(prices, priceLevel);

    setItems(prev => {
      // Mismo producto y misma presentación => sumar cantidades.
      const existingIdx = prev.findIndex(i => i.productId === product.id && i.presentation === presentation);
      if (existingIdx >= 0) {
        const item = prev[existingIdx];
        const newQty = Math.round((item.quantity + qty) * 100) / 100;
        if (item.stock > 0 && newQty > item.stock) {
          toast({ title: 'Stock insuficiente', description: `Solo hay ${item.stock} unidades disponibles de "${item.productName}".`, variant: 'destructive' });
          return prev;
        }
        return prev.map((it, i) => i === existingIdx
          ? { ...it, quantity: newQty, unitPrice, priceLevel, presentation, presentationName: presentationName ?? it.presentationName, presentationFactor: presentationFactor ?? it.presentationFactor }
          : it);
      }
      if (stock > 0 && qty > stock) {
        toast({ title: 'Stock insuficiente', description: `Solo hay ${stock} unidades disponibles de "${product.name}".`, variant: 'destructive' });
        return prev;
      }
      return [...prev, {
        productId: product.id,
        productName: product.name,
        quantity: qty,
        unitPrice,
        stock,
        prices,
        presentation,
        presentationName,
        presentationFactor,
        priceLevel,
      }];
    });

    scrollToBottom();
    if (isMobile) {
      setMobileTab('cart');
    } else {
      setTimeout(() => searchInputRef.current?.focus(), 10);
    }
  }, [scrollToBottom, toast, isMobile]);

  const removeItem = (idx: number) => {
    setItems(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async () => {
    if (!customerId) {
      toast({ title: 'Error', description: 'Seleccione un cliente.', variant: 'destructive' });
      return;
    }
    if (items.length === 0) {
      toast({ title: 'Error', description: 'Agregue al menos un producto del catálogo.', variant: 'destructive' });
      return;
    }
    setSaving(true);
    const result = await createOrder({
      customerId,
      items: items.map(i => ({ productName: i.productName, quantity: i.quantity, unitPrice: i.unitPrice })),
      notes,
    });
    setSaving(false);
    if (result.success) {
      setSavedOrder(result.data as any);
    } else {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
    }
  };

  const finishWithoutPrint = () => {
    setPrintReady(false);
    setSavedOrder(null);
    setItems([]);
    setNotes('');
    setCustomerId('');
    router.push('/orders');
  };

  const triggerPrint = () => {
    if (!savedOrder) return;
    // Montar el portal de impresión y esperar a que React pinte el HTML
    // antes de abrir el diálogo del navegador (evita impresión en blanco).
    setPrintReady(true);
    setTimeout(() => {
      window.print();
    }, 250);
  };

  // Tras cerrar la ventana de impresión (o cancelar), desmontar el portal.
  useEffect(() => {
    if (!printReady) return;
    const onAfterPrint = () => setPrintReady(false);
    window.addEventListener('afterprint', onAfterPrint);
    return () => {
      window.removeEventListener('afterprint', onAfterPrint);
    };
  }, [printReady]);

  const currencyFmt = new Intl.NumberFormat('es-NI', { style: 'currency', currency: settings.currency || 'NIO' });

  const printTicket = savedOrder && (
    <div id="order-print-area" className="font-mono text-[11px] leading-tight" style={{ width: '76mm', background: '#fff', color: '#000' }}>
      <div className="text-center">
        <div className="text-sm font-bold">{settings.ticketHeader.name}</div>
        {settings.ticketHeader.address && <div>{settings.ticketHeader.address}</div>}
        {settings.ticketHeader.phone && <div>Tel: {settings.ticketHeader.phone}</div>}
        {settings.ticketHeader.rfc && <div>RFC: {settings.ticketHeader.rfc}</div>}
        <div className="my-1 border-t border-dashed border-black" />
        <div className="font-bold">PEDIDO No. {String(savedOrder.orderNumber ?? '').padStart(5, '0')}</div>
        <div>{new Date(savedOrder.createdAt ?? Date.now()).toLocaleString('es-NI')}</div>
        <div>Cliente: {savedOrder.customer?.fullName}</div>
        <div className="my-1 border-t border-dashed border-black" />
      </div>
      <table className="w-full">
        <thead>
          <tr className="text-left">
            <th>Cant</th>
            <th>Descripción</th>
            <th className="text-right">P.U.</th>
            <th className="text-right">Total</th>
          </tr>
        </thead>
        <tbody>
          {(savedOrder.items || []).map((it: any, i: number) => (
            <tr key={i}>
              <td className="pr-1">{it.quantity}</td>
              <td className="pr-1">{it.productName}</td>
              <td className="text-right whitespace-nowrap">{(it.unitPrice ?? 0).toFixed(2)}</td>
              <td className="text-right whitespace-nowrap">{(it.totalPrice ?? 0).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-1 border-t border-dashed border-black pt-1 flex justify-between font-bold">
        <span>TOTAL</span>
        <span>{currencyFmt.format(savedOrder.totalAmount ?? (savedOrder.items || []).reduce((s: number, i: any) => s + (i.totalPrice ?? 0), 0))}</span>
      </div>
      {savedOrder.notes && (
        <div className="mt-1 border-t border-dashed border-black pt-1">NOTAS: {savedOrder.notes}</div>
      )}
      <div className="mt-2 text-center border-t border-dashed border-black pt-1">
        {settings.ticketFooter.message && <div>{settings.ticketFooter.message}</div>}
        {settings.ticketFooter.website && <div>{settings.ticketFooter.website}</div>}
      </div>
    </div>
  );

  const printInvoice = savedOrder && (
    <div id="order-print-area" style={{ width: '100%', maxWidth: '800px', margin: '0 auto', fontFamily: 'inherit', background: '#fff', color: '#000', padding: '24px' }}>
      <div className="flex justify-between items-start">
        <div>
          <div className="text-lg font-bold">{settings.ticketHeader.name}</div>
          {settings.ticketHeader.address && <div>{settings.ticketHeader.address}</div>}
          {settings.ticketHeader.phone && <div>Tel: {settings.ticketHeader.phone}</div>}
          {settings.ticketHeader.rfc && <div>RFC: {settings.ticketHeader.rfc}</div>}
        </div>
        <div className="text-right">
          <div className="text-lg font-bold">PEDIDO No. {String(savedOrder.orderNumber ?? '').padStart(5, '0')}</div>
          <div>{new Date(savedOrder.createdAt ?? Date.now()).toLocaleString('es-NI')}</div>
          <div>Cliente: {savedOrder.customer?.fullName}</div>
        </div>
      </div>
      <table className="w-full mt-4 border-collapse">
        <thead>
          <tr className="border-b-2 border-black text-left">
            <th className="py-1 pr-2">Cant.</th>
            <th className="py-1 pr-2">Descripción</th>
            <th className="py-1 pr-2 text-right">Precio Unitario</th>
            <th className="py-1 text-right">Total</th>
          </tr>
        </thead>
        <tbody>
          {(savedOrder.items || []).map((it: any, i: number) => (
            <tr key={i} className="border-b border-black/20">
              <td className="py-1 pr-2">{it.quantity}</td>
              <td className="py-1 pr-2">{it.productName}</td>
              <td className="py-1 pr-2 text-right">{currencyFmt.format(it.unitPrice ?? 0)}</td>
              <td className="py-1 text-right">{currencyFmt.format(it.totalPrice ?? 0)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-4 flex justify-end text-lg font-bold">
        <span>TOTAL: {currencyFmt.format(savedOrder.totalAmount ?? (savedOrder.items || []).reduce((s: number, i: any) => s + (i.totalPrice ?? 0), 0))}</span>
      </div>
      {savedOrder.notes && (
        <div className="mt-3 border-t border-black pt-2">NOTAS: {savedOrder.notes}</div>
      )}
      <div className="mt-6 text-center border-t border-black pt-2">
        {settings.ticketFooter.message && <div>{settings.ticketFooter.message}</div>}
        {settings.ticketFooter.website && <div>{settings.ticketFooter.website}</div>}
      </div>
    </div>
  );

  const printLayer = savedOrder && printReady && typeof document !== 'undefined' && createPortal(
    <>
      <style>{`
@media print {
  body * { visibility: hidden !important; }
  #order-print-area, #order-print-area * { visibility: visible !important; }
  #order-print-area {
    position: absolute !important;
    left: 0 !important;
    top: 0 !important;
    ${printFormat === 'ticket' ? '' : 'width: 100% !important;'}
  }
  @page { size: auto; margin: 0 !important; }
}
`}</style>
      {printFormat === 'ticket' ? printTicket : printInvoice}
    </>,
    document.body
  );

  const capturePanel = (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label className="text-sm font-medium">Cliente</Label>
        <Select value={customerId} onValueChange={setCustomerId}>
          <SelectTrigger className="h-12 md:h-10 text-sm"><SelectValue placeholder="Seleccione un cliente" /></SelectTrigger>
          <SelectContent>
            {customers.map((c: any) => (
              <SelectItem key={c.id} value={c.id}>{c.fullName}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="h-px bg-border" />

      <div className="space-y-2">
        <Label className="text-sm font-medium">Producto</Label>
        <ProductSearch onSelect={handleProductSelect} inputRef={searchInputRef} />
        <p className="text-xs text-muted-foreground">
          Al seleccionar un producto se abre la configuración de presentación, cantidad y nivel.
        </p>
      </div>

      <div className="h-px bg-border" />

      <div className="space-y-2">
        <Label className="text-sm font-medium">Notas (opcional)</Label>
        <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notas del pedido..." className="h-12 md:h-10 text-sm" />
      </div>
    </div>
  );

  const cartPanel = (compact: boolean = false) => (
    <div className="flex flex-col h-full">
      {items.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm py-12">
          <p>Agregue productos desde la pestaña de captura.</p>
        </div>
      ) : (
        <>
          {!compact && (
            <div className="flex items-center justify-between px-4 py-2 border-b shrink-0">
              <span className="text-sm font-semibold">
                {items.length} {items.length === 1 ? 'artículo' : 'artículos'}
              </span>
            </div>
          )}

          <div ref={scrollRef} className={cn("overflow-y-auto min-h-0", compact ? "max-h-[340px]" : "flex-1")}>
            {isMobile ? (
              <div className="space-y-2 p-3">
                {items.map((item, idx) => (
                  <CartItemMobile key={item.productId + idx} item={item} onRemove={() => removeItem(idx)} />
                ))}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-[1fr_60px_80px_90px_32px] gap-2 px-4 py-2 bg-muted/50 border-b text-[11px] font-semibold text-muted-foreground uppercase tracking-wide shrink-0 sticky top-0 z-10">
                  <span>Producto</span>
                  <span className="text-center">Cant.</span>
                  <span className="text-right">P. Unit.</span>
                  <span className="text-right">Subtotal</span>
                  <span />
                </div>
                <div className="divide-y">
                  {items.map((item, idx) => (
                    <div key={item.productId + idx} className="grid grid-cols-[1fr_60px_80px_90px_32px] gap-2 items-center px-4 py-2.5 hover:bg-muted/30 transition-colors">
                      <div className="min-w-0">
                        <span className="text-sm font-medium truncate">{item.productName}</span>
                        {item.presentationName && (
                          <span className="block text-[11px] text-muted-foreground truncate">{item.presentationName}</span>
                        )}
                      </div>
                      <span className="text-sm text-center font-mono">{item.quantity}</span>
                      <span className="text-sm text-right font-mono">C${item.unitPrice.toFixed(2)}</span>
                      <span className="text-sm text-right font-bold font-mono">C${(item.quantity * item.unitPrice).toFixed(2)}</span>
                      <div className="flex justify-center">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeItem(idx)}>
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );

  const summaryAndSubmit = (
    <div className="shrink-0 border rounded-lg bg-card p-4 space-y-3">
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Productos</span>
          <span className="font-medium">{items.length}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Subtotal</span>
          <span className="font-medium">C${total.toFixed(2)}</span>
        </div>
        <div className="h-px bg-border" />
        <div className="flex justify-between items-baseline">
          <span className="text-base font-bold">Total</span>
          <span className="text-2xl font-bold text-primary">C${total.toFixed(2)}</span>
        </div>
      </div>
      <Button onClick={handleSubmit} disabled={saving} className="w-full h-12 md:h-10 text-sm md:text-base" size="lg">
        <Save className="mr-2 h-4 w-4" />{saving ? 'Guardando...' : 'Guardar Pedido'}
      </Button>
    </div>
  );

  const savedOrderDialog = savedOrder && (
    <Dialog open onOpenChange={(open) => { if (!open) finishWithoutPrint(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Check className="h-5 w-5 text-emerald-500" />
            Pedido Guardado con Éxito
          </DialogTitle>
          <DialogDescription>
            Pedido <span className="font-semibold text-foreground">#{String(savedOrder.orderNumber ?? '').padStart(5, '0')}</span> para{' '}
            <span className="font-semibold text-foreground">{savedOrder.customer?.fullName}</span>. Elija el formato de impresión o finalice sin imprimir.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <Label className="text-sm font-medium">Formato de impresión</Label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setPrintFormat('ticket')}
              className={cn(
                'flex flex-col items-center gap-1 rounded-lg border p-3 text-sm font-medium transition-colors',
                printFormat === 'ticket' ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:bg-muted'
              )}
            >
              <Printer className="h-5 w-5" />
              Ticket POS
              <span className="text-[10px] font-normal">Térmica 80/58mm</span>
            </button>
            <button
              type="button"
              onClick={() => setPrintFormat('invoice')}
              className={cn(
                'flex flex-col items-center gap-1 rounded-lg border p-3 text-sm font-medium transition-colors',
                printFormat === 'invoice' ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:bg-muted'
              )}
            >
              <ClipboardList className="h-5 w-5" />
              Pedido Completo
              <span className="text-[10px] font-normal">Hoja Carta / A4</span>
            </button>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={finishWithoutPrint} className="flex-1">
            <X className="mr-2 h-4 w-4" />Finalizar sin Imprimir
          </Button>
          <Button onClick={triggerPrint} className="flex-1">
            <Printer className="mr-2 h-4 w-4" />Imprimir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  if (isMobile) {
    return (
      <div className="flex flex-col h-[calc(100dvh-8rem)] -m-2 md:-m-4">
        <div className="shrink-0 px-3 pt-3 pb-2">
          <h1 className="text-xl font-headline font-bold tracking-tight">Nuevo Pedido</h1>
        </div>

        <Tabs value={mobileTab} onValueChange={setMobileTab} className="flex-1 flex flex-col min-h-0">
          <div className="shrink-0 px-3">
            <TabsList className="w-full h-12">
              <TabsTrigger value="capture" className="flex-1 h-10 text-sm data-[state=active]:text-primary">
                <ScanLine className="h-4 w-4 mr-1.5" />
                Captura
              </TabsTrigger>
              <TabsTrigger value="cart" className="flex-1 h-10 text-sm data-[state=active]:text-primary">
                <ShoppingCart className="h-4 w-4 mr-1.5" />
                Pedido
                {items.length > 0 && (
                  <span className="ml-1.5 inline-flex items-center justify-center h-5 min-w-[20px] rounded-full bg-primary text-primary-foreground text-[10px] font-bold px-1">
                    {items.length}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="capture" className="flex-1 overflow-y-auto mt-0 p-3 data-[state=inactive]:hidden">
            {capturePanel}
          </TabsContent>

          <TabsContent value="cart" className="flex-1 overflow-hidden mt-0 data-[state=inactive]:hidden flex flex-col">
            <div className="flex-1 overflow-y-auto min-h-0">
              {cartPanel(false)}
            </div>
            <div className="shrink-0 p-3 border-t bg-background">
              {summaryAndSubmit}
            </div>
          </TabsContent>
        </Tabs>

        <ProductAddWizard
          product={wizardProduct}
          defaultPriceLevel={selectedCustomer?.priceLevel && selectedCustomer.priceLevel >= 1 && selectedCustomer.priceLevel <= 4 ? selectedCustomer.priceLevel : priceLevel}
          onConfirm={handleWizardConfirm}
          onClose={() => setWizardProduct(null)}
        />
        {printLayer}
        {savedOrderDialog}
      </div>
    );
  }

  return (
    <div className="flex w-full h-full flex-col gap-3 min-h-0">
      {/* Encabezado */}
      <div className="shrink-0 flex items-center justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-xl md:text-2xl font-headline font-bold tracking-tight">Nuevo Pedido</h1>
          <p className="text-muted-foreground text-sm">Registre un pedido. Los precios se aplican según el nivel asignado.</p>
        </div>
      </div>

      {/* Layout tipo POS a ancho completo */}
      <div className="flex-1 flex gap-4 min-h-0">

        {/* Panel Izquierdo: Detalle del Pedido (ancho fijo, no colapsa) */}
        <div className="hidden lg:flex w-[380px] xl:w-[420px] shrink-0 flex-col gap-3 min-h-0">
          <Card className="flex-1 flex flex-col min-h-0 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b shrink-0">
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-semibold">Detalle del Pedido</span>
                {items.length > 0 && (
                  <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                    {items.length} {items.length === 1 ? 'artículo' : 'artículos'}
                  </span>
                )}
              </div>
            </div>
            {cartPanel(false)}
          </Card>
          {summaryAndSubmit}
        </div>

        {/* Panel Derecho: Captura expandida a ancho completo */}
        <div className="hidden lg:flex flex-1 min-w-0 flex-col min-h-0">
          <Card className="flex-1 flex flex-col min-h-0 overflow-hidden">
            {/* Selectores superiores: Cliente y Notas en ancho simétrico */}
            <div className="shrink-0 border-b p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Cliente</Label>
                <Select value={customerId} onValueChange={setCustomerId}>
                  <SelectTrigger className="h-10 text-sm"><SelectValue placeholder="Seleccione un cliente" /></SelectTrigger>
                  <SelectContent>
                    {customers.map((c: any) => (
                      <SelectItem key={c.id} value={c.id}>{c.fullName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Notas (opcional)</Label>
                <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notas del pedido..." className="h-10 text-sm" />
              </div>
            </div>

            {/* Búsqueda de producto ampliada */}
            <div className="flex-1 overflow-y-auto min-h-0 p-4 space-y-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Producto</Label>
                <ProductSearch onSelect={handleProductSelect} inputRef={searchInputRef} />
                <p className="text-xs text-muted-foreground">
                  Al seleccionar un producto se abre la configuración de presentación, cantidad y nivel.
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>

      <ProductAddWizard
        product={wizardProduct}
        defaultPriceLevel={selectedCustomer?.priceLevel && selectedCustomer.priceLevel >= 1 && selectedCustomer.priceLevel <= 4 ? selectedCustomer.priceLevel : priceLevel}
        onConfirm={handleWizardConfirm}
        onClose={() => setWizardProduct(null)}
      />
      {printLayer}
      {savedOrderDialog}
    </div>
  );
}
