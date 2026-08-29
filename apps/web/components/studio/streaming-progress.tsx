export function StreamingProgress({ active, label = "Streaming draft…" }: { active: boolean; label?: string }) {
  if (!active) return null;
  return (
    <div className="mb-3 overflow-hidden rounded-full border border-[var(--border)] bg-[var(--muted)]">
      <div className="h-1 w-full origin-left animate-pulse bg-[var(--accent)]/80" />
      <p className="px-3 py-1.5 text-[11px] text-[var(--muted-foreground)]">{label}</p>
    </div>
  );
}
