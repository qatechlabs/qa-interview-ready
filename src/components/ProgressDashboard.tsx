"use client";
import Link from "next/link";
import { useProgress } from "@/lib/progress";
import type { QuestionSummary } from "@/content/types";
import { LEVELS, TOPICS, levelMeta } from "@/content/meta";
import { useMockHistory, scoreOf, weakTopics } from "@/lib/mock";
import { clearLabProgress, useLabRuns } from "@/lib/lab/progress";

export interface LabSummary {
  id: string;
  title: string;
  app: string;
  free: boolean;
}

export function ProgressDashboard({ summaries, labs = [] }: { summaries: QuestionSummary[]; labs?: LabSummary[] }) {
  const { state, reset } = useProgress();
  const { rounds, clear: clearRounds } = useMockHistory();
  const labRuns = useLabRuns();
  const labById = new Map(labs.map((l) => [l.id, l]));
  const labsPassed = labs.filter((l) => labRuns[l.id]?.passedAt).length;
  const recentRuns = Object.entries(labRuns)
    .filter(([id]) => labById.has(id))
    .sort((a, b) => b[1].lastAt - a[1].lastAt)
    .slice(0, 8);
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
      <section className="card p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-semibold">🧪 Live labs <span className="muted">({labsPassed}/{labs.length} passed)</span></h2>
          <Link href="/labs" className="text-sm accent hover:underline">All labs →</Link>
        </div>
        {recentRuns.length ? (
          <ul className="mt-3 divide-y text-sm" style={{ borderColor: "var(--border)" }}>
            {recentRuns.map(([id, r]) => {
              const lab = labById.get(id)!;
              return (
                <li key={id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2" style={{ borderColor: "var(--border)" }}>
                  <span className="w-20 font-semibold" style={{ color: r.lastOk ? "var(--good)" : "var(--bad)" }}>{r.lastOk ? "✓ Passed" : "✗ Not yet"}</span>
                  <Link href={`/labs/${id}`} className="min-w-0 flex-1 truncate hover:underline">
                    <span className="muted">{lab.app} · </span>{lab.title}
                  </Link>
                  <span className="muted">
                    {r.lastTests} tests · {r.lastMode === "github" ? "GitHub Actions" : "browser"} · {r.runs} run{r.runs === 1 ? "" : "s"} · {new Date(r.lastAt).toLocaleDateString()}
                  </span>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="mt-2 text-sm muted">No lab runs yet. <Link href="/labs" className="underline">Open a lab</Link> and press Run; every run is recorded here, passed or not.</p>
        )}
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
        <button className="underline" onClick={() => { if (confirm("Clear all progress in this browser?")) { reset(); clearRounds(); clearLabProgress(); } }}>Reset progress</button>
      </p>
    </div>
  );
}
