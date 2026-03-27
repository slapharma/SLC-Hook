import { describe, it, expect } from "vitest";
import { createContext } from "../context.js";

describe("context factory", () => {
  it("creates context with null userId for unauthenticated", () => {
    const ctx = createContext(null, null);
    expect(ctx.userId).toBeNull();
  });

  it("creates context with userId and tier", () => {
    const ctx = createContext("user_123", "creator");
    expect(ctx.userId).toBe("user_123");
    expect(ctx.userTier).toBe("creator");
  });
});
