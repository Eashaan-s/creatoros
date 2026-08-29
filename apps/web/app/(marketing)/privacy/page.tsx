import Link from "next/link";
import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = { title: "Privacy — CreatorOS" };

export default function PrivacyPage() {
  return (
    <LegalShell title="Privacy">
      <p>
        CreatorOS is in early development. Account data and saved documents are used to provide the product. We do not
        sell personal data. AI providers process prompts to generate content — review provider policies when you connect
        keys.
      </p>
      <p className="mt-4 text-[var(--muted-foreground)]">This page will expand as we ship production auth and storage.</p>
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
