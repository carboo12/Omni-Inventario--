// Módulo de navegación para la migración de Next.js -> Vite + TanStack Router.
// Sustituye imports de `next/navigation` y `next/link` por implementaciones
// respaldadas por TanStack Router (SPA, sin recarga completa).

import {
  Link as TanStackLink,
  useNavigate,
  useRouter as useTanStackRouter,
  useRouterState,
  useLocation,
  useSearch as useTanStackSearch,
} from '@tanstack/react-router';
import { createElement, useMemo } from 'react';
import { useRouteParams } from '@/lib/route-match';

/** Compatibilidad con useRouter() de next/navigation. */
export function useRouter() {
  const navigate = useNavigate();
  const router = useTanStackRouter();
  return useMemo(() => ({
    push: (href: string, opts?: { scroll?: boolean }) =>
      navigate({ to: href as never, ...opts }),
    replace: (href: string, opts?: { scroll?: boolean }) =>
      navigate({ to: href as never, replace: true, ...opts }),
    refresh: () => window.location.reload(),
    back: () => navigate({ to: '../' as never }),
    forward: () => navigate({ to: '../' as never }),
    prefetch: (href: string) => {
      try { router.preloadRoute({ to: href as never }); } catch { /* noop */ }
    },
  }), [navigate, router]);
}

/** usePathname: ruta actual sin query. */
export function usePathname() {
  const state = useRouterState();
  return state.location.pathname;
}

/** useSearchParams: búsqueda de la URL (URLSearchParams-like). */
export function useSearchParams() {
  const location = useLocation();
  return useMemo(() => new URLSearchParams(location.searchStr), [location.searchStr]);
}

/** useParams: parámetros de ruta dinámicos (provienen del route-match del catch-all). */
export function useParams(): Record<string, string> {
  return useRouteParams();
}

/** redirect: en un SPA navegamos y lanzamos error para abortar el render. */
export function redirect(href: string): never {
  if (typeof window !== 'undefined') {
    window.history.replaceState(null, '', href);
    window.dispatchEvent(new PopStateEvent('popstate'));
  }
  throw new Error(`__REDIRECT__${href}`);
}

/** notFound: similar a redirect a 404. */
export function notFound(): never {
  if (typeof window !== 'undefined') {
    window.history.replaceState(null, '', '/404');
    window.dispatchEvent(new PopStateEvent('popstate'));
  }
  throw new Error('__NOT_FOUND__');
}

/** Link: componente declarativo respaldado por TanStack Router (SPA).
 *  Acepta `to` (estilo TanStack) u `href` (estilo next/link) indistintamente. */
type LinkProps = {
  to?: string;
  href?: string;
  prefetch?: boolean;
  passHref?: boolean;
  legacyBehavior?: boolean;
  replace?: boolean;
  scroll?: boolean;
  shallow?: boolean;
  locale?: string;
  children?: React.ReactNode;
} & Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'href'>;

export function Link({ to, href, prefetch, passHref, legacyBehavior, replace, scroll, shallow, locale, children, ...rest }: LinkProps) {
  const target = to ?? href;
  return createElement(TanStackLink, { to: target as never, replace, ...rest }, children);
}

// Re-export de hooks de TanStack Router para uso directo cuando se requiera.
export { useNavigate, useRouterState, useLocation, useTanStackSearch as useSearch };

export default Link;