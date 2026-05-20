# EPHotspot

A multi-tenant WiFi hotspot management platform. Operators deploy MikroTik routers; end users buy a single data balance that works across every operator's hotspot.

## Language

### People

**User**:
A person with an EPHotspot account and a data balance. Downloads the Android app, buys data, and connects to any Node on the network.
_Avoid_: Customer, subscriber, client

**Operator**:
A business or institution (school, cafe, library) that deploys one or more Nodes and pays a monthly platform subscription. Has access to the admin dashboard.
_Avoid_: Tenant, cafe owner, merchant

**Super Admin**:
The platform owner. Manages all Operators, sets global package prices, and registers new Nodes.
_Avoid_: Platform admin, root user

### Relationships

**Operator scope**:
An Operator can only manage Users who have connected to their own Nodes. Deactivating a User is local — it bans them from that Operator's Nodes only, leaving their global account and Data Balance intact. No Operator can affect another Operator's Users.
_Avoid_: Global ban, global deactivation (these are Super Admin actions only)

### Infrastructure

**Node**:
A single MikroTik router deployment at an Operator's physical location. Enforces data access by authenticating sessions against the central RADIUS server. Has no business logic of its own.
_Avoid_: Router, hotspot, device, access point, site

**RADIUS Server**:
The central FreeRADIUS instance that all Nodes authenticate against. The single source of truth for whether a User is allowed to connect and how much data they have remaining.
_Avoid_: Auth server, RADIUS agent

### Data & Money

**Data Balance**:
The total megabytes a User has available to spend, pooled across all Nodes. A single global balance — not scoped per Operator.
_Avoid_: Credits, quota, allowance

**Package**:
A data bundle (e.g. 1 GB) sold at a fixed price. Defined globally by the Super Admin. Operators cannot set their own prices.
_Avoid_: Plan, bundle, tier, product

**Purchase**:
A completed payment transaction that adds MB to a User's Data Balance. Balance rolls over — new MB is added to whatever remains, never reset.
_Avoid_: Top-up, transaction, order

### Sessions

**Session**:
A period of authenticated internet access for a User on a specific Node, tracked from RADIUS Accounting-Start to Accounting-Stop.
_Avoid_: Connection, visit
