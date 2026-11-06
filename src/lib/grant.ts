import "server-only";
import { NextResponse } from "next/server";
import { ACCESS_COOKIE, accessCookieOptions, signAccess } from "./access";
import type { TierId } from "./config";

export async function grantResponse(email: string, paymentId: string, tier: TierId) {
  const token = await signAccess({ email, paymentId, tier });
  const res = NextResponse.json({ ok: true, tier });
  res.cookies.set(ACCESS_COOKIE, token, accessCookieOptions());
  return res;
}
