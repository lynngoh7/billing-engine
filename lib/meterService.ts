import { PrismaClient, UsageType, Prisma } from "../app/generated/prisma/client";

const prisma = new PrismaClient();

export async function record(
    tenantID: string, 
    type: UsageType,
    quantity: number,
    idempotencyKey: string
) {
    try {
        const newRecord = await prisma.usageEvent.create({ data: {
            tenantID: tenantID,
            idempotencyKey: idempotencyKey,
            usageType: type,
            quantity: quantity,
        
    }});
    return newRecord;
    //create a new record for the UsageType table, storing all the required information from an action made by the client and return it 

    } catch (error) {
        //check if the prev action is a duplicate of the latest one through the error code 
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
            const existing = await prisma.usageEvent.findUnique({
                where: {
                    tenantID_idempotencyKey: {
                        tenantID: tenantID,
                        idempotencyKey: idempotencyKey
                    },
                },
            });
            return existing;
        } // if it is a duplicate then find the existing record and return it instead 
        else { throw error; }
        //else the error is unrelated to idempotency 
    }

    

}