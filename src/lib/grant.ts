import "server-only";
import { NextResponse } from "next/server";
import { ACCESS_COOKIE, accessCookieOptions, signAccess } from "./access";

export async function grantResponse(email: string, paymentId: string) {
  const token = await signAccess({ email, paymentId });
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ACCESS_COOKIE, token, accessCookieOptions());
  return res;
}
