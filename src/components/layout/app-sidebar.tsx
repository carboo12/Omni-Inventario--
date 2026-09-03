
"use client";

import React, { useCallback, useEffect, useMemo } from 'react';

import { useAuth } from "@/hooks/use-auth";
import {
  Boxes,
  LayoutDashboard,
  LineChart,
  LogOut,
  Settings,
  ShoppingCart,
  Users,
  History,
  Truck,
  FileText,
  Wallet,
  FolderTree,
  Coins,
  Hammer,
  Landmark,
  MapPin,
  ClipboardList,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Logo } from "@/components/icons/logo";
import type { NavItem } from "@/lib/types";
import { Link } from '@tanstack/react-router';
import { usePathname, useRouter } from '@/lib/router-nav';
import { useCashRegister } from "@/hooks/use-cash-register";
import { useToast } from "@/hooks/use-toast";
import { useSettings } from "@/hooks/use-settings";
import { useBusinessMode } from "@/hooks/use-business-mode";
import { Gem } from "lucide-react";

const navItems: NavItem[] = [
  { href: "/dashboard", label: "Panel", icon: LayoutDashboard, roles: ["master-admin", "admin", "cashier", "rutero"] },
  { href: "/pos", label: "Punto de Venta", icon: ShoppingCart, roles: ["master-admin", "admin", "cashier", "dispatcher"] },
  { href: "/cash-count", label: "Cuadre de Caja", icon: Coins, roles: ["master-admin", "admin", "cashier"] },
  { href: "/inventory", label: "Inventario", icon: Boxes, roles: ["master-admin", "admin"] },
  { href: "/categories", label: "Categorías", icon: FolderTree, roles: ["master-admin", "admin"] },
  { href: "/kardex", label: "Kardex", icon: History, roles: ["master-admin", "admin"] },
  { href: "/cash-management", label: "Gestión de Caja", icon: Wallet, roles: ["master-admin", "admin"] },
  { href: "/customers", label: "Clientes", icon: Users, roles: ["master-admin", "admin", "rutero"] },
  { href: "/customers/credit", label: "Cuentas por Cobrar", icon: Landmark, roles: ["master-admin", "admin"] },
  { href: "/purchases", label: "Compras", icon: FileText, roles: ["master-admin", "admin"] },
  { href: "/suppliers", label: "Proveedores", icon: Truck, roles: ["master-admin", "admin"] },
  { href: "/reports", label: "Informes", icon: LineChart, roles: ["master-admin", "admin"] },
  { href: "/users", label: "Usuarios", icon: Users, roles: ["master-admin", "admin"] },
  { href: "/settings", label: "Configuración", icon: Settings, roles: ["master-admin", "admin"] },
];

