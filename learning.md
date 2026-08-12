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

usage cost computation:
- cached input tokens are cheaper than regular input tokens, if a req reuses prev processed context, the provider charges a discounted rate for the cached portion 
- some models generate internal "reasoning" tokens before giving the final answer, these should be priced as output tokens and do not double coumt them 
- api calls charge a flat rate per call 

day 3 summary: added usage cost computation 

stripe checkout session:
- when a tenant wants to upgrade to pro, server asks stripe to create a checkout session, and stripe sends back a URL which hosts the payment page
- once payment succeeds stripe redirects back to a specified url and sends a webhook to the server confirming that the subscription was created 

signature verification: 
- required so that fake pro subscriptions are not trusted blindly 
- stripe signs each webhook using secret and the server recomputes the signature form the raw request body and compares it 
- if it doesnt match then the request is forges and must not be accepted 

day 4 summary: added stripe checkout page with verification 

returning used + limit + cost flow:
- route recives a tenantID (GET) through a request.url
- call getUsage() to return used tokens and the limit
- call calculateCost() to return how much the request costed 
limitations: getUsage only tracks tokens and calls whereas calculateCost expects a breakdown of the 3 types of tokens + api call 

duplicate webhook handling: 
- stripe may send the same webhook twice if there are network issues or if the server is slow to respond 
- the same event might end up being sent multiple times, hence webhook handler must be able to distinguish from new events and events which have been processed previously

solution: 
- stripe assigns each webhook event a unique event.id 
- track each event and avoid processing any event.ids which have already been seed, return success automatically 
- create a new table to store event.ids (3 types, create + update + delete)

updating tennat subscription logic: 
1. match the stripeSubscriptionID to to tenant who wants to cancel their subscription and change their status 
2. capture this change as an entire row
3. find the freePlan.id 
4. find the tenant who owns the subscription that just got cancelled and set their planID to point to Free instead of pro 

day 5 summary: GET /usage returns {used, limits, cost}, duplicate webhook handling, updating tenant subscription status, added tests 