"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  DEFAULT_SETTINGS,
  loadSettings,
  saveSettings,
  type AlertPreferences,
  type AppSettings,
} from "@/lib/settings";
import type { AqiStandard, Locale } from "@/lib/types";
import { PwaManager } from "./PwaManager";

interface PreferencesContextValue {
  settings: AppSettings;
  hydrated: boolean;
  setAqiStandard: (standard: AqiStandard) => void;
  setLocale: (locale: Locale) => void;
  setSimpleMode: (enabled: boolean) => void;
  updateAlerts: (patch: Partial<AlertPreferences>) => void;
}

const PreferencesContext = createContext<PreferencesContextValue | null>(null);

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setSettings(loadSettings());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    saveSettings(settings);
    document.documentElement.lang = settings.locale;
    document.documentElement.dir = "ltr";
    document.documentElement.dataset.simple = settings.simpleMode ? "true" : "false";
  }, [settings, hydrated]);

  const setAqiStandard = useCallback((aqiStandard: AqiStandard) => {
    setSettings((current) => ({ ...current, aqiStandard }));
  }, []);

  const setLocale = useCallback((locale: Locale) => {
    setSettings((current) => ({ ...current, locale }));
  }, []);

  const setSimpleMode = useCallback((simpleMode: boolean) => {
    setSettings((current) => ({ ...current, simpleMode }));
  }, []);

  const updateAlerts = useCallback((patch: Partial<AlertPreferences>) => {
    setSettings((current) => ({
      ...current,
      alerts: { ...current.alerts, ...patch },
    }));
  }, []);

  const value = useMemo(
    () => ({
      settings,
      hydrated,
      setAqiStandard,
      setLocale,
      setSimpleMode,
      updateAlerts,
    }),
    [settings, hydrated, setAqiStandard, setLocale, setSimpleMode, updateAlerts],
  );

  return (
    <PreferencesContext.Provider value={value}>
      {children}
      <PwaManager />
    </PreferencesContext.Provider>
  );
}

export function usePreferences(): PreferencesContextValue {
  const value = useContext(PreferencesContext);
  if (!value) {
    throw new Error("usePreferences must be used inside PreferencesProvider");
  }
  return value;
}
