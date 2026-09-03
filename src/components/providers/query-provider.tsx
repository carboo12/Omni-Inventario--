"use client";

import React, { useState, useEffect } from "react";
import { QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import {
  installSessionInterceptor,
  SESSION_EXPIRED_EVENT,
} from "@/lib/session-expiry";

const CACHE_KEY = "joyeriaplus-rq-cache-v1";
const CACHE_BUSTER = "v1";
const MAX_AGE = 1000 * 60 * 60 * 24; // 24h

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60_000,
        gcTime: MAX_AGE,
        retry: 1,
        refetchOnWindowFocus: false,
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined;

function getQueryClient() {
  if (typeof window === "undefined") {
    return makeQueryClient();
  }
  if (!browserQueryClient) {
    browserQueryClient = makeQueryClient();
  }
  return browserQueryClient;
}

const safeStorage = {
  getItem: (key: string): Promise<string | null> => {
    if (typeof window === "undefined") return Promise.resolve(null);
    try {
      return Promise.resolve(window.localStorage.getItem(key));
    } catch {
      return Promise.resolve(null);
    }
  },
  setItem: (key: string, value: string): Promise<void> => {
    if (typeof window === "undefined") return Promise.resolve();
    try {
      window.localStorage.setItem(key, value);
    } catch {}
    return Promise.resolve();
  },
  removeItem: (key: string): Promise<void> => {
    if (typeof window === "undefined") return Promise.resolve();
    try {
      window.localStorage.removeItem(key);
    } catch {}
    return Promise.resolve();
  },
};

const persister = createAsyncStoragePersister({
  storage: safeStorage,
  key: CACHE_KEY,
  throttleTime: 2_000,
});

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(getQueryClient);

  // Instala el interceptor HTTP global (401/403 -> logout) y limpia la caché
  // en memoria cuando la sesión expira, para evitar "estado zombi" tras re-login.
  useEffect(() => {
    installSessionInterceptor();
    const onExpired = () => queryClient.clear();
    window.addEventListener(SESSION_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, onExpired);
  }, [queryClient]);

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister,
        maxAge: MAX_AGE,
        buster: CACHE_BUSTER,
      }}
    >
      {children}
    </PersistQueryClientProvider>
  );
}
