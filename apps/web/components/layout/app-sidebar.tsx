"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  BookOpen,
  FileText,
  FlaskConical,
  History,
  LayoutDashboard,
  PenLine,
  Settings,
  Share2,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/writer", label: "Writer Studio", icon: PenLine },
  { href: "/research", label: "Research Studio", icon: FlaskConical },
  { href: "/social", label: "Social Studio", icon: Share2 },
  { href: "/editor", label: "Editor", icon: FileText },
  { href: "/templates", label: "Templates", icon: BookOpen },
  { href: "/history", label: "History", icon: History },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden h-screen w-64 shrink-0 flex-col border-r border-[var(--sidebar-border)] bg-[var(--sidebar)]/90 px-3 py-4 backdrop-blur md:flex">
      <div className="mb-6 flex items-center gap-2.5 px-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--accent)] text-white shadow-[0_0_24px_var(--glow)]">
          <Sparkles className="h-4 w-4" />
        </div>
        <div>
          <div className="text-sm font-semibold tracking-tight">CreatorOS</div>
          <div className="text-[11px] text-[var(--muted-foreground)]">AI operating system</div>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-1">
        {NAV.map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
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

      <div className="mt-auto rounded-2xl border border-[var(--border)] bg-[var(--card)] p-3">
        <p className="text-xs font-medium">Phase 1</p>
        <p className="mt-1 text-[11px] leading-relaxed text-[var(--muted-foreground)]">
          Writer Studio is live. Research, Social, and Editor ship next.
        </p>
      </div>
    </aside>
  );
}
