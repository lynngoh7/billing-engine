import { stripe } from '@/lib/stripe';
import { headers } from 'next/headers';
import { PrismaClient } from '../../../../app/generated/prisma/client';
import { error } from 'console';

const prisma = new PrismaClient();

export async function POST(request: Request) {
  const rawBody = await request.text(); // raw, not .json()
  const signature = (await headers()).get('stripe-signature')!;

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    return Response.json({ error: 'Invalid signature' }, { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
  const session = event.data.object; // the actual Checkout Session object
  const tenantId = session.client_reference_id;
  const stripeSubscriptionID =
    typeof session.subscription === 'string'
        ? session.subscription
        : session.subscription?.id;
        
  if (!tenantId) {
    return Response.json({ error: 'Missing tenant reference' }, { status: 400 });
  }

  if (!stripeSubscriptionID) {
    return Response.json({error: 'Missing subscription ID'}, {status: 400});''
  }


  const proPlan = await prisma.plan.findFirst({where: {planType: 'PRO'}});
  if (!proPlan) {
    return Response.json({ error: 'Pro plan not found' }, { status: 500 });
  }
  
  await prisma.tenant.update({
    where: {id: tenantId },
    data: { planID: proPlan?.id},
  });

  await prisma.subscription.create({
    data: {
        tenantID: tenantId,
        stripeID: stripeSubscriptionID,
        status: 'active'
    }
  })

}


  return Response.json({ received: true });

  
}