# CreatorOS

AI operating system for creators — generate, edit, research, and publish from one workspace.

Phase 1 ships the product shell, a **Studio Signal** marketing landing page, and wired **Writer**, **Research** (incl. Academic Mode), and **Social** studios.

## Stack

| Layer | Tech |
|-------|------|
| Web | Next.js 15, TypeScript, Tailwind CSS 4, TipTap, Framer Motion, Clerk |
| API | FastAPI, SQLAlchemy (async), Alembic |
| Data | PostgreSQL via Supabase (SQLite supported for local dev) |
| Storage | Supabase Storage (wired later for Research Studio) |
| AI | Provider-agnostic `AIService` (Mock + OpenRouter live; other adapters stubbed) |

## Monorepo layout

```text
apps/web          Next.js app
apps/api          FastAPI app
packages/shared   Shared TypeScript contracts
```

## Prerequisites

- Node.js 20+
- pnpm 9+
- Python 3.11+

## Quick start (local / mock AI)

### 1. Install JS deps

```bash
pnpm install
pnpm --filter @creatoros/shared build
```

### 2. API

```bash
cd apps/api
python -m venv .venv

# Windows
.\.venv\Scripts\activate

# macOS / Linux
source .venv/bin/activate

pip install -r requirements.txt
copy .env.example .env   # or: cp .env.example .env
uvicorn app.main:app --reload --port 8000
```

Health check: [http://localhost:8000/health](http://localhost:8000/health)

### 3. Web

```bash
cp apps/web/.env.example apps/web/.env.local
pnpm --filter @creatoros/web dev
```

Open [http://localhost:3000](http://localhost:3000) for the marketing landing page, or [http://localhost:3000/dashboard](http://localhost:3000/dashboard) for the app.

Without Clerk keys, the app runs with a **local workspace** badge and the API accepts a local bearer token.

## Environment

### `apps/api/.env`

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | `sqlite+aiosqlite:///./creatoros.db` or Supabase Postgres (`postgresql+asyncpg://...`) |
| `AI_PROVIDER` | `mock` or `openrouter` |
| `AI_API_KEY` | OpenRouter / compatible key |
| `AI_MODEL` | e.g. `openai/gpt-4o-mini` |
| `AI_BASE_URL` | Default `https://openrouter.ai/api/v1` |
| `AUTH_DEV_BYPASS` | `true` for local unsigned tokens when Clerk JWKS unset |
| `CLERK_JWKS_URL` | Clerk JWKS endpoint |
| `CLERK_ISSUER` | Clerk issuer URL |
| `CORS_ORIGINS` | `http://localhost:3000` |

### `apps/web/.env.local`

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000/api/v1` |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Optional — enables Clerk UI + middleware |
| `CLERK_SECRET_KEY` | Optional — required when Clerk is enabled |
| `NEXT_PUBLIC_DEV_AUTH_TOKEN` | Optional override (`dev:dev_user:dev@creatoros.local`) |

## Architecture notes

- Modules never call AI vendors. Path: **Module → Domain Service → AIService → ProviderAdapter**
- Switch providers with `AI_PROVIDER` / Settings — no Writer code changes
- Documents + generation runs are user-scoped after Clerk (or dev) identity upsert via `GET /me`

## Phase 1 modules

| Module | Status |
|--------|--------|
| Dashboard | Live |
| Writer Studio | Live (stream, improve, save, export) |
| History | Live |
| Settings | Live |
| Research / Social / Editor / Templates | Shell (coming soon) |

## API (v1)

- `GET /health`
- `GET /me`
- `GET|PATCH /settings`
- `POST /writer/generate`
- `POST /writer/stream` (SSE)
- `POST /writer/improve`
- `GET|POST /documents`, `GET|PATCH|DELETE /documents/{id}`, `POST /documents/{id}/duplicate`

## Production database

Point `DATABASE_URL` at Supabase Postgres:

```env
DATABASE_URL=postgresql+asyncpg://postgres:[password]@db.[project].supabase.co:5432/postgres
```

Tables auto-create on API startup; Alembic migrations live under `apps/api/alembic`.

## License

Private — all rights reserved.
