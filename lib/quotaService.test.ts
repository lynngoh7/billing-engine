import { PrismaClient } from '../app/generated/prisma/client';
import { describe, it, expect } from 'vitest';
import { record } from './meterService';
import { checkQuota } from './quotaService';

const prisma = new PrismaClient();

describe('checkQuota', () => {
  it('allows usage at the limit but refuses usage over the limit', async () => {
    // 1. create a Plan with callLimit: 1
    const testPlan = await prisma.plan.create({ data: { planType: 'FREE', callLimit: 1, tokenLimit: 10000, price: 0.00 } });

    // 2. create a Tenant on that plan, with a unique email
    const testTenant= await prisma.tenant.create({ data: { name: 'Test', email: crypto.randomUUID() + '@test.com', planID: testPlan.id} });

    // 3. first check — should be allowed
    const firstCheck = await checkQuota(testTenant.id, 'API_CALL', 1);
    expect(firstCheck.allowed).toBe(true);

    // 4. actually record that usage, so the tenant's usage count goes up
    await record(testTenant.id, 'API_CALL', 1, crypto.randomUUID());

    // 5. second check — should now be refused
    const secondCheck = await checkQuota(testTenant.id, 'API_CALL', 1);
    expect(secondCheck.allowed).toBe(false);
  });
});