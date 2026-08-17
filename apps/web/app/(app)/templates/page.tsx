"use client";

import { BookOpen } from "lucide-react";
import { ComingSoonModule } from "@/modules/shared/coming-soon";

export default function TemplatesPage() {
  return (
    <ComingSoonModule
      title="Templates"
      description="Resume, PRD, proposals, newsletters, case studies, and more — launch straight into Writer."
      icon={BookOpen}
    />
  );
}
