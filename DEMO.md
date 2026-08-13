# Demo Script

Walkthrough proving the five required behaviors from the capstone brief (§13).

**Before running:** ensure `docker compose up -d`, `npm run dev`, and
`stripe listen --forward-to localhost:3000/api/webhooks/stripe` are all running.
Tenant IDs below are examples — replace with real IDs from your current database
(`SELECT id, email, "planID" FROM "Tenant";`) since seed data may differ by the time you run this.

## 1. Quota boundary — clean 402 refusal

```bash
curl "http://localhost:3000/api/usage?tenantID=evidence_tenant_1"
```

```bash
curl -i -X POST http://localhost:3000/api/usage \
  -H "Content-Type: application/json" \
  -d '{"tenantID": "evidence_tenant_1", "type": "API_CALL", "quantity": 1, "idempotencyKey": "demo-refusal-1"}'
```

**Expect:** `HTTP/1.1 402 Payment Required`, `{"error":"API_CALL quota exceeded"}`

## 2. Idempotent retry — no double-count

```bash
curl -X POST http://localhost:3000/api/usage \
  -H "Content-Type: application/json" \
  -d '{"tenantID": "REPLACE_WITH_REAL_TENANT_ID", "type": "API_CALL", "quantity": 1, "idempotencyKey": "demo-retry-1"}'
```

Run the exact same command again — same `idempotencyKey`:

```bash
curl -X POST http://localhost:3000/api/usage \
  -H "Content-Type: application/json" \
  -d '{"tenantID": "REPLACE_WITH_REAL_TENANT_ID", "type": "API_CALL", "quantity": 1, "idempotencyKey": "demo-retry-1"}'
```

Confirm no duplicate row was created:

```bash
docker exec -it flyrank-billing-db-1 psql -U flyrank -d flyrank_billing -c 'SELECT COUNT(*) FROM "UsageEvent" WHERE "idempotencyKey" = '\''demo-retry-1'\'';'
```

**Expect:** `count = 1`, despite two identical POSTs.

## 3. Real Stripe Checkout — webhook flips Free → Pro live

```bash
curl -X POST http://localhost:3000/api/checkout \
  -H "Content-Type: application/json" \
  -d '{"tenantID": "REPLACE_WITH_REAL_TENANT_ID"}'
```

Open the returned URL in a browser, pay with `4242 4242 4242 4242`, any future expiry/CVC.

```bash
docker exec -it flyrank-billing-db-1 psql -U flyrank -d flyrank_billing -c 'SELECT id, email, "planID" FROM "Tenant" WHERE id = '\''REPLACE_WITH_REAL_TENANT_ID'\'';'
```

**Expect:** `planID` now matches the Pro plan's id.

## 4. Forged webhook rejected; real one replayed and ignored

Forged:

```bash
curl -i -X POST http://localhost:3000/api/webhooks/stripe \
  -H "Content-Type: application/json" \
  -d '{"fake": "event"}'
```

**Expect:** `HTTP/1.1 400`

Real event replayed:

```bash
stripe events list --limit 1
stripe events resend evt_XXXXXXXXXX
```

```bash
docker exec -it flyrank-billing-db-1 psql -U flyrank -d flyrank_billing -c 'SELECT * FROM "ProcessedWebhookEvent";'
```

**Expect:** no new row for an already-seen event id.

## 5. GET /usage + pinned tests green

```bash
curl "http://localhost:3000/api/usage?tenantID=REPLACE_WITH_REAL_TENANT_ID"
```

```bash
npm test
```

**Expect:** all test files passing, shown on screen as the closing beat.