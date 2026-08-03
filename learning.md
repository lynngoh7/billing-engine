step 1:
- when using Next.js app router, API routes are inferred from the folder structure, no route.js file/endpoints 
- Next.js scans the app directory for any folders which contain route.ts to become the API endpoint
- The endpoint's URL path is identical to the folder path 

1. create folder path: app/api/ping/route.ts 
2. inside the file export a GET function (Next.js maps HTTP methods to function names)
3. the function returns a json response 
4. use a curl command to make a HTTP GET request, Next.js matches the URL to the folder, runs the function, then returns the response.

planning fields:
1. tenant:
    - id (pk), name, email, planID (ref plan) 
2. plan:
    - free or pro, api token limit, AI token limit, price 
3. UsageEvent:
    - tenant id, what type (ai/api) they used, how much they used in a single event, date used, idempotency key 
    - idempotency (applying multiple times -> just do once) is guarenteed through an idempotency key:
        1. client generates unique key once per logical action b4 sending req 
        2. if retry needed, same key is used 
        3. server receives identical key and recognises retry

Tenant: id, name, email, planId (reference to Plan)
Plan: id, name (Free/Pro), callLimit, tokenLimit, price 
UsageEvent: tenantId, type, quantity, idempotencyKey, date/timestamp — with uniqueness on (tenantId, idempotencyKey)
Subscription: (light for now, we'll flesh this out properly in Week 2 alongside Stripe) — tenantId, some Stripe reference id, status

Day 1 Summary: Installed tech stack, 