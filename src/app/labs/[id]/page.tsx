import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getScenario, isWorkspace, labApp, SCENARIOS, workspaceFor, WORKSPACES } from "@/lab/scenarios";
import { SOLUTIONS } from "@/lab/solutions";
import { hasTier } from "@/lib/access";
import { formatPrice, tier } from "@/lib/config";
import { LabWorkbench } from "@/components/lab/LabWorkbench";
import { githubConfig } from "@/lib/github/app";
import { getGitHubUser } from "@/lib/github/user";

export function generateMetadata({ params }: { params: { id: string } }): Metadata {
  const s = getScenario(params.id);
  if (!s) return {};
  return {
    title: `${s.title} · Live lab`,
    description: s.story.replace(/"/g, "").slice(0, 155),
    robots: s.free ? undefined : { index: false },
  };
}

export default async function LabPage({ params }: { params: { id: string } }) {
  const s = getScenario(params.id);
  if (!s) notFound();
  const app = labApp(s.app);
  const need = isWorkspace(s) ? tier("architect") : tier("pro");
  const locked = !s.free && !(await hasTier(need.id));
  const ghCfg = githubConfig();
  const ghUser = ghCfg ? await getGitHubUser() : null;
  const github = { configured: !!ghCfg, org: ghCfg?.org || "", user: ghUser ? { login: ghUser.login, name: ghUser.name, avatar: ghUser.avatar } : null };
  const solution = locked ? null : SOLUTIONS[s.id] ?? null;
  const workspace = isWorkspace(s);
  const list = SCENARIOS.filter((x) => x.app === s.app);
  const idx = list.findIndex((x) => x.id === s.id);
  // after the last task of an app, the next step is its workspace
  const next = workspace ? undefined : list[idx + 1] ?? workspaceFor(s.app);

  return (
    <div className="relative left-1/2 w-[min(1360px,calc(100vw-2rem))] -translate-x-1/2 space-y-5">
      <nav className="flex flex-wrap items-center gap-2 text-sm muted">
        <Link href="/labs" className="hover:underline">← Live labs</Link>
        <span>·</span>
        <Link href={`/labs#${app.id}`} className="hover:underline">{app.icon} {app.name}</Link>
        <span>·</span>
        <span>{workspace ? "Framework workspace" : `Scenario ${idx + 1} of ${list.length}`}</span>
      </nav>
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="mb-2 flex flex-wrap gap-1.5">
            <span className="chip">{s.level}</span>
            <span className="chip">~{s.minutes} min</span>
            {s.skills.map((k) => (
              <span key={k} className="chip">{k}</span>
            ))}
          </div>
          <h1 className="text-2xl font-bold sm:text-3xl">{s.title}</h1>
          <p className="mt-1 text-sm muted">
            {app.remote ? `Site: ${app.base}, ${app.styledAfter}. Runs on GitHub Actions in your repo.` : `App: ${app.name}, a practice ${app.styledAfter}.`} Login: {app.credentials}.
          </p>
        </div>
        {next && (
          <Link href={`/labs/${next.id}`} className="btn btn-ghost">{isWorkspace(next) ? "Build the framework →" : "Next scenario →"}</Link>
        )}
      </header>

      {locked ? (
        <div className="mx-auto max-w-3xl space-y-4">
          <section className="card p-5">
            <h2 className="text-xs font-semibold uppercase tracking-wide accent">Interview scenario</h2>
            <p className="mt-2 leading-relaxed">{s.story}</p>
            <h3 className="mt-4 text-sm font-semibold">Acceptance criteria</h3>
            <ol className="mt-1 list-decimal space-y-1 pl-5 text-sm">
              {s.criteria.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ol>
          </section>
          <div className="card p-6 text-center">
            <p className="text-lg font-semibold">🔒 This {isWorkspace(s) ? "framework workspace" : "lab"} is part of {need.name}</p>
            <p className="mx-auto mt-1 max-w-md text-sm muted">
              {isWorkspace(s)
                ? `Architect unlocks the live editor, the production-grade framework review and the reference frameworks for all ${WORKSPACES.length} workspaces, on top of every lab and interview answer.`
                : `Pro unlocks the live editor, the scenario checks and the reference solutions in Playwright and Selenium Java for all ${SCENARIOS.length} labs, plus every interview answer.`}{" "}
              One payment of {formatPrice(need.amount)}, lifetime access. Already on a lower tier? Upgrade for the difference.
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <Link href="/pricing" className="btn btn-primary">Get {need.name}</Link>
              <Link href="/labs" className="btn btn-ghost">Try a free lab</Link>
            </div>
          </div>
        </div>
      ) : (
        <LabWorkbench id={s.id} solution={solution} github={github} />
      )}
    </div>
  );
}
