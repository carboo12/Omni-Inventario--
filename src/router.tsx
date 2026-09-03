import { createRootRoute, createRoute, createRouter, Outlet } from '@tanstack/react-router';
import { createElement, useEffect } from 'react';

// Layout raíz: providers globales + montaje de página.
import { QueryProvider } from '@/components/providers/query-provider';
import { Toaster } from '@/components/ui/toaster';
import { PWARegistration } from '@/components/layout/pwa-registration';
import { ActivationGuard } from '@/components/activation/activation-guard';
import { InitialDataProvider } from '@/hooks/use-initial-data';
import { AuthProvider, useAuth } from '@/hooks/use-auth';
import { SettingsProvider } from '@/hooks/use-settings';
import { BusinessModeProvider } from '@/hooks/use-business-mode';
import { CashRegisterSessionProvider } from '@/hooks/use-cash-register-sessions';
import { PendingSalesProvider } from '@/hooks/use-pending-sales';
import { CashRegisterProvider } from '@/hooks/use-cash-register';
import { MasterKeyGuard } from '@/components/auth/master-key-guard';
import { LicenseGuard } from '@/components/auth/license-guard';
import { InvoiceAlerts } from '@/components/purchases/invoice-alerts';
import { AppLayout } from '@/components/layout/app-layout';
import { useRouterState, useNavigate } from '@tanstack/react-router';
import { canAccessRoute, DISPATCHER_HOME } from '@/lib/rbac';

// Registro de páginas: path -> componente. Se puebla en src/pages-registry.tsx.
import { matchPage } from '@/lib/route-match';

function useMatchedPage() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return matchPage(pathname);
}

function PageRenderer() {
  const { Component, requiresAuth } = useMatchedPage();
  const { user } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  // RBAC: si el rol no puede acceder a la ruta, reorientar al home del rol.
  if (user && requiresAuth && !canAccessRoute(user.role, pathname)) {
    const home = user.role === 'dispatcher' ? DISPATCHER_HOME : '/dashboard';
    if (pathname !== home) {
      return <RedirectTo to={home} />;
    }
  }

  const content = requiresAuth ? (
    <LicenseGuard>
      <MasterKeyGuard>
        <AppLayout>
          <InvoiceAlerts />
          <Component />
        </AppLayout>
      </MasterKeyGuard>
    </LicenseGuard>
  ) : (
    <Component />
  );

  return content;
}

function RedirectTo({ to }: { to: string }) {
  const navigate = useNavigate();
  useEffect(() => {
    navigate({ to: to as never, replace: true });
  }, [navigate, to]);
  return null;
}

const rootRoute = createRootRoute({
  component: () => (
    <QueryProvider>
      <InitialDataProvider>
        <AuthProvider>
          <PWARegistration />
          <ActivationGuard>
            <SettingsProvider>
              <BusinessModeProvider>
                <CashRegisterSessionProvider>
                  <PendingSalesProvider>
                    <CashRegisterProvider>
                      {/* Outlet renderiza la ruta hija (catch-all) sin desmontar este layout. */}
                      <Outlet />
                    </CashRegisterProvider>
                  </PendingSalesProvider>
                </CashRegisterSessionProvider>
              </BusinessModeProvider>
            </SettingsProvider>
          </ActivationGuard>
          <Toaster />
        </AuthProvider>
      </InitialDataProvider>
    </QueryProvider>
  ),
});

// Catch-all: una sola ruta que resuelve la página según el pathname.
const catchAllRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '$',
  component: () => <PageRenderer />,
});

export const routeTree = rootRoute.addChildren([catchAllRoute]);

export const router = createRouter({ routeTree: routeTree as any, defaultPreload: false });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}