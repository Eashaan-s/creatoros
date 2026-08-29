import type { LucideIcon } from "lucide-react";

export function StudioCanvasEmpty({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <div className="flex min-h-[480px] flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--border)] bg-[var(--card)]/40 px-6 text-center">
      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--muted)]">
        <Icon className="h-5 w-5 text-[var(--muted-foreground)]" />
      </div>
      <p className="text-sm font-medium">{title}</p>
      <p className="mt-1.5 max-w-sm text-sm text-[var(--muted-foreground)]">{description}</p>
    </div>
  );
}
