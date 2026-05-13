# SprintNote — Product Requirements Document

## Overview
SprintNote is a premium AI-powered voice notes mobile app (Expo / React Native) that turns rough voice recordings into beautifully formatted text in seconds. Inspired by AudioPen but with a modern indigo aesthetic, the app feels like a real funded startup product — minimal, elegant, fast, polished, and highly addictive to use.

## Stack
- **Mobile/Web**: Expo SDK 54, React Native, Expo Router, TypeScript, Zustand, TanStack Query, Reanimated, lucide-react-native, expo-audio, expo-secure-store
- **Active backend** (this environment): FastAPI + MongoDB on port 8001 with `/api` prefix
- **Migration scaffold** (per user request): `/app/apps/backend-netlify` — Netlify Functions + Neon PostgreSQL + Drizzle ORM (mirrors every endpoint)
- **AI**: OpenAI Whisper-1 (transcription) + GPT-5.2 (rewrite & style) via Emergent Universal LLM Key
- **Auth**: JWT email/password (with 6-digit email OTP) + Emergent-managed Google OAuth

## Theme
- Indigo / Electric Blue (`#4F46E5`) on warm off-white (`#FDFCFB`)
- Light theme only (no dark mode)
- Serif display (Georgia) for hero titles, geometric sans for UI
- Soft diffuse shadows, large rounded cards (Linear/Raycast inspired)

## Implemented features
- Splash → onboarding (3 slides) → login/signup → OTP verify → dashboard
- Email/password signup + login + 6-digit OTP verification
- Emergent-managed Google OAuth (`/api/auth/emergent/session`)
- Dashboard with tab pills (All Notes / Favorites / dynamic folders), search bar, "X/Y notes saved" indicator, floating animated record FAB with pulse ring
- Full recording screen with live waveform, mm:ss timer, pause/resume/stop, haptics, processing state
- AI transcription (Whisper-1) and AI rewrite into 7 styles (Clear & Simple, Bullet Summary, Professional Notes, Meeting Minutes, Journal, Blog Draft, Task List) with Low/Medium/High rewriting levels
- Note detail screen with serif hero title, divider, transcript, in-place editing, favorite toggle, delete confirmation, style picker bottom sheet (animated slide-up)
- Search screen with debounced query and popular tags
- Premium paywall with monthly/annual cards
- Settings with profile, preferences, support sections, sign out

## API endpoints (FastAPI, all `/api/*`)
- `POST /auth/signup`, `POST /auth/verify-otp`, `POST /auth/login`, `POST /auth/emergent/session`, `GET /auth/me`, `POST /auth/logout`
- `GET /notes`, `POST /notes`, `GET /notes/{id}`, `PUT /notes/{id}`, `DELETE /notes/{id}`
- `GET /folders`
- `POST /ai/transcribe` (multipart audio → text), `POST /ai/rewrite` (transcript + style → polished)

## Smart business enhancement
The freemium quota (50 notes free vs. unlimited Pro) is displayed in real time as a pill indicator on the dashboard (`X/50 notes saved`). Combined with the inline "Explore Pro" header chip, this gentle nudge drives free-to-paid conversion the same way AudioPen does — without being intrusive — and is positioned exactly where users land after every save, the highest-intent moment.

## Mocked / partial
- Audio recording on web (Expo Go on a device captures audio; the web preview uses a sample transcript when no microphone is available — the GPT-5.2 rewrite then runs on that sample so the full flow remains demonstrable).
- Apple Sign-In: not implemented in MVP (only email OTP + Google). Easy to add via `expo-apple-authentication`.
- RevenueCat: paywall is UI-only — does not call any billing SDK yet (per scope decision).
- SQLite offline cache: not implemented in MVP (would be added with `expo-sqlite`).
- Email delivery of OTP: prints to backend logs and returns `dev_otp` in the signup response for testing. Wire to SendGrid/Resend to enable production email.

## Netlify migration scaffold
`/app/apps/backend-netlify/` contains a non-runnable Netlify Functions project that mirrors every FastAPI endpoint, using Drizzle ORM + Neon Postgres. To migrate: provide `DATABASE_URL`, `JWT_SECRET`, `EMERGENT_LLM_KEY` env vars, run `npm install && drizzle-kit push && netlify deploy`, then point the Expo `EXPO_PUBLIC_BACKEND_URL` at your Netlify site.

## Test credentials
See `/app/memory/test_credentials.md`.
