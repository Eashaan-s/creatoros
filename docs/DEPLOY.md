# CreatorOS — Deploy (from this point)

You already have code on GitHub: https://github.com/Eashaan-s/creatoros

Split:
- **Railway** = API only (`apps/api`, Python)
- **Vercel** = Website (`apps/web`, Next.js)

Do **not** deploy `@creatoros/web` on Railway.

---

## 0) Local terminal — push any pending deploy files

```powershell
cd c:\Users\shank\OneDrive\Desktop\createos
git add apps/api/railway.toml docs/DEPLOY.md
git status
git commit -m "Add Railway API start config for deploy."
git push origin master
```

---

## 1) Railway — API (browser + little typing)

1. Open https://railway.app → login with GitHub.
2. If you already have a broken `@creatoros/web` service: open it → **Settings** → **Delete service**.
3. **New Project** → **Deploy from GitHub repo** → `Eashaan-s/creatoros`.
4. After it creates a service, open that service → **Settings**:
   - **Root Directory** = `apps/api`
   - Watch for auto deploy using `railway.toml` start command.
5. Open **Variables** → **Raw Editor** (or add one-by-one). Paste (fill real secrets):

```env
ENVIRONMENT=production
AUTH_DEV_BYPASS=false
CORS_ORIGINS=https://REPLACE_WITH_VERCEL_URL
AI_PROVIDER=openrouter
AI_API_KEY=sk-or-REPLACE
AI_MODEL=openai/gpt-4o-mini
AI_BASE_URL=https://openrouter.ai/api/v1
DATABASE_URL=sqlite+aiosqlite:///./creatoros.db
CLERK_JWKS_URL=https://holy-osprey-6367.clerk.accounts.dev/.well-known/jwks.json
CLERK_ISSUER=https://holy-osprey-6367.clerk.accounts.dev
CLERK_AUDIENCE=
```

6. **Settings** → **Networking** → **Generate Domain**.
7. Copy the domain, e.g. `https://something.up.railway.app`
8. In a browser (or terminal) test:

```powershell
curl https://YOUR-RAILWAY-DOMAIN/health
```

Expect: `{"status":"ok","service":"creatoros-api"}`

Save this URL — call it **API_URL** (without path), e.g. `https://something.up.railway.app`

---

## 2) Vercel — Website (browser)

1. Open https://vercel.com → login with GitHub.
2. **Add New…** → **Project** → Import `Eashaan-s/creatoros`.
3. Configure:

| Field | Value |
|--------|--------|
| Framework Preset | Next.js |
| Root Directory | `apps/web` → Edit → select `apps/web` |
| Install Command | `cd ../.. && pnpm install` |
| Build Command | `cd ../.. && pnpm --filter @creatoros/shared build && pnpm --filter @creatoros/web build` |
| Output Directory | (leave default) |

4. **Environment Variables** (Production):

```env
NEXT_PUBLIC_API_URL=https://YOUR-RAILWAY-DOMAIN/api/v1
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_REPLACE
CLERK_SECRET_KEY=sk_test_REPLACE
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard
```

5. Deploy. Copy the site URL, e.g. `https://creatoros-xxx.vercel.app` → call it **WEB_URL**.

---

## 3) Connect CORS + Clerk

1. Railway → API Variables → set:
   ```env
   CORS_ORIGINS=https://YOUR-VERCEL-URL
   ```
   (no trailing slash). Redeploy if needed.

2. Clerk Dashboard → allowed origins / domains → add:
   - `https://YOUR-VERCEL-URL`
   - keep `http://localhost:3000` for local

---

## 4) Smoke test

1. Open **WEB_URL**
2. Sign up / sign in → `/dashboard`
3. Writer → Generate

---

## 5) Later updates (after first deploy works)

```powershell
cd c:\Users\shank\OneDrive\Desktop\createos
# make code changes...
git add -A
git status
git commit -m "Describe your change."
git push origin master
```

Vercel + Railway will redeploy from GitHub automatically.

---

## Local still works (unchanged)

```powershell
# Terminal 1 — API
cd c:\Users\shank\OneDrive\Desktop\createos\apps\api
.\.venv\Scripts\activate
uvicorn app.main:app --reload --port 8000 --host 127.0.0.1

# Terminal 2 — Web
cd c:\Users\shank\OneDrive\Desktop\createos\apps\web
npx next dev --turbopack --port 3000 --hostname 0.0.0.0
```

PC: http://localhost:3000  
Phone: http://YOUR-LAN-IP:3000  

---

## If Railway still tries to build the web app

Root Directory is wrong. It must be exactly:

```text
apps/api
```

Not repo root. Not `apps/web`.
