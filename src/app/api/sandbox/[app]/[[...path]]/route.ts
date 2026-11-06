import { handle } from "@/lib/sandbox/http";
import { swagshopApi } from "@/lib/sandbox/swagshop";
import { peopledeskApi } from "@/lib/sandbox/peopledesk";
import { trendkartApi } from "@/lib/sandbox/trendkart";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: { app: string; path?: string[] } };

async function dispatch(req: Request, { params }: Params) {
  const path = params.path ?? [];
  switch (params.app) {
    case "swagshop":
      return handle(swagshopApi, req, path);
    case "peopledesk":
      return handle(peopledeskApi, req, path);
    case "trendkart":
      return handle(trendkartApi, req, path);
    default:
      return new Response(JSON.stringify({ error: { code: "not_found", message: "Unknown practice app. Use swagshop, peopledesk or trendkart." } }), { status: 404, headers: { "Content-Type": "application/json" } });
  }
}

export const GET = dispatch;
export const POST = dispatch;
export const PUT = dispatch;
export const PATCH = dispatch;
export const DELETE = dispatch;
export const OPTIONS = dispatch;
