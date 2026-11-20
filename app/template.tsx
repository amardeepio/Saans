import type { ReactNode } from "react";

/**
 * Remounts on client-side navigation, which gives every route a short,
 * reduced-motion-aware enter transition without a client-side router wrapper.
 */
export default function Template({ children }: { children: ReactNode }) {
  return <div className="page-enter">{children}</div>;
}
