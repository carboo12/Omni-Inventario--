
"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import { useInitialData } from "./use-initial-data";

interface TicketInfo {
  name: string;
  address: string;
  phone: string;
  rfc: string;
}

interface TicketFooter {
  message: string;
  website: string;
}

interface Settings {
  exchangeRate: string;
  workflow: string;
  applyIVA: boolean;
  allowCash: boolean;
  blockInsufficientCash: boolean;
  allowDollars: boolean;
  allowCard: boolean;
  ticketHeader: TicketInfo;
  ticketFooter: TicketFooter;
  includeUnitPrice: boolean;
  printFullDescription: boolean;
  recoveryKey: string;
  quickSwitchEnabled: boolean;
  isPremium: boolean;
  logoSvg?: string | null;
  jewelryLocationMode: string;
  troyOunceGrams: number;
  adminEmail: string;
  smtpEmail: string;
  smtpPassword: string;
  emailNotificationsEnabled: boolean;
  licenseStartDate?: Date | null;
  licenseExpirationDate?: Date | null;
  licenseStatus?: string;
  invoiceAlertDays: number;
  importProductsInDollars: boolean;
  currency: string;
}

interface SettingsContextType {
  settings: Settings;
  setSettings: React.Dispatch<React.SetStateAction<Settings>>;
  saveSettings: () => void;
  loading: boolean;
}

const defaultSettings: Settings = {
  exchangeRate: "36.5",
  workflow: "dispatcher-cashier",
  applyIVA: true,
  allowCash: true,
  blockInsufficientCash: true,
  allowDollars: true,
  allowCard: true,
  ticketHeader: {
    name: 'Joyeria Torrez',
    address: '',
    phone: '',
    rfc: '',
  },
  ticketFooter: {
    message: 'Gracias por su compra',
    website: '',
  },
  includeUnitPrice: false,
  printFullDescription: false,
  recoveryKey: "",
  quickSwitchEnabled: false,
  isPremium: false,
  logoSvg: null,
  jewelryLocationMode: "HOME",
  troyOunceGrams: 31.10,
  adminEmail: "",
  smtpEmail: "",
  smtpPassword: "",
  emailNotificationsEnabled: false,
  licenseStartDate: null,
  licenseExpirationDate: null,
  licenseStatus: "unregistered",
  invoiceAlertDays: 5,
  importProductsInDollars: false,
  currency: "NIO",
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

import { updateSettings, SystemSettingsData } from "@/lib/actions/settings";
import { useToast } from "@/hooks/use-toast";

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { data: initialData, loading: initialLoading } = useInitialData();
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const { toast } = useToast();

  // When initial data loads, hydrate settings WITHOUT extra DB call
  useEffect(() => {
    if (initialLoading) return;

    const dbSettings = initialData?.settings;
    if (dbSettings) {
      setSettings(prev => ({
        ...prev,
        applyIVA: dbSettings.applyTax,
        recoveryKey: dbSettings.recoveryKey || "",
        workflow: dbSettings.workflow,
        quickSwitchEnabled: dbSettings.quickSwitchEnabled,
        exchangeRate: dbSettings.exchangeRate,
        allowCash: dbSettings.allowCash,
        blockInsufficientCash: dbSettings.blockInsufficientCash,
        allowDollars: dbSettings.allowDollars,
        allowCard: dbSettings.allowCard,
        isPremium: dbSettings.isPremium,
        logoSvg: dbSettings.logoSvg,
        jewelryLocationMode: dbSettings.jewelryLocationMode || "HOME",
        troyOunceGrams: dbSettings.troyOunceGrams || 31.10,
        includeUnitPrice: dbSettings.includeUnitPrice,
        printFullDescription: dbSettings.printFullDescription,
        ticketHeader: {
          ...prev.ticketHeader,
          name: dbSettings.pharmacyName,
          address: dbSettings.address || prev.ticketHeader.address,
          phone: dbSettings.phone || prev.ticketHeader.phone,
          rfc: dbSettings.rfc || prev.ticketHeader.rfc,
        },
        ticketFooter: {
          ...prev.ticketFooter,
          message: dbSettings.footerMessage || prev.ticketFooter.message,
          website: dbSettings.website || prev.ticketFooter.website,
        },
        adminEmail: dbSettings.adminEmail || "",
        smtpEmail: dbSettings.smtpEmail || "",
        smtpPassword: dbSettings.smtpPassword || "",
        emailNotificationsEnabled: dbSettings.emailNotificationsEnabled || false,
        licenseStartDate: dbSettings.licenseStartDate,
        licenseExpirationDate: dbSettings.licenseExpirationDate,
        licenseStatus: dbSettings.licenseStatus || "unregistered",
        invoiceAlertDays: dbSettings.invoiceAlertDays || 5,
        importProductsInDollars: dbSettings.importProductsInDollars || false,
        currency: dbSettings.currency || "NIO",
      }));
    }
    setSettingsLoaded(true);
  }, [initialData, initialLoading]);

  const saveSettings = useCallback(async () => {
    try {
      const dataToSave: SystemSettingsData = {
        pharmacyName: settings.ticketHeader.name,
        address: settings.ticketHeader.address,
        phone: settings.ticketHeader.phone,
        currency: settings.currency,
        taxRate: 0.15,
        applyTax: settings.applyIVA,
        recoveryKey: settings.recoveryKey,
        workflow: settings.workflow,
        quickSwitchEnabled: settings.quickSwitchEnabled,
        exchangeRate: settings.exchangeRate,
        allowCash: settings.allowCash,
        blockInsufficientCash: settings.blockInsufficientCash,
        allowDollars: settings.allowDollars,
        allowCard: settings.allowCard,
        isPremium: settings.isPremium,
        logoSvg: settings.logoSvg,
        jewelryLocationMode: settings.jewelryLocationMode,
        troyOunceGrams: settings.troyOunceGrams,
        rfc: settings.ticketHeader.rfc,
        footerMessage: settings.ticketFooter.message,
        website: settings.ticketFooter.website,
        includeUnitPrice: settings.includeUnitPrice,
        printFullDescription: settings.printFullDescription,
        adminEmail: settings.adminEmail,
        smtpEmail: settings.smtpEmail,
        smtpPassword: settings.smtpPassword,
        emailNotificationsEnabled: settings.emailNotificationsEnabled,
        licenseStartDate: settings.licenseStartDate,
        licenseExpirationDate: settings.licenseExpirationDate,
        licenseStatus: settings.licenseStatus,
        invoiceAlertDays: settings.invoiceAlertDays,
        importProductsInDollars: settings.importProductsInDollars,
      };

      await updateSettings(dataToSave);
      toast({ title: "Éxito", description: "Configuraciones guardadas correctamente." });
    } catch (error) {
      console.error("Error saving settings:", error);
      toast({ title: "Error", description: "No se pudieron guardar las configuraciones.", variant: "destructive" });
    }
  }, [settings, toast]);

  const loading = initialLoading || !settingsLoaded;

  const value = useMemo(
    () => ({ settings, setSettings, saveSettings, loading }),
    [settings, saveSettings, loading]
  );

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
};

// Custom hook to use the context
export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }
  return context;
};
