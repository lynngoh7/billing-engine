import { error } from "console";
import { PrismaClient, Tenant, Prisma, UsageType } from "../app/generated/prisma/client";

const prisma = new PrismaClient();

export async function getUsage(tenantID: string) {
    const thisTenant = await prisma.tenant.findUnique({
        where: {id: tenantID}, 
        include: {plan: true},
    });

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const apiCallUsage = await prisma.usageEvent.aggregate({
        where: {
            tenantID: tenantID,
            usageType: 'API_CALL',
            usedAt: { gte: startOfMonth},
        },
        _sum: {quantity: true,}
    });

    const aiTokenUsage = await prisma.usageEvent.aggregate({
        where: {
            tenantID: tenantID,
            usageType: 'AI_TOKEN',
            usedAt: { gte: startOfMonth},
        },
        _sum: {quantity: true,}
    });

    return {
        used: {
            calls: apiCallUsage._sum.quantity ?? 0,
            tokens: aiTokenUsage._sum.quantity ?? 0,
        },
        limits: {
            calls: thisTenant?.plan.callLimit ?? 0,
            tokens: thisTenant?.plan.tokenLimit ?? 0
        },
    };

}

export async function checkQuota(tenantID:string, type: UsageType, quantity: number) {
    const usage = await getUsage(tenantID);

    if (type === 'AI_TOKEN') {
        const newQTY = usage.used.tokens + quantity;
        if (newQTY > usage.limits.tokens) {
            return { allowed: false, reason: `${type} quota exceeded` };
        }
    }
    else if (type === 'API_CALL') {
        const newQTY = usage.used.calls + quantity;
        if (newQTY > usage.limits.calls) {
            return { allowed: false, reason: `${type} quota exceeded` };
        }
    }

    return { allowed: true}
}