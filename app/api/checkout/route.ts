import { stripe }from '@/lib/stripe'

export async function POST(request : Request) {
  const body = await request.json()
  const thisTenant = body.tenantID 

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    line_items: [{price: process.env.STRIPE_PRO_PRICE_ID, quantity: 1}],
    success_url: 'http://localhost:3000/success',
    cancel_url: 'http://localhost:3000/cancel',
    client_reference_id: thisTenant
  });

  return Response.json({url: session.url})
}