import { describe, it, expect } from "vitest";
import { encryptToken, decryptToken } from "../crypto.js";

describe("token encryption", () => {
  const key = "0".repeat(64); // 32 bytes as hex

  it("round-trips a token", () => {
    const original = "ya29.some_oauth_token";
    const encrypted = encryptToken(original, key);
    expect(encrypted).not.toBe(original);
    expect(decryptToken(encrypted, key)).toBe(original);
  });

  it("produces different ciphertext each call (random IV)", () => {
    const t = "same_token";
    expect(encryptToken(t, key)).not.toBe(encryptToken(t, key));
  });

  it("throws on wrong key", () => {
    const encrypted = encryptToken("token", key);
    const wrongKey = "1".repeat(64);
    expect(() => decryptToken(encrypted, wrongKey)).toThrow();
  });
});
