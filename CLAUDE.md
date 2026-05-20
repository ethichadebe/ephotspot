# CLAUDE.md — EPHotspot Autonomous Build Instructions

> This file tells Claude Code exactly what to build, how to work, and what decisions have already been made. Read this fully before writing a single line of code.

---

## What you are building

**EPHotspot** — a centralized, multi-tenant WiFi hotspot management platform built on MikroTik infrastructure. Full context is in `PRD.md`. All architectural decisions are in `HANDOFF.md`. Do not re-ask questions that are already answered in those files.

---

## Your working mode

You are working **autonomously**. The human is not available for questions. Follow these rules:

1. **Work through GitHub issues in order** — Issue #1 first, then #2, then #3, and so on. Do not skip ahead or work out of order. Each issue lists its dependencies.
2. **One issue at a time** — complete an issue fully before starting the next. An issue is complete when all its acceptance criteria are checked off.
3. **Commit after every issue** — commit with the message format: `feat: close #N — [issue title]`
4. **If you hit a genuine blocker** (missing API key, external service unavailable) — skip that specific integration, leave a `TODO:` comment with what is needed, and continue. Do not stop working.
5. **Do not ask for clarification** on anything already covered in `PRD.md` or `HANDOFF.md`. Use your best judgment for minor decisions not covered there.
6. **Write tests** for all backend API routes and service functions. Use Jest.

---

## Stack (do not deviate)

| Layer | Technology |
|---|---|
| Backend | Node.js + Fastify |
| ORM | Prisma |
| Database | PostgreSQL |
| RADIUS | FreeRADIUS + Node.js bridge |
| Admin web | Next.js (App Router) |
| Mobile | React Native (Android, Expo-free bare workflow) |
| Real-time | Socket.io |
| Push | Firebase Admin SDK (FCM) |
| Payments | Peach Payments SDK + Bango carrier billing API |
| Auth | JWT (jsonwebtoken) + OAuth (Google, Facebook, Apple) + OTP via Africa's Talking |
| Testing | Jest + Supertest |

---

## Monorepo structure

```
ephotspot/
├── apps/
│   ├── backend/          # Fastify API + RADIUS bridge + Socket.io
│   ├── admin/            # Next.js operator dashboard
│   └── mobile/           # React Native Android app
├── packages/
│   └── shared/           # Shared types, constants, utilities
├── docker-compose.yml    # PostgreSQL + Redis
├── .env.example          # All required env vars documented
├── PRD.md
├── HANDOFF.md
└── CLAUDE.md             # This file
```

---

## Key architectural decisions (do not revisit)

- **Central RADIUS** — one FreeRADIUS server, all MikroTik nodes point to it. Nodes are enforcement points only; all business logic lives in the backend.
- **Data rollover** — when a user purchases, new balance = current remaining MB + purchased package MB. Never reset to zero on purchase.
- **Hard cut at zero** — when DataBalance hits 0, call MikroTik REST API to terminate session immediately. No grace period.
- **Push thresholds** — send FCM notification at 20% remaining and again at 10% remaining. Evaluate after every RADIUS Accounting-Interim-Update packet. Do not send duplicates within the same session.
- **Operator data isolation** — all admin API endpoints must scope queries to the authenticated operator's data. No operator can see another operator's users or nodes.
- **Super admin JWT** — use a separate JWT secret for super admin tokens. Super admin routes must reject operator JWTs and vice versa.
- **Android 10+ target** — use `WifiNetworkSuggestion` API for auto-connect. Include a fallback manual password screen for Android 9 and below.

---

## Environment variables needed

Create a `.env.example` with these keys (Issue #1). Real values will be filled in by the human later:

```
# Database
DATABASE_URL=

# JWT
JWT_SECRET=
JWT_SUPER_ADMIN_SECRET=

# OAuth
GOOGLE_CLIENT_ID=
FACEBOOK_APP_ID=
FACEBOOK_APP_SECRET=
APPLE_CLIENT_ID=
APPLE_TEAM_ID=
APPLE_KEY_ID=
APPLE_PRIVATE_KEY=

# OTP (Africa's Talking)
AT_API_KEY=
AT_USERNAME=
AT_SENDER_ID=

# Firebase
FIREBASE_PROJECT_ID=
FIREBASE_PRIVATE_KEY=
FIREBASE_CLIENT_EMAIL=

# Payments
PEACH_PAYMENTS_TOKEN=
PEACH_PAYMENTS_ENTITY_ID=
BANGO_API_KEY=
BANGO_API_SECRET=

# MikroTik
MIKROTIK_DEFAULT_PORT=8728

# Redis
REDIS_URL=

# App
PORT=3000
NODE_ENV=development
```

---

## Definition of done

The build session is complete when:
- [ ] All 19 GitHub issues are closed with a commit referencing the issue number
- [ ] `docker-compose up` starts the full local environment
- [ ] `npm run dev` in `apps/backend` starts the API without errors
- [ ] `npm run dev` in `apps/admin` starts the Next.js dashboard without errors
- [ ] `npx react-native run-android` in `apps/mobile` builds without errors
- [ ] `npm test` passes in `apps/backend`
- [ ] All `.env.example` keys are documented with a comment explaining what each is for

---

## When the human returns

They will review:
1. Whether the monorepo structure matches the spec above
2. Whether all 19 issues are closed on GitHub
3. Whether the acceptance criteria on each issue are met
4. Whether `docker-compose up && npm run dev` works end to end

Leave a `BUILD_NOTES.md` in the repo root summarising:
- What was completed
- What was skipped and why (missing API keys, blockers)
- Any decisions you made that weren't in the PRD
- What the human needs to do before the app can run end to end (fill in env vars, configure MikroTik, etc.)

---

*Start with Issue #1. Work until all 19 are done. Commit everything.*
