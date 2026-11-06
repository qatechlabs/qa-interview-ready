"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useProgress } from "@/lib/progress";
import type { QuestionSummary, TopicId } from "@/content/types";
import { TOPICS } from "@/content/meta";

export function LevelPath({ modules, premium }: { modules: { module: string; questions: QuestionSummary[] }[]; premium: boolean }) {
  const { state } = useProgress();
  const [topic, setTopic] = useState<TopicId | "all">("all");
  const [hideDone, setHideDone] = useState(false);
  const all = modules.flatMap((m) => m.questions);
  const topics = useMemo(() => Array.from(new Set(all.map((q) => q.topic))), [all]);
  const visible = modules
    .map((m) => ({ ...m, questions: m.questions.filter((q) => (topic === "all" || q.topic === topic) && (!hideDone || !state.done[q.id])) }))
    .filter((m) => m.questions.length);
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
      <div className="flex flex-wrap items-center gap-2">
        <button onClick={() => setTopic("all")} className="btn btn-ghost !py-1 text-xs" style={topic === "all" ? { background: "var(--accent-soft)", color: "var(--accent)", borderColor: "var(--accent)" } : undefined}>All topics</button>
        {topics.map((t) => (
          <button key={t} onClick={() => setTopic(t)} className="btn btn-ghost !py-1 text-xs" style={topic === t ? { background: "var(--accent-soft)", color: "var(--accent)", borderColor: "var(--accent)" } : undefined}>{TOPICS[t].short}</button>
        ))}
        <label className="ml-auto flex items-center gap-1.5 text-xs muted">
          <input type="checkbox" checked={hideDone} onChange={(e) => setHideDone(e.target.checked)} /> Hide done
        </label>
      </div>
      {!visible.length && <p className="card p-6 text-center text-sm muted">Nothing matches. {hideDone ? "Everything in this filter is done." : "Try another topic."}</p>}
      {visible.map((m) => (
        <section key={m.module}>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide muted">Module {modules.findIndex((x) => x.module === m.module) + 1} · {m.module}</h2>
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
