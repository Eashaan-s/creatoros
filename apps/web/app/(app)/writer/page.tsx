import { Suspense } from "react";
import { WriterStudio } from "@/modules/writer/writer-studio";
import { Skeleton } from "@/components/ui/skeleton";

export default function WriterPage() {
  return (
    <Suspense fallback={<Skeleton className="h-[520px] w-full" />}>
      <WriterStudio />
    </Suspense>
  );
}
