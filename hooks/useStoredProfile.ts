"use client";

import { useCallback, useMemo, useState } from "react";
import { DEFAULT_PROFILE } from "@/lib/cities";
import { readStorage, writeStorage } from "@/lib/storage";
import type { Profile } from "@/lib/types";
import {
  deserializeProfile,
  PROFILE_STORAGE_KEY,
  serializeProfile,
} from "@/lib/validation";
import { useClientValue } from "./useClientValue";

export function useStoredProfile() {
  const hydrated = useClientValue(() => true, false);
  const rawStored = useClientValue(() => readStorage(PROFILE_STORAGE_KEY), null);
  const storedProfile = useMemo(() => deserializeProfile(rawStored), [rawStored]);
  const [override, setOverride] = useState<Profile | null>(null);

  const profile = override ?? storedProfile ?? DEFAULT_PROFILE;
  const personalized = override !== null || storedProfile !== null;

  const saveProfile = useCallback((next: Profile) => {
    setOverride(next);
    writeStorage(PROFILE_STORAGE_KEY, serializeProfile(next));
  }, []);

  return { profile, setProfile: setOverride, saveProfile, personalized, hydrated };
}
