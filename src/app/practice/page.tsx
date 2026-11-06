import Link from "next/link";
import { LEVELS } from "@/content/meta";

export const metadata = { title: "Flashcards" };

export default function PracticeIndex() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Flashcard practice</h1>
        <p className="mt-2 muted">See the question, answer it out loud, then reveal the 60-second answer. Mark it as got it or practice again.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {LEVELS.map((l) => (
          <Link key={l.id} href={`/practice/${l.id}`} className="card p-5 hover:shadow-lg">
            <div className="flex items-baseline justify-between"><span className="font-semibold">{l.name}</span><span className="text-sm muted">{l.years}</span></div>
            <p className="mt-1 text-sm muted">{l.focus.slice(0, 3).join(" · ")}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
