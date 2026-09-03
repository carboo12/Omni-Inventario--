import { ManagedUser, Product, InventoryItem, Supplier, PurchaseInvoice, CashRegisterSession, InventoryMovement } from './types';

export const managedUsers: ManagedUser[] = [
    {
        id: 'user-1',
        name: 'Admin User',
        role: 'admin',
        password: 'password123',
        status: 'activo',
        inventoryType: 'general'
    }
];

export const products: Product[] = [
    {
        id: 'prod-1',
        name: 'Paracetamol',
        priceNIO: 10,
        costPriceNIO: 5,
        category: 'Pain Relief',
        inventoryType: 'pharmacy',
        unitOfMeasure: 'unit',
        minStock: 10,
        barcode: '123456789',
        purchaseCurrency: 'NIO',
        originalPrice: 10
    }
];

export const inventory: InventoryItem[] = [
    {
        id: 'inv-1',
        productId: 'prod-1',
        productName: 'Paracetamol',
        inventoryType: 'pharmacy',
        barcode: '123456789',
        batch: 'BATCH001',
        quantity: 100,
        expiryDate: '2025-12-31',
        status: 'En Stock'
    }
];

export const suppliers: Supplier[] = [];
export const purchaseInvoices: PurchaseInvoice[] = [];
export const cashRegisterSessions: CashRegisterSession[] = [];
export const inventoryMovements: InventoryMovement[] = [];
