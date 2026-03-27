import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;

function keyBuffer(hexKey: string): Buffer {
  const buf = Buffer.from(hexKey, "hex");
  if (buf.length !== 32) throw new Error("Encryption key must be 32 bytes (64 hex chars)");
  return buf;
}

/** Returns base64 string: iv:authTag:ciphertext */
export function encryptToken(plaintext: string, hexKey: string): string {
  const key = keyBuffer(hexKey);
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [iv.toString("base64"), authTag.toString("base64"), encrypted.toString("base64")].join(":");
}

export function decryptToken(encoded: string, hexKey: string): string {
  const key = keyBuffer(hexKey);
  const parts = encoded.split(":");
  if (parts.length !== 3) throw new Error("Invalid encrypted token format");
  const [ivB64, authTagB64, ciphertextB64] = parts;
  const iv = Buffer.from(ivB64, "base64");
  const authTag = Buffer.from(authTagB64, "base64");
  const ciphertext = Buffer.from(ciphertextB64, "base64");
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  return decipher.update(ciphertext).toString("utf8") + decipher.final("utf8");
}
