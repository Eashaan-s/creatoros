"use client";

import Link from "next/link";
import { SignUp } from "@clerk/nextjs";
import { ArrowLeft, Sparkles } from "lucide-react";

const clerkEnabled = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

export default function SignUpPage() {
  if (!clerkEnabled) {
    return (
      <AuthShell title="Clerk is not configured">
        <p className="mt-2 text-sm text-[var(--muted-foreground)]">
          Add Clerk keys to <code className="text-[var(--foreground)]">apps/web/.env.local</code> and JWKS settings on
          the API to enable accounts. Local workspace mode works without them.
        </p>
        <Link href="/dashboard" className="mt-6 inline-flex text-sm text-[var(--accent)] hover:underline">
          Continue to app
        </Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Create your account">
      <p className="mb-8 text-sm text-[var(--muted-foreground)]">Get a workspace for Writer, Research, and Social.</p>
      <SignUp
        routing="path"
        path="/sign-up"
        signInUrl="/sign-in"
        forceRedirectUrl="/dashboard"
        fallbackRedirectUrl="/dashboard"
        appearance={{
          variables: { colorPrimary: "#1764e8" },
          elements: {
            rootBox: "mx-auto w-full",
            card: "bg-[var(--card)] shadow-none border border-[var(--border)]",
          },
        }}
      />
    </AuthShell>
  );
}

function AuthShell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-[var(--background)] px-4 py-12">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,var(--glow),transparent_55%)]" />
      <div className="relative w-full max-w-md text-center">
        <Link
          href="/"
          className="mb-8 inline-flex items-center gap-2 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
        >
          <ArrowLeft className="h-4 w-4" />
          CreatorOS
        </Link>
        <div className="mb-4 flex justify-center">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--accent)] text-white shadow-[0_0_28px_var(--glow)]">
            <Sparkles className="h-5 w-5" />
          </span>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {children}
      </div>
    </div>
  );
}
