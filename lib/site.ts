/** Canonical public origin, used for share links and absolute metadata URLs. */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://saans-api7jwjpza-uc.a.run.app"
).replace(/\/+$/, "");
