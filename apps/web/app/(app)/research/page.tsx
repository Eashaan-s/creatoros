import { Suspense } from "react";
import { ResearchStudio } from "@/modules/research/research-studio";
import { Skeleton } from "@/components/ui/skeleton";

export default function ResearchPage() {
  return (
    <Suspense fallback={<Skeleton className="h-[520px] w-full" />}>
      <ResearchStudio />
    </Suspense>
  );
}
