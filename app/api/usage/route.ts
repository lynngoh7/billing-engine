import { record } from "@/lib/meterService";
import { checkQuota } from "@/lib/quotaService";
import { error } from "console";

export async function GET() {
  return Response.json({ ok: true });
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