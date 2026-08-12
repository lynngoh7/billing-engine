import { describe, it, expect } from 'vitest';
import {POST} from './route';

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
    })