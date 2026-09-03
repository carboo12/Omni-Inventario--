"use client";

import { useQuery } from '@tanstack/react-query';
import type { Product, InventoryItem } from '@/lib/types';
import { getProducts } from '@/lib/actions/products';
import { getInventory } from '@/lib/actions/inventory';

// Hook de datos del POS: productos e inventario con React Query.
// Separado de client.tsx para mantener compatibilidad con Fast Refresh de Vite.
export function usePOSData(initialProducts?: Product[], initialInventory?: InventoryItem[]) {
    const productsQuery = useQuery({
        queryKey: ['products'],
        queryFn: async () => {
            const res = await getProducts();
            return res.success ? (res.data as any[]) : [];
        },
        initialData: initialProducts,
        retry: 2,
        staleTime: 30_000,
    });

    const inventoryQuery = useQuery({
        queryKey: ['inventory'],
        queryFn: async () => {
            const res = await getInventory();
            return res.success ? (res.data as any[]) : [];
        },
        initialData: initialInventory,
        retry: 2,
        staleTime: 30_000,
    });

    return { productsQuery, inventoryQuery };
}