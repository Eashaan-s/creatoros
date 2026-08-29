"use client";

import Link from "next/link";
import { SignedIn, SignedOut } from "@clerk/nextjs";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const clerkEnabled = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

type Props = {
  primaryLabel?: string;
  secondaryHref?: string;
  secondaryLabel?: string;
  size?: "default" | "sm" | "lg";
};

/** Landing / marketing CTAs that respect Clerk when configured. */
export function AuthCtaGroup({
  primaryLabel = "Open studio",
  secondaryHref = "#how",
  secondaryLabel = "See how it works",
  size = "lg",
}: Props) {
  if (!clerkEnabled) {
    return (
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button asChild variant="accent" size={size}>
          <Link href="/dashboard">
            {primaryLabel}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
        <Button asChild variant="outline" size={size}>
          <Link href={secondaryHref}>{secondaryLabel}</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-center gap-3">
      <SignedOut>
        <Button asChild variant="accent" size={size}>
          <Link href="/sign-up">
            Get started
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
        <Button asChild variant="outline" size={size}>
          <Link href="/sign-in">Sign in</Link>
        </Button>
      </SignedOut>
      <SignedIn>
        <Button asChild variant="accent" size={size}>
          <Link href="/dashboard">
            {primaryLabel}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
        <Button asChild variant="outline" size={size}>
          <Link href={secondaryHref}>{secondaryLabel}</Link>
        </Button>
      </SignedIn>
    </div>
  );
}
