# SprintNote — Netlify Functions + Neon PostgreSQL (Migration Scaffold)

This folder is a **non-runnable scaffold** for migrating the current FastAPI + MongoDB backend (in `/app/backend`) to **Netlify Functions + Neon PostgreSQL** as described in the original PRD.

Mirror of every endpoint from `/app/backend/server.py` is provided here as a TypeScript Netlify Function. Drop into a separate Netlify project, run `npm install`, set environment variables, and `netlify deploy`.

## Stack

- Runtime: Netlify Functions (Node 20)
- DB: Neon Postgres (serverless) via `@neondatabase/serverless`
- ORM: Drizzle ORM
- Auth: JWT (jsonwebtoken) + Emergent session bridge
- AI: OpenAI Whisper-1 + GPT-5.2 (Emergent LLM key or your own OpenAI key)

## Env vars

```
DATABASE_URL=postgresql://...neon.tech/sprintnote
JWT_SECRET=...
EMERGENT_LLM_KEY=sk-emergent-...
OPENAI_API_KEY=sk-... # optional, otherwise EMERGENT_LLM_KEY is used
```

## Endpoints mirrored

| Path | Method | Handler |
|---|---|---|
| `/api/auth/signup` | POST | `functions/auth-signup.ts` |
| `/api/auth/verify-otp` | POST | `functions/auth-verify-otp.ts` |
| `/api/auth/login` | POST | `functions/auth-login.ts` |
| `/api/auth/emergent/session` | POST | `functions/auth-emergent-session.ts` |
| `/api/auth/me` | GET | `functions/auth-me.ts` |
| `/api/notes` | GET / POST | `functions/notes.ts` |
| `/api/notes/:id` | GET / PUT / DELETE | `functions/notes-id.ts` |
| `/api/ai/transcribe` | POST | `functions/ai-transcribe.ts` |
| `/api/ai/rewrite` | POST | `functions/ai-rewrite.ts` |

## Switching the mobile app

In `/app/frontend/.env`, replace `EXPO_PUBLIC_BACKEND_URL` with your Netlify URL. All other code is unchanged.

```
EXPO_PUBLIC_BACKEND_URL=https://sprintnote.netlify.app
```
