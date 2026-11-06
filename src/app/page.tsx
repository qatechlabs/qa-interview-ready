import Link from "next/link";
import { LEVELS, TOPICS } from "@/content/meta";
import { questionsForLevel, allQuestions } from "@/content";
import { FREE_PER_LEVEL, formatPrice } from "@/lib/config";

export default function Home() {
  const total = allQuestions().length;
  const first = questionsForLevel("fresher")[0];
  return (
    <div className="space-y-16">
      <section className="pt-6 text-center sm:pt-12">
        <span className="chip mb-4">For QA engineers, from fresher to test architect</span>
        <h1 className="mx-auto max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl">
          Walk into your QA interview <span className="accent">ready</span>.
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg muted">
          Pick your experience level and follow a study path built in the order you should prepare. Every answer gives you a
          60-second version to say out loud, then the explanation, a real example and working code.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="#levels" className="btn btn-primary !px-6 !py-3 text-base">Choose your level</Link>
          {first && <Link href={`/q/${first.id}`} className="btn btn-ghost !px-6 !py-3 text-base">Try a free question</Link>}
        </div>
        <p className="mt-4 text-sm muted">{total} questions · first {FREE_PER_LEVEL} of every level free · no sign-up</p>
      </section>

      <section id="levels" className="scroll-mt-20">
        <h2 className="mb-1 text-2xl font-bold">Choose your level</h2>
        <p className="mb-6 muted">Questions are ordered as a preparation path for each level, from basics to the hard ones.</p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {LEVELS.map((l) => {
            const n = questionsForLevel(l.id).length;
            return (
              <Link key={l.id} href={`/levels/${l.id}`} className="card group flex flex-col p-5 transition hover:-translate-y-0.5 hover:shadow-lg">
                <div className="flex items-baseline justify-between">
                  <h3 className="text-lg font-semibold">{l.name}</h3>
                  <span className="text-sm muted">{l.years}</span>
                </div>
                <p className="mt-2 flex-1 text-sm muted">{l.blurb}</p>
                <div className="mt-4 flex items-center justify-between text-sm">
                  <span className="muted">{n} questions</span>
                  <span className="font-semibold accent group-hover:underline">Start path →</span>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[
          ["🎯", "Ordered, not random", "Each level is a study path. Concepts build on each other, so you prepare the way interviewers think.", null, null],
          ["⏱", "60-second answers", "A crisp spoken answer first, with a timer to rehearse, then the deep explanation and example.", null, null],
          ["💻", "Real code", "Java for Selenium and REST Assured, TypeScript for Playwright, Python, SQL, YAML and more.", null, null],
          ["🎤", "Mock interviews", "Timed rounds that score you, track weak topics and build your revision list automatically.", "/mock", "Try a round →"],
          ["🧪", "Live coding labs", "Interview scenarios on a shop, an HR portal and a fashion store, plus real-site framework labs on saucedemo.com, OrangeHRM and AutomationExercise that run on GitHub Actions from a repo in your name.", "/labs", "Try a free lab →"],
        ].map(([icon, title, text, href, cta]) => (
          <div key={title} className="card p-5">
            <div className="text-2xl">{icon}</div>
            <h3 className="mt-2 font-semibold">{title}</h3>
            <p className="mt-1 text-sm muted">{text}</p>
            {href && <Link href={href} className="mt-2 inline-block text-sm font-semibold accent hover:underline">{cta}</Link>}
          </div>
        ))}
      </section>

      <section>
        <h2 className="mb-4 text-2xl font-bold">What's covered</h2>
        <div className="flex flex-wrap gap-2">
          {Object.entries(TOPICS).map(([id, t]) => (
            <Link key={id} href={`/search?topic=${id}`} className="chip !px-3 !py-1 !text-sm hover:underline">{t.name}</Link>
          ))}
        </div>
      </section>

      <section className="card flex flex-col items-start gap-4 p-6 sm:flex-row sm:items-center">
        <div className="flex-1">
          <h2 className="text-xl font-bold">Unlock every level for {formatPrice()}</h2>
          <p className="mt-1 muted">One-time payment, lifetime access to every answer and all live coding labs, including new questions as they're added.</p>
        </div>
        <Link href="/pricing" className="btn btn-primary !px-6 !py-3">See what's included</Link>
      </section>
    </div>
  );
}
