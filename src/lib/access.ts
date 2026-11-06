import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

export const ACCESS_COOKIE = "qir_access";
const MAX_AGE = 60 * 60 * 24 * 365 * 5; // 5 years

function secret() {
  const s = process.env.ACCESS_TOKEN_SECRET;
  if (!s || s.length < 32) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("ACCESS_TOKEN_SECRET must be set (32+ chars) in production");
    }
    return new TextEncoder().encode("dev-only-insecure-secret-change-me-please-0000");
  }
  return new TextEncoder().encode(s);
}

export interface AccessClaims {
  email: string;
  paymentId: string;
}

export async function signAccess(claims: AccessClaims) {
  return new SignJWT({ email: claims.email, pid: claims.paymentId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(secret());
}

export async function verifyAccess(token: string | undefined): Promise<AccessClaims | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret(), { algorithms: ["HS256"] });
    if (typeof payload.email !== "string" || typeof payload.pid !== "string") return null;
    return { email: payload.email, paymentId: payload.pid };
  } catch {
    return null;
  }
}

/** Reads the access cookie for the current request. */
export async function getAccess() {
  return verifyAccess(cookies().get(ACCESS_COOKIE)?.value);
}

export async function hasPremium() {
  return (await getAccess()) !== null;
}

export function accessCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: MAX_AGE,
  };
}
