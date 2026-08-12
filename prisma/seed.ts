import { PlanType, PrismaClient } from '../app/generated/prisma/client';
const prisma = new PrismaClient();

async function main(){
    // seed logic
    // awaitb on both calls to ensure insert is completed before moving to next part of code 
    const freePlan = await prisma.plan.create({data: {
        planType: 'FREE', 
        callLimit: 1000, 
        tokenLimit: 100000,
        price: 0.00
    }});

    const proPlan = await prisma.plan.create({ data: {
        planType: 'PRO',
        callLimit: 10000,
        tokenLimit: 1000000,
        price: 3000
    }})

    const tenantFree = await prisma.tenant.upsert({ 
        where: {email: 'test@example.com'},
        update: {},
        create: {
            name: 'Test',
            email: 'test@example.com',
            planID: freePlan.id,
        },
    });
    const tenantPro = await prisma.tenant.upsert({ 
        where: {email: 'test2@example.com'},
        update: {},
        create: {
            name: 'Test',
            email: 'test2@example.com',
            planID: proPlan.id,
        },
    });
    
    

    console.log({tenantFree, tenantPro});

}

main() 
    .then(() => prisma.$disconnect())
    .catch(async (e) => {
        console.error(e);
        await prisma.$disconnect();
        process.exit(1);
    });