"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PageHeader({
  title,
  description,
  actions,
  backHref = "/",
  showBack = true,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  /** Always routes to Dashboard by default — never browser history. */
  backHref?: string;
  showBack?: boolean;
}) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {showBack ? (
          <Button asChild variant="ghost" size="sm" className="-ml-2 mb-2 h-8 px-2 text-[var(--muted-foreground)]">
            <Link href={backHref}>
              <ArrowLeft className="h-4 w-4" />
              Dashboard
            </Link>
          </Button>
        ) : null}
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">{title}</h1>
        {description ? (
          <p className="mt-1.5 max-w-2xl text-sm text-[var(--muted-foreground)]">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </div>
  );
}
