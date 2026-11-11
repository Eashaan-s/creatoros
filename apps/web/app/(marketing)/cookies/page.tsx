import Link from "next/link";
import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = { title: "Cookies — CreatorOS" };

export default function CookiesPage() {
  return (
    <LegalShell title="Cookies">
      <p>
        CreatorOS uses a small set of cookies and similar storage to run the product. We do not use advertising
        trackers.
      </p>
      <h2 className="mt-8 text-base font-semibold tracking-tight">Essential</h2>
      <ul className="mt-3 list-disc space-y-2 pl-5 text-[var(--muted-foreground)]">
        <li>
          <span className="text-[var(--foreground)]">Authentication (Clerk)</span> — session cookies so you stay signed
          in securely across pages.
        </li>
        <li>
          <span className="text-[var(--foreground)]">Theme preference</span> — local storage for light/dark mode via
          next-themes.
        </li>
      </ul>
      <h2 className="mt-8 text-base font-semibold tracking-tight">What we do not do</h2>
      <p className="mt-3 text-[var(--muted-foreground)]">
        We do not sell cookie data. Analytics cookies are not part of this early build. When we add optional analytics,
        this page will list them and how to opt out.
      </p>
      <h2 className="mt-8 text-base font-semibold tracking-tight">Manage</h2>
      <p className="mt-3 text-[var(--muted-foreground)]">
        Clear site data in your browser settings to remove local theme preferences. Sign out to end Clerk sessions. See
        also our <Link href="/privacy" className="text-[var(--accent)] hover:underline">Privacy</Link> page.
      </p>
    </LegalShell>
  );
}

function LegalShell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <main className="mx-auto min-h-screen max-w-2xl px-5 py-16 md:px-8">
      <Link href="/" className="text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)]">
        ← CreatorOS
      </Link>
      <h1 className="mt-8 text-3xl font-semibold tracking-tight">{title}</h1>
      <div className="mt-6 text-sm leading-relaxed">{children}</div>
    </main>
  );
}
