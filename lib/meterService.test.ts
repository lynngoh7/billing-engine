import { PrismaClient } from "../app/generated/prisma/client";
import{describe, it, expect} from 'vitest';
import {record} from './meterService';

describe('record', () => {
    it('does not double count usage when called twice with the same idempotency key', async () => {
        const prisma = new PrismaClient();
        const tenant = await prisma.tenant.findFirst();
        if (!tenant) throw new Error('No seeded tenant found — run the seed script first');

        const idempotencyKey = crypto.randomUUID();

        await record(tenant.id, 'API_CALL', 1, idempotencyKey);
        await record(tenant.id, 'API_CALL', 1, idempotencyKey);

        const count = await prisma.usageEvent.count({ where: {
            tenantID : tenant.id,
            idempotencyKey : idempotencyKey
        }
        });

        expect(count).toBe(1)
    })
})