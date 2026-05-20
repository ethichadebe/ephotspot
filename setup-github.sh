#!/bin/bash
# NetPulse — GitHub repo + issues setup script
# Prerequisites: GitHub CLI installed and authenticated (gh auth login)
# Usage: bash setup-github.sh

set -e

REPO_NAME="netpulse"
REPO_DESC="Centralized multi-tenant WiFi hotspot platform built on MikroTik, FreeRADIUS, Node.js and React Native"

echo "🚀 Creating GitHub repo: $REPO_NAME..."
gh repo create "$REPO_NAME" \
  --description "$REPO_DESC" \
  --private \
  --clone

cd "$REPO_NAME"

echo "📄 Adding project files..."
cp ../PRD.md .
cp ../HANDOFF.md .

cat > README.md << 'EOF'
# NetPulse

Centralized multi-tenant WiFi hotspot management platform built on MikroTik infrastructure.

Operators subscribe monthly to deploy hotspot nodes. End users download the Android app, buy data via card or airtime, and roam across any NetPulse hotspot with one account and one data balance that never expires.

## Docs
- [PRD.md](./PRD.md) — Full product requirements document
- [HANDOFF.md](./HANDOFF.md) — Agent handoff document with all decisions and next steps

## Stack
- **Backend** — Node.js, Express/Fastify, PostgreSQL, Prisma, FreeRADIUS
- **Admin** — Next.js
- **Mobile** — React Native (Android first)
- **Real-time** — Socket.io
- **Notifications** — Firebase Cloud Messaging
- **Payments** — Peach Payments + Bango carrier billing

## Getting started
See open GitHub issues — work through them in order starting with Issue 1.
EOF

git add .
git commit -m "init: add PRD, handoff doc, and README"
git push

echo "✅ Repo created and files pushed."
echo ""
echo "📋 Creating GitHub labels..."
gh label create "setup"   --color "0075ca" --force
gh label create "feature" --color "7057ff" --force
gh label create "chore"   --color "e4e669" --force
gh label create "size:S"  --color "c2e0c6" --force
gh label create "size:M"  --color "f9d0c4" --force
gh label create "size:L"  --color "f29513" --force

echo "✅ Labels created."
echo ""
echo "📝 Creating issues..."

# ── Issue 1 ──────────────────────────────────────────────────────────────────
gh issue create \
  --title "Initialize monorepo project structure" \
  --label "setup,size:S" \
  --body "## Why
Every other issue depends on a consistent project structure being in place first.

