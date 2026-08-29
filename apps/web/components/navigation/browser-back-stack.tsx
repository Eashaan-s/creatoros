"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

const DEEP_ROUTES = [
  "/writer",
  "/research",
  "/social",
  "/editor",
  "/templates",
  "/history",
  "/settings",
];

function isDeepAppPath(path: string) {
  return DEEP_ROUTES.some((route) => path === route || path.startsWith(`${route}/`));
}

type CosState = { __cos?: "dashboard" | "deep" };

/**
 * Ensures browser Back from any studio/settings page hits Dashboard first,
 * then Landing — even when the user deep-linked from the marketing site.
 */
export function BrowserBackStack() {
  const pathname = usePathname();
  const prevPathRef = useRef<string | null>(null);

  useEffect(() => {
    const prev = prevPathRef.current;
    prevPathRef.current = pathname;

    if (typeof window === "undefined") return;
    if (!isDeepAppPath(pathname)) return;

    // Came from Dashboard via in-app navigation — stack is already correct.
    if (prev === "/dashboard") return;

    const state = window.history.state as CosState | null;
    if (state?.__cos === "deep") return;

    const deepUrl = `${window.location.pathname}${window.location.search}`;

    // Rewrite: […, deep] → […, dashboard, deep]
    window.history.replaceState({ __cos: "dashboard" } satisfies CosState, "", "/dashboard");
    window.history.pushState({ __cos: "deep" } satisfies CosState, "", deepUrl);
  }, [pathname]);

  return null;
}
