import Link from "next/link";
import { LEVELS, TOPICS, levelMeta } from "@/content/meta";
import { searchQuestions } from "@/content";
import { hasPremium } from "@/lib/access";

export const metadata = { title: "Search questions" };

export default async function SearchPage({ searchParams }: { searchParams: { q?: string; level?: string; topic?: string } }) {
  const term = (searchParams.q || "").slice(0, 100);
  const level = searchParams.level && levelMeta(searchParams.level) ? searchParams.level : "";
  const topic = searchParams.topic && searchParams.topic in TOPICS ? searchParams.topic : "";
  const premium = await hasPremium();
  const results = searchQuestions(term, { level, topic });
  const field = "rounded-lg border px-3 py-2 text-sm";
  const fs = { borderColor: "var(--border)", background: "var(--surface)" };
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Search by topic</h1>
      <form className="card grid gap-2 p-4 sm:grid-cols-[1fr_auto_auto_auto]" action="/search">
        <input name="q" defaultValue={term} placeholder="e.g. waits, joins, flaky, contract testing" className={field} style={fs} />
        <select name="level" defaultValue={level} className={field} style={fs}>
          <option value="">All levels</option>
          {LEVELS.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
        </select>
        <select name="topic" defaultValue={topic} className={field} style={fs}>
          <option value="">All topics</option>
          {Object.entries(TOPICS).map(([id, t]) => <option key={id} value={id}>{t.name}</option>)}
        </select>
        <button className="btn btn-primary">Search</button>
      </form>
      <p className="text-sm muted">{results.length} question{results.length === 1 ? "" : "s"}</p>
      <ul className="card divide-y" style={{ borderColor: "var(--border)" }}>
        {results.map((q) => (
          <li key={q.id} style={{ borderColor: "var(--border)" }}>
            <Link href={`/q/${q.id}`} className="flex items-start gap-3 px-4 py-3 hover:bg-[var(--surface-2)]">
              <span className="flex-1">
                <span className="block font-medium">{q.q}</span>
                <span className="mt-1 flex flex-wrap gap-1.5">
                  <span className="chip">{levelMeta(q.level)!.name} · Q{q.order}</span>
                  <span className="chip">{TOPICS[q.topic].short}</span>
                  {q.free && !premium && <span className="chip" style={{ color: "var(--good)" }}>Free</span>}
                </span>
              </span>
              {!premium && !q.free && <span className="muted">🔒</span>}
            </Link>
          </li>
        ))}
        {!results.length && <li className="p-6 text-center muted">No questions match. Try a shorter word.</li>}
      </ul>
    </div>
  );
}
