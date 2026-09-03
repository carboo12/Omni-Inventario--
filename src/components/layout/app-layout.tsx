
"use client";

import * as React from "react";
import { useRouter, usePathname } from '@/lib/router-nav';
import { SidebarProvider, useSidebar } from "@/components/ui/sidebar";
import { AppSidebar } from "./app-sidebar";
import { AppHeader } from "./app-header";
import { useAuth } from "@/hooks/use-auth";
import { useInitialData } from "@/hooks/use-initial-data";
import { CashRegisterAlert } from "./cash-register-alert";
import { BottomNav } from "./bottom-nav";
import { SessionErrorState } from "./session-error-state";
import { cn } from "@/lib/utils";

function AppLayoutInner({ children, className }: { children: React.ReactNode, className?: string }) {
  const { user, loading } = useAuth();
  const { error: initialError } = useInitialData();
  const router = useRouter();
  const pathname = usePathname();
  const isPOS = pathname === '/pos' || pathname.startsWith('/pos/');
  const { isMobile, setOpenMobile } = useSidebar();

  React.useEffect(() => {
    if (!loading && !user) {
      router.push('/');
    }
  }, [user, loading, router]);

  // Si la carga inicial falló por red/sesión y aún no hay usuario, mostrar un
  // estado claro en lugar de una pantalla en blanco o un redirect sin mensaje.
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="flex items-center space-x-2">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <span>Cargando...</span>
        </div>
      </div>
    );
  }

  if (initialError && !user) {
    return (
      <div className="flex h-screen items-center justify-center bg-background p-4">
        <SessionErrorState className="max-w-md" offline />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="flex items-center space-x-2">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <span>Cargando...</span>
        </div>
      </div>
    );
  }
  
  const collapsibleMode = isPOS ? 'offcanvas' : 'icon';

  return (
    <div className="flex h-[100dvh] overflow-hidden">
      <AppSidebar collapsible={collapsibleMode} />
      <div className="flex min-w-0 flex-1 flex-col">
         {!isPOS && <AppHeader />}
        <main className={cn(
          "flex-1",
          isPOS
            ? "w-full overflow-hidden p-0"
            : "overflow-y-auto p-2 pb-20 md:p-4 md:pb-8 lg:p-8"
        )}>
          <div className={cn(isPOS ? "h-full w-full" : "page-shell", isPOS && "overflow-hidden")}>
            {children}
          </div>
        </main>
        {isMobile && (
          <BottomNav onMenuClick={() => setOpenMobile(true)} />
        )}
      </div>
      <CashRegisterAlert />
    </div>
  );
}

export function AppLayout({ children, className }: { children: React.ReactNode, className?: string }) {
  const pathname = usePathname();
  const isPOS = pathname === '/pos' || pathname.startsWith('/pos/');
  // En el POS el sidebar inicia colapsado/oculto (offcanvas) para no desplazar
  // ni aplastar el layout del punto de venta.
  return (
    <SidebarProvider defaultOpen={!isPOS}>
      <AppLayoutInner children={children} className={className} />
    </SidebarProvider>
  );
}
