'use client';

import React from 'react';
import { Link } from '@tanstack/react-router';
import { usePathname } from '@/lib/router-nav';
import { FileText, PlusCircle, MapPin, Wallet, Menu } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { useBusinessMode } from '@/hooks/use-business-mode';
import { useAuth } from '@/hooks/use-auth';

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: string[];
}

const distributorNavItems: NavItem[] = [
  { href: '/orders', label: 'Pedidos', icon: FileText, roles: ['master-admin', 'admin', 'rutero'] },
  { href: '/orders/new', label: 'Nuevo', icon: PlusCircle, roles: ['master-admin', 'admin', 'rutero'] },
  { href: '/delivery-routes', label: 'Rutas', icon: MapPin, roles: ['master-admin', 'admin', 'rutero'] },
  { href: '/collections', label: 'Cobros', icon: Wallet, roles: ['master-admin', 'admin'] },
];

export function BottomNav({ onMenuClick }: { onMenuClick?: () => void }) {
  const pathname = usePathname();
  const isMobile = useIsMobile();
  const { mode } = useBusinessMode();
  const { user } = useAuth();

  if (!isMobile || mode !== 'DISTRIBUIDORA' || !user) return null;

  const accessibleItems = distributorNavItems.filter((item) =>
    item.roles.includes(user.role)
  );

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur-md safe-area-inset-bottom">
      <div className="flex items-center justify-around h-14 px-1">
        {accessibleItems.map((item) => {
          const isActive =
            item.href === '/orders/new'
              ? pathname === '/orders/new'
              : pathname.startsWith(item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                'flex flex-col items-center justify-center gap-0.5 w-full h-full text-[10px] font-medium transition-colors',
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Icon className={cn('h-5 w-5', isActive && 'text-primary')} />
              <span>{item.label}</span>
            </Link>
          );
        })}
        {onMenuClick && (
          <button
            onClick={onMenuClick}
            className="flex flex-col items-center justify-center gap-0.5 w-full h-full text-[10px] font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <Menu className="h-5 w-5" />
            <span>Menú</span>
          </button>
        )}
      </div>
    </nav>
  );
}
