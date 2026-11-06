import Link from "next/link";
import { notFound } from "next/navigation";
import { levelMeta } from "@/content/meta";
import { questionsForLevel, toSummary } from "@/content";
import { hasPremium } from "@/lib/access";
import { Flashcards, type Card } from "@/components/Flashcards";
import type { LevelId } from "@/content/types";

export function generateMetadata({ params }: { params: { level: string } }) {
  const l = levelMeta(params.level);
  return l ? { title: `${l.name} flashcards` } : {};
}

export default async function PracticeLevel({ params }: { params: { level: string } }) {
  const l = levelMeta(params.level);
  if (!l) notFound();
  const premium = await hasPremium();
  const all = questionsForLevel(l.id as LevelId);
  // Only questions the visitor can access are sent to the browser.
  const cards: Card[] = all.filter((q) => premium || q.free).map((q) => ({ ...toSummary(q), a60: q.a60 }));
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Link href={`/levels/${l.id}`} className="text-sm muted hover:underline">← {l.name} path</Link>
      <h1 className="text-2xl font-bold">{l.name} flashcards</h1>
      <Flashcards cards={cards} lockedCount={all.length - cards.length} />
    </div>
  );
}
