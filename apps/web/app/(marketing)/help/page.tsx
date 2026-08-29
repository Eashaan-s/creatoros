import Link from "next/link";
import type { Metadata } from "next";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Help — CreatorOS" };

export default function HelpPage() {
  return (
    <main className="mx-auto min-h-screen max-w-2xl px-5 py-16 md:px-8">
      <Link href="/" className="text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)]">
        ← CreatorOS
      </Link>
      <h1 className="mt-8 text-3xl font-semibold tracking-tight">Help</h1>
      <div className="mt-6 space-y-4 text-sm leading-relaxed">
        <p>
          Start on the Dashboard, open a studio, fill the brief, and hit Generate. Use Save to land drafts in History.
          Research supports file, URL, YouTube, and paste — Academic Mode adds paper search.
        </p>
        <p className="text-[var(--muted-foreground)]">
          If URL or YouTube extract fails, paste the text or upload a file instead.
        </p>
        <Button asChild variant="accent" className="mt-2">
          <Link href="/dashboard">Open studio</Link>
        </Button>
      </div>
    </main>
  );
}
