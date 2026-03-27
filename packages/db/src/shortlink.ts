import { randomBytes } from "crypto";

export function generateShortlinkCode(): string {
  return randomBytes(6).toString("base64url").slice(0, 8).toLowerCase().replace(/[^a-z0-9]/g, "x");
}
