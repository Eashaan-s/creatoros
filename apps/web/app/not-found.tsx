import Link from "next/link";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-5 py-16 text-center">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_20%,var(--glow),transparent_55%)]" />
      <div className="relative max-w-md">
        <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--accent)] text-[var(--accent-foreground)] shadow-[0_0_28px_var(--glow)]">
          <Sparkles className="h-5 w-5" />
        </span>
        <p className="mt-6 font-mono text-xs uppercase tracking-[0.2em] text-[var(--muted-foreground)]">404</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">Page not found</h1>
        <p className="mt-3 text-sm leading-relaxed text-[var(--muted-foreground)]">
          That route is not in CreatorOS. Head home or open your workspace.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Button asChild variant="accent">
            <Link href="/">Home</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/dashboard">Dashboard</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
