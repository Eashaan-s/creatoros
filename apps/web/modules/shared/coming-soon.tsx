"use client";

import type { LucideIcon } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";

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
        description="This module is scaffolded in the shell so navigation stays real. The domain service and AI flows will plug in without reshaping the app."
      />
    </div>
  );
}
