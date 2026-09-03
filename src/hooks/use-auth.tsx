"use client";

import type { User } from "@/lib/types";
import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { useCashRegister } from "./use-cash-register";
import { loginUser, logout as logoutAction } from "@/lib/actions/auth";
import { useInitialData } from "./use-initial-data";
import {
  clearStoredSession,
  forceSessionExpiry,
  isSessionExpired,
  setSessionStored,
  SESSION_DURATION_MS,
  SESSION_EXPIRED_EVENT,
} from "@/lib/session-expiry";

interface AuthContextType {
  user: User | null;
  login: (name: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Componente separado para cumplir con reglas de Fast Refresh de Vite
// (no mezclar componentes y hooks en el mismo export)
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { data: initialData, loading: initialLoading, error: initialError, refresh: refreshInitialData } = useInitialData();
  const [user, setUser] = useState<User | null>(null);
  const [authResolved, setAuthResolved] = useState(false);
  const navigate = useNavigate();
  const routerState = useRouterState();
  const cashRegisterContext = useContext((useCashRegister as any).Context);

  // Usamos ref para el pathname para evitar que sea una dependencia del effect
  const pathnameRef = useRef(routerState.location.pathname);
  pathnameRef.current = routerState.location.pathname;

  // Resuelve el usuario cuando los datos iniciales cargan.
  // Usamos pathnameRef (no pathname) para evitar el bucle infinito.
  useEffect(() => {
    if (initialLoading) return;

    if (!initialData) {
      setAuthResolved(true);
      return;
    }

    if (initialData.user) {
      setUser({
        id: initialData.user.id,
        name: initialData.user.name,
        role: initialData.user.role as any,
        inventoryType: initialData.user.inventoryType as any,
        assignedLocation: initialData.user.assignedLocation || undefined,
      });
    } else {
      const currentPath = pathnameRef.current;
      const isPublicPage = currentPath === '/setup' || currentPath === '/login' || currentPath === '/';
      if (!isPublicPage) {
        navigate({ to: '/' as never });
      }
    }

    setAuthResolved(true);
    // Solo re-ejecutar cuando los datos iniciales cambian, NO cuando pathname cambia
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialData, initialLoading]);

  const login = useCallback(
    async (name: string, password: string) => {
      const result = await loginUser(name, password);

      if (result.success && result.user) {
        const sessionUser: User = {
          id: result.user.id,
          name: result.user.name,
          role: result.user.role,
          inventoryType: result.user.inventoryType,
          assignedLocation: result.user.assignedLocation || undefined,
        };

        setUser(sessionUser);
        // Persistimos localmente la sesión con su vencimiento (8h exactas)
        // para poder forzar el cierre automático desde el frontend.
        setSessionStored(Date.now() + SESSION_DURATION_MS);
        await refreshInitialData();

        const currentPath = pathnameRef.current;
        const isPublicPage = currentPath === '/login' || currentPath === '/';
        if (isPublicPage) {
          if (sessionUser.role === 'cashier') {
            navigate({ to: '/cash-register/open' as never });
          } else if (sessionUser.role === 'dispatcher') {
            // El despachador va directo a su vista de toma de pedidos (mobile-first).
            navigate({ to: '/pos' as never });
          } else {
            navigate({ to: '/dashboard' as never });
          }
        }
        return { success: true };
      }

      return { success: false, error: result.error };
    },
    [navigate, refreshInitialData]
  );

  const logout = useCallback(async () => {
    const userRole = user?.role;
    if (userRole === 'cashier' && (cashRegisterContext as any)?.isCashRegisterOpen) {
      (cashRegisterContext as any)?.resetCashRegister();
    }

    // Al cerrar sesión explícitamente, limpiar el carrito persistido del POS.
    try {
      if (typeof window !== 'undefined') sessionStorage.removeItem('pos-cart');
    } catch { /* noop */ }

    clearStoredSession();

    await logoutAction();
    setUser(null);
    navigate({ to: '/' as never });
  }, [navigate, user, cashRegisterContext]);

  // Timer en primer plano: verifica CADA MINUTO si ya pasaron las 8 horas de
  // sesión. Si es el caso, fuerza el cierre sin esperar una acción del usuario.
  // También se re-chequea al volver a la pestaña (visibilitychange), cubriendo
  // tablets/celulares que quedan en segundo plano.
  useEffect(() => {
    const checkExpiration = () => {
      if (isSessionExpired()) {
        forceSessionExpiry();
      }
    };

    // En el montaje, por si queda una sesión ya vencida.
    checkExpiration();

    const intervalId = window.setInterval(checkExpiration, 60_000);
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') checkExpiration();
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, []);

  // Si cualquier flujo dispara fuerza de expiración (401/403 del interceptor,
  // timer de 8h, etc.), resetear el usuario en memoria por si acaso no hay
  // recarga dura (p.ej. estando ya en una vista pública).
  useEffect(() => {
    const onExpired = () => {
      clearStoredSession();
      setUser(null);
      setAuthResolved(true);
    };
    window.addEventListener(SESSION_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, onExpired);
  }, []);

  const loading = initialLoading || !authResolved;

  const value = useMemo(
    () => ({ user, login, logout, loading }),
    [user, login, logout, loading]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// Hook separado — Vite Fast Refresh requiere que hooks y componentes estén
// en archivos separados o que el archivo exporte SOLO uno de los dos tipos.
// Al usar function declarations (no arrow fn asignada a const) esto se resuelve.
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth debe ser utilizado dentro de un AuthProvider");
  }
  return context;
}
