"use client";
import Link from "next/link";
import { useProgress } from "@/lib/progress";
import type { QuestionSummary } from "@/content/types";
import { LEVELS } from "@/content/meta";

export function ProgressDashboard({ summaries }: { summaries: QuestionSummary[] }) {
  const { state, reset } = useProgress();
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
        <button className="underline" onClick={() => { if (confirm("Clear all progress in this browser?")) reset(); }}>Reset progress</button>
      </p>
    </div>
  );
}
