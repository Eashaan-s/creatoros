import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Terms — CreatorOS" };

export default function TermsPage() {
  return (
    <main className="mx-auto min-h-screen max-w-2xl px-5 py-16 md:px-8">
      <Link href="/" className="text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)]">
        ← CreatorOS
      </Link>
      <h1 className="mt-8 text-3xl font-semibold tracking-tight">Terms</h1>
      <div className="mt-6 space-y-4 text-sm leading-relaxed">
        <p>
          CreatorOS is provided as-is during early access. Generated content is a starting point — you are responsible for
          reviewing and publishing it. Academic Mode drafts are learning aids, not formal academic submissions.
        </p>
        <p className="text-[var(--muted-foreground)]">Full terms will ship with production billing and accounts.</p>
      </div>
    </main>
  );
}
