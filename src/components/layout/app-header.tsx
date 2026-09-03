"use client";

import { SidebarTrigger } from "@/components/ui/sidebar";
import { UserNav } from "@/components/layout/user-nav";
import { usePathname } from '@/lib/router-nav';
import { Button } from "@/components/ui/button";
import { Users, Clock } from "lucide-react";
import { useSettings } from "@/hooks/use-settings";
import { QuickSwitchModal } from "@/components/auth/quick-switch-modal";
import { useState } from "react";
import { NotificationsPopover } from "@/components/layout/notifications-popover";

const getPageTitle = (pathname: string) => {
  switch (pathname) {
    case '/dashboard': return 'Panel de Control';
    case '/pos': return 'Punto de Venta';
    case '/inventory': return 'Inventario';
    case '/kardex': return 'Kardex';
    case '/cash-management': return 'Gestión de Caja';
    case '/purchases': return 'Cuentas por Pagar';
    case '/purchases/new': return 'Registrar Compra';
    case '/suppliers': return 'Proveedores';
    case '/reports': return 'Informes';
    case '/users': return 'Usuarios';
    case '/settings': return 'Configuración';
    case '/cash-register/open': return 'Apertura de Caja';
    case '/cash-register/close': return 'Cierre de Caja';
    default: return '';
  }
}

export function AppHeader() {
  const pathname = usePathname();
  const title = getPageTitle(pathname);
  const { settings } = useSettings();
  const [showQuickSwitch, setShowQuickSwitch] = useState(false);

  // Estado de licencia Demo: deriva de licenseStatus === 'demo' y calcula los días restantes
  const isDemo = settings.licenseStatus === 'demo';
  const demoDaysRemaining = isDemo && settings.licenseExpirationDate
    ? Math.max(0, Math.floor((new Date(settings.licenseExpirationDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;

  return (
    <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-background/85 px-4 shadow-sm shadow-slate-200/40 backdrop-blur-md sm:px-6">
      <div className="md:hidden">
        <SidebarTrigger />
      </div>
      <div className="w-full flex-1">
        <h1 className="text-lg font-semibold text-foreground md:text-xl">{title}</h1>
      </div>

      {isDemo && (
        <span
          title={`Su licencia de prueba vence el ${settings.licenseExpirationDate ? new Date(settings.licenseExpirationDate).toLocaleDateString('es-ES') : 'N/A'}`}
          className="inline-flex items-center gap-1.5 rounded-full border border-amber-300/60 bg-amber-50 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-amber-700"
        >
          <Clock className="h-3.5 w-3.5" />
          Licencia Demo ({demoDaysRemaining} día{demoDaysRemaining !== 1 ? 's' : ''} restantes)
        </span>
      )}

      {settings.quickSwitchEnabled && (
        <>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setShowQuickSwitch(true)}
            title="Cambio Rápido de Usuario"
          >
            <Users className="h-5 w-5" />
          </Button>
          <QuickSwitchModal
            open={showQuickSwitch}
            onOpenChange={setShowQuickSwitch}
          />
        </>
      )}

      <NotificationsPopover />
      <UserNav />
    </header>
  );
}
