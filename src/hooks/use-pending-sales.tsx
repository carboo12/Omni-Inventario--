"use client";

import React, { createContext, useContext, useCallback, useMemo, useRef, useEffect, ReactNode } from 'react';
import type { PendingSale, CartItem } from '@/lib/types';
import { useAuth } from './use-auth';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from './use-toast';
import {
  createHeldSale,
  getPendingHeldSales,
  completeHeldSale,
  cancelHeldSale,
  deleteHeldSale,
  updateHeldSale,
  lockHeldSale,
  unlockHeldSale,
  createHeldOrder,
  getHeldOrders,
  promoteHeldOrder as promoteHeldOrderAction,
} from '@/lib/actions/held-sales';

interface PendingSalesContextType {
  pendingSales: PendingSale[];
  addPendingSale: (customerName: string, items: CartItem[], total: number) => Promise<any>;
  removePendingSale: (saleId: string, invoiceId?: string) => Promise<any>;
  cancelPendingSale: (saleId: string) => Promise<any>;
  deletePendingSale: (saleId: string) => Promise<any>;
  updatePendingSale: (saleId: string, items: CartItem[], total: number) => Promise<any>;
  lockPendingSale: (saleId: string) => Promise<any>;
  unlockPendingSale: (saleId: string) => Promise<any>;
  refreshPendingSales: () => Promise<void>;
  heldOrders: PendingSale[];
  addHeldOrder: (customerName: string, items: CartItem[], total: number) => Promise<any>;
  promoteHeldOrder: (saleId: string) => Promise<any>;
  refreshHeldOrders: () => Promise<void>;
}

const PendingSalesContext = createContext<PendingSalesContextType | undefined>(undefined);

const HELD_SALES_KEY = ['held-sales'];
const HELD_ORDERS_KEY = ['held-orders'];

const unwrap = (r: any) =>
  r && typeof r === 'object' && 'success' in r && 'data' in r
    ? (r.success ? r.data : [])
    : Array.isArray(r)
      ? r
      : [];

export const PendingSalesProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const prevCountRef = useRef<number>(0);
  const initializedRef = useRef(false);

  const { data: pendingSales = [] } = useQuery({
    queryKey: HELD_SALES_KEY,
    queryFn: () => getPendingHeldSales().then(unwrap),
    refetchInterval: 10_000,
    retry: 2,
    staleTime: 5_000,
    placeholderData: (prev) => prev ?? [],
  });

  const { data: heldOrders = [] } = useQuery({
    queryKey: HELD_ORDERS_KEY,
    queryFn: () => getHeldOrders().then(unwrap),
    refetchInterval: 10_000,
    retry: 2,
    staleTime: 5_000,
    placeholderData: (prev) => prev ?? [],
  });

  // Notificar al cajero cuando llegan comandas nuevas
  useEffect(() => {
    const currentCount = (pendingSales ?? []).length;
    if (!initializedRef.current) {
      prevCountRef.current = currentCount;
      initializedRef.current = true;
      return;
    }
    if (currentCount > prevCountRef.current) {
      const diff = currentCount - prevCountRef.current;
      toast({
        title: `${diff} nueva${diff > 1 ? 's' : ''} comanda${diff > 1 ? 's' : ''}`,
        description: `Hay ${currentCount} comanda${currentCount > 1 ? 's' : ''} pendiente${currentCount > 1 ? 's' : ''}. Toca para ver.`,
        duration: 2000,
      });
    }
    prevCountRef.current = currentCount;
  }, [pendingSales, toast]);

  const addPendingSale = useCallback(async (customerName: string, items: CartItem[], total: number) => {
    if (!user) return { success: false, error: 'No hay usuario autenticado' };
    const res = await createHeldSale({
      dispatcherId: user.id,
      dispatcherName: user.name,
      customerName,
      items,
      total,
    });
    await queryClient.invalidateQueries({ queryKey: HELD_SALES_KEY });
    return res;
  }, [user, queryClient]);

  const addHeldOrder = useCallback(async (customerName: string, items: CartItem[], total: number) => {
    if (!user) return { success: false, error: 'No hay usuario autenticado' };
    const res = await createHeldOrder({
      dispatcherId: user.id,
      dispatcherName: user.name,
      customerName,
      items,
      total,
    });
    await queryClient.invalidateQueries({ queryKey: HELD_ORDERS_KEY });
    return res;
  }, [user, queryClient]);

  const promoteHeldOrder = useCallback(async (saleId: string) => {
    const res = await promoteHeldOrderAction(saleId);
    await queryClient.invalidateQueries({ queryKey: HELD_ORDERS_KEY });
    await queryClient.invalidateQueries({ queryKey: HELD_SALES_KEY });
    return res;
  }, [queryClient]);

  const refreshHeldOrders = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: HELD_ORDERS_KEY });
  }, [queryClient]);

  const removePendingSale = useCallback(async (saleId: string, invoiceId?: string) => {
    const res = await completeHeldSale(saleId, invoiceId);
    await queryClient.invalidateQueries({ queryKey: HELD_SALES_KEY });
    return res;
  }, [queryClient]);

  const cancelPendingSale = useCallback(async (saleId: string) => {
    const res = await cancelHeldSale(saleId);
    await queryClient.invalidateQueries({ queryKey: HELD_SALES_KEY });
    return res;
  }, [queryClient]);

  const deletePendingSale = useCallback(async (saleId: string) => {
    const res = await deleteHeldSale(saleId);
    await queryClient.invalidateQueries({ queryKey: HELD_SALES_KEY });
    return res;
  }, [queryClient]);

  const updatePendingSale = useCallback(async (saleId: string, items: CartItem[], total: number) => {
    const res = await updateHeldSale(saleId, items, total);
    await queryClient.invalidateQueries({ queryKey: HELD_SALES_KEY });
    return res;
  }, [queryClient]);

  const lockPendingSale = useCallback(async (saleId: string) => {
    if (!user) return { success: false, error: 'No hay usuario autenticado' };
    const res = await lockHeldSale(saleId, user.id);
    await queryClient.invalidateQueries({ queryKey: HELD_SALES_KEY });
    return res;
  }, [user, queryClient]);

  const unlockPendingSale = useCallback(async (saleId: string) => {
    const res = await unlockHeldSale(saleId);
    await queryClient.invalidateQueries({ queryKey: HELD_SALES_KEY });
    return res;
  }, [queryClient]);

  const refreshPendingSales = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: HELD_SALES_KEY });
  }, [queryClient]);

  const value = useMemo(
    () => ({
      pendingSales: (pendingSales ?? []) as PendingSale[],
      addPendingSale,
      removePendingSale,
      cancelPendingSale,
      deletePendingSale,
      updatePendingSale,
      lockPendingSale,
      unlockPendingSale,
      refreshPendingSales,
      heldOrders: (heldOrders ?? []) as PendingSale[],
      addHeldOrder,
      promoteHeldOrder,
      refreshHeldOrders,
    }),
    [pendingSales, addPendingSale, removePendingSale, cancelPendingSale, deletePendingSale, updatePendingSale, lockPendingSale, unlockPendingSale, refreshPendingSales, heldOrders, addHeldOrder, promoteHeldOrder, refreshHeldOrders]
  );

  return (
    <PendingSalesContext.Provider value={value}>
      {children}
    </PendingSalesContext.Provider>
  );
};

export const usePendingSales = () => {
  const context = useContext(PendingSalesContext);
  if (context === undefined) {
    throw new Error('usePendingSales must be used within a PendingSalesProvider');
  }
  return context;
};
