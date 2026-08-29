"use client";

import { ClerkProvider } from "@clerk/nextjs";
import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";
import { ApiAuthBridge } from "@/components/providers/api-auth-bridge";

const clerkEnabled = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

export function Providers({ children }: { children: React.ReactNode }) {
  const inner = (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
      <ApiAuthBridge>
        {children}
        <Toaster theme="dark" richColors position="top-right" />
      </ApiAuthBridge>
    </ThemeProvider>
  );

  if (!clerkEnabled) {
    return inner;
  }

  return (
    <ClerkProvider appearance={{ variables: { colorPrimary: "#1764e8" } }}>
      {inner}
    </ClerkProvider>
  );
}
