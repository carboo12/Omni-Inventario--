"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import { BusinessMode } from "@prisma/client";
import { updateBusinessMode as updateModeAction } from "@/lib/actions/app-settings";
import { useInitialData } from "./use-initial-data";

interface BusinessModeContextType {
    mode: BusinessMode;
    setMode: (mode: BusinessMode) => Promise<void>;
    loading: boolean;
}

const BusinessModeContext = createContext<BusinessModeContextType | undefined>(undefined);

export const BusinessModeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { data: initialData, loading: initialLoading } = useInitialData();
    const [mode, setModeState] = useState<BusinessMode>("PHARMACY");
    const [modeLoaded, setModeLoaded] = useState(false);
    const [updating, setUpdating] = useState(false);

    // Hydrate from pre-loaded data — NO extra DB call
    useEffect(() => {
        if (initialLoading) return;
        if (initialData?.businessMode) {
            setModeState(initialData.businessMode);
        }
        setModeLoaded(true);
    }, [initialData, initialLoading]);

    const setMode = useCallback(async (newMode: BusinessMode) => {
        try {
            setUpdating(true);
            const updated = await updateModeAction(newMode);
            setModeState(updated);
        } catch (e) {
            console.error(e);
        } finally {
            setUpdating(false);
        }
    }, []);

    const loading = initialLoading || !modeLoaded || updating;

    const value = useMemo(
        () => ({ mode, setMode, loading }),
        [mode, setMode, loading]
    );

    return (
        <BusinessModeContext.Provider value={value}>
            {children}
        </BusinessModeContext.Provider>
    );
};

export const useBusinessMode = () => {
    const context = useContext(BusinessModeContext);
    if (context === undefined) {
        throw new Error("useBusinessMode must be used within a BusinessModeProvider");
    }
    return context;
};
