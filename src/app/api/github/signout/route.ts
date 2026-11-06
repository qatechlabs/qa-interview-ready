import { NextResponse } from "next/server";
import { GITHUB_COOKIE } from "@/lib/github/user";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(GITHUB_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}
