"use client";
import { generateUUID } from '@/lib/uuid';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import dynamic from '@/lib/dynamic';
import type { CartItem, Product, InventoryMovement, PendingSale, InventoryItem } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, Minus, Search, X, ShoppingCart, ScanLine, User, User as UserIcon, Send, ListOrdered, Clock, Coins, Users, Trash2, CreditCard, FileText, UserPlus, Monitor, ClipboardList, Lock } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useRouter, usePathname } from '@/lib/router-nav';
import { useCashRegister } from '@/hooks/use-cash-register';
import { useCashRegisterSessions } from '@/hooks/use-cash-register-sessions';
import { useToast } from '@/hooks/use-toast';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { UserNav } from '@/components/layout/user-nav';
import { Numpad } from '@/components/cash-register/numpad';
import Image from '@/components/ui/image';
import placeholderImages from '@/lib/placeholder-images.json';
import { useSettings } from '@/hooks/use-settings';
import { cn, formatCurrency, formatTicketNumber } from '@/lib/utils';
import { usePendingSales } from '@/hooks/use-pending-sales';
import { getPreferredPrintFormat, savePreferredPrintFormat, type PrintFormat } from '@/lib/print-format';
import { format, formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { createSale, getLastSale } from '@/lib/actions/sales';
import type { SaleFinancing } from '@/lib/actions/sales';
import { buildReceiptDataFromInvoice } from '@/lib/ticket-data';
import { printReceiptHtml, buildReceiptHtml, buildRetiroReceiptHtml, buildQuoteReceiptHtml } from '@/lib/print-iframe';
import { createQuote, getQuoteByNumber } from '@/lib/actions/quotations';
import { searchOrCreateCustomer } from '@/lib/actions/customers';
import { useBusinessMode } from '@/hooks/use-business-mode';
import { getAvailableJewelry } from '@/lib/actions/jewelry-production';
import { useQuery } from '@tanstack/react-query';
import { CartTicket } from '@/components/pos/cart-ticket';
import { ProductGrid, ProductGridHandle } from '@/components/pos/product-grid';
import { PaymentGrid } from '@/components/pos/payment-grid';
import { CreditFinancingDialog } from '@/components/pos/credit-financing-dialog';
import { DispatcherPOS } from '@/components/pos/dispatcher-pos';
import { ProductAddWizard } from '@/components/pos/product-add-wizard';
import { ItemEditDialog } from '@/components/pos/item-edit-dialog';
import { usePersistedCart } from '@/hooks/use-persisted-cart';
import { usePOSData } from '@/hooks/use-pos-data';
import { resolvePresentationFactor } from '@/lib/presentations';

const AssignClientDialog = dynamic(
    () => import('@/components/pos/assign-client-dialog').then((mod) => ({ default: mod.AssignClientDialog })),
    { ssr: false }
);
import type { SelectedClient } from '@/components/pos/assign-client-dialog';
const HeldBillsDialog = dynamic(
    () => import('@/components/pos/held-bills-dialog').then((mod) => ({ default: mod.HeldBillsDialog })),
    { ssr: false }
);
const PaymentSummaryDialog = dynamic(
    () => import('@/components/pos/payment-summary-dialog').then((mod) => ({ default: mod.PaymentSummaryDialog })),
    { ssr: false }
);
const QuickSwitchModal = dynamic(
    () => import('@/components/auth/quick-switch-modal').then((mod) => ({ default: mod.QuickSwitchModal })),
    { ssr: false }
);
const ReceiptTemplate = dynamic(
    () => import('@/components/pos/receipt-template').then((mod) => ({ default: mod.ReceiptTemplate })),
    { ssr: false }
);
const JewelryPOS = dynamic(
    () => import('@/components/jewelry/jewelry-pos').then((mod) => ({ default: mod.JewelryPOS })),
    { ssr: false }
);
const QuoteReceiptTemplate = dynamic(
    () => import('@/components/pos/quote-receipt-template').then((mod) => ({ default: mod.QuoteReceiptTemplate })),
    { ssr: false }
);
const FullPageInvoiceTemplate = dynamic(
    () => import('@/components/pos/full-page-invoice-template').then((mod) => ({ default: mod.FullPageInvoiceTemplate })),
    { ssr: false }
);
const LoadQuoteDialog = dynamic(
    () => import('@/components/pos/load-quote-dialog').then((mod) => ({ default: mod.LoadQuoteDialog })),
    { ssr: false }
);

// Local formatCurrency removed in favor of unified lib/utils utility

// Helper to prepare receipt data
const prepareReceiptData = (items: CartItem[], total: number, subtotal: number, tax: number, user: any, settings: any, customerName: string = 'Cliente General', paymentMethod: string = 'Efectivo', amountPaid: number = 0, change: number = 0, ticketIdOverride?: string) => {
    return {
        pharmacyName: settings.ticketHeader.name,
        address: settings.ticketHeader.address,
        phone: settings.ticketHeader.phone,
        rfc: settings.ticketHeader.rfc,
        ticketId: ticketIdOverride || `T-${Date.now().toString().slice(-6)}`,
        date: new Date(),
        cashierName: user?.name || 'Cajero',
        clientName: customerName,
        items: items.map(item => {
            const isBox = item.presentation === 'box' && (item.product as any).hasBoxOption;
            const bulkUnit = (item.product as any).bulkUnit || 'Paca';
            const baseUnit = (item.product as any).baseUnit || 'ud';
            // Presentación exacta vendida (dinámica o legado caja). Se muestra en mayúscula
            // en el ticket: ej. "2 RISTRA - Jabón - C$30.00" / "1 CAJA - Café - C$1,300".
            const presentationName = item.presentationName || (isBox ? bulkUnit : null);
            const unit = presentationName || baseUnit;
            const unitPrice = getCartItemPrice(item);
            return {
                quantity: item.quantity,
                // Descripción = nombre del producto (sin conversión a unidad base).
                description: item.product.name,
                price: unitPrice,
                total: unitPrice * item.quantity,
                // Cantidad + presentación: el template renderiza "{quantity} {unit}".
                unit,
                priceLevel: item.priceLevel,
                pending: !!item.isEncargo,
            };
        }),
        subtotal,
        tax,
        total,
        paymentMethod,
        amountPaid,
        change,
        hasEncargoItems: items.some(item => item.isEncargo),
        footerMessage: settings.ticketFooter.message,
        website: settings.ticketFooter.website,
        logoSvg: settings.logoSvg,
        exchangeRate: parseFloat(settings.exchangeRate) || 36.5,
        showTotalUSD: true
    };
};

interface POSComponentProps {
    products: Product[];
    inventory: InventoryItem[];
}

// Precio unitario de un item del carrito según su presentación (unidad o caja).
const getCartItemPrice = (item: CartItem): number => {
    // Usa el precio unitario congelado al agregar (nivel de precio × presentación).
    if (typeof item.unitPrice === 'number' && item.unitPrice > 0) return item.unitPrice;
    return item.product.priceNIO;
};

// Determina si el ítem supera el stock disponible => venta bajo encargo (entrega pendiente).
const computeIsEncargo = (product: Product, presentation: 'unit' | 'box' | string, quantity: number, presentationFactor?: number): boolean => {
    const factor = resolvePresentationFactor(product, presentation, undefined, presentationFactor);
    const physicalNeed = quantity * factor;
    const stock = typeof (product as any).stock === 'number' ? (product as any).stock : 0;
    return physicalNeed > stock;
};

// #region Dispatcher Component
// La vista del Despachador (mobile-first) vive en @/components/pos/dispatcher-pos.
// (DispatcherPOS se importa desde '@/components/pos/dispatcher-pos'.)
// #endregion

// Convierte un pedido (CustomerOrder) en ítems de carrito POS, emparejando
// cada línea contra el catálogo de productos por id o por nombre.
const buildCartItemsFromOrder = (order: any, products: Product[]): CartItem[] => {
  const result: CartItem[] = [];
  for (const it of (order?.items || [])) {
    const product = products.find(p => p.id === it.productId) || products.find(p => p.name === it.productName);
    if (!product) continue;
    result.push({
      id: generateUUID(),
      product,
      quantity: Math.max(1, Number(it.quantity) || 1),
      unitPrice: Number(it.unitPrice) || 0,
      presentation: 'unit',
      isEncargo: false,
    });
  }
  return result;
};

// Aplica un pedido pendiente de pre-carga (proveniente del detalle de pedido
// "Cargar en POS") escribiendo el carrito, el cliente y la comanda activa en
// sessionStorage para que los componentes POS los lean al montarse.
const applyOrderPreloadToPOS = (staged: any, products: Product[]) => {
  const order = staged?.order;
  const heldSale = staged?.heldSale;
  const cartItems = Array.isArray(staged?.cartItems) && staged.cartItems.length
    ? staged.cartItems
    : buildCartItemsFromOrder(order, products);
  try {
    sessionStorage.setItem('pos-cart', JSON.stringify(cartItems));
    const customerName = heldSale?.customerName || order?.customer?.fullName || '';
    if (customerName) sessionStorage.setItem('pos-customer', customerName);
    else sessionStorage.removeItem('pos-customer');
    // Deja la comanda "activa" para que el cajero actual la atienda/bloquee y
    // al cobrar se marque el pedido original como FACTURADO (anti-duplicado).
    if (heldSale?.id) sessionStorage.setItem('pos-active-held-sale', JSON.stringify(heldSale));
    else sessionStorage.removeItem('pos-active-held-sale');
  } catch {
    // sessionStorage puede no estar disponible; no bloquear la UI.
  }
};

const CashierPOS = ({ products, inventory }: POSComponentProps) => {
    const { user } = useAuth();
    const { mode } = useBusinessMode();
    const { activeSession, refreshSessions } = useCashRegister();
    const { addSaleToSession } = useCashRegisterSessions();
    const { toast } = useToast();
    const { settings } = useSettings();
const { pendingSales, removePendingSale, updatePendingSale, lockPendingSale, unlockPendingSale, addPendingSale, deletePendingSale } = usePendingSales();
    const { cart, setCart, customerName, setCustomerName } = usePersistedCart();
    const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
    const [wizardProduct, setWizardProduct] = useState<{ product: Product } | null>(null);
    const productGridRef = useRef<ProductGridHandle>(null);
    const [editingItem, setEditingItem] = useState<CartItem | null>(null);
    const [activeSale, setActiveSale] = useState<PendingSale | null>(null);
    const [viewMode, setViewMode] = useState<'products' | 'payment'>('products');
    const [isPaymentSummaryOpen, setIsPaymentSummaryOpen] = useState(false);
    const [paymentData, setPaymentData] = useState<{ paid: number, change: number, method: string } | null>(null);
    const [lastSale, setLastSale] = useState<any>(null);
    const [saleForPrint, setSaleForPrint] = useState<any>(null);
    const [printFormat, setPrintFormat] = useState<PrintFormat>('ticket');
    useEffect(() => { setPrintFormat(getPreferredPrintFormat()); }, []);
    // Marca que el cobro en curso (handleSuccessfulPayment) debe reiniciar la
    // venta (carrito, modal de resumen, cliente y panel = productos) SOLO después
    // de que la vista previa de impresión termine/cierre.
    const saleResetAfterPrintRef = useRef(false);
    // Tubería de impresión segura:
    // 1) NO imprime hasta que el portal del <ReceiptTemplate/> esté montado en
    //    document.body (#ticket-print-area). Evita la vista previa en blanco por
    //    la carrera entre setState + el render del portal vs window.print().
    // 2) window.print() es síncrono: espera a que la vista previa se complete o
    //    se cierre, y recién entonces reinicia la venta y se auto-limpia.
    const printAreaId = printFormat === 'invoice' ? 'invoice-print' : 'ticket-print-area';
    useEffect(() => {
        if (!saleForPrint) return;

        let cancelled = false;
        let pollTimer: number | undefined;
        let fallbackTimer: number | undefined;
        let attempts = 0;

        const resetAfterPrint = () => {
            if (saleResetAfterPrintRef.current) {
                saleResetAfterPrintRef.current = false;
                // Reinicio DESPUÉS de imprimir/cerrar la ventana: volver al catálogo.
                setViewMode('products');
                setCart([]);
                setPaymentData(null);
                setIsPaymentSummaryOpen(false);
                if (activeSale) {
                    removePendingSale(activeSale.id);
                    setActiveSale(null);
                }
                setCustomerName('');
            }
        };

        // TICKET TÉRMICO (80mm): imprime en un iframe aislado con CSS propio, sin
        // window.print() sobre la ventana principal. Evita el salto de página que
        // Chromium fuerza en tickets largos (>10 ítems) antes del bloque de Totales.
        // print() del iframe también es síncrono: el reinicio ocurre al cerrar el diálogo.
        if (printFormat === 'ticket') {
            printReceiptHtml(buildReceiptHtml(saleForPrint));
            resetAfterPrint();
            setSaleForPrint(null);
            return () => { cancelled = true; };
        }

        // FACTURA HOJA COMPLETA (letter): tubería legacy window.print() sobre #invoice-print.
        const finishPrint = () => {
            if (cancelled) return;
            window.print();
            resetAfterPrint();
            setSaleForPrint(null);
        };

        const waitForPrintArea = () => {
            if (cancelled) return;
            if (typeof document !== 'undefined' && document.getElementById(printAreaId)) {
                if (fallbackTimer !== undefined) window.clearTimeout(fallbackTimer);
                fallbackTimer = undefined;
                // Margen extra: garantiza que React terminó de pintar el contenido del portal.
                window.setTimeout(finishPrint, 30);
                return;
            }
            attempts += 1;
            if (attempts >= 60) return; // tope de ~6s
            pollTimer = window.setTimeout(waitForPrintArea, 100);
        };

        pollTimer = window.setTimeout(waitForPrintArea, 0);
        fallbackTimer = window.setTimeout(finishPrint, 500);

        return () => {
            cancelled = true;
            if (pollTimer !== undefined) window.clearTimeout(pollTimer);
            if (fallbackTimer !== undefined) window.clearTimeout(fallbackTimer);
        };
    }, [saleForPrint, printAreaId, printFormat]);
    const [isHeldBillsOpen, setIsHeldBillsOpen] = useState(false);
    const [isAssignClientOpen, setIsAssignClientOpen] = useState(false);
    const [showQuickSwitch, setShowQuickSwitch] = useState(false);
    const [isRetiroOpen, setIsRetiroOpen] = useState(false);
    const [isRetiroSaving, setIsRetiroSaving] = useState(false);
    const [lastRetiro, setLastRetiro] = useState<any>(null);

    // Si se llegó al POS vía "Cargar en POS" desde un pedido, vincular la
    // comanda (held sale) activa: la bloquea para este cajero y permite que al
    // cobrar se marque el pedido original como FACTURADO (anti-duplicado).
    const stagedBindRef = useRef(false);
    useEffect(() => {
        if (stagedBindRef.current || activeSale) return;
        try {
            const raw = sessionStorage.getItem('pos-active-held-sale');
            const held = raw ? (JSON.parse(raw) as PendingSale) : null;
            if (!held?.id) return;
            stagedBindRef.current = true;
            sessionStorage.removeItem('pos-active-held-sale');
            // Si está bloqueada por otro cajero, no la vinculamos (anti-duplicado).
            if (held.lockedBy && held.lockedBy !== user?.id) {
                setCart([]);
                return;
            }
            const shouldLock = held.lockedBy !== user?.id;
            (shouldLock ? lockPendingSale(held.id) : Promise.resolve({ success: true })).then((r: any) => {
                if (r && r.success === false) {
                    // Otro cajero la tomó mientras tanto: evitar doble cobro.
                    setCart([]);
                    return;
                }
                setActiveSale({ ...held, lockedBy: user?.id || (held.lockedBy as any) });
                if (held.customerName) setCustomerName(held.customerName);
            });
        } catch { /* ignore */ }
    }, [activeSale]);

    // Registra un "Retiro / Salida de Efectivo" en la caja activa e imprime el comprobante ESC/POS.
    const handleRetiroConfirm = async (amount: number, reason: string) => {
        if (!activeSession) {
            toast({ title: 'Error', description: 'No hay una caja activa para registrar el retiro.', variant: 'destructive' });
            return;
        }
        setIsRetiroSaving(true);
        try {
            const result = await createOutflowAction(activeSession.id, amount, reason);
            if (!result || !result.id) {
                throw new Error('Sin respuesta del servidor');
            }
            const retiroData = prepareRetiroReceiptData(settings, user, activeSession, result, amount, reason);
            setLastRetiro(retiroData);
            setIsRetiroOpen(false);
            toast({ title: 'Retiro Registrado', description: `Recibo #${result.receiptNumber}. Salida de C$${amount.toFixed(2)}.` });
            setTimeout(() => {
                printReceiptHtml(buildRetiroReceiptHtml(retiroData));
                setLastRetiro(null);
            }, 150);
        } catch (e) {
            console.error(e);
            toast({ title: 'Error', description: 'No se pudo registrar el retiro.', variant: 'destructive' });
        } finally {
            setIsRetiroSaving(false);
        }
    };

    const userInventoryType = user?.inventoryType || 'general';

    const availableProducts = useMemo(() => {
        const productMap = new Map<string, Product>();
        products.forEach(p => productMap.set(p.id, p));
        // Incluye todos los productos con registro de inventario (incluye stock 0 o negativo)
        // para habilitar ventas bajo encargo, y agrega el stock disponible por producto.
        const filteredInventory = inventory.filter(item => item.inventoryType === userInventoryType);
        const stockByProduct = new Map<string, number>();
        filteredInventory.forEach(item => {
            stockByProduct.set(item.productId, (stockByProduct.get(item.productId) || 0) + item.quantity);
        });
        const result: Product[] = [];
        const seen = new Set<string>();
        filteredInventory.forEach(item => {
            const product = productMap.get(item.productId);
            if (!product || seen.has(product.id)) return;
            seen.add(product.id);
            const categoryHint = product.category.toLowerCase().split(' ')[0];
            const image = placeholderImages.placeholderImages.find(img => img.id === `product-${categoryHint}`)
                || placeholderImages.placeholderImages.find(img => img.id === 'product-default');
            result.push({ ...product, imageUrl: image?.imageUrl, stock: stockByProduct.get(product.id) || 0 });
        });
        return result;
    }, [userInventoryType, products, inventory]);

const addToCart = (product: Product) => {
        // Abre el wizard compartido (presentación → cantidad → nivel de precio).
        setWizardProduct({ product });
    };

    // Precio directo del nivel elegido en BD (sin recálculos).
    const getProductPrice = (product: Product, priceLevel: number): number => {
        if (priceLevel === 2 && (product as any).price2) return (product as any).price2;
        if (priceLevel === 3 && (product as any).price3) return (product as any).price3;
        if (priceLevel === 4 && (product as any).price4) return (product as any).price4;
        return product.priceNIO;
    };

    // Completa la secuencia del wizard y agrega el ítem con presentación/cantidad/nivel.
    const handleWizardConfirm = (product: Product, presentation: 'unit' | 'box' | string, priceLevel: number, quantity: number, presentationName?: string, presentationFactor?: number) => {
        const qty = Math.max(0, Number.isFinite(quantity) ? quantity : 0);
        if (qty <= 0) return;
        setCart(prevCart => {
            const existingItem = prevCart.find((item) => item.product.id === product.id && item.presentation === presentation);
            // Precio unitario efectivo: nivel elegido de precios del producto.
            const unitPrice = getProductPrice(product, priceLevel);;
            if (existingItem) {
                const newQty = Math.round((existingItem.quantity + qty) * 100) / 100;
                return prevCart.map((item) =>
                    item.product.id === product.id && item.presentation === presentation
                        ? { ...item, quantity: newQty, unitPrice, presentationName: presentationName ?? item.presentationName, presentationFactor: presentationFactor ?? item.presentationFactor, isEncargo: computeIsEncargo(product, presentation, newQty, presentationFactor) }
                        : item
                );
            }
return [...prevCart, { id: product.id, product, quantity: qty, presentation, presentationName, presentationFactor, unitPrice, priceLevel, isEncargo: computeIsEncargo(product, presentation, qty, presentationFactor) }];
        });
        setWizardProduct(null);
        // Tras agregar el ítem, limpiar el filtro y reiniciar el catálogo para el siguiente producto.
        productGridRef.current?.resetCatalog();
    };

    // Guarda los cambios de un ítem editado (cantidad / precio / presentación).
    const handleSaveItemEdit = (itemId: string, updates: { quantity?: number; priceLevel?: number; presentationId?: string; presentationName?: string; presentationFactor?: number }) => {
        setCart(prevCart => prevCart.map(item => {
            if (item.product.id !== itemId) return item;
            const nextQuantity = updates.quantity !== undefined ? Math.max(0, updates.quantity) : item.quantity;
            const nextPresentation = updates.presentationId ?? item.presentation ?? 'unit';
            const nextName = updates.presentationName ?? item.presentationName;
            const nextFactor = updates.presentationFactor ?? item.presentationFactor;
            const nextPriceLevel = updates.priceLevel ?? item.priceLevel ?? 1;
            const unitPrice = getProductPrice(item.product, nextPriceLevel);
            return { ...item, quantity: nextQuantity, presentation: nextPresentation, presentationName: nextName, presentationFactor: nextFactor, priceLevel: nextPriceLevel, unitPrice, isEncargo: computeIsEncargo(item.product, nextPresentation, nextQuantity, nextFactor) };
        }).filter(item => item.quantity > 0));
        setEditingItem(null);
    };

    const handleRemoveItem = (itemId: string) => {
        setCart(prevCart => {
            const next = prevCart.filter(item => item.product.id !== itemId);
            if (next.length === 0 && activeSale) {
                deletePendingSale(activeSale.id);
                setActiveSale(null);
            }
            return next;
        });
        setEditingItem(null);
    };

    const updateQuantity = (productId: string, change: number) => {
        setCart((prevCart) =>
            prevCart.map((item) =>
                item.product.id === productId
                    ? { ...item, quantity: Math.max(0, Math.round((item.quantity + change) * 100) / 100) }
                    : item
            ).filter((item) => item.quantity > 0)
        );
    };

    const removeFromCart = (productId: string) => {
        setCart((prevCart) => {
            const next = prevCart.filter((item) => item.product.id !== productId);
            if (next.length === 0 && activeSale) {
                deletePendingSale(activeSale.id);
                setActiveSale(null);
            }
            return next;
        });
    };

    const handleItemSelect = (itemId: string) => {
        setSelectedItemId(itemId === selectedItemId ? null : itemId);
    };

    const cartSubtotal = useMemo(() => cart.reduce((total, item) => total + getCartItemPrice(item) * item.quantity, 0), [cart]);
    const taxAmount = useMemo(() => settings.applyIVA ? cartSubtotal * 0.15 : 0, [cartSubtotal, settings.applyIVA]);
    const cartTotal = cartSubtotal + taxAmount;

    // Cargar una comanda del despachador al carrito (desde el modal).
    const handleLoadComanda = async (sale: PendingSale) => {
        if (sale.lockedBy && sale.lockedBy !== user?.id) {
            toast({ title: 'Comanda en atenciÃ³n', description: 'Otro cajero estÃ¡ atendiendo esta comanda.', variant: 'destructive' });
            return;
        }
        if (sale.lockedBy !== user?.id) {
            const lockRes = await lockPendingSale(sale.id);
            if (lockRes && !lockRes.success) {
                toast({ title: 'No disponible', description: lockRes.error || 'No se pudo cargar la comanda.', variant: 'destructive' });
                return;
            }
        }
        setActiveSale(sale);
        setCart(sale.items);
        if (sale.customerName) setCustomerName(sale.customerName);
        setViewMode('products');
        toast({ title: 'Comanda cargada', description: 'La comanda se cargÃ³ al carrito. Puede editarla antes de cobrar.' });
    };

    const handlePayment = () => {
        if (cart.length === 0) {
            toast({ title: 'Carrito VacÃ­o', description: 'Agregue productos antes de cobrar.', variant: 'destructive' });
            return;
        }
setViewMode('payment');
    };

const [isFinancingOpen, setIsFinancingOpen] = useState(false);
    const [pendingCredit, setPendingCredit] = useState<{ paid: number; change: number } | null>(null);

const handleSuccessfulPayment = async (amountPaid: number, change: number, paymentMethod: string, financing?: SaleFinancing) => {
        if (!user || !activeSession) return;

const effectiveCustomerName = activeSale?.customerName || customerName || 'Cliente General';

        let customerId: string | undefined = undefined;
        const requiresCustomer = mode === 'JEWELRY' || paymentMethod === 'Credito';
        const hasRealName = !!effectiveCustomerName && effectiveCustomerName.trim() !== '' && effectiveCustomerName !== 'Cliente General';
        if (requiresCustomer && !hasRealName) {
            toast({ title: 'Error', description: 'Es obligatorio asignar un nombre de cliente real.', variant: 'destructive' });
            return;
        }
        // Persiste la relación del cliente en la factura SIEMPRE que haya un nombre real,
        // para que la reimpresión muestre el mismo nombre asignado al cobrar.
        if (hasRealName) {
            try {
                const customer = await searchOrCreateCustomer(effectiveCustomerName.trim());
                customerId = customer.id;
            } catch (e) {
                toast({ title: 'Error', description: 'No se pudo crear/validar el cliente en la BD', variant: 'destructive' });
                return;
            }
        }

        const roundedTotal = Math.round(cartTotal * 100) / 100;
        const result = await createSale(
            cart,
            activeSession.id,
            user.id,
            user.inventoryType || 'general',
roundedTotal,
            paymentMethod as any,
            customerId,
            financing || null
        );

        if (!result.success) {
            toast({ title: 'Error', description: result.error, variant: 'destructive' });
            return;
        }

        const isJewelry = mode === 'JEWELRY';
        const ticketLabel = result.invoiceNumber
            ? (isJewelry ? `Factura ${formatTicketNumber(result.invoiceNumber)}` : formatTicketNumber(result.invoiceNumber))
            : undefined;
        const finalCustomerName = effectiveCustomerName && effectiveCustomerName.trim() ? effectiveCustomerName.trim() : 'Cliente General';
const receiptData = prepareReceiptData(cart, cartTotal, cartSubtotal, taxAmount, user, settings, finalCustomerName, paymentMethod, amountPaid, change, ticketLabel);
        // Se solicita imprimir SOLO cuando el portal del <ReceiptTemplate/> esté
        // montado. El reinicio de la venta (carrito/resumen/cliente/panel) se
        // ejecuta DESPUÉS de cerrar la vista previa, dentro de la tubería de impresión.
        saleResetAfterPrintRef.current = true;
        setSaleForPrint(receiptData);

        refreshSessions();
        toast({ title: 'Venta Completada', description: 'La venta ha sido registrada exitosamente.' });
    };

const handlePrePaymentComplete = (amountPaid: number, change: number, method: string) => {
        if (method === 'Credito' && settings.creditFinancingEnabled) {
            setPendingCredit({ paid: amountPaid, change });
            setIsFinancingOpen(true);
            return;
        }
        setPaymentData({ paid: amountPaid, change, method });
        setIsPaymentSummaryOpen(true);
    };

    const handleFinancingConfirm = (financing: SaleFinancing) => {
        setIsFinancingOpen(false);
        if (pendingCredit) {
            handleSuccessfulPayment(pendingCredit.paid, pendingCredit.change, 'Credito', financing);
        }
        setPendingCredit(null);
    };

    const confirmPayment = () => {
        if (paymentData) {
            handleSuccessfulPayment(paymentData.paid, paymentData.change, paymentData.method);
        }
    };

    const handleClearCart = () => {
        if (cart.length > 0 && confirm('¿Estás seguro de limpiar el carrito?')) {
            if (activeSale) {
                deletePendingSale(activeSale.id);
                setActiveSale(null);
            }
            setCart([]);
            setCustomerName('');
        }
    };

    const handleHoldBill = () => {
        if (cart.length === 0) {
            toast({ title: 'Carrito VacÃ­o', description: 'No hay productos para poner en espera.', variant: 'destructive' });
            return;
        }
        const nameToSave = customerName.trim() || 'CLIENTE GENERAL';
        addPendingSale(nameToSave, cart, cartTotal);
        toast({ title: 'Factura en Espera', description: 'La factura se ha guardado temporalmente.' });
        setCart([]);
        setCustomerName('');
    };

return (
        <div className="flex w-full h-full min-w-0 bg-gray-100">
            {/* Left Panel: Cart + Resumen (ancho fijo, no colapsa) */}
            <div className="w-[380px] min-w-[380px] shrink-0 h-full flex flex-col border-r border-gray-200 shadow-sm bg-white">
{/* Header */}
                <div className="bg-white p-2.5 border-b flex items-center justify-between gap-1 h-16 shrink-0 w-full overflow-hidden">
                    <div className="flex items-center gap-2 min-w-0">
                        <SidebarTrigger className="h-8 w-8 shrink-0" />
                        <span className="font-bold text-base whitespace-nowrap">Punto de Venta</span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                        <Button
                            variant="outline"
                            size="icon"
                            className="relative h-9 w-9 border-primary/30 text-primary hover:bg-primary/5 shrink-0"
                            onClick={() => setIsHeldBillsOpen(true)}
                            title="Comandas pendientes (F10)"
                        >
                            <ListOrdered className="w-4 h-4" />
                            {pendingSales.length > 0 && (
                                <span className="absolute -top-2 -right-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-black text-white">
                                    {pendingSales.length}
                                </span>
                            )}
                        </Button>
                        {settings.quickSwitchEnabled && (
                            <Button
                                variant="outline"
                                size="icon"
                                className="h-9 w-9 text-slate-600 hover:bg-slate-100 shrink-0"
                                onClick={() => setShowQuickSwitch(true)}
                                title="Cambio rápido de usuario"
                            >
                                <UserIcon className="w-4 h-4" />
                            </Button>
                        )}
                    </div>
                </div>

                {/* Cart Area */}
<div className="flex-1 overflow-hidden flex flex-col">
                    <CartTicket
                        cart={cart}
                        subtotal={cartSubtotal}
                        tax={taxAmount}
                        total={cartTotal}
                        currency="NIO"
                        selectedItemId={selectedItemId}
                        onSelectItem={handleItemSelect}
                        onEditItem={(item) => setEditingItem(item)}
                        onRemoveItem={removeFromCart}
                        onUpdateQuantity={(pid, qty) => {
                            setCart(prev => prev.map(ci =>
                                ci.product.id === pid ? { ...ci, quantity: Math.max(0, qty) } : ci
                            ).filter(ci => ci.quantity > 0));
                        }}
                    />
                </div>

                {/* Totals + Actions */}
                <div className="border-t border-slate-200 bg-white p-3 shrink-0">
                    {activeSale && (
                        <div className="mb-2 flex items-center justify-between bg-amber-50 border border-amber-200 rounded-lg p-2">
                            <span className="text-[10px] text-amber-700 font-black uppercase">Editando comanda</span>
                            <span className="text-xs text-amber-800 font-semibold truncate max-w-[140px]">{activeSale.customerName}</span>
                        </div>
                    )}
                    <div className="mb-3 flex items-center justify-between bg-gray-50 p-2.5 rounded-lg border border-gray-100">
                        <div className="flex flex-col gap-0.5 min-w-0">
                            <span className="text-[10px] text-gray-500 font-black uppercase tracking-widest">Cliente:</span>
                            <span className="font-black text-base text-[#673AB7] truncate max-w-[160px]">
                                {customerName || (activeSale?.customerName) || 'ANÓNIMO'}
                            </span>
                        </div>
                        <Button
                            variant="secondary"
                            size="sm"
                            className="h-10 w-10 p-0 rounded-full bg-white border shadow-sm hover:bg-gray-100 shrink-0"
                            onClick={() => setIsAssignClientOpen(true)}
                        >
                            <UserPlus className="w-5 h-5 text-[#673AB7]" />
                        </Button>
                    </div>

                    <div className="grid grid-cols-3 gap-2 mb-2">
                        <Button
                            className="h-14 flex flex-col gap-1 bg-[#FF5722] hover:bg-[#F4511E] text-white font-black text-[10px] p-2 active:scale-95"
                            onClick={handleClearCart}
                            title="Limpiar (Delete)"
                        >
                            <Trash2 className="w-5 h-5" />
                            LIMPIAR
                        </Button>
<Button
                            className="h-14 flex flex-col gap-1 bg-[#673AB7] hover:bg-[#5E35B1] text-white font-black text-[10px] p-2 active:scale-95"
                            onClick={handleHoldBill}
                            title="Poner en Espera (F2)"
                        >
                            <FileText className="w-5 h-5" />
                            ESPERA
                        </Button>
                        <Button
                            className="h-14 flex flex-col gap-1 bg-[#FF9800] hover:bg-[#F57C00] text-white font-black text-[10px] p-2 active:scale-95"
                            onClick={() => setIsRetiroOpen(true)}
                            title="Retiro / Salida de Efectivo"
                        >
                            <Coins className="w-5 h-5" />
                            RETIRO/SALIDA
                        </Button>
                    </div>

                    <Button
                        className="h-20 w-full flex items-center justify-center gap-3 bg-[#8BC34A] hover:bg-[#7CB342] text-white font-black text-xl shadow-lg transition-all active:scale-[0.98]"
                        onClick={handlePayment}
                        title="Cobrar (F1)"
                    >
                        <CreditCard className="w-8 h-8" />
                        COBRAR
                    </Button>
                </div>
            </div>

{/* Right Panel: Product Grid / Payment (65%) */}
            <div className="flex-1 min-w-0 h-full flex flex-col">
                <div className="flex-1 overflow-hidden">
                    {viewMode === 'products' ? (
                        <ProductGrid
                            ref={productGridRef}
                            products={availableProducts}
                            onProductSelect={addToCart}
                        />
                    ) : (
                        <PaymentGrid
                            total={cartTotal}
                            onCancel={() => setViewMode('products')}
                            onComplete={handlePrePaymentComplete}
                            customerName={customerName || activeSale?.customerName || 'Cliente General'}
                        />
                    )}
                </div>
            </div>

            <AssignClientDialog
                isOpen={isAssignClientOpen}
                onClose={() => setIsAssignClientOpen(false)}
                onAssign={(client: SelectedClient) => setCustomerName(client.name)}
                currentName={customerName || activeSale?.customerName}
            />

            <HeldBillsDialog
                isOpen={isHeldBillsOpen}
                onClose={() => setIsHeldBillsOpen(false)}
                onSelectSale={handleLoadComanda}
                currentUserId={user?.id}
            />

<PaymentSummaryDialog
                isOpen={isPaymentSummaryOpen}
                onClose={() => setIsPaymentSummaryOpen(false)}
                total={cartTotal}
                amountPaid={paymentData?.paid || 0}
                change={paymentData?.change || 0}
                onConfirm={confirmPayment}
            />

            <CreditFinancingDialog
                isOpen={isFinancingOpen}
                onClose={() => setIsFinancingOpen(false)}
                total={cartTotal}
                onConfirm={handleFinancingConfirm}
            />

            <ProductAddWizard
                product={wizardProduct?.product ?? null}
                onConfirm={handleWizardConfirm}
                onClose={() => setWizardProduct(null)}
            />

            <ItemEditDialog
                item={editingItem}
                onClose={() => setEditingItem(null)}
                onSave={handleSaveItemEdit}
                onRemove={handleRemoveItem}
            />

            <QuickSwitchModal
                open={showQuickSwitch}
                onOpenChange={setShowQuickSwitch}
            />



            <RetiroDialog
                isOpen={isRetiroOpen}
                onClose={() => setIsRetiroOpen(false)}
                onConfirm={handleRetiroConfirm}
                isLoading={isRetiroSaving}
            />
            {lastRetiro && <RetiroReceiptTemplate {...lastRetiro} />}

            {printFormat === 'invoice'
                ? (saleForPrint && <FullPageInvoiceTemplate {...saleForPrint} />)
                : (saleForPrint && <ReceiptTemplate {...saleForPrint} />)}
        </div>
    );
};
// #endregion

import { AdminAuthDialog } from '@/components/pos/admin-auth-dialog';
import { CreditNoteDialog } from '@/components/pos/credit-note-dialog';
import { HelpDialog } from '@/components/pos/help-dialog';
import { HelpCircle, FolderOpen, Printer } from 'lucide-react';
import { OpenDrawerTemplate } from '@/components/pos/open-drawer-template';
import { createOutflowAction } from '@/lib/actions/cash-register';
import { RetiroDialog } from '@/components/pos/retiro-dialog';
import { RetiroReceiptTemplate } from '@/components/pos/retiro-receipt-template';

// Prepara los datos del comprobante de retiro/salida de efectivo.
const prepareRetiroReceiptData = (settings: any, user: any, activeSession: any, result: any, amount: number, reason: string) => ({
    pharmacyName: settings.ticketHeader.name,
    address: settings.ticketHeader.address,
    phone: settings.ticketHeader.phone,
    rfc: settings.ticketHeader.rfc,
    ticketId: `#${result.receiptNumber}`,
    date: new Date(),
    cashierName: user?.name || activeSession?.cashierName || 'Cajero',
    amount,
    reason,
    footerMessage: settings.ticketFooter.message,
    website: settings.ticketFooter.website,
    logoSvg: settings.logoSvg,
});

// CashierOnlyPOS component - This is the main one to redesign as per screenshots
const CashierOnlyPOS = ({ products, inventory }: POSComponentProps) => {
    const { user } = useAuth();
    const { mode } = useBusinessMode();
    const { activeSession, refreshSessions } = useCashRegister();
    const { addSaleToSession } = useCashRegisterSessions();
    const { toast } = useToast();
    const { settings } = useSettings();
    const { addPendingSale, removePendingSale, deletePendingSale, lockPendingSale } = usePendingSales();
    const { cart, setCart, customerName, setCustomerName } = usePersistedCart();
    const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
    const [wizardProduct, setWizardProduct] = useState<{ product: Product } | null>(null);
    const productGridRef = useRef<ProductGridHandle>(null);
    const [editingItem, setEditingItem] = useState<CartItem | null>(null);
    const [activeSale, setActiveSale] = useState<PendingSale | null>(null);
    const [viewMode, setViewMode] = useState<'products' | 'payment'>('products');
    const [isPaymentSummaryOpen, setIsPaymentSummaryOpen] = useState(false);

    // Payment State
    const [paymentData, setPaymentData] = useState<{ paid: number, change: number, method: string } | null>(null);

    const [isAssignClientOpen, setIsAssignClientOpen] = useState(false);
    const [isHeldBillsOpen, setIsHeldBillsOpen] = useState(false);
    const [showQuickSwitch, setShowQuickSwitch] = useState(false);
    const [isHelpOpen, setIsHelpOpen] = useState(false);
    const [lastSale, setLastSale] = useState<any>(null);
    const [saleForPrint, setSaleForPrint] = useState<any>(null);
    // Retiro / Salida de Efectivo
const [isRetiroOpen, setIsRetiroOpen] = useState(false);
    const [isRetiroSaving, setIsRetiroSaving] = useState(false);
    const [lastRetiro, setLastRetiro] = useState<any>(null);

    // Si se llegó al POS vía "Cargar en POS" desde un pedido, vincular la
    // comanda (held sale) activa: la bloquea para este cajero y permite que al
    // cobrar se marque el pedido original como FACTURADO (anti-duplicado).
    const stagedBindRef = useRef(false);
    useEffect(() => {
        if (stagedBindRef.current || activeSale) return;
        try {
            const raw = sessionStorage.getItem('pos-active-held-sale');
            const held = raw ? (JSON.parse(raw) as PendingSale) : null;
            if (!held?.id) return;
            stagedBindRef.current = true;
            sessionStorage.removeItem('pos-active-held-sale');
            // Si está bloqueada por otro cajero, no la vinculamos (anti-duplicado).
            if (held.lockedBy && held.lockedBy !== user?.id) {
                setCart([]);
                return;
            }
            const shouldLock = held.lockedBy !== user?.id;
            (shouldLock ? lockPendingSale(held.id) : Promise.resolve({ success: true })).then((r: any) => {
                if (r && r.success === false) {
                    // Otro cajero la tomó mientras tanto: evitar doble cobro.
                    setCart([]);
                    return;
                }
                setActiveSale({ ...held, lockedBy: user?.id || (held.lockedBy as any) });
                if (held.customerName) setCustomerName(held.customerName);
            });
        } catch { /* ignore */ }
    }, [activeSale]);

    const [printFormat, setPrintFormat] = useState<PrintFormat>('ticket');
    useEffect(() => { setPrintFormat(getPreferredPrintFormat()); }, []);
    // Marca que el cobro en curso (handleSuccessfulPayment) debe reiniciar la
    // venta (carrito, modal de resumen, cliente y panel = productos) SOLO después
    // de que la vista previa de impresión termine/cierre.
    const saleResetAfterPrintRef = useRef(false);
    // Tubería de impresión segura:
    // 1) NO imprime hasta que el portal del <ReceiptTemplate/> esté montado en
    //    document.body (#ticket-print-area). Evita la vista previa en blanco por
    //    la carrera entre setState + el render del portal vs window.print().
    // 2) window.print() es síncrono: espera a que la vista previa se complete o
    //    se cierre, y recién entonces reinicia la venta y se auto-limpia.
    const printAreaId = printFormat === 'invoice' ? 'invoice-print' : 'ticket-print-area';
    useEffect(() => {
        if (!saleForPrint) return;

        let cancelled = false;
        let pollTimer: number | undefined;
        let fallbackTimer: number | undefined;
        let attempts = 0;

        const resetAfterPrint = () => {
            if (saleResetAfterPrintRef.current) {
                saleResetAfterPrintRef.current = false;
                // Reinicio DESPUÉS de imprimir/cerrar la ventana: volver al catálogo.
                setViewMode('products');
                setCart([]);
                setPaymentData(null);
                setIsPaymentSummaryOpen(false);
                if (activeSale) {
                    removePendingSale(activeSale.id);
                    setActiveSale(null);
                }
                setCustomerName('');
                setSelectedClient(null);
            }
        };

        // TICKET TÉRMICO (80mm): imprime en un iframe aislado con CSS propio, sin
        // window.print() sobre la ventana principal. Evita el salto de página que
        // Chromium fuerza en tickets largos (>10 ítems) antes del bloque de Totales.
        // print() del iframe también es síncrono: el reinicio ocurre al cerrar el diálogo.
        if (printFormat === 'ticket') {
            printReceiptHtml(buildReceiptHtml(saleForPrint));
            resetAfterPrint();
            setSaleForPrint(null);
            return () => { cancelled = true; };
        }

        // FACTURA HOJA COMPLETA (letter): tubería legacy window.print() sobre #invoice-print.
        const finishPrint = () => {
            if (cancelled) return;
            window.print();
            resetAfterPrint();
            setSaleForPrint(null);
        };

        const waitForPrintArea = () => {
            if (cancelled) return;
            if (typeof document !== 'undefined' && document.getElementById(printAreaId)) {
                if (fallbackTimer !== undefined) window.clearTimeout(fallbackTimer);
                fallbackTimer = undefined;
                // Margen extra: garantiza que React terminó de pintar el contenido del portal.
                window.setTimeout(finishPrint, 30);
                return;
            }
            attempts += 1;
            if (attempts >= 60) return; // tope de ~6s
            pollTimer = window.setTimeout(waitForPrintArea, 100);
        };

        pollTimer = window.setTimeout(waitForPrintArea, 0);
        fallbackTimer = window.setTimeout(finishPrint, 500);

        return () => {
            cancelled = true;
            if (pollTimer !== undefined) window.clearTimeout(pollTimer);
            if (fallbackTimer !== undefined) window.clearTimeout(fallbackTimer);
        };
    }, [saleForPrint, printAreaId, printFormat]);
    // Credit Note / Return States
    const [isAdminAuthOpen, setIsAdminAuthOpen] = useState(false);
    const [isCreditNoteOpen, setIsCreditNoteOpen] = useState(false);
    const [isOpenDrawerReceiptActive, setIsOpenDrawerReceiptActive] = useState(false);
    const [isSaveQuoteOpen, setIsSaveQuoteOpen] = useState(false);
    const [isLoadQuoteOpen, setIsLoadQuoteOpen] = useState(false);
    const [lastQuoteReceipt, setLastQuoteReceipt] = useState<any>(null);
    const [quoteCustomerName, setQuoteCustomerName] = useState('');
    const [quoteCustomerPhone, setQuoteCustomerPhone] = useState('');
    const [selectedClient, setSelectedClient] = useState<SelectedClient | null>(null);

    const userInventoryType = user?.inventoryType || 'general';

    const availableProducts = useMemo(() => {
        const productMap = new Map<string, Product>();
        products.forEach(p => productMap.set(p.id, p));
        // Incluye todos los productos con registro de inventario (incluye stock 0 o negativo)
        // para habilitar ventas bajo encargo, y agrega el stock disponible por producto.
        const filteredInventory = inventory.filter(item => item.inventoryType === userInventoryType);
        const stockByProduct = new Map<string, number>();
        filteredInventory.forEach(item => {
            stockByProduct.set(item.productId, (stockByProduct.get(item.productId) || 0) + item.quantity);
        });
        const result: Product[] = [];
        const seen = new Set<string>();
        filteredInventory.forEach(item => {
            const product = productMap.get(item.productId);
            if (!product || seen.has(product.id)) return;
            seen.add(product.id);
            const categoryHint = product.category.toLowerCase().split(' ')[0];
            const image = placeholderImages.placeholderImages.find(img => img.id === `product-${categoryHint}`)
                || placeholderImages.placeholderImages.find(img => img.id === 'product-default');
            result.push({ ...product, imageUrl: image?.imageUrl, stock: stockByProduct.get(product.id) || 0 });
        });
        return result;
    }, [userInventoryType, products, inventory]);

    const addToCart = (product: Product) => {
        // Abre el wizard compartido (presentación → cantidad → nivel de precio).
        setWizardProduct({ product });
    };

    // Precio directo del nivel elegido en BD (sin recálculos).
    const getProductPrice = (product: Product, priceLevel: number): number => {
        if (priceLevel === 2 && (product as any).price2) return (product as any).price2;
        if (priceLevel === 3 && (product as any).price3) return (product as any).price3;
        if (priceLevel === 4 && (product as any).price4) return (product as any).price4;
        return product.priceNIO;
    };

    // Completa la secuencia del wizard y agrega el ítem con presentación/cantidad/nivel.
    const handleWizardConfirm = (product: Product, presentation: 'unit' | 'box' | string, priceLevel: number, quantity: number, presentationName?: string, presentationFactor?: number) => {
        const qty = Math.max(0, Number.isFinite(quantity) ? quantity : 0);
        if (qty <= 0) return;
        setCart(prevCart => {
            const existingItem = prevCart.find((item) => item.product.id === product.id && item.presentation === presentation);
            // Precio unitario efectivo: nivel elegido de precios del producto.
            const unitPrice = getProductPrice(product, priceLevel);;
            if (existingItem) {
                const newQty = Math.round((existingItem.quantity + qty) * 100) / 100;
                return prevCart.map((item) =>
                    item.product.id === product.id && item.presentation === presentation
                        ? { ...item, quantity: newQty, unitPrice, presentationName: presentationName ?? item.presentationName, presentationFactor: presentationFactor ?? item.presentationFactor, isEncargo: computeIsEncargo(product, presentation, newQty, presentationFactor) }
                        : item
                );
            }
return [...prevCart, { id: product.id, product, quantity: qty, presentation, presentationName, presentationFactor, unitPrice, priceLevel, isEncargo: computeIsEncargo(product, presentation, qty, presentationFactor) }];
        });
        setWizardProduct(null);
        // Tras agregar el ítem, limpiar el filtro y reiniciar el catálogo para el siguiente producto.
        productGridRef.current?.resetCatalog();
    };

    // Guarda los cambios de un ítem editado (cantidad / precio / presentación).
    const handleSaveItemEdit = (itemId: string, updates: { quantity?: number; priceLevel?: number; presentationId?: string; presentationName?: string; presentationFactor?: number }) => {
        setCart(prevCart => prevCart.map(item => {
            if (item.product.id !== itemId) return item;
            const nextQuantity = updates.quantity !== undefined ? Math.max(0, updates.quantity) : item.quantity;
            const nextPresentation = updates.presentationId ?? item.presentation ?? 'unit';
            const nextName = updates.presentationName ?? item.presentationName;
            const nextFactor = updates.presentationFactor ?? item.presentationFactor;
            const nextPriceLevel = updates.priceLevel ?? item.priceLevel ?? 1;
            const unitPrice = getProductPrice(item.product, nextPriceLevel);
            return { ...item, quantity: nextQuantity, presentation: nextPresentation, presentationName: nextName, presentationFactor: nextFactor, priceLevel: nextPriceLevel, unitPrice, isEncargo: computeIsEncargo(item.product, nextPresentation, nextQuantity, nextFactor) };
        }).filter(item => item.quantity > 0));
        setEditingItem(null);
    };

    const handleRemoveItem = (itemId: string) => {
        setCart(prevCart => {
            const next = prevCart.filter(item => item.product.id !== itemId);
            if (next.length === 0 && activeSale) {
                deletePendingSale(activeSale.id);
                setActiveSale(null);
            }
            return next;
        });
        setEditingItem(null);
    };

    const updateQuantity = (productId: string, change: number) => {
        setCart((prevCart) =>
            prevCart.map((item) =>
                item.product.id === productId
                    ? { ...item, quantity: Math.max(0, item.quantity + change) }
                    : item
            ).filter((item) => item.quantity > 0)
        );
    };

    const removeFromCart = (productId: string) => {
        setCart((prevCart) => {
            const next = prevCart.filter((item) => item.product.id !== productId);
            if (next.length === 0 && activeSale) {
                deletePendingSale(activeSale.id);
                setActiveSale(null);
            }
            return next;
        });
    };

    const handleItemSelect = (itemId: string) => {
        setSelectedItemId(itemId === selectedItemId ? null : itemId);
    };

    const cartSubtotal = useMemo(() => cart.reduce((total, item) => total + getCartItemPrice(item) * item.quantity, 0), [cart]);
    const taxAmount = useMemo(() => settings.applyIVA ? cartSubtotal * 0.15 : 0, [cartSubtotal, settings.applyIVA]);
    const cartTotal = cartSubtotal + taxAmount;

    const handlePayment = () => {
        if (cart.length === 0) {
            toast({ title: 'Carrito VacÃ­o', description: 'Agregue productos antes de cobrar.', variant: 'destructive' });
            return;
        }
        setViewMode('payment');
    };

    const [isFinancingOpen, setIsFinancingOpen] = useState(false);
    const [pendingCredit, setPendingCredit] = useState<{ paid: number; change: number } | null>(null);

    const handleSuccessfulPayment = async (amountPaid: number, change: number, paymentMethod: string, financing?: SaleFinancing) => {
        if (!user || !activeSession) return;

        let customerId: string | undefined = undefined;
        const requiresCustomer = mode === 'JEWELRY' || paymentMethod === 'Credito';
        const hasRealName = !!customerName && customerName.trim() !== '' && customerName !== 'Cliente General';
        if (requiresCustomer && !hasRealName) {
            toast({ title: 'Error', description: 'Es obligatorio asignar un nombre de cliente real.', variant: 'destructive' });
            return;
        }
        // Persiste la relación del cliente en la factura SIEMPRE que haya un nombre real,
        // para que la reimpresión muestre el mismo nombre asignado al cobrar.
        if (hasRealName) {
            try {
                const customer = await searchOrCreateCustomer(customerName.trim());
                customerId = customer.id;
            } catch (e) {
                toast({ title: 'Error', description: 'No se pudo crear/validar el cliente en la BD', variant: 'destructive' });
                return;
            }
        }

        const roundedTotal = Math.round(cartTotal * 100) / 100;
        const result = await createSale(
            cart,
            activeSession.id,
            user.id,
            user.inventoryType || 'general',
            roundedTotal,
            paymentMethod as any,
            customerId,
            financing || null
        );

        if (!result.success) {
            toast({ title: 'Error', description: result.error, variant: 'destructive' });
            return;
        }

        const isJewelry = mode === 'JEWELRY';
        const ticketLabel = result.invoiceNumber
            ? (isJewelry ? `Factura ${formatTicketNumber(result.invoiceNumber)}` : formatTicketNumber(result.invoiceNumber))
            : undefined;
        const finalCustomerName = customerName && customerName.trim() ? customerName.trim() : 'Cliente General';
        const receiptData = prepareReceiptData(cart, cartTotal, cartSubtotal, taxAmount, user, settings, finalCustomerName, paymentMethod, amountPaid, change, ticketLabel);
        // Se solicita imprimir SOLO cuando el portal del <ReceiptTemplate/> esté
        // montado. El reinicio de la venta (carrito/resumen/cliente/panel) se
        // ejecuta DESPUÉS de cerrar la vista previa, dentro de la tubería de impresión.
        saleResetAfterPrintRef.current = true;
        setSaleForPrint(receiptData);

        refreshSessions();
        toast({ title: 'Venta Completada', description: 'La venta ha sido registrada exitosamente.' });
    };

    const handlePrePaymentComplete = (amountPaid: number, change: number, method: string) => {
        if (method === 'Credito' && settings.creditFinancingEnabled) {
            setPendingCredit({ paid: amountPaid, change });
            setIsFinancingOpen(true);
            return;
        }
        setPaymentData({ paid: amountPaid, change, method });
        setIsPaymentSummaryOpen(true);
    };

    const handleFinancingConfirm = (financing: SaleFinancing) => {
        setIsFinancingOpen(false);
        if (pendingCredit) {
            handleSuccessfulPayment(pendingCredit.paid, pendingCredit.change, 'Credito', financing);
        }
        setPendingCredit(null);
    };

    const confirmPayment = () => {
        if (paymentData) {
            handleSuccessfulPayment(paymentData.paid, paymentData.change, paymentData.method);
        }
    };


    const handleClearCart = () => {
        if (cart.length > 0 && confirm('¿Estás seguro de limpiar el carrito?')) {
            if (activeSale) {
                deletePendingSale(activeSale.id);
                setActiveSale(null);
            }
            setCart([]);
            setCustomerName('');
            setSelectedClient(null);
        }
    };

    const handleHoldBill = () => {
        if (cart.length === 0) {
            toast({ title: 'Carrito Vacío', description: 'No hay productos para poner en espera.', variant: 'destructive' });
            return;
        }

        // Use customer name if set, otherwise default to CLIENTE GENERAL
        const nameToSave = customerName.trim() || 'CLIENTE GENERAL';

        addPendingSale(nameToSave, cart, cartTotal);
        toast({ title: 'Factura en Espera', description: 'La factura se ha guardado temporalmente.' });
        setCart([]);
        setCustomerName('');
        setSelectedClient(null);
    };

    const handleResumeBill = (sale: PendingSale) => {
        setCart(sale.items);
        setCustomerName(sale.customerName);
        setActiveSale(sale);
        toast({ title: 'Factura Recuperada', description: 'La factura se ha cargado al carrito.' });
    };

    // Handler for Credit Note Button
    const handleCreditNoteClick = () => {
        setIsAdminAuthOpen(true);
    };

    const handleAdminAuthSuccess = () => {
        setIsAdminAuthOpen(false);
        setIsCreditNoteOpen(true);
    };

    const handleOpenDrawer = () => {
        setIsOpenDrawerReceiptActive(true);
        setTimeout(() => {
            window.print();
            setIsOpenDrawerReceiptActive(false);
        }, 100);
    };

    // Registra un "Retiro / Salida de Efectivo" en la caja activa e imprime el comprobante ESC/POS.
    const handleRetiroConfirm = async (amount: number, reason: string) => {
        if (!activeSession) {
            toast({ title: 'Error', description: 'No hay una caja activa para registrar el retiro.', variant: 'destructive' });
            return;
        }
        setIsRetiroSaving(true);
        try {
            const result = await createOutflowAction(activeSession.id, amount, reason);
            if (!result || !result.id) {
                throw new Error('Sin respuesta del servidor');
            }
            const retiroData = prepareRetiroReceiptData(settings, user, activeSession, result, amount, reason);
            setLastRetiro(retiroData);
            setIsRetiroOpen(false);
            toast({ title: 'Retiro Registrado', description: `Recibo #${result.receiptNumber}. Salida de C$${amount.toFixed(2)}.` });
            setTimeout(() => {
                printReceiptHtml(buildRetiroReceiptHtml(retiroData));
                setLastRetiro(null);
            }, 150);
        } catch (e) {
            console.error(e);
            toast({ title: 'Error', description: 'No se pudo registrar el retiro.', variant: 'destructive' });
        } finally {
            setIsRetiroSaving(false);
        }
    };

    const handleReprintLast = async () => {
        try {
            const result = await getLastSale(activeSession?.id);
            if (result.success && result.data) {
                const isJewelry = mode === 'JEWELRY';
                const ticketLabel = isJewelry
                    ? `Factura ${formatTicketNumber(result.data.invoiceNumber)}`
                    : formatTicketNumber(result.data.invoiceNumber);
                // Reutiliza la misma tubería de impresión del cobro directo (ReceiptTemplate).
                setLastSale(buildReceiptDataFromInvoice(result.data, settings, ticketLabel));
                toast({ title: 'Último Ticket', description: `Ticket #${ticketLabel} listo para imprimir.` });
            } else {
                toast({ title: 'Error', description: result.error || 'No hay ventas recientes.', variant: 'destructive' });
            }
        } catch (e) {
            toast({ title: 'Error', description: 'No se pudo obtener la última venta.', variant: 'destructive' });
        }
    };

    const openSaveQuoteDialog = () => {
        // Auto-llenado: pre-pobla nombre y teléfono desde el cliente seleccionado.
        setQuoteCustomerName(selectedClient?.name || customerName || '');
        setQuoteCustomerPhone(selectedClient?.phone || '');
        setIsSaveQuoteOpen(true);
    };

    const handleSaveQuote = async () => {
        if (cart.length === 0) {
            toast({ title: 'Carrito vacío', description: 'Agregue productos antes de crear una cotización.', variant: 'destructive' });
            return;
        }
        try {
            const result = await createQuote({
                customerName: quoteCustomerName.trim() || selectedClient?.name || 'Cliente General',
                customerPhone: quoteCustomerPhone.trim() || selectedClient?.phone || undefined,
                clientId: selectedClient?.id || undefined,
                expirationDays: 30,
                items: cart.map(item => ({
                    productId: item.product.id,
                    productName: item.product.name,
                    quantity: item.quantity,
                    unitPrice: typeof item.unitPrice === 'number' && item.unitPrice > 0 ? item.unitPrice : item.product.priceNIO,
                    variantId: (item.product as any).variantId || undefined,
                })),
                total: cartTotal,
            });

            if (result.success && result.data) {
                const quoteData = {
                    businessName: settings.ticketHeader.name,
                    address: settings.ticketHeader.address,
                    phone: settings.ticketHeader.phone,
                    rfc: settings.ticketHeader.rfc,
                    quoteNumber: `COT-${String(result.data.quoteNumber).padStart(7, '0')}`,
                    date: new Date(result.data.createdAt),
                    expirationDays: result.data.expirationDays,
                    customerName: quoteCustomerName.trim() || selectedClient?.name || 'Cliente General',
                    customerPhone: quoteCustomerPhone.trim() || selectedClient?.phone || undefined,
                    cashierName: user?.name || 'Cajero',
                    items: cart.map(item => ({
                        quantity: item.quantity,
                        description: item.product.name,
                        price: typeof item.unitPrice === 'number' && item.unitPrice > 0 ? item.unitPrice : item.product.priceNIO,
                        total: (typeof item.unitPrice === 'number' && item.unitPrice > 0 ? item.unitPrice : item.product.priceNIO) * item.quantity,
                    })),
                    subtotal: cartTotal,
                    total: cartTotal,
                    logoSvg: settings.logoSvg,
                    footerMessage: settings.ticketFooter.message,
                    website: settings.ticketFooter.website,
                };
                setLastQuoteReceipt(quoteData);
                setTimeout(() => {
                    printReceiptHtml(buildQuoteReceiptHtml(quoteData));
                    setLastQuoteReceipt(null);
                }, 200);
                setQuoteCustomerName('');
                setQuoteCustomerPhone('');
                setIsSaveQuoteOpen(false);
                setCart([]);
                setCustomerName('');
                setSelectedClient(null);
                toast({ title: 'Cotización Guardada', description: `Cotización #${quoteData.quoteNumber} creada exitosamente.` });
            } else {
                toast({ title: 'Error', description: result.error || 'No se pudo crear la cotización.', variant: 'destructive' });
            }
        } catch (e) {
            toast({ title: 'Error', description: 'Error al crear la cotización.', variant: 'destructive' });
        }
    };

    const handleLoadQuote = async (quote: any) => {
        if (!quote || !quote.quoteNumber) {
            toast({ title: 'Error', description: 'No se pudo cargar la cotización.', variant: 'destructive' });
            return;
        }
        try {
            const result = await getQuoteByNumber(quote.quoteNumber);
            if (result.success && result.data) {
                if (result.data.status === 'CONVERTED') {
                    toast({ title: 'Cotización ya convertida', description: 'Esta cotización ya fue facturada.', variant: 'destructive' });
                    return;
                }
                if (result.data.status === 'CANCELLED') {
                    toast({ title: 'Cotización cancelada', description: 'Esta cotización fue cancelada.', variant: 'destructive' });
                    return;
                }
                const expiresAt = new Date(result.data.createdAt);
                expiresAt.setDate(expiresAt.getDate() + result.data.expirationDays);
                if (expiresAt < new Date()) {
                    toast({ title: 'Cotización vencida', description: 'Esta cotización ya venció.', variant: 'destructive' });
                    return;
                }

                const loadedItems: CartItem[] = (result.data.items || []).map((qi: any) => {
                    const product = products.find(p => p.id === qi.productId);
                    return {
                        id: qi.id,
                        product: product || {
                            id: qi.productId || 'unknown',
                            name: qi.productName,
                            priceNIO: qi.unitPrice,
                            category: '',
                            inventoryType: userInventoryType,
                            unitOfMeasure: 'ud',
                        } as any,
                        quantity: qi.quantity,
                        unitPrice: qi.unitPrice,
                        priceLevel: qi.priceLevel,
                    };
                });

                setCart(loadedItems);
                setIsLoadQuoteOpen(false);
                setCustomerName(result.data.customer?.fullName || result.data.customerName || 'Cliente General');
                // Si la cotización tiene un cliente asignado, vincularlo como cliente seleccionado del carrito.
                if (result.data.clientId || result.data.customer) {
                    const cust = result.data.customer;
                    setSelectedClient({
                        id: result.data.clientId || cust?.id,
                        name: cust?.fullName || result.data.customerName || 'Cliente General',
                        phone: cust?.phone || result.data.customerPhone || undefined,
                        priceLevel: cust?.priceLevel,
                    });
                }
                toast({ title: 'Cotización Cargada', description: `Cotización COT-${String(result.data.quoteNumber).padStart(7, '0')} cargada con éxito.` });
            } else {
                toast({ title: 'No encontrada', description: result.error || 'Cotización no encontrada.', variant: 'destructive' });
            }
        } catch (e) {
            toast({ title: 'Error', description: 'Error al cargar la cotización.', variant: 'destructive' });
        }
    };

    // Keyboard shortcuts - MUST be after function declarations
    useEffect(() => {
        const handleKeyPress = (e: KeyboardEvent) => {
            // Only trigger if not typing in an input/textarea
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
                return;
            }

            switch (e.key) {
                case 'F1':
                    e.preventDefault();
                    handlePayment();
                    break;
                case 'F2':
                    e.preventDefault();
                    if (viewMode === 'payment') {
                        // Trigger credit payment if possible
                        if (customerName && customerName !== 'ANONIM') {
                             handlePrePaymentComplete(cartTotal, 0, 'Credito');
                        }
                    } else {
                        handleHoldBill();
                    }
                    break;
                case 'F3':
                    e.preventDefault();
                    handleCreditNoteClick();
                    break;
                case 'F4':
                    e.preventDefault();
                    toast({ title: 'MÃ¡s Opciones', description: 'FunciÃ³n en desarrollo' });
                    break;
                case 'F10':
                    e.preventDefault();
                    setIsHeldBillsOpen(true);
                    break;
                case 'F6':
                    e.preventDefault();
                    toast({ title: 'Afiliados', description: 'FunciÃ³n en desarrollo' });
                    break;
                case 'F7':
                    e.preventDefault();
                    toast({ title: 'Consulta Saldo', description: 'FunciÃ³n en desarrollo' });
                    break;
                case 'F8':
                    e.preventDefault();
                    toast({ title: 'Visor de Precio', description: 'FunciÃ³n en desarrollo' });
                    break;
                case 'F9':
                    e.preventDefault();
                    toast({ title: 'Recarga Saldo', description: 'FunciÃ³n en desarrollo' });
                    break;
                case 'Delete':
                    e.preventDefault();
                    handleClearCart();
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyPress);
        return () => window.removeEventListener('keydown', handleKeyPress);
    }, [
        handlePayment,
        handleHoldBill,
        handleClearCart,
        toast,
        viewMode,
        customerName,
        cartTotal,
        handlePrePaymentComplete,
        handleCreditNoteClick,
        setIsHeldBillsOpen
    ]);


    return (
        <div className="flex w-full h-full min-w-0 bg-gray-100">
            {/* Left Panel: Cart Ticket (ancho fijo, no colapsa) */}
            <div className="w-[380px] min-w-[380px] shrink-0 h-full flex flex-col border-r border-gray-200 shadow-sm bg-white">
                {/* Sidebar Trigger Header */}
                <div className="bg-white p-2.5 border-b flex items-center justify-between gap-1 h-16 shrink-0 w-full overflow-hidden">
                    <div className="flex items-center gap-2 min-w-0">
                        <SidebarTrigger className="h-8 w-8 shrink-0" />
                        <span className="font-bold text-base whitespace-nowrap">Punto de Venta</span>
                    </div>
                </div>

                {/* Cart Area */}
                <div className="flex-1 overflow-hidden flex flex-col">
                    <CartTicket
                        cart={cart}
                        subtotal={cartSubtotal}
                        tax={taxAmount}
                        total={cartTotal}
                        currency="NIO"
                        selectedItemId={selectedItemId}
                        onSelectItem={handleItemSelect}
                        onEditItem={(item) => setEditingItem(item)}
                    />
                </div>

                {/* Action Buttons Area - Compact Grid */}
                <div className="bg-white border-t p-2 shrink-0">
                    {/* Customer Display */}
                    <div className="mb-3 flex items-center justify-between bg-gray-50 p-2.5 rounded-lg border border-gray-100 shadow-sm">
                        <div className="flex flex-col gap-0.5">
                            <span className="text-[10px] text-gray-500 font-black uppercase tracking-widest">Cliente:</span>
                            <span className="font-black text-base text-[#673AB7] truncate max-w-[180px]">
                                {customerName || 'ANÓNIMO'}
                            </span>
                        </div>
                        <Button 
                            variant="secondary" 
                            size="sm" 
                            className="h-10 w-10 p-0 rounded-full bg-white border shadow-sm hover:bg-gray-100" 
                            onClick={() => setIsAssignClientOpen(true)}
                        >
                            <UserPlus className="w-5 h-5 text-[#673AB7]" />
                        </Button>
                    </div>

                    {/* Compact Action Grid - Essential buttons */}
                    <div className="grid grid-cols-3 gap-2">
                        {/* Row 1 */}
                        <Button
                            className="h-16 flex flex-col gap-1.5 bg-[#FF5722] hover:bg-[#F4511E] text-white font-black text-[10px] p-2 transition-all active:scale-95"
                            onClick={handleClearCart}
                            title="Limpiar (Delete)"
                        >
                            <Trash2 className="w-5 h-5" />
                            LIMPIAR
                        </Button>

                        <Button
                            className="h-16 flex flex-col gap-1.5 bg-[#673AB7] hover:bg-[#5E35B1] text-white font-black text-[10px] p-2 transition-all active:scale-95"
                            onClick={() => handleHoldBill()}
                            title="Poner en Espera (F2)"
                        >
                            <FileText className="w-5 h-5" />
                            <span className="text-center leading-none uppercase">PONER EN<br />ESPERA</span>
                        </Button>

                        <Button
                            className="h-16 flex flex-col gap-1.5 bg-[#673AB7] hover:bg-[#5E35B1] text-white font-black text-[10px] p-2 transition-all active:scale-95"
                            onClick={handleCreditNoteClick}
                            title="Nota de CrÃ©dito (F3)"
                        >
                            <CreditCard className="w-5 h-5" />
                            <span className="text-center leading-none uppercase">NOTA DE<br />CRÃ‰DITO</span>
                        </Button>

                        {/* Row 2 */}
                        <Button
                            className="h-16 flex flex-col gap-1.5 bg-[#673AB7] hover:bg-[#5E35B1] text-white font-black text-[10px] p-2 transition-all active:scale-95"
                            onClick={() => setIsHeldBillsOpen(true)}
                            title="Ver Facturas en Espera (F10)"
                        >
                            <ListOrdered className="w-5 h-5" />
                            <span className="text-center leading-none uppercase">VER FACS<br />EN ESPERA</span>
                        </Button>

                        {settings.quickSwitchEnabled ? (
                            <Button
                                className="h-16 flex flex-col gap-1.5 bg-[#2196F3] hover:bg-[#1976D2] text-white font-black text-[10px] p-2 transition-all active:scale-95"
                                onClick={() => setShowQuickSwitch(true)}
                                title="Cambio de Usuario"
                            >
                                <UserIcon className="w-5 h-5" />
                                <span className="text-center leading-none uppercase">CAMBIO<br />USUARIO</span>
                            </Button>
                        ) : (
                            <Button
                                className="h-16 flex flex-col gap-1.5 bg-[#607D8B] hover:bg-[#546E7A] text-white font-black text-[10px] p-2 transition-all active:scale-95"
                                onClick={handleOpenDrawer}
                                title="Abrir Gaveta"
                            >
                                <FolderOpen className="w-5 h-5" />
                                <span className="text-center leading-none uppercase">ABRIR<br />GAVETA</span>
                            </Button>
                        )}

                        <Button
                            className="h-16 flex flex-col gap-1.5 bg-[#FF9800] hover:bg-[#F57C00] text-white font-black text-[10px] p-2 transition-all active:scale-95"
                            onClick={() => setIsRetiroOpen(true)}
                            title="Retiro / Salida de Efectivo"
                        >
                            <Coins className="w-5 h-5" />
                            <span className="text-center leading-none uppercase">RETIRO<br />SALIDA</span>
                        </Button>
                    </div>

                    <div className="grid grid-cols-3 gap-2 mt-2">
                        <Button
                            className="h-14 flex flex-col gap-1 bg-[#E91E63] hover:bg-[#C2185B] text-white font-black text-[9px] p-2 transition-all active:scale-95"
                            onClick={openSaveQuoteDialog}
                            title="Guardar como Cotización"
                        >
                            <FileText className="w-4 h-4" />
                            <span className="text-center leading-none uppercase">GUARDAR<br />COTIZACIÓN</span>
                        </Button>
                        <Button
                            className="h-14 flex flex-col gap-1 bg-[#9C27B0] hover:bg-[#7B1FA2] text-white font-black text-[9px] p-2 transition-all active:scale-95"
                            onClick={() => setIsLoadQuoteOpen(true)}
                            title="Cargar Cotización"
                        >
                            <ClipboardList className="w-4 h-4" />
                            <span className="text-center leading-none uppercase">CARGAR<br />COTIZACIÓN</span>
                        </Button>
                        <Button
                            className="h-14 flex flex-col gap-1 bg-[#009688] hover:bg-[#00796B] text-white font-black text-[9px] p-2 transition-all active:scale-95"
                            onClick={handleReprintLast}
                            title="Reimprimir Último Ticket"
                        >
                            <Printer className="w-4 h-4" />
                            <span className="text-center leading-none uppercase">REIMPRIMIR<br />ÚLTIMO</span>
                        </Button>
                    </div>

                    <div className="mt-2">
                        {/* COBRAR button spans full width */}
                        <Button
                            className="h-20 w-full flex items-center justify-center gap-3 bg-[#8BC34A] hover:bg-[#7CB342] text-white font-black text-xl shadow-lg transition-all active:scale-[0.98]"
                            onClick={handlePayment}
                            title="Cobrar (F1)"
                        >
                            <CreditCard className="w-8 h-8" />
                            COBRAR
                        </Button>
                    </div>
                </div>
            </div>

            {/* Right Panel: Product Grid & Actions */}
            <div className="flex-1 min-w-0 h-full flex flex-col">
                {/* Content Area: Products OR Payment Grid */}
                <div className="flex-1 overflow-hidden">
                    {viewMode === 'products' ? (
                        <ProductGrid
                            ref={productGridRef}
                            products={availableProducts}
                            onProductSelect={addToCart}
                        />
                    ) : (
                        <PaymentGrid
                            total={cartTotal}
                            onCancel={() => setViewMode('products')}
                            onComplete={handlePrePaymentComplete}
                            customerName={customerName}
                        />
                    )}
                </div>
            </div>

            <AssignClientDialog
                isOpen={isAssignClientOpen}
                onClose={() => setIsAssignClientOpen(false)}
                onAssign={(client: SelectedClient) => {
                    setCustomerName(client.name);
                    setSelectedClient(client);
                }}
                currentName={customerName}
            />

            <HeldBillsDialog
                isOpen={isHeldBillsOpen}
                onClose={() => setIsHeldBillsOpen(false)}
                onSelectSale={handleResumeBill}
                currentUserId={user?.id}
            />


            <PaymentSummaryDialog
                isOpen={isPaymentSummaryOpen}
                onClose={() => setIsPaymentSummaryOpen(false)}
                total={cartTotal}
                amountPaid={paymentData?.paid || 0}
                change={paymentData?.change || 0}
                onConfirm={confirmPayment}
            />

            <CreditFinancingDialog
                isOpen={isFinancingOpen}
                onClose={() => setIsFinancingOpen(false)}
                total={cartTotal}
                onConfirm={handleFinancingConfirm}
            />

            <ProductAddWizard
                product={wizardProduct?.product ?? null}
                onConfirm={handleWizardConfirm}
                onClose={() => setWizardProduct(null)}
            />
            <ItemEditDialog
                item={editingItem}
                onClose={() => setEditingItem(null)}
                onSave={handleSaveItemEdit}
                onRemove={handleRemoveItem}
            />
            <QuickSwitchModal
                open={showQuickSwitch}
                onOpenChange={setShowQuickSwitch}
            />

            <AdminAuthDialog
                isOpen={isAdminAuthOpen}
                onClose={() => setIsAdminAuthOpen(false)}
                onSuccess={handleAdminAuthSuccess}
            />

            <CreditNoteDialog
                isOpen={isCreditNoteOpen}
                onClose={() => setIsCreditNoteOpen(false)}
                onSuccess={() => { /* maybe refresh dash stats or show success summary */ }}
            />

            {isOpenDrawerReceiptActive && <OpenDrawerTemplate />}

            <RetiroDialog
                isOpen={isRetiroOpen}
                onClose={() => setIsRetiroOpen(false)}
                onConfirm={handleRetiroConfirm}
                isLoading={isRetiroSaving}
            />
            {lastRetiro && <RetiroReceiptTemplate {...lastRetiro} />}

            {printFormat === 'invoice'
                ? (saleForPrint && <FullPageInvoiceTemplate {...saleForPrint} />)
                : (saleForPrint && <ReceiptTemplate {...saleForPrint} />)}

            <Dialog open={!!lastSale} onOpenChange={(open: boolean) => { if (!open) setLastSale(null); }}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Reimprimir Factura / Ticket</DialogTitle>
                    </DialogHeader>
                    <div className="flex items-center justify-center gap-2 py-2">
                        <Button
                            size="sm"
                            variant={printFormat === 'ticket' ? 'default' : 'outline'}
                            onClick={() => setPrintFormat('ticket')}
                        >
                            🧾 Imprimir Ticket
                        </Button>
                        <Button
                            size="sm"
                            variant={printFormat === 'invoice' ? 'default' : 'outline'}
                            onClick={() => setPrintFormat('invoice')}
                        >
                            📄 Imprimir Factura (Hoja Completa)
                        </Button>
                    </div>
                    <div className="flex justify-center p-4 max-h-[60vh] overflow-y-auto">
                        {lastSale && printFormat === 'invoice'
                            ? <FullPageInvoiceTemplate {...lastSale} previewMode />
                            : (lastSale && <ReceiptTemplate {...lastSale} previewMode />)}
                    </div>
                    <DialogFooter>
                        <Button onClick={() => {
                            savePreferredPrintFormat(printFormat);
                            const toPrint = lastSale;
                            setSaleForPrint(toPrint);
                            setLastSale(null);
                            // La impresión la dispara el useEffect que reacciona
                            // a saleForPrint una vez el template esté en el DOM.
                        }}>Imprimir</Button>
                        <Button variant="outline" onClick={() => setLastSale(null)}>Cerrar</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {lastQuoteReceipt && <QuoteReceiptTemplate {...lastQuoteReceipt} />}

            {/* Save Quote Dialog */}
            <Dialog open={isSaveQuoteOpen} onOpenChange={setIsSaveQuoteOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Guardar como Cotización</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <p className="text-sm text-muted-foreground">
                            Se guardará el carrito actual como cotización. El cliente puede presentarla después para facturar.
                        </p>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Nombre del Cliente (opcional)</label>
                            <Input
                                placeholder="Cliente General"
                                value={quoteCustomerName}
                                onChange={(e) => setQuoteCustomerName(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Teléfono (opcional)</label>
                            <Input
                                placeholder="0000-0000"
                                value={quoteCustomerPhone}
                                onChange={(e) => setQuoteCustomerPhone(e.target.value)}
                            />
                        </div>
                        <div className="bg-muted p-3 rounded-lg text-sm">
                            <p className="font-semibold">Total: {formatCurrency(cartTotal)}</p>
                            <p className="text-xs text-muted-foreground mt-1">{cart.length} producto(s) en el carrito</p>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsSaveQuoteOpen(false)}>Cancelar</Button>
                        <Button className="bg-[#E91E63] hover:bg-[#C2185B] text-white" onClick={handleSaveQuote}>
                            Guardar e Imprimir
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Load Quote Dialog */}
            <LoadQuoteDialog
                isOpen={isLoadQuoteOpen}
                onClose={() => setIsLoadQuoteOpen(false)}
                onLoadQuote={handleLoadQuote}
            />
        </div>
    );
};

interface POSClientProps {
    initialProducts: Product[];
    initialInventory: InventoryItem[];
    initialJewelryPieces?: any[];
}

export default function POSClient({ initialProducts, initialInventory, initialJewelryPieces = [] }: POSClientProps) {
    const { user } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const { isCashRegisterOpen } = useCashRegister();
    const { settings, loading: settingsLoading } = useSettings();
    const { mode } = useBusinessMode();
    const isDispatcherCashierFlow = settings.workflow === 'dispatcher-cashier';

    const { productsQuery, inventoryQuery } = usePOSData(initialProducts, initialInventory);
    const products = productsQuery.data ?? [];
    const inventory = inventoryQuery.data ?? [];

    const jewelryQuery = useQuery({
        queryKey: ['jewelry-available'],
        queryFn: async () => {
            const res = await getAvailableJewelry();
            return res.success ? (res.data as any[]) : [];
        },
        enabled: mode === 'JEWELRY',
        staleTime: 30_000,
    });
    const jewelryPieces = jewelryQuery.data ?? initialJewelryPieces;

    // Indica si hay un pedido pendiente de pre-carga ("Cargar en POS") desde el
    // detalle de pedido. Evita montar las vistas hasta aplicar el pre-carga.
    const [preloadReady, setPreloadReady] = useState<boolean>(() => {
        if (typeof window === 'undefined') return true;
        return !sessionStorage.getItem('pos-preload-order');
    });

    // Recepción del pedido a facturar: escribe el carrito y el cliente en
    // sessionStorage ANTES de montar las vistas POS para que usePersistedCart
    // los lea al inicializarse.
    useEffect(() => {
        if (preloadReady) return;
        if (products.length === 0) return;
        try {
            const staged = sessionStorage.getItem('pos-preload-order');
            if (staged) {
                const parsed = JSON.parse(staged);
                applyOrderPreloadToPOS(parsed, products);
            }
            sessionStorage.removeItem('pos-preload-order');
        } catch {
            sessionStorage.removeItem('pos-preload-order');
        }
        setPreloadReady(true);
    }, [preloadReady, products]);

    useEffect(() => {
        if (!user || settingsLoading) return;

        if (['cashier', 'admin', 'master-admin'].includes(user.role)) {
            if (!isCashRegisterOpen && pathname === '/pos') {
                router.replace('/cash-register/open');
            }
        } else if (user.role === 'dispatcher') {
            // El despachador SIEMPRE debe usar la vista de toma de pedidos (/pos).
            // Si por alguna razón no está en /pos, se le reorienta ahí (nunca a /dashboard).
            if (pathname !== '/pos') {
                router.replace('/pos');
            }
        }
    }, [user, isCashRegisterOpen, router, settingsLoading, isDispatcherCashierFlow]);

    if (!user || settingsLoading || (user.role === 'cashier' && !isCashRegisterOpen)) {
        return null;
    }

    if (productsQuery.isLoading || inventoryQuery.isLoading || !preloadReady) {
        return (
            <div className="flex h-screen items-center justify-center bg-muted">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
        );
    }

    const renderContent = () => {
        // El Despachador SIEMPRE usa su vista exclusiva de toma de pedidos.
        if (user.role === 'dispatcher') {
            return <DispatcherPOS products={products} inventory={inventory} />;
        }

        if (mode === 'JEWELRY') {
            if (jewelryQuery.isLoading) {
                return (
                    <div className="flex h-full items-center justify-center">
                        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                    </div>
                );
            }
            return <JewelryPOS availablePieces={jewelryPieces} />;
        }

        if (isDispatcherCashierFlow) {
            if (user.role === 'cashier') return <CashierPOS products={products} inventory={inventory} />;
        }

        if (!isDispatcherCashierFlow && (user.role === 'cashier' || user.role === 'admin' || user.role === 'master-admin')) {
            return <CashierOnlyPOS products={products} inventory={inventory} />;
        }

        return null;
    }

    return (
        <div className="flex h-screen w-full flex-col bg-muted p-0">
            <main className="flex-1 overflow-hidden p-0 h-full">
                {renderContent()}
            </main>
        </div>
    );
}

