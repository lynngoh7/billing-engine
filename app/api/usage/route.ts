import { record } from "@/lib/meterService";
import { checkQuota, getUsage } from "@/lib/quotaService";
import { stripe }from '@/lib/stripe'
import { request } from "http";
import { calculateCost } from '@/lib/pricing.config'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tenantID = searchParams.get('tenantID')
  
  if(!tenantID) { return Response.json({error: 'Missing tenantID'}, {status: 400})};

  const thisUsage = await getUsage(tenantID)
  const cost = calculateCost({
    apiCalls: thisUsage.used.calls,
    inputTokens: thisUsage.used.tokens,
    cachedTokens: 0,
    outputTokens: 0
  });

  return Response.json({
    used: thisUsage.used,
    limit: thisUsage.limits,
    cost: cost.totalCost
  });
}

export async function POST(request: Request) {
  const body = await request.json()
  const thisQuota = await checkQuota(body.tenantID, body.type, body.quantity)

  if(thisQuota?.allowed === false) {
    return Response.json({error: thisQuota.reason}, {status: 402})
  }
  else {
    const thisRecord = await record(body.tenantID, body.type, body.quantity, body.idempotencyKey)
    return Response.json({ success: true, usageEvent: thisRecord})
  }
}
