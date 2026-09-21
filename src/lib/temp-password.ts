import crypto from "crypto";

export function generateTempPassword(): string {
  // 8-char alphanumeric, easy to relay verbally/via chat
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let out = "";
  for (let i = 0; i < 6; i++) {
    out += chars[crypto.randomInt(0, chars.length)];
  }
  return out;
}