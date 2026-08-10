import { describe, it, expect } from 'vitest';
import { calculateCost } from '../lib/pricing.config'; // or wherever calculateCost actually lives
import { PRICING } from './pricing.config';

describe('calculateCost', () => {
    it('correctly calculates cost for a known usage breakdown', () => {
        const usage = {
            apiCalls: 5,
            inputTokens: 5,
            cachedTokens: 10,
            outputTokens: 10
        };
        const result = calculateCost(usage);
        const expectedTotal = (usage.apiCalls * PRICING.apiCall.perCall) + (usage.inputTokens * PRICING.aiTokens.perInputToken) + (usage.cachedTokens* PRICING.aiTokens.perCachedInputToken) + (usage.outputTokens * PRICING.aiTokens.perOutputToken);
        
        expect(result.totalCost).toBeCloseTo(expectedTotal);
    });
});