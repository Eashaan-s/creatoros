"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Stable SSR/first-paint markup — avoids hydration mismatch with next-themes.
  if (!mounted) {
    return (
      <button
        type="button"
        role="switch"
        aria-checked={false}
        aria-label="Toggle theme"
        disabled
        className="relative inline-flex h-8 w-[3.25rem] shrink-0 items-center rounded-full border border-[var(--border)] bg-[var(--muted)] opacity-60"
      >
        <span className="absolute left-0.5 top-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-[var(--card)] shadow-sm">
          <Sun className="h-3.5 w-3.5 text-[var(--muted-foreground)]" />
        </span>
      </button>
    );
  }

  const isDark = resolvedTheme === "dark";

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isDark}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Light mode" : "Dark mode"}
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className={cn(
        "relative inline-flex h-8 w-[3.25rem] shrink-0 items-center rounded-full border border-[var(--border)] transition-colors",
        isDark ? "bg-[var(--muted)]" : "bg-[color-mix(in_oklab,var(--accent)_18%,var(--muted))]",
      )}
    >
      <span
        className={cn(
          "absolute left-0.5 top-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-[var(--card)] text-[var(--foreground)] shadow-sm transition-transform",
          isDark ? "translate-x-0" : "translate-x-[1.35rem]",
        )}
      >
        {isDark ? <Moon className="h-3.5 w-3.5" /> : <Sun className="h-3.5 w-3.5 text-[var(--accent)]" />}
      </span>
    </button>
  );
}
