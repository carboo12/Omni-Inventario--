"use client";
import { generateUUID } from '@/lib/uuid';

// Vista móvil-first del Despachador (role: dispatcher).
// 3 bloques: selector de cliente, catálogo/escáner de productos y carrito táctil.
// Sin elementos de cobro (pago/arqueo/factura): solo toma de comandas -> createHeldSale.

import React, { useState, useMemo, useEffect, useRef } from 'react';
import type { CartItem, Product, InventoryItem } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import {
  Search,
  UserPlus,
  User as UserIcon,
  Send,
  ShoppingCart,
  ScanLine,
  Plus,
  Minus,
  Trash2,
  CreditCard,
  ChevronRight,
  PauseCircle,
  Clock,
  RotateCcw,
} from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { useSettings } from '@/hooks/use-settings';
import { usePendingSales } from '@/hooks/use-pending-sales';
import { AssignClientDialog } from '@/components/pos/assign-client-dialog';
import { PaymentSummaryDialog } from '@/components/pos/payment-summary-dialog';
import { UserNav } from '@/components/layout/user-nav';
import placeholderImages from '@/lib/placeholder-images.json';
import { cn, formatCurrency } from '@/lib/utils';
import { ProductAddWizard } from '@/components/pos/product-add-wizard';
import { usePersistedCart } from '@/hooks/use-persisted-cart';
import { resolvePresentationFactor } from '@/lib/presentations';

interface DispatcherPOSProps {
  products: Product[];
  inventory: InventoryItem[];
}

const getAvailablePOSProducts = (products: Product[], inventory: InventoryItem[], inventoryType: string) => {
  const productMap = new Map<string, Product>();
  products.forEach(p => productMap.set(p.id, p));

  const simpleProducts = inventory
    .filter(item => item.inventoryType === inventoryType && item.quantity > 0)
    .reduce<Product[]>((acc, item) => {
      const product = productMap.get(item.productId);
      if (product && !(product as any).variantId) acc.push(product);
      return acc;
    }, []);

  const variantProducts = products.filter((product) =>
    (product as any).variantId &&
    product.inventoryType === inventoryType &&
    Number((product as any).stock || 0) > 0
  );

  return Array.from(new Map([...simpleProducts, ...variantProducts].map(p => [p.id, p])).values());
};

const getPOSProductStock = (product: Product, inventory: InventoryItem[], inventoryType: string) => {
  if ((product as any).variantId) return Number((product as any).stock || 0);
  const invItem = inventory.find(i => i.productId === product.id && i.inventoryType === inventoryType);
  return invItem?.quantity || 0;
};