## What to build
A monorepo using npm workspaces with four packages: \`apps/backend\`, \`apps/admin\`, \`apps/mobile\`, \`packages/shared\`. Include root \`package.json\`, \`.gitignore\`, \`README.md\`, and a \`docker-compose.yml\` with PostgreSQL and Redis services.

## Acceptance criteria
- [ ] \`npm install\` from root installs all workspace dependencies
- [ ] \`docker-compose up\` starts PostgreSQL on port 5432 and Redis on port 6379
- [ ] Each app folder has its own \`package.json\` with correct workspace name
- [ ] \`packages/shared\` is importable from all three apps
- [ ] \`.env.example\` exists at root with all required environment variable keys documented

## Depends on
None"

echo "✅ Issue 1 created"

# ── Issue 2 ──────────────────────────────────────────────────────────────────
gh issue create \
  --title "Design and migrate PostgreSQL schema" \
  --label "setup,size:M" \
  --body "## Why
All backend services read from and write to this schema. Must exist before any API work begins.

## What to build
Prisma schema covering: \`User\`, \`Session\`, \`DataPackage\`, \`Purchase\`, \`DataBalance\`, \`Operator\`, \`HotspotNode\`, \`PushToken\`, \`SuperAdmin\`. Run initial migration and seed script with one super admin, two test packages, and one test operator.

## Acceptance criteria
- [ ] \`npx prisma migrate dev\` runs without errors
- [ ] \`npx prisma db seed\` creates test super admin, 2 packages (1GB, 5GB), 1 operator
- [ ] \`DataBalance\` model has a \`rolledOverMb\` field tracking accumulated rollover
- [ ] \`HotspotNode\` model stores MikroTik IP, RADIUS secret, and online status
- [ ] All foreign key relationships are enforced with correct cascade rules
- [ ] Prisma client generates without type errors

## Depends on
Issue #1"

echo "✅ Issue 2 created"

# ── Issue 3 ──────────────────────────────────────────────────────────────────
gh issue create \
  --title "Backend — authentication service (SSO + phone OTP)" \
  --label "feature,size:M" \
  --body "## Why
Every user-facing and operator-facing feature requires an authenticated identity.

## What to build
Node.js/Express auth service with routes for Google, Facebook, and Apple OAuth and phone number OTP via Africa's Talking or Twilio. On first login, create a \`User\` record. Return a signed JWT on success.

## Acceptance criteria
- [ ] \`POST /auth/google\` accepts a Google ID token and returns a JWT
- [ ] \`POST /auth/facebook\` accepts a Facebook access token and returns a JWT
- [ ] \`POST /auth/apple\` accepts an Apple identity token and returns a JWT
- [ ] \`POST /auth/phone/request\` sends an OTP SMS to the provided number
- [ ] \`POST /auth/phone/verify\` validates OTP and returns a JWT
- [ ] New users are created in the \`User\` table on first successful auth
- [ ] Existing users are matched by phone number or OAuth provider ID
- [ ] JWT is verified correctly by a shared middleware used in all other routes

## Depends on
Issue #2"

echo "✅ Issue 3 created"

# ── Issue 4 ──────────────────────────────────────────────────────────────────
gh issue create \
  --title "FreeRADIUS setup with Node.js accounting bridge" \
  --label "setup,size:L" \
  --body "## Why
This is the core infrastructure that authenticates users on MikroTik and tracks their data consumption in real time.

## What to build
FreeRADIUS server configured to use a PostgreSQL backend. A Node.js service that listens for RADIUS accounting packets (session start, stop, interim updates) and writes data usage to the \`Session\` table and deducts from \`DataBalance\`. When a user's balance hits zero, the bridge calls the MikroTik REST API to terminate their session.

## Acceptance criteria
- [ ] FreeRADIUS accepts Access-Request from a MikroTik and returns Access-Accept for a valid user
- [ ] FreeRADIUS returns Access-Reject for a user with zero data balance
- [ ] Accounting-Start packet creates a new \`Session\` record
- [ ] Accounting-Interim-Update deducts data from \`DataBalance\` in real time
- [ ] Accounting-Stop closes the \`Session\` record with final bytes used
- [ ] When balance reaches zero mid-session, MikroTik REST API is called to disconnect the user
- [ ] All accounting events are logged with timestamps

## Depends on
Issue #2"

echo "✅ Issue 4 created"

# ── Issue 5 ──────────────────────────────────────────────────────────────────
gh issue create \
  --title "Data packages API" \
  --label "feature,size:S" \
  --body "## Why
The mobile app and admin dashboard both need to read available packages. Super admin needs to manage them.

## What to build
REST endpoints to list, create, update, and deactivate data packages. Packages have: name, data allowance in MB, price in ZAR, and active flag.

## Acceptance criteria
- [ ] \`GET /packages\` returns all active packages (public, no auth required)
- [ ] \`POST /packages\` creates a new package (super admin JWT required)
- [ ] \`PATCH /packages/:id\` updates a package (super admin JWT required)
- [ ] \`DELETE /packages/:id\` deactivates a package without deleting it (super admin JWT required)
- [ ] Deactivated packages are hidden from \`GET /packages\` but visible in super admin endpoints

## Depends on
Issue #3"

echo "✅ Issue 5 created"

# ── Issue 6 ──────────────────────────────────────────────────────────────────
gh issue create \
  --title "Peach Payments integration" \
  --label "feature,size:M" \
  --body "## Why
Enables users to buy data packages via card or instant EFT — the primary online payment method.

## What to build
Backend service that initiates a Peach Payments checkout, handles the webhook callback, and on successful payment: creates a \`Purchase\` record, adds data to \`DataBalance\` with rollover logic (new balance = current remaining + new package MB), and triggers a push notification.

## Acceptance criteria
- [ ] \`POST /payments/peach/initiate\` returns a checkout URL for a given package ID
- [ ] Peach Payments webhook at \`POST /payments/peach/webhook\` is verified with correct signature
- [ ] Successful payment creates a \`Purchase\` record with package ID, amount, timestamp
- [ ] \`DataBalance\` is updated: new total = existing remaining MB + purchased MB
- [ ] Rollover field is incremented correctly if user had remaining balance before purchase
- [ ] Push notification is sent to user's FCM token confirming purchase and new balance
- [ ] Failed or cancelled payments do not modify \`DataBalance\`

## Depends on
Issues #3, #5"

echo "✅ Issue 6 created"

# ── Issue 7 ──────────────────────────────────────────────────────────────────
gh issue create \
  --title "Bango carrier billing integration" \
  --label "feature,size:M" \
  --body "## Why
Enables users to buy data by charging to their airtime — works over GSM with no internet required.

## What to build
Integration with Bango's carrier billing API supporting Vodacom, MTN, Cell C, and Telkom. Initiates a carrier billing charge from the mobile app, handles callback, and on success applies the same purchase and rollover logic as Issue #6.

## Acceptance criteria
- [ ] \`POST /payments/bango/initiate\` starts a carrier billing flow for a given package and phone number
- [ ] Bango callback at \`POST /payments/bango/callback\` is verified and processed
- [ ] Successful charge creates a \`Purchase\` record identical in structure to Peach purchases
- [ ] \`DataBalance\` rollover logic is identical to Issue #6
- [ ] Failed charge returns a meaningful error code to the mobile app
- [ ] Push notification confirms successful airtime purchase and new balance

## Depends on
Issues #3, #5"

echo "✅ Issue 7 created"

# ── Issue 8 ──────────────────────────────────────────────────────────────────
gh issue create \
  --title "Push notifications service (FCM)" \
  --label "feature,size:S" \
  --body "## Why
Users must be warned before data runs out and confirmed after purchases — without this the UX breaks down.

## What to build
A notification service using Firebase Admin SDK. Stores FCM tokens in the \`PushToken\` table. Exposes an internal function callable by other services: \`sendNotification(userId, title, body)\`. Triggers threshold warnings at 20% and 10% remaining balance, evaluated after every RADIUS accounting update.

## Acceptance criteria
- [ ] \`POST /notifications/register\` saves an FCM token against a user ID
- [ ] Notification is sent when data balance drops below 20% of last purchased package
- [ ] Notification is sent when data balance drops below 10% of last purchased package
- [ ] Notification is sent on successful purchase (from Issues #6 and #7)
- [ ] Notification is sent when session is terminated due to zero balance
- [ ] Duplicate threshold notifications are not sent within the same session

## Depends on
Issues #4, #6, #7"

echo "✅ Issue 8 created"

# ── Issue 9 ──────────────────────────────────────────────────────────────────
gh issue create \
  --title "MikroTik REST API integration service" \
  --label "feature,size:M" \
  --body "## Why
The admin dashboard needs real-time node status and the platform needs to remotely manage hotspot nodes.

## What to build
A Node.js service that wraps MikroTik's REST API. Exposes internal functions: \`getActiveConnections(nodeId)\`, \`disconnectUser(nodeId, userId)\`, \`getNodeStatus(nodeId)\`. Called by the RADIUS bridge (Issue #4) and the admin dashboard API.

## Acceptance criteria
- [ ] \`getNodeStatus(nodeId)\` returns online/offline status and uptime for a given MikroTik node
- [ ] \`getActiveConnections(nodeId)\` returns list of connected users with session duration and data used
- [ ] \`disconnectUser(nodeId, userId)\` successfully terminates the user's session on the MikroTik
- [ ] All functions handle MikroTik connection timeouts gracefully and return a structured error
- [ ] Node credentials (IP, username, password) are retrieved from the \`HotspotNode\` table, never hardcoded

## Depends on
Issue #2"

echo "✅ Issue 9 created"

# ── Issue 10 ──────────────────────────────────────────────────────────────────
gh issue create \
  --title "Operator admin API" \
  --label "feature,size:M" \
  --body "## Why
Operators need backend endpoints to power their admin dashboard.

## What to build
Authenticated REST endpoints scoped to an operator's own data: list users, view user balance, deactivate a user, list hotspot nodes and their status, view active sessions, and get revenue and usage summary stats.

## Acceptance criteria
- [ ] \`GET /admin/users\` returns paginated list of users on the operator's network
- [ ] \`GET /admin/users/:id\` returns user detail including current balance and purchase history
- [ ] \`PATCH /admin/users/:id/deactivate\` blocks a user from authenticating via RADIUS
- [ ] \`GET /admin/nodes\` returns all operator's MikroTik nodes with online/offline status
- [ ] \`GET /admin/nodes/:id/sessions\` returns active sessions on a specific node
- [ ] \`GET /admin/stats\` returns: total users, active sessions now, data consumed today, revenue this month
- [ ] All endpoints reject requests from operators accessing another operator's data

## Depends on
Issues #3, #4, #9"

echo "✅ Issue 10 created"

# ── Issue 11 ──────────────────────────────────────────────────────────────────
gh issue create \
  --title "Super admin API" \
  --label "feature,size:S" \
  --body "## Why
Platform owner needs to manage operators, subscriptions, and global packages.

## What to build
Super admin authenticated endpoints: list all operators, create/suspend an operator account, list all packages (including inactive), view platform-wide stats.

## Acceptance criteria
- [ ] \`GET /super/operators\` lists all operators with subscription status
- [ ] \`POST /super/operators\` creates a new operator account with credentials
- [ ] \`PATCH /super/operators/:id/suspend\` disables an operator and blocks their users from RADIUS auth
- [ ] \`GET /super/stats\` returns platform-wide: total users, total nodes, total revenue, active sessions
- [ ] Super admin JWT is separate from operator JWT and cannot access operator-scoped routes

## Depends on
Issues #3, #5, #10"

echo "✅ Issue 11 created"

# ── Issue 12 ──────────────────────────────────────────────────────────────────
gh issue create \
  --title "Real-time monitoring with Socket.io" \
  --label "feature,size:S" \
  --body "## Why
The admin dashboard needs live updates — active sessions and node status should update without page refresh.

## What to build
Socket.io server integrated into the backend. Emits events: \`session:start\`, \`session:end\`, \`node:status\`, \`stats:update\` scoped per operator room. Admin dashboard client subscribes on login.

## Acceptance criteria
- [ ] Operator connects to a Socket.io room authenticated by their JWT
- [ ] \`session:start\` event is emitted when a new RADIUS session begins on their node
- [ ] \`session:end\` event is emitted when a session closes
- [ ] \`node:status\` event is emitted when a node goes online or offline
- [ ] Events from one operator are not visible to another operator's socket room

## Depends on
Issues #4, #10"

echo "✅ Issue 12 created"

# ── Issue 13 ──────────────────────────────────────────────────────────────────
gh issue create \
  --title "Admin dashboard — Next.js setup and overview screen" \
  --label "feature,size:M" \
  --body "## Why
Operators need a web interface to manage their deployment. This is the entry point.

## What to build
Next.js app with authentication (operator login), protected route layout, and an overview dashboard screen showing: active sessions count, total users, data consumed today, revenue this month — all updating live via Socket.io.

## Acceptance criteria
- [ ] Operator can log in with their credentials and receive a session
- [ ] Unauthenticated users are redirected to login
- [ ] Overview screen displays all four key stats from \`GET /admin/stats\`
- [ ] Stats update in real time via Socket.io without page refresh
- [ ] Responsive layout works on tablet and desktop

## Depends on
Issues #10, #12"

echo "✅ Issue 13 created"

# ── Issue 14 ──────────────────────────────────────────────────────────────────
gh issue create \
  --title "Admin dashboard — user management and node monitoring screens" \
  --label "feature,size:M" \
  --body "## Why
Day-to-day operator tasks are managing users and monitoring hotspot nodes.

## What to build
Two screens in the admin dashboard: (1) Users table with search, balance display, and deactivate action. (2) Nodes list showing each MikroTik with online/offline status, connected user count, and active sessions table.

## Acceptance criteria
- [ ] Users screen shows paginated list with name, phone, current balance, last seen
- [ ] Search filters users by name or phone number in real time
- [ ] Deactivate button calls \`PATCH /admin/users/:id/deactivate\` and updates UI immediately
- [ ] Nodes screen shows each node with green/red status indicator
- [ ] Clicking a node shows its active sessions with username, duration, and data used
- [ ] Node status updates live without page refresh via Socket.io

## Depends on
Issue #13"

echo "✅ Issue 14 created"

# ── Issue 15 ──────────────────────────────────────────────────────────────────
gh issue create \
  --title "React Native app — project setup and auth screens" \
  --label "setup,size:M" \
  --body "## Why
The mobile app is the primary user-facing product. Auth is the entry point.

## What to build
React Native (Android) project inside \`apps/mobile\`. Screens: splash, login (Google, Facebook, Apple, phone number), OTP verification. On success, store JWT in secure storage and navigate to home screen.

## Acceptance criteria
- [ ] App builds and runs on Android emulator via \`npx react-native run-android\`
- [ ] Google Sign-In button authenticates and calls \`POST /auth/google\`
- [ ] Facebook Login button authenticates and calls \`POST /auth/facebook\`
- [ ] Apple Sign-In button authenticates and calls \`POST /auth/apple\`
- [ ] Phone number input sends OTP via \`POST /auth/phone/request\`
- [ ] OTP screen verifies code via \`POST /auth/phone/verify\`
- [ ] JWT is stored in Android Keystore via \`react-native-keychain\`
- [ ] Returning users with a valid stored JWT skip auth and go straight to home

## Depends on
Issues #1, #3"

echo "✅ Issue 15 created"

# ── Issue 16 ──────────────────────────────────────────────────────────────────
gh issue create \
  --title "React Native app — home screen and data balance display" \
  --label "feature,size:S" \
  --body "## Why
The first thing a user sees after login — their balance and connection status.

## What to build
Home screen showing: current data balance (MB/GB remaining), connected hotspot name, top-up button, and a visual indicator of balance percentage. Pulls data from a user balance endpoint.

## Acceptance criteria
- [ ] Home screen displays current data balance in human-readable format (e.g. '2.3 GB remaining')
- [ ] Balance percentage is shown as a progress bar or arc
- [ ] Connected hotspot name is displayed when on a NetPulse SSID
- [ ] 'Top up' button navigates to the packages screen
- [ ] Balance refreshes automatically when app comes to foreground
- [ ] Zero balance state shows a clear 'Buy data to reconnect' message

## Depends on
Issue #15"

echo "✅ Issue 16 created"

# ── Issue 17 ──────────────────────────────────────────────────────────────────
gh issue create \
  --title "React Native app — WiFi auto-connect (WifiNetworkSuggestion)" \
  --label "feature,size:M" \
  --body "## Why
Core UX promise — user should never manually type a WiFi password.

## What to build
On login, use Android's \`WifiNetworkSuggestion\` API to register the user's unique SSID and password with the system. App requests location permission (required for WiFi APIs). When the user is in range of a NetPulse hotspot, Android connects automatically.

## Acceptance criteria
- [ ] App requests \`ACCESS_FINE_LOCATION\` permission on first launch with clear explanation
- [ ] On successful auth, \`WifiNetworkSuggestion\` is registered with user's unique SSID credentials
- [ ] Device automatically connects to the NetPulse SSID when in range without user action
- [ ] Works on Android 10 and above
- [ ] On logout, the WiFi suggestion is removed
- [ ] Fallback manual password display screen exists for devices below Android 10

## Depends on
Issues #15, #3"

echo "✅ Issue 17 created"

# ── Issue 18 ──────────────────────────────────────────────────────────────────
gh issue create \
  --title "React Native app — package purchase flow" \
  --label "feature,size:M" \
  --body "## Why
This is the monetisation core of the app — user buys data, balance updates, they reconnect.

## What to build
Packages screen listing all active bundles with price and data amount. Payment method selection (card/EFT via Peach, airtime via Bango). Handles payment flow, success/failure states, and refreshes balance on completion.

## Acceptance criteria
- [ ] Packages screen fetches and displays all active packages from \`GET /packages\`
- [ ] User can select a package and choose payment method (Peach or Bango)
- [ ] Peach Payments flow opens a WebView or deep link to checkout
- [ ] Bango carrier billing flow initiates charge and shows confirmation screen
- [ ] Successful purchase shows a confirmation screen with new balance
- [ ] Failed payment shows a clear error with retry option
- [ ] Balance on home screen updates immediately after successful purchase
- [ ] Purchase is recorded in transaction history

## Depends on
Issues #6, #7, #16"

echo "✅ Issue 18 created"

# ── Issue 19 ──────────────────────────────────────────────────────────────────
gh issue create \
  --title "React Native app — push notifications and transaction history" \
  --label "feature,size:S" \
  --body "## Why
Users need to know when data is low and be able to review their purchase history.

## What to build
Register FCM token on app launch via \`POST /notifications/register\`. Handle foreground and background push notifications. Transaction history screen listing all purchases with date, package, amount paid, and data added.

## Acceptance criteria
- [ ] FCM token is registered on every app launch (token refreshes are handled)
- [ ] Push notification appears when data drops below 20% and 10%
- [ ] Tapping a push notification opens the app to the top-up screen
- [ ] Transaction history screen shows all purchases in reverse chronological order
- [ ] Each transaction row shows: date, package name, amount paid (ZAR), data added (MB/GB)
- [ ] Empty state shown when user has no purchases yet

## Depends on
Issues #8, #18"

echo "✅ Issue 19 created"

echo ""
echo "🎉 All done! Your NetPulse repo is ready."
echo "   Repo: https://github.com/$(gh api user --jq .login)/$REPO_NAME"
echo ""
echo "Next step — in Claude Code:"
echo "  'Work through all open GitHub issues in netpulse in order, starting with Issue 1. Use PRD.md and HANDOFF.md as your source of truth.'"
