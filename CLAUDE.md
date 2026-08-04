# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A portfolio site that also serves as an AI "digital twin": a chat widget lets visitors talk to an LLM-backed clone of the site owner, primed with the owner's data from `shared/portfolio.ts`. React SPA frontend + Express API backend, deployed as a Vercel serverless function, with Postgres (Supabase) for persistence.

## Commands

- `npm run dev` — run the backend with `tsx` (Express). Client dev server is separate.
- `npm run dev:client` — run the Vite dev server for the client only.
- `npm run build` — typecheck (`tsc`), build the client (`vite build` → `dist/client`), then bundle the server with esbuild (→ `dist/server/index.js`). **Vercel does not run this** — see "Deployment: `dist/` must be committed" below.
- `npm run start` — run the built server from `dist/server/index.js`.
- `npm run check` — typecheck only (`tsc`, no emit).
- `npm run db:push` — push the Drizzle schema (`shared/schema.ts`) to the database via `drizzle-kit`.
- `vercel build` / `vercel dev` / `vercel --prod` — build/run/deploy exactly as Vercel would (requires `vercel` CLI and `VERCEL=true` in `.env` for `vercel dev`).

There is no test suite and no lint script configured.

### Two server entrypoints: `server/index.ts` (Vercel) vs `server/dev.ts` (local)

`server/index.ts` is the Vercel serverless entrypoint only — it exports a `handler(req, res)` and never calls `server.listen` or touches `server/vite.ts`. `server/dev.ts` (used by `npm run dev`) is the local-only entrypoint: it sets up Vite middleware (`setupVite`/`serveStatic`) and calls `server.listen`.

They're kept separate on purpose. Previously this was one file with an `if (!process.env.VERCEL)` runtime guard around the Vite/listen code — but esbuild bundles `server/index.ts` as a single chunk (no code splitting), so a dynamic `import("./vite.ts")` still gets its _own_ static imports (`vite`, `@vitejs/plugin-react`, etc. — devDependencies) hoisted to the top of the bundled output as real ESM `import` statements, outside the runtime guard. Node then fails to resolve those devDependencies when Vercel loads the function. Splitting into two entrypoints means `server/index.ts`'s import graph never reaches `server/vite.ts`, so esbuild can't pull those packages into the Vercel bundle at all — fixed by construction, not by discipline.

### Deployment: `dist/` must be committed

`vercel.json` uses the legacy `builds` config (`{ "src": "dist/server/index.js", "use": "@vercel/node" }`, etc.) instead of Vercel's standard Build Command. This means **Vercel never runs `npm run build`** — it just packages whatever `dist/server/index.js` and `dist/client/**` already exist in the git checkout (this is also why `dist/` is tracked in git instead of gitignored).

**Consequence**: any change to `server/`, `client/`, or `shared/` has no effect in production until you run `npm run build` locally and commit the regenerated `dist/` alongside the source change. Pushing source changes without rebuilding `dist/` deploys "successfully" (no build error) but silently serves the old code — this bit us once: `/api/health` returned 404 in production for a full deploy cycle because `dist/` wasn't rebuilt.

Workflow for any server/client change:

```bash
npm run build
git add server/ client/ shared/ dist/   # adjust to what actually changed, but always include dist/
git commit -m "..."
git push origin main   # Vercel's Git integration auto-deploys on push to main
```

## Architecture

**Serverless entrypoint**: `server/index.ts` builds an Express `app` and exports a `handler(req, res)` function consumed by Vercel as a Node serverless function (see `vercel.json`). Routing to that function, static assets (`dist/client`), and `public/` files are all wired via `vercel.json`'s `routes`, not Express static middleware — Express itself is stripped of static-file handling in production ("Vercel s'en charge via vercel.json").

**API routes** (`server/routes.ts`, registered via `registerRoutes(app)`):

- `POST /api/contact` — upsert a user + store a contact-form message.
- `GET /api/chat?user_id=` — fetch a user's chat history.
- `POST /api/chat` — post a user message, get an AI reply, both persisted; hard-capped at `MAX_MESSAGES = 20` messages (user+assistant combined) per user.
- `POST /api/chat/reset` — wipe a user's chat history.
- `POST /api/rebootcamp-email` (+ its own CORS allowlist) — send email via Mailjet, used by an external site (rebootcamp.fr), unrelated to the portfolio's own chat/contact flow.
- `GET /api/health` — runs a real `select 1` against Postgres (via `checkDatabaseHealth` in `server/storage.ts`) and reports whether the Mistral/OpenAI/Mailjet API keys are configured (key presence only, no live calls to those providers to avoid cost). Returns 200/`status: "ok"` if the DB responds, 503/`status: "down"` otherwise. Pinged every 3 days by `.github/workflows/keep-supabase-awake.yml` to generate real DB activity and prevent Supabase from auto-pausing the free-tier project after 7 days of inactivity — requires the `SITE_URL` repo variable (Settings > Secrets and variables > Actions > Variables) to be set to the deployed site's origin.

**AI agent layer** (`server/ai/`): `AIAgent` (abstract base, `AIAgent.ts`) picks a provider implementation — `OpenAIAPI` or `MistralAPI` (`server/ai/APIs/`), both implementing `AiApiInterface` — based on a `model` string prefix (`gpt*` vs `mistral*`). `DigitalTwinAgent.ts` extends `AIAgent`, builds its system prompt by embedding the _entire_ `portfolioData` object (from `shared/portfolio.ts`) as JSON, and is exported as the singleton `digitalTwinAgent` used by the chat route. To change the model, edit `portfolioData.ai_clone.model` in `shared/portfolio.ts` (must start with `gpt` or `mistral` to route correctly) and set the matching API key env var.

**Data layer**: `shared/schema.ts` defines Drizzle tables (`users`, `chatMessages`, `contactMessages`) plus Zod insert schemas derived via `drizzle-zod`. `server/storage.ts` is the only module that talks to the DB (via `postgres`/`drizzle-orm/postgres-js`), and all routes go through it rather than querying Drizzle directly.

**Single source of content**: `shared/portfolio.ts` exports `portfolioData`, one large object holding all personal/site content (bio, skills, projects, experience, etc.) _and_ the AI clone's model/personality config. It's imported by both the client (for rendering pages) and the server (for the system prompt) — update content here, not by hardcoding in components.

**Client** (`client/src/`): Vite + React, routed with `wouter` (see `App.tsx`), data fetching via `@tanstack/react-query` (`lib/queryClient.ts`), styling via Tailwind + shadcn/radix components (`components/ui/`). Path aliases: `@/*` → `client/src/*`, `@shared/*` → `shared/*` (defined in both `tsconfig.json` and `vite.config.ts` — keep them in sync). Pages live in `client/src/pages/`; the chat UI is `components/ChatWidget.tsx`, talking to the `/api/chat*` routes.

## Environment variables

- `DATABASE_URL` — Postgres connection string (Supabase "Transaction pooler" URL recommended).
- `MISTRAL_API_KEY` or `OPENAI_API_KEY` — matching whichever model is set in `portfolioData.ai_clone.model`.
- `MJ_API_KEY_PUBLIC` / `MJ_API_KEY_PRIVATE` — Mailjet, used only by `/api/rebootcamp-email`.
- `VERCEL` — set automatically on Vercel; gates the commented-out local static-serving code path.

`init_supabase.sql` contains the initial schema to run in Supabase's SQL editor for a fresh database.
