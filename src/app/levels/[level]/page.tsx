import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { levelMeta } from "@/content/meta";
import { modulesForLevel, toSummary } from "@/content";
import { hasPremium } from "@/lib/access";
import { LevelPath } from "@/components/LevelPath";
import type { LevelId } from "@/content/types";

export const dynamic = "force-dynamic";

export function generateMetadata({ params }: { params: { level: string } }): Metadata {
  const l = levelMeta(params.level);
  if (!l) return {};
  return { title: `${l.name} QA interview questions (${l.years})`, description: l.blurb };
}

export default async function LevelPage({ params }: { params: { level: string } }) {
  const l = levelMeta(params.level);
  if (!l) notFound();
  const premium = await hasPremium();
  const modules = modulesForLevel(l.id as LevelId).map((m) => ({ module: m.module, questions: m.questions.map(toSummary) }));
  return (
    <div className="space-y-6">
      <div>
        <Link href="/#levels" className="text-sm muted hover:underline">← All levels</Link>
        <h1 className="mt-2 text-3xl font-bold">{l.name} <span className="text-xl font-normal muted">· {l.years}</span></h1>
        <p className="mt-2 muted">{l.blurb}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link href={`/practice/${l.id}`} className="btn btn-ghost">🃏 Flashcard mode</Link>
          <Link href={`/search?level=${l.id}`} className="btn btn-ghost">🔎 Search this level</Link>
        </div>
      </div>
      <LevelPath modules={modules} premium={premium} />
    </div>
  );
}
