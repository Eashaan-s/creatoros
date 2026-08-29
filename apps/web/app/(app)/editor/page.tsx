"use client";

import { Suspense } from "react";
import { EditorStudio } from "@/modules/editor/editor-studio";
import { Skeleton } from "@/components/ui/skeleton";

export default function EditorPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-4">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-[480px] w-full" />
        </div>
      }
    >
      <EditorStudio />
    </Suspense>
  );
}
