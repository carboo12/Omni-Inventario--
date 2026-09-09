

export type UserRole = "master-admin" | "admin" | "dispatcher" | "cashier" | "rutero";
export type InventoryType = "pharmacy" | "general" | "jewelry";
export type UnitOfMeasure = "unit" | "bulk" | "box" | "blister";

export type User = {
  id: string;
  name: string;
  role: UserRole;
  inventoryType?: InventoryType;
  assignedLocation?: string;
};

export type ManagedUser = {
  id: string;
  name: string;
  role: UserRole;
  password?: string;
  status: 'activo' | 'inactivo';
  inventoryType?: InventoryType;
  assignedLocation?: string;
};

export type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: UserRole[];
};

export type Product = {
  id: string;
  parentProductId?: string | null;
  variantId?: string | null;
  hasVariants?: boolean;
  name: string;
  priceNIO: number; // Sale price
  /** Nivel de precio 2 (Mayor). */
  price2?: number | null;
  /** Nivel de precio 3 (Paca / Bulto). */
  price3?: number | null;
  /** Nivel de precio 4 (Vol. Especial). */
  price4?: number | null;
  costPriceNIO?: number | null;
  category: string;
  categoryId?: string | null;
  inventoryType: InventoryType;
  unitOfMeasure: UnitOfMeasure;
  minStock?: number | null;
  barcode?: string | null;
  imageUrl?: string | null;
  imageHint?: string | null;
  brand?: string | null;
  size?: string | null;
  color?: string | null;
  gender?: string | null;
  purchaseCurrency: 'NIO' | 'USD';
  originalPrice: number;
  stock?: number;
  hasBoxOption?: boolean;
  unitsPerBox?: number | null;
  boxPrice?: number | null;
  isFractional?: boolean;
  trackInventory?: boolean;
  /** Presentación 1: unidad Mayor (ej. Caja, Ristra). */
  bulkUnit?: string | null;
  /** Factor de equivalencia de la presentación 1 (en unidades base). */
  unitsPerBulk?: number | null;
  /** Presentación 2 (opcional). */
  bulkUnit2?: string | null;
  unitsPerBulk2?: number | null;
  /** Presentación 3 (opcional). */
  bulkUnit3?: string | null;
  unitsPerBulk3?: number | null;
  baseUnit?: string | null;
  /** Descripciones adicionales opcionales (Descripción 2 y Descripción 3). */
  hasExtraDetails?: boolean;
  description2?: string | null;
  description3?: string | null;
};

export type InventoryItem = {
  id: string;
  productId: string;
  productName: string;
  inventoryType: InventoryType;
  barcode?: string | null;
  batch: string;
  quantity: number;
  expiryDate: string;
  status: "En Stock" | "Stock Bajo" | "Agotado";
  parentProductId?: string | null;
  variantId?: string | null;
};

export type CartItem = {
  id: string;
  product: Product;
  quantity: number;
  /** Presentación vendida: 'unit' (unidad base), 'box' (legado caja), o una clave de presentación fija. */
  presentation?: 'unit' | 'box' | string;
  /** Nombre legible de la presentación seleccionada (para tickets/reporte). */
  presentationName?: string;
  /** Factor de conversión a la unidad base de la presentación seleccionada. */
  presentationFactor?: number;
  /** Precio unitario efectivo según el Nivel de Precio y la presentación. */
  unitPrice?: number;
  /** Nivel de precio aplicado (1 = priceNIO, 2 = price2, 3 = price3, 4 = price4). */
  priceLevel?: number;
  /** Ventas sin inventario: artículo encargado / pendiente de entrega (PAGADO). */
  isEncargo?: boolean;
};

export type PendingSale = {
  id: string;
  customerName: string;
  dispatcherId: string;
  dispatcherName: string;
  items: CartItem[];
  total: number;
  createdAt: string;
  status: 'pending' | 'completed' | 'PENDING' | 'BILLED' | 'CANCELLED' | 'HELD';
  lockedBy?: string | null;
};

export type InventoryMovement = {
  id: string;
  timestamp: string;
  productName: string;
  movementType: 'Salida' | 'Devolución' | 'Entrada' | 'Ajuste';
  movementId: string;
  quantityChange: number;
  previousQuantity: number;
  newQuantity: number;
  user: string;
  inventoryType: InventoryType;
};

export type Supplier = {
  id: string;
  name: string;
  nit: string;
  phone: string;
  email?: string | null;
  address?: string | null;
  city?: string | null;
  status: string;
};

export type PurchaseInvoice = {
  id: string;
  invoiceNumber: string;
  supplierId: string;
  supplierName: string;
  date: string;
  dueDate: string;
  totalAmount: number;
  paidAmount: number;
  status: string;
  details?: string | null;
};

export type CreditInstallmentStatus = 'PENDING' | 'PAID' | 'OVERDUE';

export type CreditInstallment = {
  id: string;
  saleId: string;
  customerId: string;
  installmentNumber: number;
  dueDate: Date;
  amount: number;
  status: CreditInstallmentStatus;
  createdAt: Date;
};

export type CashRegisterSession = {
  id: string;
  cashierId: string;
  cashierName: string;
  openingTime: string;
  closingTime?: string;
  initialAmount: number;
  initialAmountUSD: number;
  finalAmount?: number;
  totalSales?: number;
  salesCash?: number;
  salesCard?: number;
  salesUSD?: number;
  salesServices?: number;
  salesCredit?: number;
  salesAbonos?: number;
  totalReturns?: number;
  actualCash?: number;
  actualUSD?: number;
  difference?: number;
  differenceUSD?: number;
  status: 'open' | 'closed';
};

export type PurchaseOrderItem = {
  id: string;
  purchaseOrderId: string;
  productId?: string | null;
  productName: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
};

export type PurchaseOrder = {
  id: string;
  orderNumber: string;
  supplierId: string;
  supplier?: Supplier;
  status: string;
  date: Date;
  expectedDate?: Date | null;
  totalAmount: number;
  notes?: string | null;
  items?: PurchaseOrderItem[];
  createdAt: Date;
  updatedAt: Date;
};

export type QuotationItem = {
  id: string;
  quoteId: string;
  productId?: string | null;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  variantId?: string | null;
};

export type Quotation = {
  id: string;
  quoteNumber: number;
  customerName: string;
  customerPhone?: string | null;
  expirationDays: number;
  subtotal: number;
  tax: number;
  total: number;
  status: 'PENDING' | 'CONVERTED' | 'EXPIRED' | 'CANCELLED';
  notes?: string | null;
  createdAt: Date;
  updatedAt: Date;
  userId: string;
  convertedInvoiceId?: string | null;
  quoteItem?: QuotationItem[];
  user?: { name: string };
};
