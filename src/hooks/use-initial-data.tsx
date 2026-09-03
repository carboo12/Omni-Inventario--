"use client";

/**
 * InitialDataProvider — el corazón del arranque rápido.
 *
 * Ejecuta UNA SOLA llamada a la DB (getInitialAppData) que carga en paralelo:
 *  - Datos del usuario autenticado
 *  - Settings del sistema
 *  - Business mode (PHARMACY / JEWELRY / etc)
 *  - Sesiones de caja
 *
 * Luego cada provider individual (useAuth, useSettings, etc.) accede a este
 * caché de datos pre-cargados en lugar de hacer su propia llamada a la DB.
 */

import React, { createContext, useContext, useState, useEffect, useMemo } from "react";
import { getInitialAppData, InitialAppData } from "@/lib/actions/init-data";

interface InitialDataContextType {
  data: InitialAppData | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1500;

const InitialDataContext = createContext<InitialDataContextType>({
  data: null,
  loading: false,
  error: null,
  refresh: async () => {},
});

export const InitialDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [data, setData] = useState<InitialAppData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async (attempt = 0) => {
    setLoading(true);
    setError(null);
    try {
      const result = await getInitialAppData();
      setData(result);
    } catch (err) {
      console.error("Error loading initial app data:", err);
      if (attempt < MAX_RETRIES) {
        // Retry with backoff
        await new Promise(r => setTimeout(r, RETRY_DELAY_MS * (attempt + 1)));
        return load(attempt + 1);
      }
      setError("Error al conectar con la base de datos.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const refresh = async () => {
    await load();
  };

  const value = useMemo(() => ({ data, loading, error, refresh }), [data, loading, error]);

  return (
    <InitialDataContext.Provider value={value}>
      {children}
    </InitialDataContext.Provider>
  );
};

/**
 * LoginInitialDataProvider — proveedor no-op para la página de login.
 * Resuelve inmediatamente con data=null, loading=false.
 * Esto permite que AuthProvider funcione en el contexto del login
 * sin hacer ninguna llamada a la DB (el usuario aún no está autenticado).
 */
const loginDefaultValue: InitialDataContextType = { 
  data: null, 
  loading: false, 
  error: null,
  refresh: async () => {} 
};

export const LoginInitialDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <InitialDataContext.Provider value={loginDefaultValue}>
    {children}
  </InitialDataContext.Provider>
);

export const useInitialData = () => useContext(InitialDataContext);
