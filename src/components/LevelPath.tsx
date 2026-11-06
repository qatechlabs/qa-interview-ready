"use client";
import Link from "next/link";
import { useProgress } from "@/lib/progress";
import type { QuestionSummary } from "@/content/types";
import { TOPICS } from "@/content/meta";

export function LevelPath({ modules, premium }: { modules: { module: string; questions: QuestionSummary[] }[]; premium: boolean }) {
  const { state } = useProgress();
  const all = modules.flatMap((m) => m.questions);
  const doneCount = all.filter((q) => state.done[q.id]).length;
  const nextUp = all.find((q) => !state.done[q.id] && (premium || q.free));
  const pct = all.length ? Math.round((doneCount / all.length) * 100) : 0;
  return (
    <div className="space-y-6">
      <div className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
        <div className="flex-1">
          <div className="flex justify-between text-sm"><span className="font-medium">Your progress</span><span className="muted">{doneCount}/{all.length} done</span></div>
          <div className="mt-2 h-2 overflow-hidden rounded-full" style={{ background: "var(--surface-2)" }}>
            <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: "var(--good)" }} />
          </div>
        </div>
        {nextUp && <Link href={`/q/${nextUp.id}`} className="btn btn-primary">{doneCount ? "Continue" : "Start"}: Q{nextUp.order} →</Link>}
      </div>
      {modules.map((m, mi) => (
        <section key={m.module}>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide muted">Module {mi + 1} · {m.module}</h2>
          <ol className="card divide-y" style={{ borderColor: "var(--border)" }}>
            {m.questions.map((q) => {
              const locked = !premium && !q.free;
              const done = !!state.done[q.id];
              return (
                <li key={q.id} style={{ borderColor: "var(--border)" }}>
                  <Link href={`/q/${q.id}`} className="flex items-start gap-3 px-4 py-3 hover:bg-[var(--surface-2)]">
                    <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-semibold" style={done ? { background: "var(--good)", color: "#fff" } : { background: "var(--surface-2)", color: "var(--muted)" }}>
                      {done ? "✓" : q.order}
                    </span>
                    <span className="flex-1">
                      <span className="block font-medium">{q.q}</span>
                      <span className="mt-1 flex flex-wrap gap-1.5">
                        <span className="chip">{TOPICS[q.topic].short}</span>
                        {q.free && !premium && <span className="chip" style={{ color: "var(--good)" }}>Free</span>}
                        {state.again[q.id] && <span className="chip" style={{ color: "var(--warn)" }}>↻ Practice again</span>}
                        {state.bookmarks[q.id] && <span className="chip" style={{ color: "var(--accent)" }}>★</span>}
                      </span>
                    </span>
                    {locked && <span className="mt-0.5 text-sm muted" aria-label="Locked">🔒</span>}
                  </Link>
                </li>
              );
            })}
          </ol>
        </section>
      ))}
    </div>
  );
}
