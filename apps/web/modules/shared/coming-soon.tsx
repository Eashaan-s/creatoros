"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";

export function ComingSoonModule({
  title,
  description,
  icon,
}: {
  title: string;
  description: string;
  icon: LucideIcon;
}) {
  return (
    <div>
      <PageHeader title={title} description={description} />
      <EmptyState
        icon={icon}
        title="Coming in the next phase"
        description="This module is scaffolded so navigation stays real. Writer, Research, and Social are live today — use those while Editor and Templates ship."
        actionLabel="Back to Dashboard"
        actionHref="/dashboard"
      />
      <div className="mt-4 flex flex-wrap gap-2">
        <Button asChild variant="outline" size="sm">
          <Link href="/writer">Writer</Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link href="/research">Research</Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link href="/social">Social</Link>
        </Button>
      </div>
    </div>
  );
}
