"use client";

import { useCallback, useMemo, useState } from "react";
import { DEFAULT_PROFILE } from "@/lib/cities";
import type { Profile } from "@/lib/types";
import {
  deserialiseProfile,
  PROFILE_STORAGE_KEY,
  serialiseProfile,
} from "@/lib/validation";
import { useClientValue } from "./useClientValue";

function readRawProfile(): string | null {
  try {
    return window.localStorage.getItem(PROFILE_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function useStoredProfile() {
  const hydrated = useClientValue(() => true, false);
  const rawStored = useClientValue(readRawProfile, null);
  const storedProfile = useMemo(() => deserialiseProfile(rawStored), [rawStored]);
  const [override, setOverride] = useState<Profile | null>(null);

  const profile = override ?? storedProfile ?? DEFAULT_PROFILE;
  const personalised = override !== null || storedProfile !== null;

  const saveProfile = useCallback((next: Profile) => {
    setOverride(next);
    try {
      window.localStorage.setItem(PROFILE_STORAGE_KEY, serialiseProfile(next));
    } catch {
      // Storage may be unavailable in private browsing; keep in-memory state.
    }
  }, []);

  return { profile, setProfile: setOverride, saveProfile, personalised, hydrated };
}
