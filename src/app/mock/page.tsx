import Link from "next/link";
import { LEVELS } from "@/content/meta";
import { questionsForLevel } from "@/content";

export const metadata = { title: "Mock interview", description: "Timed mock interview rounds for QA engineers: answer out loud, compare with the model answer, grade yourself and find your weak topics." };

export default function MockIndex() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Mock interview</h1>
        <p className="mt-2 max-w-2xl muted">
          A timed round of questions, like the real thing. You get 60 seconds per question to answer out loud, then you compare with the model answer and grade yourself. Finish with a score, your weak topics and a list to revise.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {LEVELS.map((l) => (
          <Link key={l.id} href={`/mock/${l.id}`} className="card p-5 hover:shadow-lg">
            <div className="flex items-baseline justify-between"><span className="font-semibold">{l.name}</span><span className="text-sm muted">{l.years}</span></div>
            <p className="mt-1 text-sm muted">{questionsForLevel(l.id).length} questions · mixed, weak-spots or by topic</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
