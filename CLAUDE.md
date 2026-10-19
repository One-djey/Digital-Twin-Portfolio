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
- `npm run db:push` — push the Drizzle schema (`shared/schema.ts`) to the database via `drizzle-kit`. **Don't run it against prod**: the Drizzle schema has drifted from the real tables created by `init_supabase.sql` (`serial` vs `bigint identity`, `timestamp` vs `timestamptz`, constraint names), so a push would try to alter existing tables. Apply targeted SQL in Supabase's SQL editor instead, and mirror it in `init_supabase.sql`.
- `vercel build` / `vercel dev` / `vercel --prod` — build/run/deploy exactly as Vercel would (requires `vercel` CLI and `VERCEL=true` in `.env` for `vercel dev`).

- `npm run eval` — run the chatbot eval suite (`evals/`): each case in `evals/cases.ts` (12 categories: rate, availability, stack, projects, contact, booking, lead, language, security, audiences, business, format) is played against the agent, then scored by an LLM judge (Mistral, temperature 0, 1-5 score) plus regex/tool-call checks. Needs `MISTRAL_API_KEY` only (tools are stubbed: no DB, no email). Options: `--case <id>` (repeatable), `--category <name>`; `JUDGE_MODEL` overrides the judge model (default `mistral-small-latest`, falling back to `ministral-14b-latest` on 429); `EVAL_TARGET=run` runs `digitalTwinAgent.run()` with a stubbed `submit_lead` executor (default `baseline` target is the legacy path, see "Known gaps" below). Calls are paced at >= 1.1 s (Mistral free tier ~1 req/s) with one retry on 429, so a full run takes a few minutes. Results are written to `evals/results/<timestamp>.json` (gitignored). Exit code: `0` ok, `1` a `critical` case failed or overall pass rate < 85 %, `2` no case selected / crash.

There is no unit test suite and no lint script configured (`npm run eval` is the only automated quality check, and it is LLM-based, so run it after any prompt/model change).

### Database migrations

Schema changes ship as SQL files in `db/migrations/NNN_name.sql` with a matching `NNN_name.down.sql` (additive and idempotent where possible, so the currently deployed code keeps working while they are applied). Existing: `001_chatbot_overhaul` (chat metrics + feedback columns, `contact_messages.source`, `users.phone`, `rate_limits` table) and `002_enable_rls` (optional RLS hardening). They are **not** applied by any tool: the owner runs them by hand in Supabase's SQL editor. Every migration must also be mirrored in `init_supabase.sql` (fresh databases) and in `shared/schema.ts`. `db:push` stays forbidden (see above).

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

**API routes** (`server/routes.ts` only sets `trust proxy` = 1 and registers `server/routes/{health,contact,chat}.ts`; `shared/chat.ts` is the client/server contract: limits, zod schemas, error codes, SSE event types):

