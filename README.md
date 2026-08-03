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

🚧 In progress — early scaffolding (API route stubs, Prisma schema/migrations, Docker setup)

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