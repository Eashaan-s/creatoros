import type { ReactNode } from "react";

export function StudioActionBar({ children, status }: { children: ReactNode; status?: ReactNode }) {
  return (
    <div className="mb-3 space-y-2.5 rounded-xl border border-[var(--border)] bg-[var(--card)]/80 px-3 py-3">
      <div className="flex flex-wrap items-center gap-2">{children}</div>
      {status ? (
        <p className="rounded-lg border border-[var(--border)] bg-[var(--muted)]/50 px-3 py-2 text-sm font-medium leading-snug text-[var(--foreground)]">
          {status}
        </p>
      ) : null}
    </div>
  );
}
