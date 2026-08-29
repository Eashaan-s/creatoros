# Clerk auth setup (CreatorOS)

Clerk is already wired in the web app (middleware, SignIn/SignUp, API token bridge) and API (JWT via JWKS). You only need keys.

## 1. Create a Clerk application

1. Go to [https://dashboard.clerk.com](https://dashboard.clerk.com) and create an application.
2. Under **Paths** (or Configure → Paths), set:
   - Sign-in URL: `/sign-in`
   - Sign-up URL: `/sign-up`
   - After sign-in / sign-up: `/dashboard` (optional; we also force this in code)
3. Add allowed origins for local: `http://localhost:3000`

## 2. Web env — `apps/web/.env.local`

```env
NEXT_PUBLIC_API_URL=/api/v1

NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard
```

`NEXT_PUBLIC_API_URL=/api/v1` uses the Next.js rewrite to FastAPI (see `next.config.ts`). That works on desktop and on phones hitting your LAN IP — do **not** point the browser at `http://localhost:8000` when testing from a phone.

Restart the Next.js dev server after saving.

With these set:

- `/dashboard` and studios require sign-in
- Landing `/` stays public
- Landing CTAs become **Get started** / **Sign in**

## 3. API env — `apps/api/.env`

Find your Frontend API URL in Clerk (e.g. `https://your-app.clerk.accounts.dev`).

```env
CLERK_JWKS_URL=https://your-app.clerk.accounts.dev/.well-known/jwks.json
CLERK_ISSUER=https://your-app.clerk.accounts.dev
# Leave audience empty unless you configured a custom JWT template audience
CLERK_AUDIENCE=
AUTH_DEV_BYPASS=true
ENVIRONMENT=development
```

`CLERK_ISSUER` must be the Frontend API host only — **not** the `/.well-known/jwks.json` URL.

Restart uvicorn after saving.

When `CLERK_JWKS_URL` is set, missing/invalid JWTs return **401** (no silent `dev_user` fallback).

## 4. Verify

1. Open http://localhost:3000 → **Get started** → create an account  
2. You should land on `/dashboard`  
3. Generate in Writer — requests send your Clerk session JWT to the API  
4. Sign out (user menu) → back to landing  

## Local workspace without Clerk

Leave Clerk keys empty. Web shows **Local workspace**; API accepts the `dev:` bearer. Good for offline coding.

## Production notes

- Set `ENVIRONMENT=production` on the API and keep JWKS configured.
- Do not ship with empty Clerk keys if you expect real users.
- Next: Deploy (Vercel + API host), then Supabase for shared DB.
