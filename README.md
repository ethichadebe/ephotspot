# EPHotspot

Centralized multi-tenant WiFi hotspot management platform built on MikroTik infrastructure.

Operators subscribe monthly to deploy hotspot nodes. End users download the Android app, buy data via card or airtime, and roam across any EPHotspot hotspot with one account and one data balance that never expires.

## Docs

- [PRD.md](./PRD.md) — Full product requirements
- [HANDOFF.md](./HANDOFF.md) — Architecture decisions and next steps

## Stack

| Layer | Technology |
|---|---|
| Backend | Node.js + Fastify |
| ORM | Prisma + PostgreSQL |
| RADIUS | FreeRADIUS + Node.js bridge |
| Admin | Next.js (App Router) |
| Mobile | React Native (Android) |
| Real-time | Socket.io |
| Push | Firebase FCM |
| Payments | Peach Payments + Bango |

## Getting started

### Prerequisites

- Node.js 18+
- Docker + Docker Compose
- Android SDK (for mobile)

### Setup

```bash
# 1. Copy and fill in environment variables
cp .env.example .env

# 2. Start PostgreSQL and Redis
docker-compose up -d

# 3. Install all workspace dependencies
npm install

# 4. Run database migrations
cd apps/backend && npx prisma migrate dev && npx prisma db seed

# 5. Start backend
npm run dev:backend

# 6. Start admin dashboard (separate terminal)
npm run dev:admin
```

### Tests

```bash
npm test
```
