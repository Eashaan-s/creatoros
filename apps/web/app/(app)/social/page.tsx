import { Suspense } from "react";
import { SocialStudio } from "@/modules/social/social-studio";
import { Skeleton } from "@/components/ui/skeleton";

export default function SocialPage() {
  return (
    <Suspense fallback={<Skeleton className="h-[520px] w-full" />}>
      <SocialStudio />
    </Suspense>
  );
}
