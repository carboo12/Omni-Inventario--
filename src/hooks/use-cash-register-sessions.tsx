"use client";

import React, { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react';
import type { CashRegisterSession } from '@/lib/types';
import { getSessions, openSession, closeSession, addSaleToSessionDB, CashRegisterSessionData } from '@/lib/actions/cash-register';
import { useToast } from '@/hooks/use-toast';
import { useInitialData } from './use-initial-data';

interface CashRegisterSessionContextType {
  sessions: CashRegisterSession[];
  setSessions: React.Dispatch<React.SetStateAction<CashRegisterSession[]>>;
  addSession: (session: CashRegisterSession) => Promise<void>;
  updateSession: (session: CashRegisterSession) => Promise<void>;
  addSaleToSession: (sessionId: string, saleAmount: number) => Promise<void>;
  refreshSessions: () => Promise<void>;
}

const CashRegisterSessionContext = createContext<CashRegisterSessionContextType | undefined>(undefined);

export const CashRegisterSessionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { data: initialData, loading: initialLoading, refresh: refreshInitialData } = useInitialData();
  const [sessions, setSessions] = useState<CashRegisterSession[]>([]);
  const [sessionsLoaded, setSessionsLoaded] = useState(false);
  const { toast } = useToast();

  // Hydrate sessions from pre-loaded data — NO extra DB call
  useEffect(() => {
    if (initialLoading) return;
    if (initialData?.sessions) {
      setSessions(initialData.sessions as unknown as CashRegisterSession[]);
    }
    setSessionsLoaded(true);
  }, [initialData, initialLoading]);

  const addSession = useCallback(async (session: CashRegisterSession) => {
    try {
      const newSession = await openSession(session.cashierId, session.cashierName, session.initialAmount, session.initialAmountUSD);
      setSessions(prev => [newSession as unknown as CashRegisterSession, ...prev]);
      // Refresh global state
      refreshInitialData();
      toast({ title: "Caja Abierta", description: "La sesión de caja se ha iniciado correctamente." });
    } catch (error) {
      console.error("Error opening session:", error);
      toast({ title: "Error", description: "No se pudo abrir la caja.", variant: "destructive" });
    }
  }, [toast, refreshInitialData]);

  const updateSession = useCallback(async (updatedSession: CashRegisterSession) => {
    try {
      if (updatedSession.status === 'closed') {
        await closeSession(
          updatedSession.id,
          updatedSession.finalAmount || 0,
          updatedSession.actualCash || 0,
          updatedSession.actualUSD || 0
        );
        setSessions(prev => prev.map(s => s.id === updatedSession.id ? { ...updatedSession, status: 'closed' } : s));
        // Refresh global state to remove alerts
        refreshInitialData();
        // Toast is handled by the calling page (close/page.tsx) for better UX
      }
    } catch (error) {
      console.error("Error closing session:", error);
      throw error; // Re-throw so the calling page can handle the error
    }
  }, [refreshInitialData]);

  const addSaleToSession = useCallback(async (sessionId: string, saleAmount: number) => {
    try {
      await addSaleToSessionDB(sessionId, saleAmount);
      setSessions(prev => prev.map(s => {
        if (s.id === sessionId) {
          return {
            ...s,
            totalSales: (s.totalSales || 0) + saleAmount,
          };
        }
        return s;
      }));
    } catch (error) {
      console.error("Error adding sale to session:", error);
    }
  }, []);

  const refreshSessions = useCallback(async () => {
    try {
      const data = await getSessions();
      setSessions(data as unknown as CashRegisterSession[]);
    } catch (error) {
      console.error("Error refreshing sessions:", error);
    }
  }, []);

  const value = useMemo(
    () => ({ sessions, setSessions, addSession, updateSession, addSaleToSession, refreshSessions }),
    [sessions, addSession, updateSession, addSaleToSession, refreshSessions]
  );

  return (
    <CashRegisterSessionContext.Provider value={value}>
      {children}
    </CashRegisterSessionContext.Provider>
  );
};

export const useCashRegisterSessions = () => {
  const context = useContext(CashRegisterSessionContext);
  if (context === undefined) {
    throw new Error("useCashRegisterSessions must be used within a CashRegisterSessionProvider");
  }
  return context;
};
