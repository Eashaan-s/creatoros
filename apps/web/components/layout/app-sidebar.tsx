"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { APP_NAV, isNavActive } from "@/lib/nav";
import { cn } from "@/lib/utils";

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden h-screen w-64 shrink-0 flex-col overflow-hidden border-r border-[var(--sidebar-border)] bg-[var(--sidebar)]/90 px-3 py-4 backdrop-blur md:flex">
      <Link href="/dashboard" className="mb-6 flex shrink-0 items-center gap-2.5 px-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--accent)] text-white shadow-[0_0_24px_var(--glow)]">
          <Sparkles className="h-4 w-4" />
        </div>
        <div>
          <div className="text-sm font-semibold tracking-tight">CreatorOS</div>
          <div className="text-[11px] text-[var(--muted-foreground)]">AI operating system</div>
        </div>
      </Link>

      <nav className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto">
        {APP_NAV.map((item) => {
          const active = isNavActive(pathname, item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm transition-colors",
                active
                  ? "text-[var(--foreground)]"
                  : "text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]",
              )}
            >
              {active ? (
                <motion.span
                  layoutId="nav-active"
                  className="absolute inset-0 rounded-xl border border-[var(--border)] bg-[var(--muted)]"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              ) : null}
              <Icon className="relative z-10 h-4 w-4" />
              <span className="relative z-10">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto shrink-0 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4">
        <p className="text-sm font-semibold tracking-tight">Studios live</p>
        <p className="mt-2 text-[13px] leading-relaxed text-[var(--muted-foreground)]">
          Writer, Research, Social, Editor, and Templates are ready. Generate in a studio, then Save to edit in Editor.
        </p>
        <Link href="/" className="mt-3 inline-block text-sm text-[var(--accent)] hover:underline">
          Marketing site
        </Link>
      </div>
    </aside>
  );
}
