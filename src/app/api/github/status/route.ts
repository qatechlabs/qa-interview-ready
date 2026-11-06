import { NextResponse } from "next/server";
import { createPrivateKey } from "node:crypto";
import { appJwt, gh, githubConfig, GitHubError } from "@/lib/github/app";

export const dynamic = "force-dynamic";

/**
 * Operational check for the GitHub App setup. Reports which env vars are missing and whether the
 * App credentials work. Never returns secret values.
 */
export async function GET() {
  const names = ["GITHUB_APP_ID", "GITHUB_APP_CLIENT_ID", "GITHUB_APP_CLIENT_SECRET", "GITHUB_APP_PRIVATE_KEY", "GITHUB_LAB_ORG"] as const;
  const missing = names.filter((n) => !(process.env[n] || "").trim());
  const cfg = githubConfig();
  const out: Record<string, unknown> = { configured: !!cfg, missing };
  if (!cfg) return NextResponse.json(out, { status: 200 });
  out.org = cfg.org;
  out.clientIdLooksValid = /^(Iv1\.|Iv23)[A-Za-z0-9]+$/.test(cfg.clientId);
  try {
    createPrivateKey(cfg.privateKey);
    out.privateKey = "parses";
  } catch (e) {
    out.privateKey = `invalid: ${e instanceof Error ? e.message : String(e)}`;
    return NextResponse.json(out);
  }
  try {
    const app = await gh<{ slug: string; name: string; html_url: string; client_id?: string }>("/app", appJwt());
    out.app = { slug: app.slug, name: app.name, url: app.html_url };
    // The client ID is public (it appears in the sign-in URL), so comparing it here is safe.
    if (app.client_id) {
      out.appClientId = app.client_id;
      out.clientIdMatchesApp = app.client_id === cfg.clientId;
      if (!out.clientIdMatchesApp) out.hint = `GITHUB_APP_CLIENT_ID in Vercel is "${cfg.clientId}" but the App's Client ID is "${app.client_id}". Update the variable and redeploy.`;
    }
    const installs = await gh<{ account: { login: string } }[]>("/app/installations?per_page=100", appJwt());
    out.installedOn = installs.map((i) => i.account.login);
    out.installedOnLabOrg = installs.some((i) => i.account.login.toLowerCase() === cfg.org.toLowerCase());
  } catch (e) {
    out.app = `GitHub rejected the App credentials: ${e instanceof GitHubError ? `${e.status} ${e.message}` : String(e)}`;
  }
  return NextResponse.json(out);
}
