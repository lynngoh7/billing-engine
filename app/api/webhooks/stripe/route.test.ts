import { describe, it, expect } from 'vitest';
import {POST} from './route';
import {stripe} from '@/lib/stripe'

describe('Stripe webhook', () => {
    it('rejects a forged webhook with an invalid signature', async () => {
        const request = new Request('http://localhost:3000/api/webhooks/stripe', {
            method: 'POST',
            headers: {'stripe-signature': 'fake-signature'},
            body: JSON.stringify({fake: 'event'}),
        });
        const response = await POST(request);
        expect(response.status).toBe(400);                
    })

    it('processes a webhook once and ignores a redelivery of the same event', async () => {
        const eventId = `evt_test_${crypto.randomUUID()}`;
        const fakeSubscriptionId = `sub_test_${crypto.randomUUID()}`;

        const payload = JSON.stringify({
            id: eventId,
            type: 'checkout.session.completed',
            data: {
                object: {
                    client_reference_id: 'cmsedi1790003p6g65ih2dsmd',
                    subscription: fakeSubscriptionId
                },
            },
        });

        const signature = stripe.webhooks.generateTestHeaderString({
            payload,
            secret: process.env.STRIPE_WEBHOOK_SECRET!,
        });

        const makeRequest = () => 
            new Request('http://localhost:3000/api/webhooks/stripe', {
                method: 'POST',
                headers: {'stripe-signature': signature},
                body: payload,
            });

        const firstResponse = await POST(makeRequest());
        const firstBody = await firstResponse.json();
        //makeRequest called twice as request body can only be read once 
        const secondResponse = await POST(makeRequest());
        const secondBody = await secondResponse.json();

        expect(firstBody.duplicate).toBeFalsy();
        expect(secondBody.duplicate).toBe(true);

    })
    })