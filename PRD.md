# PRD: EPHotspot — Portable WiFi Hotspot Platform

## Overview
EPHotspot is a centralized, multi-tenant WiFi hotspot management platform built on MikroTik infrastructure. Operators (schools, businesses, libraries) subscribe to deploy hotspot nodes, while end users connect, buy data, and roam across any EPHotspot-enabled hotspot using a single Android app and one data balance that never expires.

## Problem Statement
South African WiFi hotspot solutions (like Antamedia) are isolated per-deployment — a user's data is locked to one location. Existing ISP data products expire unused. There is no portable, affordable, operator-managed hotspot platform that gives users one balance usable anywhere and data that never expires.

## Goals
- Users can download the app, buy data via airtime or card, and connect to any EPHotspot hotspot with zero manual WiFi configuration
- Operators can manage their hotspot nodes, view usage and revenue, and configure their deployment from a web dashboard
- Data balances roll over indefinitely — never expire
- Platform runs on a central RADIUS server — one user account works across all operator nodes
- MVP is shippable to a first real operator (school or business)

## Non-Goals
- iOS app (architecture must support it later, but not built in MVP)
- Operator self-service MikroTik onboarding (manual setup by platform owner for now)
- Time-based data packages
- Per-operator custom pricing (platform owner sets all package prices)
- Grace periods after data runs out
- Web portal for end users (app only)

## Users

### End Users
South African mobile users connecting to a EPHotspot hotspot. They are accustomed to buying mobile data in MB/GB bundles. Key needs: frictionless connection, airtime payment support, data that doesn't expire, visibility of remaining balance.

### Hotspot Operators
Businesses, schools, libraries deploying a MikroTik router. They pay a monthly platform subscription and keep all data revenue from their users. Key needs: user management, real-time monitoring, revenue visibility, simple configuration.

### Platform Owner (Super Admin)
Manages global pricing packages, operator subscriptions, platform-wide settings, and manually onboards new MikroTik nodes onto the RADIUS server.

## Features & Requirements

### Authentication
- Register and login via Google, Facebook, or Apple SSO
- Register and login via phone number (OTP)
- One account works across all hotspot locations on the network

### Onboarding Flow
- New user connects to operator's open guest SSID (no password, no internet)
- Captive portal serves QR code and App Store link
- User downloads app, registers
- App auto-connects user to secure SSID using `WifiNetworkSuggestion` API (Android 10+) — no manual password entry
- User receives a configurable free trial allocation (set by platform owner per package or globally)

### Data Packages
- Platform owner defines all packages (e.g. 1GB, 5GB, 10GB)
- Packages are data-based (MB/GB), not time-based
- Unused data rolls over on every new purchase — never expires
- Packages displayed in app and admin panel

### Payments
- **Peach Payments** — card and instant EFT
- **Bango** — carrier billing across Vodacom, MTN, Cell C, Telkom (airtime deduction, works offline on mobile network)
- Payment initiated inside the Android app
- First purchase requires the user to be logged in
- Receipt and data credit confirmed via push notification

### User App (Android)
- Home screen: remaining data balance, connected hotspot name, top-up button
- Package selection and purchase screen
- Transaction history
- Auto-connect to any EPHotspot SSID on entry via `WifiNetworkSuggestion` API
- Push notifications: data warnings at configurable thresholds (e.g. 20%, 10%), purchase confirmations, connection events
- Hard disconnect at zero data — no grace period

### Admin Dashboard (Web — Next.js)
- Overview: active sessions, total users, data consumed today, revenue this month
- User management: list, search, view balance, deactivate
- Hotspot nodes: list of MikroTik deployments, online/offline status, connected users per node
- Real-time monitoring via Socket.io
- Package display (read-only — set by platform owner)
- Push notification threshold configuration
- Operator subscription status

### Super Admin Panel
- Manage all operators and their subscriptions
- Define and update global data packages and pricing
- View platform-wide usage and revenue
- Manually register new MikroTik nodes onto RADIUS

### MikroTik Integration
- **FreeRADIUS** — authentication, session management, data accounting
- **MikroTik REST API** — node provisioning, real-time monitoring, config updates
- Each MikroTik deployment points at the central RADIUS server

### Push Notifications
- Firebase Cloud Messaging (FCM)
- Triggers: data threshold warnings (20%, 10%), purchase confirmation, session start/end, data exhausted

## Technical Requirements

### Stack
- **Backend** — Node.js with Express or Fastify
- **Database** — PostgreSQL via Prisma ORM
- **RADIUS** — FreeRADIUS with Node.js bridge
- **Admin Web App** — Next.js
- **Mobile App** — React Native (Android first, iOS-ready)
- **Real-time** — Socket.io
- **Push Notifications** — Firebase Cloud Messaging
- **Payments** — Peach Payments SDK + Bango carrier billing API

### Infrastructure
- Central RADIUS server (all MikroTik nodes authenticate against it)
- All user accounts, balances, and sessions managed centrally
- MikroTik nodes are enforcement points only — business logic lives in the platform

### Constraints
- Mobile app must function on Android 10+ for `WifiNetworkSuggestion` API support
- Carrier billing via Bango must work with zero internet (over GSM only)
- Architecture must support iOS addition without major refactoring
- Operator setup performed manually by platform owner in MVP

## Success Metrics
- A user can go from downloading the app to being connected and online in under 3 minutes
- A user with zero data balance can successfully purchase a bundle via airtime and reconnect without calling support
- An operator can log into the admin dashboard and see live session data within 30 seconds of a user connecting
- Data balance correctly rolls over after a new purchase with zero data loss
- First operator deployment is live and handling real users
