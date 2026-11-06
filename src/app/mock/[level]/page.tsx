import Link from "next/link";
import { notFound } from "next/navigation";
import { levelMeta } from "@/content/meta";
import { questionsForLevel, toSummary } from "@/content";
import { hasPremium } from "@/lib/access";
import { MockInterview, type MockCard } from "@/components/MockInterview";
import type { LevelId } from "@/content/types";

export const dynamic = "force-dynamic";

export function generateMetadata({ params }: { params: { level: string } }) {
  const l = levelMeta(params.level);
  return l ? { title: `${l.name} mock interview` } : {};
}

export default async function MockLevel({ params }: { params: { level: string } }) {
  const l = levelMeta(params.level);
  if (!l) notFound();
  const premium = await hasPremium();
  const all = questionsForLevel(l.id as LevelId);
  // Only questions the visitor can access are sent to the browser.
  const cards: MockCard[] = all.filter((q) => premium || q.free).map((q) => ({ ...toSummary(q), a60: q.a60 }));
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Link href="/mock" className="text-sm muted hover:underline">← All levels</Link>
      <h1 className="text-2xl font-bold">{l.name} mock interview</h1>
      <MockInterview level={l.id} cards={cards} lockedCount={all.length - cards.length} premium={premium} />
    </div>
  );
}
