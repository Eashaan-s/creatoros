"use client";

import { useEffect } from "react";
import { useAuth, useClerk } from "@clerk/nextjs";
import { setApiTokenGetter } from "@/lib/api";

const clerkEnabled = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

export function ApiAuthBridge({ children }: { children: React.ReactNode }) {
  if (!clerkEnabled) {
    return <>{children}</>;
  }
  return <ClerkTokenBridge>{children}</ClerkTokenBridge>;
}

function ClerkTokenBridge({ children }: { children: React.ReactNode }) {
  const { getToken, isLoaded } = useAuth();
  const { loaded } = useClerk();

  useEffect(() => {
    if (!isLoaded || !loaded) return;
    setApiTokenGetter(async () => {
      try {
        // Session JWTs are short-lived; skip cache so Railway always gets a fresh token.
        return (await getToken({ skipCache: true })) ?? null;
      } catch {
        return null;
      }
    });
  }, [getToken, isLoaded, loaded]);

  return <>{children}</>;
}
