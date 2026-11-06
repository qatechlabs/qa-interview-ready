"use client";
import Link from "next/link";
import { useProgress } from "@/lib/progress";
import type { QuestionSummary } from "@/content/types";
import { LEVELS, TOPICS, levelMeta } from "@/content/meta";
import { useMockHistory, scoreOf, weakTopics } from "@/lib/mock";

export function ProgressDashboard({ summaries }: { summaries: QuestionSummary[] }) {
  const { state, reset } = useProgress();
  const { rounds, clear: clearRounds } = useMockHistory();
  const weak = weakTopics(rounds).slice(0, 4);
  const byId = new Map(summaries.map((s) => [s.id, s]));
  const list = (bucket: Record<string, number>) =>
    Object.entries(bucket).sort((a, b) => b[1] - a[1]).map(([id]) => byId.get(id)).filter(Boolean) as QuestionSummary[];
  const sections: [string, QuestionSummary[]][] = [
    ["↻ Practice again", list(state.again)],
    ["★ Bookmarks", list(state.bookmarks)],
  ];
  return (
    <div className="space-y-8">
      <div className="grid gap-3 sm:grid-cols-5">
        {LEVELS.map((l) => {
          const qs = summaries.filter((s) => s.level === l.id);
          const done = qs.filter((s) => state.done[s.id]).length;
          const pct = qs.length ? Math.round((done / qs.length) * 100) : 0;
          return (
            <Link key={l.id} href={`/levels/${l.id}`} className="card p-4 hover:shadow">
              <div className="text-sm font-semibold">{l.name}</div>
              <div className="mt-1 text-2xl font-bold">{pct}%</div>
              <div className="text-xs muted">{done}/{qs.length} done</div>
            </Link>
          );
        })}
      </div>
      <section className="grid gap-4 md:grid-cols-2">
        <div className="card p-5">
          <h2 className="font-semibold">🎤 Mock interview rounds <span className="muted">({rounds.length})</span></h2>
          {rounds.length ? (
            <ul className="mt-3 space-y-2 text-sm">
              {rounds.slice(0, 6).map((r) => {
                const score = scoreOf(r);
                return (
                  <li key={r.id} className="flex items-center gap-3">
                    <span className="w-12 font-semibold" style={{ color: score >= 80 ? "var(--good)" : score >= 50 ? "var(--warn)" : "var(--accent)" }}>{score}%</span>
                    <span className="flex-1">{levelMeta(r.level)?.name} · {r.results.length} questions</span>
                    <span className="muted">{new Date(r.at).toLocaleDateString()}</span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="mt-2 text-sm muted">No rounds yet. <Link href="/mock" className="underline">Start a mock interview</Link>.</p>
          )}
        </div>
        <div className="card p-5">
          <h2 className="font-semibold">Weak topics</h2>
          {weak.length ? (
            <ul className="mt-3 space-y-2 text-sm">
              {weak.map((w) => (
                <li key={w.topic} className="flex items-center gap-3">
                  <span className="flex-1">{TOPICS[w.topic].name}</span>
                  <span className="muted">{Math.round(w.missRate * 100)}% not nailed · {w.n} asked</span>
                  <Link href={`/search?topic=${w.topic}`} className="accent hover:underline">Revise →</Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm muted">Complete a couple of mock rounds and your weakest topics will show up here.</p>
          )}
        </div>
      </section>
      {sections.map(([title, items]) => (
        <section key={title}>
          <h2 className="mb-2 font-semibold">{title} <span className="muted">({items.length})</span></h2>
          {items.length ? (
            <ul className="card divide-y" style={{ borderColor: "var(--border)" }}>
              {items.map((q) => (
                <li key={q.id} style={{ borderColor: "var(--border)" }}>
                  <Link href={`/q/${q.id}`} className="block px-4 py-2.5 hover:bg-[var(--surface-2)]">{q.q}</Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm muted">Nothing here yet.</p>
          )}
        </section>
      ))}
      <p className="text-xs muted">
        Progress is saved in this browser only.{" "}
        <button className="underline" onClick={() => { if (confirm("Clear all progress in this browser?")) { reset(); clearRounds(); } }}>Reset progress</button>
      </p>
    </div>
  );
}
