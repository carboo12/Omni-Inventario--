'use client';

import { useEffect } from 'react';
import { usePathname } from '@/lib/router-nav';

export function PWARegistration() {
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator)) return;
    if (process.env.NODE_ENV === 'development') return;

    navigator.serviceWorker.ready.then(() => {
      if (pathname) {
        const scrollRestoration = window.history.scrollRestoration;
        if (scrollRestoration === 'manual') return;
      }
    }).catch(() => {});

    const onNeedRefresh = () => {
      if (window.confirm('Hay una nueva versión disponible. Desea actualizar?')) {
        window.location.reload();
      }
    };

    window.addEventListener('serwistinstalled', () => {
      console.log('[PWA] Service Worker installed');
    });

    window.addEventListener('serwistwaiting', onNeedRefresh);

    return () => {
      window.removeEventListener('serwistwaiting', onNeedRefresh);
    };
  }, [pathname]);

  return null;
}