export function DispatcherPOS({ products, inventory }: DispatcherPOSProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { settings } = useSettings();
  const { addPendingSale, heldOrders, addHeldOrder, promoteHeldOrder, deletePendingSale, refreshHeldOrders, updatePendingSale } = usePendingSales();
  const { cart, setCart, customerName, setCustomerName } = usePersistedCart();
  const [searchTerm, setSearchTerm] = useState('');
  const [customerPriceLevel, setCustomerPriceLevel] = useState(1);
  const [isAssignClientOpen, setIsAssignClientOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isHeldOrdersOpen, setIsHeldOrdersOpen] = useState(false);
  const [isHolding, setIsHolding] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [isPaymentSummaryOpen, setIsPaymentSummaryOpen] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [wizardProduct, setWizardProduct] = useState<{ product: Product } | null>(null);
  /** ID del borrador (HELD) que se está editando tras un "Retomar". */
  const [activeDraftId, setActiveDraftId] = useState<string | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const userInventoryType = user?.inventoryType || 'general';

  const getProductPrice = (product: Product, priceLevel: number): number => {
    if (priceLevel === 2 && (product as any).price2) return (product as any).price2;
    if (priceLevel === 3 && (product as any).price3) return (product as any).price3;
    if (priceLevel === 4 && (product as any).price4) return (product as any).price4;
    return product.priceNIO;
  };

  const availableProducts = useMemo(() => {
    return getAvailablePOSProducts(products, inventory, userInventoryType).map((product) => {
      const categoryHint = product.category.toLowerCase().split(' ')[0];
      const image = placeholderImages.placeholderImages.find(img => img.id === `product-${categoryHint}`)
        || placeholderImages.placeholderImages.find(img => img.id === 'product-default');
      return { ...product, imageUrl: product.imageUrl || image?.imageUrl };
    });
  }, [userInventoryType, products, inventory]);

  // Categorías rápidas derivadas del catálogo disponible.
  const categories = useMemo(() => {
    const map = new Map<string, number>();
    availableProducts.forEach(p => {
      const cat = p.category || 'General';
      map.set(cat, (map.get(cat) || 0) + 1);
    });
    return Array.from(map.entries()).map(([name, count]) => ({ name, count }));
  }, [availableProducts]);

  const filteredProducts = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();
    return availableProducts.filter(p => {
      if (activeCategory && (p.category || 'General') !== activeCategory) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        (p.barcode && p.barcode.toLowerCase().includes(q)) ||
        (p.brand && p.brand.toLowerCase().includes(q))
      );
    });
  }, [availableProducts, searchTerm, activeCategory]);

  const addToCart = (product: Product) => {
    // Abre el wizard compartido (presentación → cantidad → nivel de precio).
    setWizardProduct({ product });
  };

  const handleWizardConfirm = (product: Product, presentation: 'unit' | 'box' | string, priceLevel: number, quantity: number, presentationName?: string, presentationFactor?: number) => {
    addItemToCart(product, presentation, priceLevel, quantity, presentationName, presentationFactor);
    // Limpiar el buscador y los selectores temporales para agilizar el siguiente artículo.
    setWizardProduct(null);
    setSearchTerm('');
    setSelectedItemId(null);
    // Regresar el catálogo a la vista completa (sin filtro de categoría).
    setActiveCategory(null);
    // Re-enfocar el buscador: deja el cursor listo para la siguiente búsqueda/escaneo.
    searchInputRef.current?.focus();
  };

  const addItemToCart = (product: Product, presentation: 'unit' | 'box' | string, priceLevel: number, quantity: number, presentationName?: string, presentationFactor?: number) => {
    const currentStock = getPOSProductStock(product, inventory, userInventoryType);
    if (currentStock <= 0) {
      toast({ title: 'Sin Existencias', description: `"${product.name}" tiene existencia 0.`, variant: 'destructive' });
      return;
    }
    const qty = Math.max(0, Number.isFinite(quantity) ? quantity : 0);
    if (qty <= 0) return;

    // Factor de conversión a la unidad base (presentación fija o legado caja).
    const factor = resolvePresentationFactor(product, presentation, presentationName, presentationFactor);
    const unitsToConsume = factor;
    const itemInCart = cart.find(item => item.product.id === product.id);
    const existingConsumption = itemInCart ? itemInCart.quantity * resolvePresentationFactor(itemInCart.product, itemInCart.presentation, itemInCart.presentationName, itemInCart.presentationFactor) : 0;

    if (existingConsumption + qty * unitsToConsume > currentStock) {
      toast({ title: 'Límite de Existencias', description: `Solo hay ${currentStock} unidades disponibles.`, variant: 'destructive' });
      return;
    }

    setCart(prev => {
      const existingItem = prev.find(item => item.product.id === product.id && item.presentation === presentation);
      // Precio unitario efectivo: nivel elegido de precios del producto.
      const unitPrice = getProductPrice(product, priceLevel);
      if (existingItem) {
        return prev.map(item =>
          item.product.id === product.id && item.presentation === presentation
            ? { ...item, quantity: Math.round((item.quantity + qty) * 100) / 100 }
            : item
        );
      }
      return [...prev, { id: product.id, product, quantity: qty, presentation, presentationName, presentationFactor: factor, unitPrice, priceLevel }];
    });
  };

  const getItemPrice = (item: CartItem): number => {
    // Usa el precio unitario congelado al agregar (valor directo del nivel de precio en BD).
    if (typeof item.unitPrice === 'number' && item.unitPrice > 0) {
      return item.unitPrice;
    }
    // Fallback: precio según Nivel de Precio del cliente (valor directo de BD).
    return getProductPrice(item.product, customerPriceLevel);
  };

  const updateQuantity = (productId: string, change: number) => {
    const product = products.find(p => p.id === productId);
    const currentStock = product ? getPOSProductStock(product, inventory, userInventoryType) : 0;
    const itemInCart = cart.find(i => i.product.id === productId);

    // Para productos fraccionables el paso es 0.5 (media libra), sino 1.
    const step = itemInCart?.product.isFractional ? 0.5 : 1;

    if (itemInCart && change > 0 && itemInCart.quantity + change > currentStock) {
      toast({ title: 'Límite de Existencias', description: `No puede exceder las ${currentStock} unidades.`, variant: 'destructive' });
      return;
    }

    setCart(prev =>
      prev
        .map(item => {
          if (item.product.id !== productId) return item;
          const next = Math.round((item.quantity + change) * 100) / 100;
          return { ...item, quantity: Math.max(0, next) };
        })
        .filter(item => item.quantity > 0)
    );
  };

  const setQuantity = (productId: string, value: number) => {
    const product = products.find(p => p.id === productId);
    const currentStock = product ? getPOSProductStock(product, inventory, userInventoryType) : 0;
    const qty = Math.max(0, Number.isFinite(value) ? value : 0);
    if (qty > currentStock) {
      toast({ title: 'Límite de Existencias', description: `No puede exceder las ${currentStock} unidades.`, variant: 'destructive' });
      return;
    }
    setCart(prev =>
      prev
        .map(item => (item.product.id === productId ? { ...item, quantity: Math.round(qty * 100) / 100 } : item))
        .filter(item => item.quantity > 0)
    );
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.product.id !== productId));
    if (selectedItemId === productId) setSelectedItemId(null);
  };

  // Auto-detección de escáner (código de barras exacto).
  useEffect(() => {
    if (searchTerm.length >= 3) {
      const exact = availableProducts.find(
        p => p.barcode && p.barcode.toLowerCase() === searchTerm.toLowerCase()
      );
      if (exact) {
        addToCart(exact);
        setSearchTerm('');
        // El wizard se encarga de re-enfocar al confirmar; aquí limpiamos el input.
        toast({ title: 'Producto agregado', description: exact.name });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm]);

  const cartCount = cart.reduce((acc, item) => acc + item.quantity, 0);
  const cartSubtotal = useMemo(
    () => cart.reduce((total, item) => total + getItemPrice(item) * item.quantity, 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cart, customerPriceLevel]
  );
  const taxAmount = useMemo(() => (settings.applyIVA ? cartSubtotal * 0.15 : 0), [cartSubtotal, settings.applyIVA]);
  const cartTotal = cartSubtotal + taxAmount;

  const handleClearCart = () => {
    if (cart.length > 0 && confirm('¿Está seguro de limpiar el carrito?')) {
      setCart([]);
      setSelectedItemId(null);
      setActiveDraftId(null);
    }
  };

  const handleSendToCashier = async () => {
    if (cart.length === 0) {
      toast({ title: 'Carrito Vacío', description: 'Agregue productos antes de enviar a caja.', variant: 'destructive' });
      return;
    }
    // Cliente opcional: si no se seleccionó, se asigna el perfil por defecto.
    const effectiveCustomerName = customerName.trim() || 'CLIENTE GENERAL';
    setIsSending(true);
    try {
      let result: any;
      if (activeDraftId) {
        // Estamos editando un borrador retomado → actualizar ítems y promover a PENDING.
        await updatePendingSale(activeDraftId, cart, cartTotal);
        result = await promoteHeldOrder(activeDraftId);
      } else {
        // createHeldSale se invoca internamente a través de addPendingSale.
        result = await addPendingSale(effectiveCustomerName, cart, cartTotal);
      }
      if (result && result.success === false) {
        toast({ title: 'Error', description: result.error || 'No se pudo guardar la comanda.', variant: 'destructive' });
        return;
      }
      toast({ title: 'Comanda enviada a caja exitosamente', description: `La comanda de ${effectiveCustomerName} quedó lista para cobrar en caja.` });
      setCart([]);
      setCustomerName('');
      setSelectedItemId(null);
      setActiveDraftId(null);
      setIsCartOpen(false);
      setSearchTerm('');
      searchInputRef.current?.focus();
    } finally {
      setIsSending(false);
    }
  };

  // Guarda el pedido en curso en estado "En Espera" (borrador) para retomarlo más
  // tarde. NO lo envía a caja ni afecta stock: solo se persiste (estado HELD).
  const handleHoldOrder = async () => {
    if (cart.length === 0) {
      toast({ title: 'Carrito Vacío', description: 'Agregue al menos un producto para poner en espera.', variant: 'destructive' });
      return;
    }
    setIsHolding(true);
    try {
      const effectiveCustomerName = customerName.trim() || 'CLIENTE GENERAL';
      let result: any;
      if (activeDraftId) {
        // Ya estamos editando un borrador retomado → actualizar en lugar de duplicar.
        result = await updatePendingSale(activeDraftId, cart, cartTotal);
      } else {
        result = await addHeldOrder(effectiveCustomerName, cart, cartTotal);
      }
      if (result && result.success === false) {
        toast({ title: 'Error', description: result.error || 'No se pudo guardar el pedido en espera.', variant: 'destructive' });
        return;
      }
      toast({ title: 'Pedido en espera', description: `Se guardó temporalmente el pedido de ${effectiveCustomerName}.` });
      setCart([]);
      setCustomerName('');
      setSelectedItemId(null);
      setActiveDraftId(null);
      setIsCartOpen(false);
      setSearchTerm('');
      refreshHeldOrders();
      searchInputRef.current?.focus();
    } finally {
      setIsHolding(false);
    }
  };

  // Reconstruye el carrito desde un pedido "En Espera". Resuelve cada ítem
  // contra el catálogo actual para usar stock/precios vigentes.
  const buildCartFromOrder = (order: any): CartItem[] => {
    const items = Array.isArray(order?.items) ? order.items : [];
    const result: CartItem[] = [];
    for (const it of items) {
      const product = it?.product
        ? products.find(p => p.id === it.product.id) || it.product
        : products.find(p => p.id === it?.productId) || products.find(p => p.name === it?.productName);
      if (!product) continue;
      result.push({
        id: generateUUID(),
        product,
        quantity: Math.max(0.5, Number(it?.quantity) || 1),
        unitPrice: Number(it?.unitPrice) > 0 ? Number(it.unitPrice) : undefined,
        priceLevel: it?.priceLevel,
        presentation: it?.presentation ?? 'unit',
        presentationName: it?.presentationName,
        presentationFactor: it?.presentationFactor,
        isEncargo: Boolean(it?.isEncargo),
      });
    }
    return result;
  };

  // Retoma un pedido en espera: lo carga de vuelta a la pantalla para continuarlo.
  const handleRetakeHeldOrder = (order: any) => {
    // Si el carrito actual tiene productos de otro borrador, confirmar antes de reemplazar.
    if (cart.length > 0 && !confirm('Ya tienes productos en el carrito. ¿Reemplazar con el pedido en espera?')) {
      return;
    }
    const restoredCart = buildCartFromOrder(order);
    setCart(restoredCart);
    // Asignar el cliente del pedido al selector.
    setCustomerName(
      order?.customerName && order.customerName !== 'CLIENTE GENERAL'
        ? order.customerName
        : ''
    );
    // Guardar referencia al borrador para que las acciones siguientes
    // (Enviar a Caja / Poner en Espera) actualicen este registro en lugar de crear duplicados.
    setActiveDraftId(order.id);
    setSelectedItemId(null);
    setIsHeldOrdersOpen(false);
    setIsCartOpen(false);
    setSearchTerm('');
    // Re-enfocar el buscador para seguir agregando productos inmediatamente.
    setTimeout(() => searchInputRef.current?.focus(), 150);
    toast({ title: 'Pedido retomado', description: `Se cargó el pedido de ${order?.customerName || 'sin cliente'}. Puedes editar y luego enviar a caja.` });
  };

  // Termina un pedido en espera y lo comanda a caja (PENDING). Sigue sin tocar stock.
  const handleSendHeldOrderToCashier = async (order: any) => {
    const result = await promoteHeldOrder(order.id);
    if (result && result.success === false) {
      toast({ title: 'Error', description: result.error || 'No se pudo enviar a caja.', variant: 'destructive' });
      return;
    }
    toast({ title: 'Comanda enviada a caja', description: `El pedido de ${order?.customerName || 'sin cliente'} quedó listo para cobrar.` });
    refreshHeldOrders();
  };

  const handleDeleteHeldOrder = async (order: any) => {
    if (!confirm('¿Eliminar este pedido en espera?')) return;
    await deletePendingSale(order.id);
    refreshHeldOrders();
    toast({ title: 'Pedido eliminado', description: 'El pedido en espera fue descartado.' });
  };

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-slate-50 touch-manipulation">
      {/* Bloque 1: Selector de Cliente + Menú de Perfil */}
      <div className="flex w-full shrink-0 items-stretch border-b border-slate-200 bg-white">
        <button
          onClick={() => setIsAssignClientOpen(true)}
          className="flex min-w-0 flex-1 items-center justify-between gap-3 px-4 py-3 text-left active:bg-slate-100 transition-colors min-h-[64px]"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              {customerName ? <UserIcon className="h-5 w-5" /> : <UserPlus className="h-5 w-5" />}
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Cliente</p>
              <p className={cn('truncate text-base font-bold', customerName ? 'text-slate-900' : 'text-slate-400')}>
                {customerName || 'Seleccionar cliente'}
              </p>
              {customerPriceLevel > 1 && (
                <p className="text-xs font-semibold text-blue-600">Nivel {customerPriceLevel}</p>
              )}
            </div>
          </div>
          <ChevronRight className="h-5 w-5 shrink-0 text-slate-400" />
        </button>
        <div className="flex shrink-0 items-center border-l border-slate-200 px-2">
          <button
            onClick={() => setIsHeldOrdersOpen(true)}
            className="relative flex h-11 w-11 items-center justify-center rounded-full text-slate-600 active:bg-slate-100 transition-colors"
            title="Pedidos en espera"
          >
            <Clock className="h-5 w-5" />
            {heldOrders.length > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-black text-white">
                {heldOrders.length}
              </span>
            )}
          </button>
          <UserNav />
        </div>
      </div>

      {/* Bloque 2: Catálogo / Escáner */}
      <div className="shrink-0 border-b border-slate-200 bg-white px-4 pt-3 pb-2 space-y-2">
        <div className="relative">
          <ScanLine className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-primary" />
          <Input
            ref={searchInputRef}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar producto o escanear código…"
            className="h-12 pl-10 pr-4 text-base"
            inputMode="search"
            autoComplete="off"
            autoCapitalize="off"
            autoCorrect="off"
          />
        </div>
        <ScrollArea className="w-full pb-1">
          <div className="flex gap-2 whitespace-nowrap">
            <button
              onClick={() => setActiveCategory(null)}
              className={cn(
                'h-10 shrink-0 rounded-full px-4 text-sm font-bold transition-colors',
                activeCategory === null
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-slate-100 text-slate-600 active:bg-slate-200'
              )}
            >
              Todos
            </button>
            {categories.map((cat) => (
              <button
                key={cat.name}
                onClick={() => setActiveCategory(activeCategory === cat.name ? null : cat.name)}
                className={cn(
                  'h-10 shrink-0 rounded-full px-4 text-sm font-bold transition-colors',
                  activeCategory === cat.name
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-slate-100 text-slate-600 active:bg-slate-200'
                )}
              >
                {cat.name} <span className="opacity-60">({cat.count})</span>
              </button>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Grid de productos */}
      <div className="flex-1 overflow-y-auto p-3">
        {filteredProducts.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center text-slate-400">
            <ShoppingCart className="mb-3 h-14 w-14 opacity-40" />
            <p className="text-lg font-semibold">No se encontraron productos</p>
            <p className="text-sm">Pruebe con otro término o categoría.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {filteredProducts.map((product) => {
              const price = getProductPrice(product, customerPriceLevel);
              return (
                <button
                  key={product.id}
                  onClick={() => addToCart(product)}
                  className="flex min-h-[112px] flex-col justify-between overflow-hidden rounded-2xl border border-slate-200 bg-white p-3 text-left shadow-sm transition-all active:scale-[0.97] active:bg-primary/5 hover:shadow-md"
                >
                  <div className="min-w-0">
                    <p className="line-clamp-2 text-[13px] font-black uppercase leading-tight text-slate-800">
                      {product.name}
                    </p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {product.barcode && (
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[9px] text-slate-500">
                          {product.barcode}
                        </span>
                      )}
                      {product.size && (
                        <Badge variant="secondary" className="px-1.5 py-0 text-[9px]">{product.size}</Badge>
                      )}
                    </div>
                  </div>
                  <div className="mt-2 flex items-end justify-between">
                    <span className="font-black text-base text-primary">{formatCurrency(price)}</span>
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
                      <Plus className="h-5 w-5" />
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Barra Inferior Fija: Resumen + ENVIAR */}
      <div className="safe-area-inset-bottom z-20 shrink-0 border-t border-slate-200 bg-white px-4 pb-3 pt-3 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsCartOpen(true)}
            className="flex min-w-0 flex-1 items-center justify-between py-1 active:opacity-70 transition-opacity"
          >
            <div className="flex items-center gap-2 text-left">
              <div className="relative">
                <ShoppingCart className="h-6 w-6 text-primary" />
                {cartCount > 0 && (
                  <span className="absolute -right-2 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-black text-primary-foreground">
                    {cartCount}
                  </span>
                )}
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  {cartCount === 0 ? 'Carrito vacío' : `${cartCount} ${cartCount === 1 ? 'artículo' : 'artículos'}`}
                </p>
                <p className="text-2xl font-black text-slate-900">{formatCurrency(cartTotal)}</p>
              </div>
            </div>
            {cart.length > 0 && <ChevronRight className="h-5 w-5 text-slate-400" />}
          </button>

          <Button
            onClick={() => { if (cart.length > 0) handleHoldOrder(); else toast({ title: 'Carrito Vacío', description: 'Agregue productos antes de poner en espera.', variant: 'destructive' }); }}
            disabled={isSending || isHolding || cart.length === 0}
            className={cn(
              "h-12 shrink-0 rounded-xl bg-slate-600 px-3 text-sm font-black text-white shadow-lg transition-all active:scale-[0.97] hover:bg-slate-700",
              cart.length === 0 && "opacity-50 cursor-not-allowed"
            )}
            title="Poner en espera"
          >
            <PauseCircle className="h-4 w-4" />
          </Button>

          <Button
            onClick={() => setIsPaymentSummaryOpen(true)}
            disabled={isSending || cart.length === 0}
            className={cn(
              "h-12 shrink-0 rounded-xl bg-amber-500 px-4 text-sm font-black text-white shadow-lg transition-all active:scale-[0.97] hover:bg-amber-600",
              cart.length === 0 && "opacity-50 cursor-not-allowed"
            )}
          >
            {isSending ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Enviando
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Send className="h-4 w-4" />
                COMANDAR
              </span>
            )}
          </Button>
        </div>

        <Button
          onClick={() => {
            if (cart.length > 0) {
              setIsPaymentSummaryOpen(true);
            } else {
              setIsCartOpen(true);
            }
          }}
          disabled={isSending}
          className={cn(
            "mt-2 h-14 w-full text-lg font-black text-white shadow-lg transition-all active:scale-[0.99]",
            cart.length === 0 && "opacity-50 cursor-not-allowed"
          )}
        >
          {isSending ? (
            <span className="flex items-center gap-2 text-white">
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Enviando…
            </span>
          ) : cart.length === 0 ? (
            <span className="flex items-center gap-2 text-white">
              <ShoppingCart className="h-5 w-5" />
              SELECCIONAR PRODUCTOS
            </span>
          ) : (
            <span className="flex items-center justify-center gap-2 text-white">
              <CreditCard className="h-5 w-5" />
              COBRAR ( {formatCurrency(cartTotal)} )
            </span>
          )}
        </Button>
      </div>

      {/* Carrito Táctil (bottom sheet) */}
      <Sheet open={isCartOpen} onOpenChange={setIsCartOpen}>
        <SheetContent side="bottom" className="flex h-[80vh] flex-col rounded-t-3xl p-0">
          <SheetHeader className="shrink-0 border-b border-slate-100 p-4 text-left">
            <SheetTitle className="flex items-center gap-2 text-lg">
              <ShoppingCart className="h-5 w-5 text-primary" />
              Comanda de {customerName || 'sin cliente'}
            </SheetTitle>
            <SheetDescription className="text-sm">
              Revisa y ajusta los artículos antes de enviar a caja.
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto p-3">
            {cart.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center text-center text-slate-400">
                <ShoppingCart className="mb-3 h-12 w-12 opacity-40" />
                <p className="font-semibold">El carrito está vacío</p>
              </div>
            ) : (
              <div className="space-y-2">
                {cart.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => setSelectedItemId(item.id === selectedItemId ? null : item.id)}
                    className={cn(
                      'rounded-2xl border p-3 transition-colors',
                      selectedItemId === item.id ? 'border-primary bg-primary/5' : 'border-slate-200 bg-white'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-2 text-sm font-bold text-slate-900">{item.product.name}</p>
                        <p className="mt-0.5 text-xs text-slate-500">
                          {item.presentationName ? (
                            <>
                              <span className="font-bold text-primary">{item.presentationName}</span> · {formatCurrency(getItemPrice(item))} c/u
                              {item.presentationFactor && Number(item.presentationFactor) > 1 ? ` (${item.presentationFactor} uds)` : ''}
                            </>
                          ) : item.presentation === 'box' ? (
                            <>
                              <span className="font-bold text-primary">Caja</span> · {formatCurrency(getItemPrice(item))} c/u
                              {item.product.unitsPerBox ? ` (${item.product.unitsPerBox} uds)` : ''}
                            </>
                          ) : (
                            `${formatCurrency(getItemPrice(item))} c/u`
                          )}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <button
                          onClick={(e) => { e.stopPropagation(); updateQuantity(item.product.id, -1); }}
                          className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-700 active:bg-slate-200 transition-colors"
                          aria-label="Restar"
                        >
                          <Minus className="h-5 w-5" />
                        </button>
                        {item.product.isFractional ? (
                          <input
                            type="number"
                            step="0.5"
                            min="0"
                            value={item.quantity}
                            onChange={(e) => setQuantity(item.product.id, parseFloat(e.target.value))}
                            onClick={(e) => e.stopPropagation()}
                            className="w-16 text-center text-lg font-black border border-slate-200 rounded-lg py-1"
                          />
                        ) : (
                          <span className="w-9 text-center text-lg font-black">{item.quantity}</span>
                        )}
                        <button
                          onClick={(e) => { e.stopPropagation(); updateQuantity(item.product.id, 1); }}
                          className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground active:opacity-80 transition-opacity"
                          aria-label="Sumar"
                        >
                          <Plus className="h-5 w-5" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); removeFromCart(item.product.id); }}
                          className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-50 text-red-500 active:bg-red-100 transition-colors"
                          aria-label="Eliminar"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                    <div className="mt-2 flex items-center justify-between border-t border-slate-100 pt-2">
                      <span className="text-xs font-semibold text-slate-500">
                        Subtotal
                        {item.product.isFractional && (
                          <span className="ml-1 text-[10px] text-slate-400">
                            · {item.quantity} {item.presentationName || (item.presentation === 'box' ? (item.product.bulkUnit || 'qtl') : (item.product.baseUnit || 'lb'))}
                          </span>
                        )}
                      </span>
                      <span className="font-black text-primary">
                        {formatCurrency(getItemPrice(item) * item.quantity)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="shrink-0 border-t border-slate-100 bg-white p-4">
            <Separator className="mb-3" />
            <div className="mb-3 space-y-1.5">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Subtotal</span>
                <span className="font-bold">{formatCurrency(cartSubtotal)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">IVA (15%)</span>
                <span className="font-bold">{formatCurrency(taxAmount)}</span>
              </div>
              <div className="flex items-center justify-between text-lg font-black">
                <span className="text-slate-900">Total</span>
                <span className="text-primary">{formatCurrency(cartTotal)}</span>
              </div>
            </div>
            {cart.length > 0 && (
              <button
                onClick={handleClearCart}
                className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-red-50 text-sm font-bold text-red-500 active:bg-red-100 transition-colors"
              >
                <Trash2 className="h-4 w-4" />
                Limpiar carrito
              </button>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Pedidos En Espera (borradores del despachador) */}
      <Sheet open={isHeldOrdersOpen} onOpenChange={setIsHeldOrdersOpen}>
        <SheetContent side="bottom" className="flex h-[80vh] flex-col rounded-t-3xl p-0">
          <SheetHeader className="shrink-0 border-b border-slate-100 p-4 text-left">
            <SheetTitle className="flex items-center gap-2 text-lg">
              <Clock className="h-5 w-5 text-amber-500" />
              Pedidos en Espera
            </SheetTitle>
            <SheetDescription className="text-sm">
              Borradores guardados temporalmente. Puedes retomarlos o enviarlos a caja.
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto p-3">
            {heldOrders.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center text-center text-slate-400">
                <Clock className="mb-3 h-12 w-12 opacity-40" />
                <p className="font-semibold">No hay pedidos en espera</p>
                <p className="text-sm">Los pedidos que pongas en espera aparecerán aquí.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {heldOrders.map((order) => {
                  const itemCount = Array.isArray(order.items) ? order.items.length : 0;
                  return (
                    <div key={order.id} className="rounded-2xl border border-amber-200 bg-amber-50/40 p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-bold text-slate-900">{order.customerName || 'Sin cliente'}</span>
                            <span className="rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-white">
                              En Espera
                            </span>
                          </div>
                          <p className="mt-0.5 text-xs text-slate-500">
                            {itemCount} artículo{itemCount !== 1 ? 's' : ''} · {formatCurrency(order.total)}
                          </p>
                          <p className="mt-0.5 text-[11px] text-slate-400">
                            {order.createdAt ? new Date(order.createdAt).toLocaleString() : ''}
                          </p>
                        </div>
                      </div>
                      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
                        <button
                          onClick={() => handleRetakeHeldOrder(order)}
                          className="flex h-11 items-center justify-center gap-2 rounded-xl bg-white text-sm font-bold text-slate-800 border border-slate-200 active:bg-slate-100 transition-colors"
                        >
                          <RotateCcw className="h-4 w-4" />
                          Retomar
                        </button>
                        <button
                          onClick={() => handleSendHeldOrderToCashier(order)}
                          className="flex h-11 items-center justify-center gap-2 rounded-xl bg-amber-500 text-sm font-bold text-white active:bg-amber-600 transition-colors"
                        >
                          <Send className="h-4 w-4" />
                          Enviar a Caja
                        </button>
                        <button
                          onClick={() => handleDeleteHeldOrder(order)}
                          className="flex h-11 items-center justify-center gap-2 rounded-xl bg-red-50 text-sm font-bold text-red-500 active:bg-red-100 transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                          Eliminar
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <AssignClientDialog
        isOpen={isAssignClientOpen}
        onClose={() => setIsAssignClientOpen(false)}
        onAssign={(client) => { setCustomerName(client.name); setCustomerPriceLevel(client.priceLevel || 1); }}
        currentName={customerName}
      />
      {/* Resumen de pago: confirma el envío de la comanda a caja */}
      <PaymentSummaryDialog
        isOpen={isPaymentSummaryOpen}
        onClose={() => setIsPaymentSummaryOpen(false)}
        total={cartTotal}
        amountPaid={cartTotal}
        change={0}
        onConfirm={() => {
          setIsPaymentSummaryOpen(false);
          handleSendToCashier();
        }}
      />

      {/* Wizard compartido: presentación → cantidad → nivel de precio */}
      <ProductAddWizard
        product={wizardProduct?.product ?? null}
        defaultPriceLevel={customerPriceLevel}
        onConfirm={handleWizardConfirm}
        onClose={() => setWizardProduct(null)}
      />
    </div>
  );
}