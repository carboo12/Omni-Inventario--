import { publicPages, authenticatedPages, pageNotFound } from '@/pages-registry';
import type { PageEntry } from '@/pages-registry';

// Almacén del match actual. matchPage() lo rellena durante el render para que
// los wrappers de página puedan leer los parámetros de ruta dinámicos ([id]).
export const routeMatchStore: { pattern: string | null; params: Record<string, string> } = {
  pattern: null,
  params: {},
};

export function useRouteParams(): Record<string, string> {
  return routeMatchStore.params;
}

const allRouteKeys = [...Object.keys(publicPages), ...Object.keys(authenticatedPages)];

function compileDynamic(pattern: string): RegExp | null {
  const re = pattern.replace(/\[([^\]]+)\]/g, '(?<$1>[^/]+)');
  try {
    return new RegExp(`^${re}$`);
  } catch {
    return null;
  }
}

export function matchPage(pathname: string): PageEntry {
  if (publicPages[pathname]) {
    routeMatchStore.pattern = pathname;
    routeMatchStore.params = {};
    return publicPages[pathname];
  }
  if (authenticatedPages[pathname]) {
    routeMatchStore.pattern = pathname;
    routeMatchStore.params = {};
    return authenticatedPages[pathname];
  }
  for (const key of allRouteKeys) {
    if (!key.includes('[')) continue;
    const re = compileDynamic(key);
    if (!re) continue;
    const m = re.exec(pathname);
    if (m) {
      routeMatchStore.pattern = key;
      routeMatchStore.params = (m.groups ?? {}) as Record<string, string>;
      return (publicPages[key] ?? authenticatedPages[key])!;
    }
  }
  routeMatchStore.pattern = null;
  routeMatchStore.params = {};
  return pageNotFound;
}