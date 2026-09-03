"use client";

import { useState, useEffect, useCallback } from 'react';
import type { CartItem } from '@/lib/types';

const CART_STORAGE_KEY = 'pos-cart';
const CUSTOMER_STORAGE_KEY = 'pos-customer';

// Carrito persistido en sessionStorage para que sobreviva a re-montajes
// del componente POS (cambio rápido de usuario, refresh de datos iniciales).
// Se limpia únicamente al cerrar sesión explícitamente (ver use-auth).
export function usePersistedCart() {
  const [cart, setCart] = useState<CartItem[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const raw = sessionStorage.getItem(CART_STORAGE_KEY);
      return raw ? (JSON.parse(raw) as CartItem[]) : [];
    } catch {
      return [];
    }
  });

  const [customerName, setCustomerName] = useState<string>(() => {
    if (typeof window === 'undefined') return '';
    try {
      return sessionStorage.getItem(CUSTOMER_STORAGE_KEY) || '';
    } catch {
      return '';
    }
  });

  useEffect(() => {
    try {
      sessionStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    } catch {
      // sessionStorage puede no estar disponible; no bloquear la UI.
    }
  }, [cart]);

  useEffect(() => {
    try {
      if (customerName) sessionStorage.setItem(CUSTOMER_STORAGE_KEY, customerName);
      else sessionStorage.removeItem(CUSTOMER_STORAGE_KEY);
    } catch {
      // sessionStorage puede no estar disponible; no bloquear la UI.
    }
  }, [customerName]);

  const clearCart = useCallback(() => setCart([]), []);

  return { cart, setCart, clearCart, customerName, setCustomerName };
}