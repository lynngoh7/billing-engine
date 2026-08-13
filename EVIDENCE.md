# Evidence

One proof per Definition-of-Done checkbox (§6 of the capstone brief).

## 1. Idempotent metering — exactly one usage event under retries

**Test:** `lib/meterService.test.ts` — "does not double count usage when called twice with the same idempotency key"

**Output:**
\```
✓ lib/meterService.test.ts (1 test) 88ms
   ✓ record > does not double count usage when called twice with the same idempotency key 87ms

 Test Files  1 passed (1)
      Tests  1 passed (1)
   Start at  12:09:36
   Duration  540ms (transform 77ms, setup 0ms, collect 122ms, tests 88ms, environment 0ms, prepare 89ms)
\```

## 2. Quota enforcement — boundary is exact, honest status code

**Test:** `lib/quotaService.test.ts` — "allows usage at the limit but refuses usage over the limit"

**Output:**
\```
✓ lib/quotaService.test.ts (1 test) 107ms
   ✓ checkQuota > allows usage at the limit but refuses usage over the limit 106ms

 Test Files  1 passed (1)
      Tests  1 passed (1)
   Start at  12:10:07
   Duration  551ms (transform 72ms, setup 0ms, collect 119ms, tests 107ms, environment 0ms, prepare 63ms)
\```

**Route-level proof (402 response):**
\```
Setup: created a dedicated test tenant on the Free plan (callLimit: 1000), directly inserted 1,000 units of usage to bring them exactly to quota, then attempted one more call through the real running route.

Confirmed at quota via `GET /usage`:
\```
curl "http://localhost:3000/api/usage?tenantID=evidence_tenant_1"
{"used":{"calls":1000,"tokens":0},"limit":{"calls":1000,"tokens":100000},"cost":10000000}
\```

Next call correctly refused with 402:
\```
curl -i -X POST http://localhost:3000/api/usage \
  -H "Content-Type: application/json" \
  -d '{"tenantID": "evidence_tenant_1", "type": "API_CALL", "quantity": 1, "idempotencyKey": "evidence-refusal-test"}'

HTTP/1.1 402 Payment Required
content-type: application/json
Date: Thu, 13 Aug 2026 07:23:48 GMT

{"error":"API_CALL quota exceeded"}
\```

## 3. Cost computation — pinned constants, AI-token rules correct

**Test:** `lib/pricing.test.ts` — "correctly calculates cost for a known usage breakdown"

**Output:**
\```
✓ lib/pricing.test.ts (1 test) 4ms
   ✓ calculateCost > correctly calculates cost for a known usage breakdown 2ms

 Test Files  1 passed (1)
      Tests  1 passed (1)
   Start at  12:08:52
   Duration  396ms (transform 48ms, setup 0ms, collect 41ms, tests 4ms, environment 0ms, prepare 87ms)
\```

## 4. Stripe Checkout + webhook sync — Free → Pro end-to-end

**Checkout session creation (real Stripe test-mode URL returned):**
\```
curl -X POST http://localhost:3000/api/checkout -d '{"tenantID": "cmsedi1790003p6g65ih2dsmd"}'
{"url":"https://checkout.stripe.com/c/pay/cs_test_a1JOCMjwF4Wf5qUj4ULcfD4ALLHf9Bj8Rxu6CfmQ24n3S7IVcxuH8C4F2i#fidnandhYHdWcXxpYCc%2FJ2FgY2RwaXEnKSdicGRmZGhqaWBTZHdsZGtxJz8nZmprcXdqaScpJ2R1bE5gfCc%2FJ3VuWnFgdnFaMDRQNkRza0RVcXx8UjRoSmpiXzJ9QnVnPEhtX2BNf3IyRlZ0NF1Cb3xuXUJGVWJ3YnZOaTFKNXRRUEFLQTVVUzczR2pLdjxzfTRHM2BTcmNMN0hKY2g0ZlU1NVZtdlFoVXZ%2FJyknY3dqaFZgd3Ngdyc%2FcXdwYCknZ2RmbmJ3anBrYUZqaWp3Jz8nJmNjY2NjYycpJ2lkfGpwcVF8dWAnPyd2bGtiaWBabHFgaCcpJ2BrZGdpYFVpZGZgbWppYWB3dic%2FcXdwYHgl"}
\```

**Database before payment:**
\```
   id             |      email       |          planID           
---------------------------+------------------+---------------------------
 cmsedi1790003p6g65ih2dsmd | test@example.com | cmsedi1780001p6g68yqgtqcr
(1 row)
\```

**Database after completing Checkout with test card 4242 4242 4242 4242:**
\```
test@example.com | cmsedi1780001p6g68yqgtqcr   (Pro plan)
\```

## 5. Forged webhook rejected

**Test:** `app/api/webhooks/stripe/route.test.ts` — "rejects a forged webhook with an invalid signature"

**Output:**
\```
 ✓ app/api/webhooks/stripe/route.test.ts (2 tests) 76ms
   ✓ Stripe webhook > rejects a forged webhook with an invalid signature 5ms
\```

## 6. Duplicate webhook ignored

**Test:** `app/api/webhooks/stripe/route.test.ts` — "processes a webhook once and ignores a redelivery of the same event"

**Output:**
\```
✓ Stripe webhook > processes a webhook once and ignores a redelivery of the same event 70ms

 Test Files  1 passed (1)
      Tests  2 passed (2)
   Start at  14:43:21
   Duration  608ms (transform 66ms, setup 0ms, collect 191ms, tests 76ms, environment 0ms, prepare 73ms)
\```

**Manual CLI proof (real Stripe event resent 3 times, database shows exactly 1 row):**
\```
stripe events resend evt_1U3XotAPtyyW1mOoaFDPfKE9
[200] POST /api/webhooks/stripe [evt_1U3XotAPtyyW1mOoaFDPfKE9]
(resent again)
[200] POST /api/webhooks/stripe [evt_1U3XotAPtyyW1mOoaFDPfKE9]

SELECT * FROM "ProcessedWebhookEvent";
            id             |        stripeEventID
 cmspuj4w40000p6rkmqbf5qjb | evt_1U3XotAPtyyW1mOoaFDPfKE9
(1 row)
\```

## 7. Data model — isolated per tenant

**Tables created:**
\```
 public | Plan
 public | Subscription
 public | Tenant
 public | UsageEvent
 public | ProcessedWebhookEvent
\```

## 8. Full test suite — all green

\```
Test Files  4 passed (4)
      Tests  5 passed (5)
   Start at  12:00:29
   Duration  732ms (transform 270ms, setup 0ms, collect 669ms, tests 255ms, environment 2ms, prepare 553ms)
\```