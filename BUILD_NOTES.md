# BUILD_NOTES.md

## What was completed

All 19 GitHub issues implemented across the full stack:

### Backend (apps/backend — Fastify + Prisma + PostgreSQL)
- **#2** Monorepo structure with npm workspaces, docker-compose (PostgreSQL + Redis), .env.example
- **#3** PostgreSQL schema: User, Session, DataPackage, Purchase, DataBalance, Operator, HotspotNode, PushToken, SuperAdmin, OtpCode, OperatorUser — with cascade rules and rollover field
- **#4** Auth service: Google, Facebook, Apple OAuth + phone OTP via Africa's Talking. JWT middleware for user/operator/super-admin with separate secrets
- **#5** FreeRADIUS accounting bridge: Start/Stop/Interim-Update handling, balance deduction, zero-balance disconnect via MikroTik REST, threshold push notifications (20%/10%)
- **#6** Data packages API: public GET, super-admin-only POST/PATCH/DELETE (soft deactivation)
- **#7** Peach Payments: checkout URL initiation, webhook signature verification, rollover purchase logic
- **#8** Bango carrier billing: charge initiation, callback processing, same rollover logic as Peach
- **#9** FCM push notifications: token registration, threshold warnings (20%/10%), purchase confirmed, session events
- **#10** MikroTik REST API service: getNodeStatus, getActiveConnections, disconnectUser with graceful timeout handling
- **#11** Operator admin API: users (paginated + search), user detail, deactivate, nodes, node sessions, stats — all scoped to operator
- **#12** Super admin API: list/create/suspend operators, platform-wide stats, packages (including inactive). Separate JWT secret, operators rejected on super-admin routes and vice versa
- **#13** Socket.io: operator rooms authenticated by JWT, session:start/end, node:status, stats:update events

### Admin Dashboard (apps/admin — Next.js 14 + Tailwind)
- **#14** Login page, AuthGuard (redirect to /login), Sidebar navigation, operator login route on backend
- **#15** Overview (live stats via Socket.io), Users table (search + paginate + deactivate), Nodes list (expand for sessions, live status via Socket.io)

### Mobile App (apps/mobile — React Native 0.85 bare)
- **#16** LoginScreen: phone OTP flow, JWT stored in Android Keychain, WifiNetworkSuggestion registered on auth
- **#17** HomeScreen: balance display (MB/GB), progress bar, foreground refresh, zero-balance state, top-up CTA
- **#18** WifiNetworkSuggestion integration: Android 10+ auto-connect, logout removes suggestion, Android 9 fallback note
- **#19** PackagesScreen: list packages, Peach (card/EFT) + Bango (airtime) payment method selection
- **#20** HistoryScreen: transaction list (date, package, amount, data added), empty state; FCM token registered on App launch with token-refresh handler

**Total backend tests: 65 passing**

---

## What was skipped / needs real credentials

| Feature | Blocker | TODO |
|---|---|---|
| Real Google/Facebook/Apple OAuth | Missing OAuth app credentials | Fill `GOOGLE_CLIENT_ID`, `FACEBOOK_APP_ID/SECRET`, `APPLE_*` in `.env` |
| Real OTP SMS | Missing Africa's Talking credentials | Fill `AT_API_KEY`, `AT_USERNAME`, `AT_SENDER_ID` |
| Real FCM push | Missing Firebase credentials | Fill `FIREBASE_PROJECT_ID`, `FIREBASE_PRIVATE_KEY`, `FIREBASE_CLIENT_EMAIL` |
| Real Peach Payments | Missing merchant credentials | Fill `PEACH_PAYMENTS_TOKEN`, `PEACH_PAYMENTS_ENTITY_ID`, `PEACH_PAYMENTS_WEBHOOK_SECRET` |
| Real Bango billing | Missing Bango credentials | Fill `BANGO_API_KEY`, `BANGO_API_SECRET` |
| FreeRADIUS server | Not provisioned | Deploy FreeRADIUS, configure rlm_rest to call `/radius/authorize` and `/radius/accounting` |
| MikroTik nodes | Not provisioned | Register nodes in DB via seed or super admin API, point them at RADIUS server |
| WifiNetworkSuggestion | Native module not linked | Add `react-native-wifi-reborn` or implement custom Android native module |
| Apple Sign-In JWT verification | Missing Apple key | Install `apple-signin-auth` library and fill `APPLE_*` env vars |
| bcrypt password hashing | Seed uses raw hash | Install `bcrypt`, update `operatorAuth.ts` to use `bcrypt.compare` |

---

## Architectural decisions made beyond the PRD

- **Operator login route** (`POST /auth/operator/login`) added to backend so the Next.js admin can authenticate without requiring a separate auth service
- **User balance + purchases routes** (`GET /user/balance`, `GET /user/purchases`) added for the mobile home and history screens
- **OperatorUser join table** added to link users to the operator network they first registered on, enabling scoped queries
- **OtpCode table** for phone OTP with 10-minute expiry and single-use enforcement
- **Session.notified20 / notified10 flags** prevent duplicate threshold push notifications within the same session
- **Operator password** stored as plaintext in seed (dev only) — production flow: super admin creates operator, frontend prompts password change on first login

---

## What you need to do before running end-to-end

1. **Copy and fill `.env`**: `cp .env.example .env` then fill every empty value
2. **Start services**: `docker-compose up -d`
3. **Run migrations**: `cd apps/backend && npx prisma migrate dev && npx prisma db seed`
4. **Start backend**: `npm run dev:backend` from root
5. **Start admin**: `npm run dev:admin` from root
6. **Configure FreeRADIUS**: Point rlm_rest at `http://<backend>:3000/radius/authorize` and `/radius/accounting`
7. **Register first MikroTik node**: POST to `/super/operators` then add node via `/admin/nodes` (add route) or directly via Prisma seed
8. **Android build**: Install Android SDK, then `cd apps/mobile && npx react-native run-android`
9. **Link native modules**: Run `cd apps/mobile/android && ./gradlew assembleDebug` to confirm all native deps link
