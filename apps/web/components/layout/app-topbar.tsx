"use client";

import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ClerkUserButton } from "@/components/layout/clerk-user-button";

const clerkEnabled = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

export function AppTopBar({ onMenu }: { onMenu?: () => void }) {
  return (
    <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-[var(--border)] bg-[var(--background)]/75 px-4 backdrop-blur-xl">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="md:hidden" onClick={onMenu} aria-label="Open menu">
          <Menu className="h-4 w-4" />
        </Button>
        <span className="text-sm text-[var(--muted-foreground)]">Unified workspace for creators</span>
      </div>
      <div className="flex items-center gap-3">
        {clerkEnabled ? (
          <ClerkUserButton />
        ) : (
          <div className="rounded-full border border-[var(--border)] px-3 py-1 text-xs text-[var(--muted-foreground)]">
            Dev mode
          </div>
        )}
      </div>
    </header>
  );
}
