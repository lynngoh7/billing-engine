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

Day 1 Summary: Installed tech stack, built basic API using Node.js, used prisma to create tables

limits:
- 1000 calls and 100k tokens for Free plan
- 10000 calls and 1M tokens for Pro plan 

- create plan rows before tenant rows 

idempotency key logic (try...catch):
- attempt to insert into table
- if action is a duplicate of previous (P2002 error code) do not insert
- then inform client that the action was performed successfully 
- if the error is not of duplicate type (P2002) then we throw an error 

describe groups related tests under a label.
it (or test, same thing) defines one individual test case, with a description of what it proves.
expect(...).toBe(...) / .toEqual(...) — assertions; the test fails if these don't hold.

testing strat:
1. call record() with an I.K
2. call record() again with the same key
3. count the number of records in the database with the key, should return 1, else the logic is wrong 

getUsage logic:
1. find the tenant and their plan
2. sum the UsageEvent rows this month and group them by type
3. return how many calls and tokens they have ussed against their quota 

checkQuota logic:
1. find the tenants plan and check how many tokens and calls they hv used
2. if under quota for relevant action proceed with no error 
3. else if the next action causes quota to be exceeded, refuse the action and inform tenant (402)
    

day 2 summary: created test Tenants, implemenmted idempotency error handling, wrote tests for idempotency, added meter and quota service 

api testing for quotas:
1. route receives a request parsed from json
2. call checkquota on the request
3. if the call is not allowed then return a 402 response, else call record() to log the usage, then return a success response 