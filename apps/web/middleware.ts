import { NextResponse } from "next/server";
import type { NextFetchEvent, NextRequest } from "next/server";
import type { NextMiddleware } from "next/server";

const clerkEnabled = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

function buildMiddleware(): NextMiddleware {
  if (!clerkEnabled) {
    return () => NextResponse.next();
  }

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { clerkMiddleware, createRouteMatcher } = require("@clerk/nextjs/server") as typeof import("@clerk/nextjs/server");
  const isPublicRoute = createRouteMatcher([
    "/",
    "/privacy(.*)",
    "/terms(.*)",
    "/help(.*)",
    "/cookies(.*)",
    "/sign-in(.*)",
    "/sign-up(.*)",
    // Proxied FastAPI — auth is Bearer JWT on the API, not Clerk page session.
    "/api(.*)",
  ]);
  return clerkMiddleware(async (auth, request) => {
    if (!isPublicRoute(request)) {
      await auth.protect();
    }
  });
}

const middlewareImpl = buildMiddleware();

export default function middleware(req: NextRequest, event: NextFetchEvent) {
  return middlewareImpl(req, event);
}

export const config = {
  matcher: [
    // Skip `/api/v1/*` — proxied FastAPI uses Bearer JWT; Clerk middleware
    // mis-handles that header and returns HTML 500 on uploads/API calls.
    "/((?!_next|api/v1|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
  ],
};
