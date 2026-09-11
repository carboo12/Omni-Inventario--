"use client";

import { useState, useEffect, useCallback } from 'react';
import type { CartItem } from '@/lib/types';

const CART_STORAGE_KEY = 'pos-cart';
const CUSTOMER_STORAGE_KEY = 'pos-customer';

// Carrito persistido en sessionStorage para que sobreviva a re-montajes
// del componente POS (cambio rápido de usuario, refresh de datos iniciales).
//
// IMPORTANTE: el cliente NO se persiste a propósito. El POS debe arrancar
// siempre con el cliente por defecto (Cliente Genérico / Anónimo), no con el
// cliente de la última venta o cotización cargada. Por eso, al montar la
// vista se elimina también cualquier clave legacy 'pos-customer' que pudiera
// haber quedado en sessionStorage.
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

  // Siempre inicia sin cliente ('') → la UI muestra "ANÓNIMO / Cliente Genérico".
  const [customerName, setCustomerName] = useState<string>('');

  useEffect(() => {
    try {
      sessionStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    } catch {
      // sessionStorage puede no estar disponible; no bloquear la UI.
    }
  }, [cart]);

  useEffect(() => {
    // Limpia claves legacy de cliente persistido para que una recarga de la
    // página no vuelva a fijar un cliente específico como por defecto.
    try {
      sessionStorage.removeItem(CUSTOMER_STORAGE_KEY);
    } catch {
      // sessionStorage puede no estar disponible; no bloquear la UI.
    }
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
    setCustomerName('');
  }, []);

  return { cart, setCart, clearCart, customerName, setCustomerName };
}