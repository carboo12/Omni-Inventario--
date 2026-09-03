

"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import { useCashRegisterSessions } from "./use-cash-register-sessions";
import { useAuth } from "./use-auth";
import type { CashRegisterSession } from "@/lib/types";

interface CashRegisterContextType {
  isCashRegisterOpen: boolean;
  activeSession: CashRegisterSession | null;
  openCashRegister: (amount: number, amountUSD?: number) => void;
  closeCashRegister: (finalAmount: number) => void;
  updateSession: (session: CashRegisterSession) => Promise<void>;
  refreshSessions: () => Promise<void>;
  resetCashRegister: () => void; // For logout while session open
}

const CashRegisterContext = createContext<CashRegisterContextType | undefined>(undefined);


export const CashRegisterProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const { sessions, addSession, updateSession, refreshSessions } = useCashRegisterSessions();

  const activeSession = useMemo(() => {
    if (!user) return null;

    // First, try to find a session owned by the current user
    const personalSession = sessions.find(s => s.cashierId === user.id && s.status === 'open');
    if (personalSession) return personalSession;

    // For admin / master-admin: if no personal session, find any open session to associate sales with or view
    if (user.role === 'admin' || user.role === 'master-admin') {
      return sessions.find(s => s.status === 'open') || null;
    }

    return null;
  }, [sessions, user]);


  const isCashRegisterOpen = !!activeSession;

  const openCashRegister = useCallback((amount: number, amountUSD: number = 0) => {
    if (!user) return;

    // Allow cashier, admin, and master-admin to open a session
    const allowedRoles = ['cashier', 'admin', 'master-admin'];
    if (!allowedRoles.includes(user.role)) return;

    addSession({
      id: `CRS${Date.now()}`,
      cashierId: user.id,
      cashierName: user.name,
      openingTime: new Date().toISOString(),
      initialAmount: amount,
      initialAmountUSD: amountUSD,
      status: 'open',
      totalSales: 0,
    });
  }, [user, addSession]);

  const closeCashRegister = useCallback((finalAmount: number) => {
    if (activeSession) {
      updateSession({
        ...activeSession,
        status: 'closed',
        closingTime: new Date().toISOString(),
        finalAmount: finalAmount,
      });
    }
  }, [activeSession, updateSession]);

  const resetCashRegister = useCallback(() => {
    if (activeSession) {
      // This is a failsafe for logout, it closes the register without a final count.
      // In a real app, you might want to handle this differently (e.g., prevent logout).
      updateSession({
        ...activeSession,
        status: 'closed',
        closingTime: new Date().toISOString(),
        finalAmount: activeSession.totalSales ? activeSession.initialAmount + activeSession.totalSales : activeSession.initialAmount, // Best guess
      });
    }
  }, [activeSession, updateSession]);

  const value = useMemo(
    () => ({
      isCashRegisterOpen,
      activeSession,
      openCashRegister,
      closeCashRegister,
      updateSession,
      refreshSessions,
      resetCashRegister,
    }),
    [
      isCashRegisterOpen,
      activeSession,
      openCashRegister,
      closeCashRegister,
      updateSession,
      refreshSessions,
      resetCashRegister,
    ]
  );

  return (
    <CashRegisterContext.Provider value={value}>
      {children}
    </CashRegisterContext.Provider>
  );
};

export const useCashRegister = () => {
  const context = useContext(CashRegisterContext);
  if (context === undefined) {
    throw new Error("useCashRegister must be used within a CashRegisterProvider");
  }
  return context;
};

// Expose the context for use in other providers
(useCashRegister as any).Context = CashRegisterContext;