- `POST /api/chat` — body `{ user_id (uuid), message: { content } }`, content trimmed, 1..`CHAT_MAX_CONTENT_LENGTH` = 1000 chars. Order of checks: zod validation (400 `invalid_request`) → IP rate limits 10/min then 100/day (429 `rate_limited`) → create user if unknown → conversation cap **before** insert: `countUserMessages + 2 > MAX_MESSAGES` (50, user + assistant combined) → 403 `conversation_limit` → global cap `countAssistantMessagesToday() >= CHAT_DAILY_CAP` (default 300 replies per UTC day, `0` disables the bot) → 503 `daily_cap` → insert the user message → load the last `HISTORY_WINDOW` = 10 messages (trimmed to start on a user turn) → stream. Everything before the stream is a plain JSON `ChatErrorBody { code, message }` (English, user-facing). Once accepted the response is SSE (`text/event-stream`, `Cache-Control: no-cache, no-transform`), events `event: <name>\ndata: <json>\n\n`: `delta {text}` (repeated), then `done {userMessage, assistantMessage}` (`ChatMessageDTO`s) or `error {code, message}` (`ai_unavailable` / `internal_error`). The agent is aborted when the client disconnects. On any AI failure/abort/empty reply the just-inserted user message is deleted (no orphan) and an `error` event is sent. On success the assistant message is stored with model, token usage, latency and finish reason.
- `GET /api/chat?user_id=` — `ChatMessageDTO[]` (`{id, role, content, createdAt, feedback}`); `200 []` for an unknown user.
- `POST /api/chat/reset` — body `{user_id}`, 5/min; deletes the user's whole conversation (the privacy policy relies on it), returns `200 []`.
- `POST /api/chat/feedback` — body `{user_id, message_id, rating: 1 | -1 | null}`, 30/min; only the user's own assistant messages (else 400).
- `POST /api/contact` — body `{user, contact}`; 5 per 15 min; upserts the user, stores the message (`source = 'form'`), then emails the owner via Resend (`sendContactEmail`). An email failure is logged and the request still returns 201 (the message is stored).
- `GET /api/health` — upserts a single row in the `heartbeat` table (via `checkDatabaseHealth` in `server/storage.ts`) — a real write, because a `select 1` alone did not stop Supabase from pausing the project in Sept 2026 — and reports whether the Mistral/OpenAI/Resend API keys are configured (key presence only, no live calls to those providers to avoid cost). Also runs `purgeExpiredData()` when the DB is up (failure is reported in the body, never affects the status): chat messages older than 60 days, contact messages/leads older than 3 years, users left with no data and created > 60 days ago, `rate_limits` rows older than 24 h; the result is returned under `purge`. Returns 200/`status: "ok"` if the DB responds, 503/`status: "down"` otherwise. Pinged every 24h by an external UptimeRobot monitor (owner's account, not in this repo), which generates real DB activity to prevent Supabase from auto-pausing the free-tier project after 7 days of inactivity, drives the retention purge, and emails an alert on any non-200. A GitHub Actions cron was used before but dropped: GitHub disables scheduled workflows after 60 days without repo activity.

**Rate limiting** (`server/rateLimitStore.ts`): `express-rate-limit` with a Postgres-backed store (`rate_limits` table, atomic fixed-window upsert) so counters are shared across serverless instances. Keys are `prefix:SHA-256(ip + RATE_LIMIT_SALT)` truncated to 32 hex chars: raw IPs are never stored. If `RATE_LIMIT_SALT` is unset a fixed fallback salt is used (set it in prod). A store error lets the request through (`passOnStoreError`).

**Logging rule**: never log message content (chat, contact form, leads) or request/response bodies that may contain it. Log metadata only (`user_id`, model, latency, token counts, finish reason, tool names). `server/middleware.ts` only logs JSON response bodies for status >= 400.

**Email** (`server/email.ts`): Resend, lazy client (the server boots without `RESEND_API_KEY`; sends then return `{ok:false}`). From `Jeremy Maisse Portfolio <portfolioData.personal.email>`, to the same address, `replyTo` = the visitor, user content HTML-escaped, Resend `idempotencyKey` per contact row.

**AI agent layer** (`server/ai/`): `types.ts` is the contract between providers, the agent loop and callers (routes, evals): `AiChatMessage`, `ToolDefinition`, `AiApiInterface.stream(messages, {tools, onText, signal})`, `RunOptions`/`RunResult`, and `submitLeadArgsSchema`. `AIAgent` (abstract, `AIAgent.ts`) picks the provider from the `model` prefix (`gpt*`/`o1*`/`o3*` → `OpenAIAPI`, `mistral*`/`ministral*`/... → `MistralAPI`, in `server/ai/APIs/`, both streaming and implementing `AiApiInterface`; clients are created lazily so a missing key fails the request, not the boot).

- `AIAgent.run(history, {onText, signal, executeTool})`: prepends the system prompt, streams text through `onText`, runs a tool loop (max `MAX_TOOL_ROUNDS` = 2 rounds with tools; the next call has no tools and must answer in text), aggregates usage/latency, returns `{text, model, usage, finishReason, latencyMs, toolCalls}`. Tool errors (unknown tool, bad JSON, executor throw) are fed back to the model as `{ok:false,error}`, never thrown.
- Fallback: if the primary provider fails **before any text was emitted** (and the caller did not abort), the call is retried once on the other provider (`gpt-4o-mini` when the primary is Mistral and `OPENAI_API_KEY` is set, `mistral-small-latest` in the opposite case). Never after text started streaming. Inside `MistralAPI`, a 429 walks down `RATE_LIMIT_FALLBACKS` (Ministral models, sticky for 10 min) — only while nothing was shown. Provider calls time out after 30 s.
- `DigitalTwinAgent.ts` is the singleton `digitalTwinAgent` (temperature 0.3, `maxTokens` 600, tools = `submit_lead`). To change the model, edit `portfolioData.ai_clone.model` in `shared/portfolio.ts` (must be a model name known to `OpenAIAPI.MODELS`/`MistralAPI.MODELS`) and set the matching API key.
- `prompts/digitalTwin.ts` — `buildSystemPrompt(now)`: static part first (prompt-cache friendly), then today's date (day granularity). Persona: **Jeremy's AI assistant**, speaks about Jeremy in the 3rd person, is transparent about being an AI, answers only from the data, **replies in the language of the visitor's latest message** (switches when they do). It embeds `portfolioData` as JSON (`<portfolio_data>`, UI-only keys stripped). Pricing/availability are indicative and confirmed by Jeremy; the TraveLearn booking link is only for TraveLearn topics. When prompt behaviour changes, run `npm run eval`.
- `tools.ts` — `SUBMIT_LEAD_TOOL` (JSON schema mirror of `submitLeadArgsSchema`: `name`, `email`, optional `phone`, one-sentence `intentSummary` <= 200 chars). The prompt only allows the call after the visitor gave name + email and explicitly agreed to a recap. The route wires it to `executeSubmitLead` (`server/leads.ts`): validates with zod, max 3 leads per user (`lead_limit`), updates the user (name/email/phone), stores a `contact_messages` row with `source = 'chat_lead'` (message = intent summary), then `sendLeadEmail` (`server/email.ts`): subject `[Chat lead] <name> — <summary>`, body = intent summary header, contact block (phone with WhatsApp/tel links), then the full timestamped conversation transcript. Returns `{ok}` / `{ok:false,error}` to the model (`email_failed` when only the notification failed — the lead is stored).

**Data layer**: `shared/schema.ts` defines Drizzle tables (`users`, `chatMessages`, `contactMessages`, `heartbeat`, `rateLimits`) plus Zod insert schemas derived via `drizzle-zod`. `server/storage.ts` is the only module that talks to the DB (via `postgres`/`drizzle-orm/postgres-js`), and all routes go through it rather than querying Drizzle directly.

**Single source of content**: `shared/portfolio.ts` exports `portfolioData`, one large object holding all personal/site content (bio, skills, projects, experience, etc.) _and_ the AI clone's model/personality config. It's imported by both the client (for rendering pages) and the server (for the system prompt) — update content here, not by hardcoding in components.

**Client** (`client/src/`): Vite + React, routed with `wouter` (see `App.tsx`), data fetching via `@tanstack/react-query` (`lib/queryClient.ts`), styling via Tailwind + shadcn/radix components (`components/ui/`). Path aliases: `@/*` → `client/src/*`, `@shared/*` → `shared/*` (defined in both `tsconfig.json` and `vite.config.ts` — keep them in sync). Pages live in `client/src/pages/`.

- **UI is English-only** (chat, forms, legal pages); the bot itself answers in the visitor's language.
- Chat: `components/ChatWidget.tsx` + `lib/chatStream.ts` (fetch + SSE parser, `ChatError(code, message, status)`). It imports types/limits from `shared/chat.ts`; never redefine them client-side. The widget streams the reply, handles `conversation_limit` with a "start a new conversation" banner, reset, thumbs feedback and suggestion chips (`portfolioData.intro.chatSuggestions`).
- Legal pages: `pages/legal/{LegalNotice,PrivacyPolicy}.tsx` (shared layout `LegalPage.tsx`) at `LEGAL_ROUTES` (`/legal/mentions-legales`, `/legal/confidentialite`, defined in `shared/chat.ts`). They hold no hard-coded identifiers: everything comes from `portfolioData.legal`. `components/Footer.tsx` (mounted in `App.tsx`) links to them. Keep the retention periods in `legal` consistent with `purgeExpiredData` in `server/storage.ts`.

## Environment variables

- `DATABASE_URL` — Postgres connection string (Supabase "Transaction pooler" URL recommended).
- `MISTRAL_API_KEY` or `OPENAI_API_KEY` — matching whichever model is set in `portfolioData.ai_clone.model`. The other key, if set, enables the cross-provider fallback (OpenAI is used as the fallback when the primary is Mistral). `MISTRAL_API_KEY` is also needed by `npm run eval` (judge).
- `RESEND_API_KEY` — Resend, for contact-form and chat-lead emails (domain `jeremy-maisse.com` verified). Optional at boot; without it emails fail and are logged.
- `RATE_LIMIT_SALT` — salt for hashing client IPs in the rate-limit store. Set it on Vercel.
- `CHAT_DAILY_CAP` — optional, max assistant replies per UTC day (default 300; `0` disables chat).
- `JUDGE_MODEL` — optional, judge model for `npm run eval`; `EVAL_TARGET` (`baseline` | `run`) selects what evals call.
- `VERCEL` — set automatically on Vercel; gates the commented-out local static-serving code path.

`init_supabase.sql` contains the initial schema to run in Supabase's SQL editor for a fresh database.

## Known gaps

- `evals/target.ts` still imports the removed `AiChatMessage` from `shared/schema.ts` and its default `baseline` target calls the removed `getResponse`; use `EVAL_TARGET=run` until it is switched to `run()`.
- `shared/chat.ts` comments `ai_unavailable` as "SSE `error` or 502", but the route only ever sends it as an SSE `error` event.
