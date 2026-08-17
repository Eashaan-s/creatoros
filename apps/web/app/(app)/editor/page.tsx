"use client";

import { FileText } from "lucide-react";
import { ComingSoonModule } from "@/modules/shared/coming-soon";

export default function EditorPage() {
  return (
    <ComingSoonModule
      title="Editor"
      description="Grammar, rewrite, shorten, expand, translate, and tone transforms on any selection."
      icon={FileText}
    />
  );
}
