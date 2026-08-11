# Usage Metering & Billing Engine

A backend service that answers the three questions every SaaS product needs to answer: **how much has this customer used, what does it cost, and have they hit their limit?**

This project implements usage metering, quota enforcement, and cost calculation with a focus on correctness under retries and failures — the kind of bugs that cost real money if handled wrong.

## What it does

- **Idempotent usage metering** — records billable actions (API calls, AI tokens) exactly once per idempotency key, even under duplicate/retried requests
- **Quota enforcement** — checks usage against a tenant's plan limits before allowing an action, returning `429` (quota exceeded) or `402` (payment required) with clear explanations
- **Cost calculation** — converts usage into money, correctly handling AI-token pricing rules (cached input tokens, reasoning tokens, output tokens)
- **Stripe subscription integration (test mode)** — Checkout flow for plan upgrades, with signature-verified, deduplicated webhooks keeping tenant plan/status in sync

## Tech stack

- [Next.js](https://nextjs.org) (API routes)
- PostgreSQL + [Prisma](https://www.prisma.io) ORM
- Docker Compose (local Postgres)
- Stripe test mode + Stripe CLI

## Status
**Completed**
-  Data model (Tenant, Plan, UsageEvent, Subscription) — migrated, relations + composite unique constraints in place
-  Idempotent usage metering (`MeterService.record`) — proven via automated test (duplicate idempotency key → single usage event)
-  Quota enforcement (`checkQuota` + rollup) — proven via boundary test (at-limit allowed, over-limit refused with `402`)
-  `POST /api/usage` — billable action endpoint wired to metering + quota checks
-   Cost computation for API calls and AI token usage 
-   Stripe checkout integration, creates a test-mode subscription session
-   Stripe webhook handler, verifies that the signature is valid and can be accepted, syncs tenants plan + creates subscription record
-   Full end to end workflow verified: checkout -> payment -> signed webhook -> tenant plan updated in database 

**In progress / next up:**
-  Architecture diagram refinement
-  Automated tests 
-  

## Architecture

\`\`\`
Client ─► Billable API request
 └─► MeterService.record(tenant, type, qty, idempotencyKey)
 ├─ duplicate key? → return original result (no new event)
 ├─ store usage_event
 └─► Quota Check ─► allowed
 └─► limit exceeded → 402 / 429 + clear message

GET /usage ◄── rollup(usage_events) → { used, limit, cost }

Stripe Checkout (test mode) ─► subscription created
Stripe ─signed webhook─► /webhooks/stripe
 ├─► verify signature (forged → 400)
 ├─► deduplicate event (replay → ignored)
 └─► update tenant plan / status
\`\`\`

## Design Notes 
**Why 402, not 429, for quota enforcement:** `429 Too Many Requests` conventionally signals rate-limiting (too many requests too fast). Exhausting a monthly usage quota is a different problem — the tenant needs to upgrade or wait for their billing period to reset, not slow down. `402 Payment Required` more accurately communicates that. `429` is reserved for genuine rate-limiting if added later.

**Idempotency key design:** uniqueness is enforced on the composite key `(tenantId, idempotencyKey)`, not `idempotencyKey` alone — this allows different tenants to safely reuse the same key value (e.g. both generating `"req-1"` independently) while still guaranteeing that a retried request from the *same* tenant is recognized and deduplicated at the database level, not just checked in application code (avoiding race conditions under concurrent retries).

**Quota boundary rule:** a request is refused only if fulfilling it would make `used + requested > limit` — i.e. usage landing exactly *at* the limit is allowed; the next request after that is refused. This boundary is covered by an automated test.

**Webhook signature verification:** the route reads the raw request body (`request.text()`, not `request.json()`) because Stripe's signature is computed over the exact raw bytes it sent — parsing and re-serializing the body would break verification even without any malicious tampering. Verification uses `stripe.webhooks.constructEvent()`, which throws on an invalid/forged signature; the route catches this and returns `400`.

**Source of truth for subscription state:** the client-side redirect after Checkout is not trusted to update the database — only the signed webhook is. A user closing their browser before the redirect fires would otherwise leave the system in an inconsistent state; the webhook is guaranteed to fire regardless.

## Getting Started

### Prerequisites

- Node.js 18+
- Docker (for local Postgres)
- A free [Stripe](https://stripe.com) account (test mode, no card required) + the [Stripe CLI](https://stripe.com/docs/stripe-cli)

### 1. Clone and install

\`\`\`bash
git clone https://github.com/lynngoh7/billing-engine.git
cd billing-engine
npm install
\`\`\`

### 2. Set up environment variables

\`\`\`bash
cp .env.example .env
\`\`\`

Fill in your Stripe test-mode keys (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`) and database URL. Never commit `.env`.

### 3. Start the database

\`\`\`bash
docker compose up -d
\`\`\`

### 4. Run Prisma migrations

\`\`\`bash
npx prisma migrate dev
\`\`\`

### 5. Forward Stripe webhooks locally

\`\`\`bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
\`\`\`

### 6. Run the dev server

\`\`\`bash
npm run dev
\`\`\`

Open [http://localhost:3000](http://localhost:3000) to see the result, or hit the API directly:

\`\`\`bash
curl http://localhost:3000/api/ping
\`\`\`