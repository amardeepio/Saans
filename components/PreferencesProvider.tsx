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
import { useClientValue } from "@/hooks/useClientValue";
import {
  DEFAULT_SETTINGS,
  sanitiseSettings,
  saveSettings,
  SETTINGS_STORAGE_KEY,
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

function readRawSettings(): string | null {
  try {
    return window.localStorage.getItem(SETTINGS_STORAGE_KEY);
  } catch {
    return null;
  }
}

function parseRawSettings(raw: string | null): AppSettings {
  if (!raw) return DEFAULT_SETTINGS;
  try {
    return sanitiseSettings(JSON.parse(raw));
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const hydrated = useClientValue(() => true, false);
  const rawStored = useClientValue(readRawSettings, null);
  const storedSettings = useMemo(() => parseRawSettings(rawStored), [rawStored]);
  const [override, setOverride] = useState<AppSettings | null>(null);
  const settings = override ?? storedSettings;

  useEffect(() => {
    if (!hydrated) return;
    saveSettings(settings);
    document.documentElement.lang = settings.locale;
    document.documentElement.dir = "ltr";
    document.documentElement.dataset.simple = settings.simpleMode ? "true" : "false";
  }, [settings, hydrated]);

  const updateSettings = useCallback(
    (updater: (current: AppSettings) => AppSettings) => {
      setOverride((current) => updater(current ?? storedSettings));
    },
    [storedSettings],
  );

  const setAqiStandard = useCallback(
    (aqiStandard: AqiStandard) => {
      updateSettings((current) => ({ ...current, aqiStandard }));
    },
    [updateSettings],
  );

  const setLocale = useCallback(
    (locale: Locale) => {
      updateSettings((current) => ({ ...current, locale }));
    },
    [updateSettings],
  );

  const setSimpleMode = useCallback(
    (simpleMode: boolean) => {
      updateSettings((current) => ({ ...current, simpleMode }));
    },
    [updateSettings],
  );

  const updateAlerts = useCallback(
    (patch: Partial<AlertPreferences>) => {
      updateSettings((current) => ({
        ...current,
        alerts: { ...current.alerts, ...patch },
      }));
    },
    [updateSettings],
  );

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