export function AppSidebar({ collapsible }: { collapsible?: React.ComponentProps<typeof Sidebar>['collapsible'] }) {
  const { user, logout } = useAuth();
  const { isCashRegisterOpen } = useCashRegister();
  const { mode } = useBusinessMode();
  const { toast } = useToast();
  const pathname = usePathname();
  const router = useRouter();

  const accessibleNavItems = useMemo(() => {
    if (!user) return [];

    // 1. Start with the base items
    let items = [...navItems];

    // 2. Filter by user role first to have a clean starting point
    items = items.filter(item => item.roles.includes(user.role));

    // 3. Handle Jewelry Mode specifically
    if (mode === 'JEWELRY') {
      // Remove pharmacy-specific modules
      const pharmacyHrefs = ['/pos', '/inventory', '/categories', '/purchases', '/cash-management', '/suppliers'];
      items = items.filter(item => !pharmacyHrefs.includes(item.href));

      // Create jewelry items
      const jewelryItems: NavItem[] = [
        { href: "/jewelry/gold-purchase", label: "Compra de Oro", icon: Gem, roles: ["master-admin", "admin", "cashier"] },
        { href: "/jewelry/production", label: "Producción", icon: Hammer, roles: ["master-admin", "admin"] },
        { href: "/jewelry/inventory", label: "Inventario Joyería", icon: Landmark, roles: ["master-admin", "admin", "cashier"] },
        { href: "/jewelry/sales", label: "Ventas Joyería", icon: ShoppingCart, roles: ["master-admin", "admin", "cashier"] },
        { href: "/jewelry/daily-closing", label: "Cierre de Día", icon: Coins, roles: ["master-admin", "admin"] },
        { href: "/jewelry/sync", label: "Sincronización CSV", icon: FileText, roles: ["master-admin", "admin", "cashier"] },
      ];

      // Filter jewelry items by role
      const accessibleJewelry = jewelryItems.filter(item => item.roles.includes(user.role));

      // Insert them after "Panel" (assumed to be the first item)
      const dashboardIndex = items.findIndex(i => i.href === '/dashboard');
      if (dashboardIndex !== -1) {
        items.splice(dashboardIndex + 1, 0, ...accessibleJewelry);
      } else {
        items = [...accessibleJewelry, ...items];
      }
    }

    // 4. Handle Distribuidora Mode specifically
    if (mode === 'DISTRIBUIDORA') {
      // Remove items not relevant for a distribution company
      const distribuidoraHrefs = ['/cash-management'];
      items = items.filter(item => !distribuidoraHrefs.includes(item.href));

      const distribucionItems: NavItem[] = [
        { href: "/orders", label: "Pedidos", icon: FileText, roles: ["master-admin", "admin", "rutero"] },
        { href: "/delivery-routes", label: "Rutas de Reparto", icon: MapPin, roles: ["master-admin", "admin", "rutero"] },
        { href: "/collections", label: "Cobros", icon: Wallet, roles: ["master-admin", "admin"] },
      ];

      const accessibleDistribucion = distribucionItems.filter(item => item.roles.includes(user.role));

      const dashboardIndex = items.findIndex(i => i.href === '/dashboard');
      if (dashboardIndex !== -1) {
        items.splice(dashboardIndex + 1, 0, ...accessibleDistribucion);
      }
    }

    return items;
  }, [mode, user]);

  const prefetchRoute = useCallback((href: string) => {
    router.prefetch(href);
  }, [router]);

  useEffect(() => {
    const routes = accessibleNavItems.map(item => item.href);
    const prefetchRoutes = () => routes.forEach(prefetchRoute);
    const browserWindow = window as Window & typeof globalThis & {
      requestIdleCallback?: (callback: IdleRequestCallback, options?: IdleRequestOptions) => number;
      cancelIdleCallback?: (handle: number) => void;
    };

    if (browserWindow.requestIdleCallback && browserWindow.cancelIdleCallback) {
      const idleId = browserWindow.requestIdleCallback(prefetchRoutes, { timeout: 2000 });
      return () => browserWindow.cancelIdleCallback?.(idleId);
    }

    const timeoutId = browserWindow.setTimeout(prefetchRoutes, 250);
    return () => browserWindow.clearTimeout(timeoutId);
  }, [accessibleNavItems, prefetchRoute]);

  const handleNavigate = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    if (!user) return;

    if (user.role === 'cashier' && href === '/pos' && !isCashRegisterOpen) {
      e.preventDefault();
      toast({
        title: 'Acción Requerida',
        description: 'Debe abrir la caja para poder realizar ventas.',
        variant: 'destructive',
      });
      if (pathname !== '/cash-register/open') {
        router.push('/cash-register/open');
      }
      return;
    }
    // Let Next.js handle the navigation normally via Link href
  };

  const handleLogoNavigate = (e: React.MouseEvent<HTMLAnchorElement>) => {
    // Normal link behavior
  }

  if (!user) return null;

  const homeHref = user.role === 'dispatcher' ? '/pos' : '/dashboard';

  return (
    <Sidebar className="border-r bg-sidebar/95" collapsible={collapsible} variant="sidebar">
      <SidebarHeader className="border-b p-4">
        <Link
          to={homeHref}
          className="flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-sidebar-accent"
          onClick={handleLogoNavigate}
          onMouseEnter={() => prefetchRoute(homeHref)}
          onFocus={() => prefetchRoute(homeHref)}
        >
          <Logo className="w-8 h-8 text-primary" />
          <span className="font-headline text-2xl font-semibold text-primary">
            Omni Inventario +
          </span>
        </Link>
      </SidebarHeader>

      <SidebarContent className="p-3">
        <SidebarMenu>
          {accessibleNavItems.map((item) => (
            <SidebarMenuItem key={item.href}>
              <Link
                to={item.href}
                onClick={(e) => handleNavigate(e, item.href)}
                onMouseEnter={() => prefetchRoute(item.href)}
                onFocus={() => prefetchRoute(item.href)}
              >
                <SidebarMenuButton
                  isActive={pathname.startsWith(item.href) && item.href !== '/'}
                  className="w-full justify-start rounded-lg"
                  asChild
                >
                  <div>
                    <item.icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </div>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>

      <SidebarFooter className="border-t p-3">
        <div className="flex items-center gap-3 rounded-lg bg-sidebar-accent/60 p-2">
          <div className="flex flex-col">
            <span className="font-semibold text-sm">{user.name}</span>
            <span className="text-xs text-muted-foreground capitalize">{user.role.replace('-', ' ')}</span>
          </div>
          <Button variant="ghost" size="icon" className="ml-auto" onClick={logout}>
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
