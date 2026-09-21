import bcrypt from "bcryptjs";
import jwt, { SignOptions } from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET as string;

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET is not set in environment variables");
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export type TokenPayload = {
  id: string;
  role: string; // "SUPER_ADMIN" or any custom staff role name (e.g. "TELLER", "CASHIER", "RECEPTIONIST")
  branchId?: string;
  mustChangePassword?: boolean;
};

export function signToken(payload: TokenPayload, options?: SignOptions): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "8h", ...options });
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch {
    return null;
  }
}