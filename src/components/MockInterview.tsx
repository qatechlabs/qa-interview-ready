"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useProgress } from "@/lib/progress";
import { useMockHistory, scoreOf, type Grade, type MockRound } from "@/lib/mock";
import type { LevelId, QuestionSummary, TopicId } from "@/content/types";
import { TOPICS } from "@/content/meta";
import { Inline } from "./RichText";

export interface MockCard extends QuestionSummary {
  a60: string;
}

type Mode = "mixed" | "weak" | TopicId;
const SECONDS = 60;

function pick(pool: MockCard[], n: number, weight: (c: MockCard) => number) {
  // Weighted sample without replacement.
  const out: MockCard[] = [];
  let rest = pool.map((c) => ({ c, w: Math.max(0.01, weight(c)) }));
  while (out.length < n && rest.length) {
    const total = rest.reduce((s, x) => s + x.w, 0);
    let r = Math.random() * total;
    const i = rest.findIndex((x) => (r -= x.w) <= 0);
    const idx = i < 0 ? rest.length - 1 : i;
    out.push(rest[idx].c);
    rest = rest.filter((_, k) => k !== idx);
  }
  return out;
}

export function MockInterview({ level, cards, lockedCount, premium }: { level: LevelId; cards: MockCard[]; lockedCount: number; premium: boolean }) {
  const { state, toggle } = useProgress();
  const { rounds, addRound } = useMockHistory();
  const [mode, setMode] = useState<Mode>("mixed");
  const [size, setSize] = useState(10);
  const [round, setRound] = useState<MockCard[] | null>(null);
  const [idx, setIdx] = useState(0);
  const [left, setLeft] = useState(SECONDS);
  const [revealed, setRevealed] = useState(false);
  const [results, setResults] = useState<MockRound["results"]>([]);
  const [finished, setFinished] = useState<MockRound | null>(null);

  const topicsHere = useMemo(() => Array.from(new Set(cards.map((c) => c.topic))), [cards]);
  const recentMiss = useMemo(() => {
    const m: Record<string, number> = {};
    for (const r of rounds.filter((r) => r.level === level).slice(0, 5)) for (const x of r.results) if (x.grade !== "nailed") m[x.id] = (m[x.id] || 0) + 1;
    return m;
  }, [rounds, level]);

  const available = mode === "mixed" || mode === "weak" ? cards.length : cards.filter((c) => c.topic === mode).length;
  const n = Math.min(size, available);

  function start() {
    const pool = mode === "mixed" || mode === "weak" ? cards : cards.filter((c) => c.topic === mode);
    const weight = (c: MockCard) => {
      if (mode !== "weak") return 1;
      let w = 1;
      if (state.again[c.id]) w += 3;
      if (!state.done[c.id]) w += 1;
      w += (recentMiss[c.id] || 0) * 2;
      return w;
    };
    setRound(pick(pool, n, weight));
    setIdx(0);
    setLeft(SECONDS);
    setRevealed(false);
    setResults([]);
    setFinished(null);
  }

  useEffect(() => {
    if (!round || revealed || left <= 0) return;
    const t = setTimeout(() => setLeft((l) => l - 1), 1000);
    return () => clearTimeout(t);
  }, [round, revealed, left]);

  function grade(g: Grade) {
    if (!round) return;
    const card = round[idx];
    const next = [...results, { id: card.id, topic: card.topic, grade: g }];
    if (g === "nailed") { toggle("done", card.id, true); toggle("again", card.id, false); }
    else toggle("again", card.id, true);
    if (idx + 1 < round.length) {
      setResults(next);
      setIdx(idx + 1);
      setLeft(SECONDS);
      setRevealed(false);
    } else {
      const r: MockRound = { id: `${Date.now()}`, level, at: Date.now(), results: next };
      addRound(r);
      setFinished(r);
      setRound(null);
    }
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!round) return;
      if ((e.target as HTMLElement)?.tagName === "INPUT") return;
      if (!revealed && (e.key === " " || e.key === "Enter")) { e.preventDefault(); setRevealed(true); }
      if (revealed && e.key === "1") grade("nailed");
      if (revealed && e.key === "2") grade("shaky");
      if (revealed && e.key === "3") grade("missed");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (finished) {
    const score = scoreOf(finished);
    const byId = new Map(cards.map((c) => [c.id, c]));
    const groups: [string, Grade][] = [["Missed", "missed"], ["Shaky", "shaky"], ["Nailed", "nailed"]];
    return (
      <div className="space-y-5">
        <div className="card p-6 text-center">
          <div className="text-sm font-semibold uppercase tracking-wide muted">Round complete</div>
          <div className="mt-1 text-5xl font-bold" style={{ color: score >= 80 ? "var(--good)" : score >= 50 ? "var(--warn)" : "var(--accent)" }}>{score}%</div>
          <p className="mt-2 muted">
            {finished.results.filter((r) => r.grade === "nailed").length} nailed · {finished.results.filter((r) => r.grade === "shaky").length} shaky · {finished.results.filter((r) => r.grade === "missed").length} missed.
            {score >= 80 ? " Interview-ready on this set." : score >= 50 ? " Close. Revisit the shaky ones and run it again." : " Work through the missed questions below, then try a weak-spots round."}
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <button className="btn btn-primary" onClick={() => { setMode("weak"); setFinished(null); }}>Weak-spots round</button>
            <button className="btn btn-ghost" onClick={() => setFinished(null)}>New round</button>
            <Link href="/progress" className="btn btn-ghost">See progress</Link>
          </div>
        </div>
        {groups.map(([title, g]) => {
          const items = finished.results.filter((r) => r.grade === g).map((r) => byId.get(r.id)).filter(Boolean) as MockCard[];
          if (!items.length) return null;
          return (
            <section key={g}>
              <h2 className="mb-2 font-semibold">{title} <span className="muted">({items.length})</span></h2>
              <ul className="card divide-y" style={{ borderColor: "var(--border)" }}>
                {items.map((c) => (
                  <li key={c.id} style={{ borderColor: "var(--border)" }}>
                    <Link href={`/q/${c.id}`} className="flex items-center gap-3 px-4 py-2.5 hover:bg-[var(--surface-2)]">
                      <span className="flex-1">{c.q}</span>
                      <span className="chip">{TOPICS[c.topic].short}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    );
  }

  if (!round) {
    const modes: [Mode, string][] = [["mixed", "Mixed"], ["weak", "Weak spots"], ...topicsHere.map((t) => [t, TOPICS[t].short] as [Mode, string])];
    return (
      <div className="space-y-4">
        <div className="card space-y-5 p-6">
          <div>
            <div className="mb-2 text-sm font-semibold">Questions from</div>
            <div className="flex flex-wrap gap-2">
              {modes.map(([m, label]) => (
                <button key={m} onClick={() => setMode(m)} className="btn btn-ghost !py-1 text-xs" style={mode === m ? { background: "var(--accent-soft)", color: "var(--accent)", borderColor: "var(--accent)" } : undefined}>{label}</button>
              ))}
            </div>
            {mode === "weak" && <p className="mt-2 text-xs muted">Prioritises questions you marked "practice again", haven't done, or missed in recent rounds.</p>}
          </div>
          <div>
            <div className="mb-2 text-sm font-semibold">Round length</div>
            <div className="flex flex-wrap gap-2">
              {[5, 10, 15].map((s) => (
                <button key={s} onClick={() => setSize(s)} className="btn btn-ghost !py-1 text-xs" style={size === s ? { background: "var(--accent-soft)", color: "var(--accent)", borderColor: "var(--accent)" } : undefined}>{s} questions</button>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button className="btn btn-primary !px-6 !py-3 text-base" disabled={n === 0} onClick={start}>Start {n}-question round</button>
            <span className="text-sm muted">{available} questions in this pool · {SECONDS}s each</span>
          </div>
          <p className="text-xs muted">How it works: read the question, answer out loud as the timer runs, reveal the model answer, then grade yourself honestly. Keys: space to reveal, 1 nailed, 2 shaky, 3 missed.</p>
        </div>
        {!premium && lockedCount > 0 && (
          <div className="card flex flex-col items-start gap-3 p-4 sm:flex-row sm:items-center">
            <p className="flex-1 text-sm"><strong>Rounds are drawn from the {cards.length} free questions.</strong> Full access adds the other {lockedCount} in this level, so every round is different.</p>
            <Link href="/pricing" className="btn btn-primary">Unlock all levels</Link>
          </div>
        )}
      </div>
    );
  }

  const card = round[idx];
  const pct = Math.round((left / SECONDS) * 100);
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-sm">
        <span className="muted">Question {idx + 1} of {round.length}</span>
        <span className="font-mono font-semibold" style={{ color: left <= 10 ? "var(--warn)" : undefined }}>{revealed ? "Answer shown" : left > 0 ? `${left}s` : "Time's up"}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full" style={{ background: "var(--surface-2)" }}>
        <div className="h-full rounded-full transition-all" style={{ width: `${revealed ? 100 : pct}%`, background: left <= 10 && !revealed ? "var(--warn)" : "var(--accent)" }} />
      </div>
      <div key={card.id + revealed} className="card flip-enter p-6 sm:p-8">
        <div className="mb-3 flex flex-wrap gap-1.5">
          <span className="chip">{TOPICS[card.topic].short}</span>
          <span className="chip">{card.module}</span>
        </div>
        <h2 className="text-xl font-semibold sm:text-2xl">{card.q}</h2>
        {!revealed ? (
          <div className="mt-8">
            <p className="mb-4 text-sm muted">Answer out loud as if the interviewer just asked. Reveal when you're done or when time runs out.</p>
            <button className="btn btn-primary" onClick={() => setRevealed(true)}>Reveal model answer (space)</button>
          </div>
        ) : (
          <div className="mt-6 space-y-5">
            <div className="rounded-lg p-4 leading-relaxed" style={{ background: "var(--accent-soft)" }}>
              <div className="mb-1 text-xs font-semibold uppercase tracking-wide accent">Model 60-second answer</div>
              <Inline text={card.a60} />
            </div>
            <div>
              <div className="mb-2 text-sm font-semibold">How did yours compare?</div>
              <div className="flex flex-wrap gap-2">
                <button className="btn btn-primary" onClick={() => grade("nailed")}>1 · Nailed it</button>
                <button className="btn btn-ghost" onClick={() => grade("shaky")}>2 · Shaky</button>
                <button className="btn btn-ghost" onClick={() => grade("missed")}>3 · Missed</button>
                <Link className="btn btn-ghost ml-auto" href={`/q/${card.id}`} target="_blank">Full answer + code ↗</Link>
              </div>
            </div>
          </div>
        )}
      </div>
      <button className="text-sm muted hover:underline" onClick={() => { setRound(null); setFinished(null); }}>Abandon round</button>
    </div>
  );
}
