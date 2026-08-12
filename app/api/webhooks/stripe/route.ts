import { stripe } from '@/lib/stripe';
import { headers } from 'next/headers';
import { PrismaClient, Prisma } from '../../../../app/generated/prisma/client';

const prisma = new PrismaClient();

export async function POST(request: Request) {
  const rawBody = await request.text(); // raw, not .json()
  const signature = request.headers.get('stripe-signature')!;

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

  //duplicate webhook handling 
  try {
    await prisma.processedWebhookEvent.create({
      data: {stripeEventID: event.id},
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      return Response.json({ received: true, duplicate: true})
    } else {
      throw err;
    }
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
      return Response.json({error: 'Missing subscription ID'}, {status: 400});
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

  else if (event.type === 'customer.subscription.updated') {
    const subscription = event.data.object;
    const stripeSubscriptionID = subscription.id
    const newStatus = subscription.status;

    const updatedStatus = await prisma.subscription.update({where: {stripeID: stripeSubscriptionID}, data: {status: newStatus}})

  }

  else if(event.type === 'customer.subscription.deleted') {
    const subscription = event.data.object;
    const stripeSubscriptionID = subscription.id;

    //update subscription status to cancelled and capture what it returns 
    const updatedSubscription = await prisma.subscription.update({
      where: {stripeID: stripeSubscriptionID},
      data: {status: 'canceled'}
    });

    //look up the Free plan and set the tenant's planID to free instead of pro 
    const freePlan = await prisma.plan.findFirst({where: {planType: 'FREE'}});
    if (!freePlan) {
      return Response.json({error: 'Free plan not found'}, {status: 500})
    }

    //revert the tenant back to the Free plan using their tenantID 
    await prisma.tenant.update({
      where: {id: updatedSubscription.tenantID},
      data: {planID: freePlan.id}
    });
  }

  return Response.json({ received: true });
}