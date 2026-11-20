"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

/**
 * A small top progress bar for client-side navigation. It starts on an
 * internal link press (before the route resolves) and completes when the
 * pathname settles, so navigation never feels like a dead click.
 */
export function RouteProgress() {
  const pathname = usePathname();
  const [active, setActive] = useState(false);
  const firstRender = useRef(true);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    function clearTimer() {
      if (timer.current !== null) {
        window.clearTimeout(timer.current);
        timer.current = null;
      }
    }

    function start() {
      clearTimer();
      setActive(true);
      // Fail-safe: never leave the bar stuck if a navigation is cancelled.
      timer.current = window.setTimeout(() => setActive(false), 2_500);
    }

    function finish() {
      clearTimer();
      timer.current = window.setTimeout(() => setActive(false), 320);
    }

    function onClick(event: MouseEvent) {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = (event.target as HTMLElement | null)?.closest("a");
      if (!anchor) return;
      if (anchor.target && anchor.target !== "_self") return;
      if (anchor.hasAttribute("download")) return;
      const url = new URL(anchor.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname && url.hash) return;
      if (url.pathname === window.location.pathname && !url.hash) return;
      start();
    }

    document.addEventListener("click", onClick, { capture: true });
    window.addEventListener("popstate", start);
    return () => {
      document.removeEventListener("click", onClick, { capture: true });
      window.removeEventListener("popstate", start);
      clearTimer();
    };
  }, []);

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    setActive(true);
    const done = window.setTimeout(() => setActive(false), 420);
    return () => window.clearTimeout(done);
  }, [pathname]);

  return (
    <div className={`route-progress ${active ? "is-active" : ""}`} aria-hidden="true">
      <span />
    </div>
  );
}
