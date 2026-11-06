import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getQuestion, neighbours } from "@/content";
import { TOPICS, levelMeta } from "@/content/meta";
import { hasPremium } from "@/lib/access";
import { highlightAll } from "@/lib/highlight";
import { formatPrice } from "@/lib/config";
import { RichText, Inline } from "@/components/RichText";
import { CodeTabs } from "@/components/CodeTabs";
import { ProgressButtons } from "@/components/ProgressButtons";
import { SpeakTimer } from "@/components/SpeakTimer";

export function generateMetadata({ params }: { params: { id: string } }): Metadata {
  const q = getQuestion(params.id);
  if (!q) return {};
  const level = levelMeta(q.level)!;
  return {
    title: q.q,
    description: q.free ? q.a60.slice(0, 155) : `${level.name} QA interview question on ${TOPICS[q.topic].name}.`,
    robots: q.free ? undefined : { index: false },
  };
}

export default async function QuestionPage({ params }: { params: { id: string } }) {
  const q = getQuestion(params.id);
  if (!q) notFound();
  const level = levelMeta(q.level)!;
  const premium = await hasPremium();
  const locked = !q.free && !premium;
  const { prev, next } = neighbours(q);
  const code = locked ? [] : await highlightAll(q.code);

  return (
    <article className="mx-auto max-w-3xl space-y-6">
      <nav className="flex flex-wrap items-center gap-2 text-sm muted">
        <Link href={`/levels/${q.level}`} className="hover:underline">← {level.name} path</Link>
        <span>·</span>
        <span>Q{q.order} · {q.module}</span>
      </nav>

      <header>
        <div className="mb-3 flex flex-wrap gap-1.5">
          <span className="chip">{level.name}</span>
          <span className="chip">{TOPICS[q.topic].name}</span>
          {q.free && !premium && <span className="chip" style={{ color: "var(--good)" }}>Free question</span>}
        </div>
        <h1 className="text-2xl font-bold leading-snug sm:text-3xl">{q.q}</h1>
      </header>

      {locked ? (
        <div className="card relative overflow-hidden p-6">
          <div aria-hidden className="select-none space-y-2 blur-sm">
            <div className="h-4 w-11/12 rounded" style={{ background: "var(--surface-2)" }} />
            <div className="h-4 w-10/12 rounded" style={{ background: "var(--surface-2)" }} />
            <div className="h-4 w-9/12 rounded" style={{ background: "var(--surface-2)" }} />
            <div className="h-24 w-full rounded" style={{ background: "var(--surface-2)" }} />
          </div>
          <div className="mt-6 text-center">
            <p className="text-lg font-semibold">🔒 This answer is part of full access</p>
            <p className="mx-auto mt-1 max-w-md text-sm muted">
              Unlock the 60-second answer, explanation, example and code for every question in all five levels. One payment of {formatPrice()}, lifetime access.
            </p>
            <div className="mt-4 flex justify-center gap-2">
              <Link href="/pricing" className="btn btn-primary">Unlock everything</Link>
              <Link href={`/levels/${q.level}`} className="btn btn-ghost">Back to free questions</Link>
            </div>
          </div>
        </div>
      ) : (
        <>
          <section className="rounded-xl p-5 leading-relaxed" style={{ background: "var(--accent-soft)" }}>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-xs font-semibold uppercase tracking-wide accent">60-second answer</h2>
              <SpeakTimer />
            </div>
            <p className="text-[1.05rem]"><Inline text={q.a60} /></p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold">Explanation</h2>
            <RichText text={q.explain} className="leading-relaxed" />
          </section>

          <section className="card p-5">
            <h2 className="mb-2 text-lg font-semibold">Example</h2>
            <RichText text={q.example} className="leading-relaxed" />
          </section>

          {code.length > 0 && (
            <section>
              <h2 className="mb-2 text-lg font-semibold">Sample code</h2>
              <CodeTabs samples={code} />
            </section>
          )}

          <ProgressButtons id={q.id} />
        </>
      )}

      <nav className="flex justify-between gap-4 border-t pt-4 text-sm" style={{ borderColor: "var(--border)" }}>
        {prev ? <Link href={`/q/${prev.id}`} className="max-w-[45%] hover:underline">← <span className="muted">Q{prev.order}</span> {prev.q}</Link> : <span />}
        {next ? <Link href={`/q/${next.id}`} className="max-w-[45%] text-right hover:underline"><span className="muted">Q{next.order}</span> {next.q} →</Link> : <span />}
      </nav>
    </article>
  );
}
