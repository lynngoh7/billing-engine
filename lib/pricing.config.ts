export const PRICING = {
    apiCall: {
        perCall : 0.01
    },

    aiTokens: {
        perInputToken: 0.000005,
        perCachedInputToken: 0.0000025,
        perOutputToken: 0.00001

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