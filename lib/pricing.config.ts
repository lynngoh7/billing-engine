export const PRICING = {
    apiCall: {
        perCall : 10000
    },

    aiTokens: {
        perInputToken: 5,
        perCachedInputToken: 3,
        perOutputToken: 10

    },

};

export function calculateCost(usage: {
    apiCalls: number,
    inputTokens: number,
    cachedTokens: number,
    outputTokens: number
}) {
    const apiCost = PRICING.apiCall.perCall * usage.apiCalls
    const inputTokensCost = PRICING.aiTokens.perInputToken * usage.inputTokens
    const cachedTokensCost = PRICING.aiTokens.perCachedInputToken * usage.cachedTokens
    const outputTokensCost = PRICING.aiTokens.perOutputToken * usage.outputTokens

    const totalCost = apiCost + inputTokensCost + cachedTokensCost + outputTokensCost
    return {totalCost, breakdown: {apiCost, inputTokensCost, cachedTokensCost, outputTokensCost}}
}