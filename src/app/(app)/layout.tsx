'use client';

import { AuthProvider, useAuth } from '@/hooks/use-auth';
import { AppLayout } from '@/components/layout/app-layout';
import React, { useState, useEffect, createContext, useContext, useCallback, useMemo } from 'react';
import { usePathname } from '@/lib/router-nav';
import Loading from './loading';
import { CashRegisterProvider } from '@/hooks/use-cash-register';
import { cn } from '@/lib/utils';
import { SettingsProvider } from '@/hooks/use-settings';
import { CashRegisterSessionProvider } from '@/hooks/use-cash-register-sessions';
import { PendingSalesProvider } from '@/hooks/use-pending-sales';
import { BusinessModeProvider } from '@/hooks/use-business-mode';
import { InitialDataProvider } from '@/hooks/use-initial-data';
import { ErrorBoundary } from '@/components/error-boundary';

export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ErrorBoundary>
      <InitialDataProvider>
        <AuthProvider>
          <SettingsProvider>
            <BusinessModeProvider>
              <CashRegisterSessionProvider>
                <PendingSalesProvider>
                  <CashRegisterProvider>
                    <AuthenticatedLayoutContent>
                      {children}
                    </AuthenticatedLayoutContent>
                  </CashRegisterProvider>
                </PendingSalesProvider>
              </CashRegisterSessionProvider>
            </BusinessModeProvider>
          </SettingsProvider>
        </AuthProvider>
      </InitialDataProvider>
    </ErrorBoundary>
  );
}

import { MasterKeyGuard } from '@/components/auth/master-key-guard';
import { LicenseGuard } from '@/components/auth/license-guard';
import { InvoiceAlerts } from '@/components/purchases/invoice-alerts';

function AuthenticatedLayoutContent({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const isPOS = pathname === '/pos';

  if (loading || !user) {
    return (
      <div className="flex h-screen items-center justify-center bg-muted">
        <div className="flex items-center space-x-2">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <span className="text-lg font-medium text-muted-foreground">Cargando...</span>
        </div>
      </div>
    );
  }

  return (
    <LicenseGuard>
      <MasterKeyGuard>
        <AppLayout
          className={cn(isPOS && 'bg-muted p-0 sm:p-0')}
        >
          <InvoiceAlerts />
          {children}
        </AppLayout>
      </MasterKeyGuard>
    </LicenseGuard>
  );
}
