"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ClerkUserButton } from "@/components/layout/clerk-user-button";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { cn } from "@/lib/utils";

const clerkEnabled = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

export function AppTopBar({ onMenu }: { onMenu?: () => void }) {
  const pathname = usePathname();
  const onDashboard = pathname === "/dashboard";
  const backHref = "/dashboard";
  const backLabel = "Dashboard";

  return (
    <header className="z-20 flex h-14 shrink-0 items-center justify-between border-b border-[var(--border)] bg-[var(--background)]/90 px-4 backdrop-blur-xl">
      <div className="flex min-w-0 items-center gap-1 sm:gap-2">
        <Button variant="ghost" size="icon" className="md:hidden" onClick={onMenu} aria-label="Open menu">
          <Menu className="h-4 w-4" />
        </Button>
        {!onDashboard ? (
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="h-8 shrink-0 gap-1.5 px-2 text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
          >
            <Link href={backHref} aria-label={`Back to ${backLabel}`}>
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">{backLabel}</span>
            </Link>
          </Button>
        ) : null}
        <div className={cn("hidden min-w-0 sm:block", !onDashboard && "border-l border-[var(--border)] pl-3")}>
          <p className="truncate text-sm font-medium tracking-tight">Workspace</p>
          <p className="truncate text-[11px] text-[var(--muted-foreground)]">
            CreatorOS · Write · Research · Social
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 sm:gap-3">
        <ThemeToggle />
        <Button asChild variant="ghost" size="sm" className="hidden text-[var(--muted-foreground)] lg:inline-flex">
          <Link href="/help">Help</Link>
        </Button>
        {clerkEnabled ? (
          <ClerkUserButton />
        ) : (
          <div className="rounded-lg border border-[var(--border)] bg-[var(--muted)]/50 px-2.5 py-1 text-[11px] text-[var(--muted-foreground)]">
            Local workspace
          </div>
        )}
      </div>
    </header>
  );
}
