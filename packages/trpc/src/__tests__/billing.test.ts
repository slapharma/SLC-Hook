import { describe, it, expect } from "vitest";

function tierFromPriceId(
  priceId: string,
  creatorPriceId: string,
  proPriceId: string
): "creator" | "pro" | "free" {
  if (priceId === creatorPriceId) return "creator";
  if (priceId === proPriceId) return "pro";
  return "free";
}

describe("tierFromPriceId", () => {
  it("returns creator for creator price", () => {
    expect(tierFromPriceId("price_creator", "price_creator", "price_pro")).toBe("creator");
  });
  it("returns pro for pro price", () => {
    expect(tierFromPriceId("price_pro", "price_creator", "price_pro")).toBe("pro");
  });
  it("defaults to free for unknown price", () => {
    expect(tierFromPriceId("price_unknown", "price_creator", "price_pro")).toBe("free");
  });
});
