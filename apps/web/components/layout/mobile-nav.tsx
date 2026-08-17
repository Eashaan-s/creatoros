"use client";

import Link from "next/link";
import {
  BookOpen,
  FileText,
  FlaskConical,
  History,
  LayoutDashboard,
  PenLine,
  Settings,
  Share2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { usePathname } from "next/navigation";

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
          {NAV.map((item) => {
            const Icon = item.icon;
            const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
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
      </div>
    </div>
  );
}
