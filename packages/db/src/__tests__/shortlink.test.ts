import { describe, it, expect } from "vitest";
import { generateShortlinkCode } from "../shortlink.js";

describe("generateShortlinkCode", () => {
  it("generates an 8-char alphanumeric code", () => {
    const code = generateShortlinkCode();
    expect(code).toHaveLength(8);
    expect(code).toMatch(/^[a-z0-9]+$/);
  });

  it("generates unique codes", () => {
    const codes = new Set(Array.from({ length: 100 }, generateShortlinkCode));
    expect(codes.size).toBeGreaterThan(95);
  });
});
