import { describe, it, expect } from "vitest";
import { calculateOpportunityScore } from "../workers/trend-polling.js";

describe("calculateOpportunityScore", () => {
  it("weights velocity 40%, relevance 35%, saturation inverse 25%", () => {
    const score = calculateOpportunityScore({ velocity: 100, relevance: 100, saturation: 0 });
    expect(score).toBe(100);
  });

  it("saturated trend scores low", () => {
    const score = calculateOpportunityScore({ velocity: 80, relevance: 80, saturation: 100 });
    expect(score).toBeCloseTo(80 * 0.4 + 80 * 0.35 + 0 * 0.25, 1);
  });

  it("clamps to 0–100", () => {
    expect(calculateOpportunityScore({ velocity: 0, relevance: 0, saturation: 100 })).toBe(0);
    expect(calculateOpportunityScore({ velocity: 100, relevance: 100, saturation: 0 })).toBe(100);
  });
});
