"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useProgress } from "@/lib/progress";
import type { QuestionSummary } from "@/content/types";
import { TOPICS } from "@/content/meta";
import { Inline } from "./RichText";

export interface Card extends QuestionSummary {
  a60: string;
}

type Filter = "all" | "todo" | "again";

function shuffle<T>(arr: T[], seed: number) {
  const a = [...arr];
  let s = seed;
  for (let i = a.length - 1; i > 0; i--) {
    s = (s * 9301 + 49297) % 233280;
    const j = Math.floor((s / 233280) * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function Flashcards({ cards, lockedCount }: { cards: Card[]; lockedCount: number }) {
  const { state, toggle } = useProgress();
  const [filter, setFilter] = useState<Filter>("all");
  const [seed, setSeed] = useState<number | null>(null);
  const [idx, setIdx] = useState(0);
  const [revealed, setRevealed] = useState(false);
  // Snapshot of the deck so marking a card doesn't reshuffle the current session.
  const [deckKey, setDeckKey] = useState(0);

  const deck = useMemo(() => {
    let list = cards;
    if (filter === "todo") list = list.filter((c) => !state.done[c.id]);
    if (filter === "again") list = list.filter((c) => state.again[c.id]);
    return seed === null ? list : shuffle(list, seed);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cards, filter, seed, deckKey]);

  useEffect(() => { setIdx(0); setRevealed(false); }, [filter, seed]);

  const card = deck[idx];
  const go = (d: number) => { setIdx((i) => Math.max(0, Math.min(deck.length - 1, i + d))); setRevealed(false); };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === "INPUT") return;
      if (e.key === " " || e.key === "Enter") { e.preventDefault(); setRevealed(true); }
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {([
          ["all", "All cards"],
          ["todo", "Not done yet"],
          ["again", "Practice again"],
        ] as [Filter, string][]).map(([f, label]) => (
          <button key={f} onClick={() => { setFilter(f); setDeckKey((k) => k + 1); }} className="btn btn-ghost !py-1 text-xs" style={filter === f ? { background: "var(--accent-soft)", color: "var(--accent)", borderColor: "var(--accent)" } : undefined}>
            {label}
          </button>
        ))}
        <button onClick={() => setSeed(seed === null ? Date.now() % 233280 : null)} className="btn btn-ghost !py-1 text-xs">
          {seed === null ? "⤮ Shuffle" : "↦ Path order"}
        </button>
        <span className="ml-auto text-sm muted">{deck.length ? `${idx + 1} / ${deck.length}` : "0 cards"}</span>
      </div>

      {!card ? (
        <div className="card p-8 text-center muted">
          {filter === "again" ? "Nothing in your practice-again list yet." : filter === "todo" ? "You've done every card here. Nice work." : "No cards."}
        </div>
      ) : (
        <div key={card.id + revealed} className="card flip-enter p-6 sm:p-8">
          <div className="mb-3 flex flex-wrap gap-1.5">
            <span className="chip">Q{card.order}</span>
            <span className="chip">{TOPICS[card.topic].short}</span>
            <span className="chip">{card.module}</span>
          </div>
          <h2 className="text-xl font-semibold sm:text-2xl">{card.q}</h2>
          {!revealed ? (
            <div className="mt-8">
              <p className="mb-4 text-sm muted">Say your answer out loud first, then reveal.</p>
              <button className="btn btn-primary" onClick={() => setRevealed(true)}>Reveal answer (space)</button>
            </div>
          ) : (
            <div className="mt-6 space-y-5">
              <div className="rounded-lg p-4 leading-relaxed" style={{ background: "var(--accent-soft)" }}>
                <div className="mb-1 text-xs font-semibold uppercase tracking-wide accent">60-second answer</div>
                <Inline text={card.a60} />
              </div>
              <div className="flex flex-wrap gap-2">
                <button className="btn btn-primary" onClick={() => { toggle("done", card.id, true); toggle("again", card.id, false); go(1); }}>✓ Got it</button>
                <button className="btn btn-ghost" onClick={() => { toggle("again", card.id, true); go(1); }}>↻ Practice again</button>
                <Link className="btn btn-ghost" href={`/q/${card.id}`}>Full answer + code</Link>
              </div>
            </div>
          )}
          <div className="mt-8 flex justify-between text-sm">
            <button className="muted hover:underline disabled:opacity-40" disabled={idx === 0} onClick={() => go(-1)}>← Previous</button>
            <button className="muted hover:underline disabled:opacity-40" disabled={idx >= deck.length - 1} onClick={() => go(1)}>Next →</button>
          </div>
        </div>
      )}

      {lockedCount > 0 && (
        <div className="card flex flex-col items-start gap-3 p-4 sm:flex-row sm:items-center">
          <p className="flex-1 text-sm"><strong>{lockedCount} more cards</strong> in this level are part of the full access plan.</p>
          <Link href="/pricing" className="btn btn-primary">Unlock all levels</Link>
        </div>
      )}
    </div>
  );
}
