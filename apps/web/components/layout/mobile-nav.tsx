"use client";

import Link from "next/link";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { APP_NAV, isNavActive } from "@/lib/nav";
import { cn } from "@/lib/utils";
import { usePathname } from "next/navigation";

export function MobileNav({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname();
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 md:hidden">
      <button className="absolute inset-0 bg-black/50" onClick={onClose} aria-label="Close menu" />
      <div className="absolute left-0 top-0 flex h-full w-72 flex-col border-r border-[var(--border)] bg-[var(--sidebar)] p-3">
        <div className="mb-4 flex items-center justify-between px-2">
          <span className="font-semibold">CreatorOS</span>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <nav className="flex flex-col gap-1">
          {APP_NAV.map((item) => {
            const Icon = item.icon;
            const active = isNavActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                  "flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm",
                  active ? "bg-[var(--muted)]" : "text-[var(--muted-foreground)]",
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <Link
          href="/"
          onClick={onClose}
          className="mt-auto px-3 py-2 text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
        >
          Marketing site
        </Link>
      </div>
    </div>
  );
}
