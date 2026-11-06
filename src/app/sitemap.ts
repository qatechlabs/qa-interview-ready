import type { MetadataRoute } from "next";
import { SITE } from "@/lib/config";
import { LEVELS } from "@/content/meta";
import { allQuestions } from "@/content";
import { ALL_SCENARIOS } from "@/lab/scenarios";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = SITE.url.replace(/\/$/, "");
  const pages = ["", "/pricing", "/practice", "/search", "/labs", "/terms", "/privacy", "/refunds", "/contact"].map((p) => ({ url: base + p }));
  const levels = LEVELS.map((l) => ({ url: `${base}/levels/${l.id}` }));
  const questions = allQuestions().filter((q) => q.free).map((q) => ({ url: `${base}/q/${q.id}` }));
  const labs = ALL_SCENARIOS.filter((s) => s.free).map((s) => ({ url: `${base}/labs/${s.id}` }));
  return [...pages, ...levels, ...questions, ...labs];
}
