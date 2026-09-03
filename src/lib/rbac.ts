import type { UserRole } from '@/lib/types';

// Rutas a las que un Despachador NO debe acceder. Cualquier pathname que
// empiece con uno de estos prefijos será reorientado a /pos.
export const DISPATCHER_RESTRICTED_PREFIXES = [
  '/dashboard',
  '/users',
  '/settings',
  '/reports',
  '/kardex',
  '/cash-count',
  '/customers/credit',
  '/cash-management',
  '/purchases',
  '/suppliers',
  '/inventory',
  '/categories',
  '/jewelry',
];

export const DISPATCHER_HOME = '/pos';

/** Indica si el rol actual puede acceder al pathname dado. */
export function canAccessRoute(role: UserRole | undefined, pathname: string): boolean {
  if (!role) return true;

  if (role === 'dispatcher') {
    // El despachador solo accede a su flujo de toma de pedidos y áreas permitidas.
    if (pathname === DISPATCHER_HOME) return true;
    if (pathname.startsWith('/orders') || pathname.startsWith('/delivery-routes') || pathname.startsWith('/collections')) {
      return true;
    }
    return !DISPATCHER_RESTRICTED_PREFIXES.some((p) => pathname.startsWith(p));
  }

  return true;
}