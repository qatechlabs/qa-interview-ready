import Link from "next/link";
import type { Metadata } from "next";
import { LAB_APPS, isFramework, scenariosFor, SCENARIOS } from "@/lab/scenarios";
import { hasPremium } from "@/lib/access";
import { formatPrice } from "@/lib/config";
import { LabPassedBadge, LabPassedCount } from "@/components/lab/LabPassedBadge";
import { githubConfig } from "@/lib/github/app";
import { getGitHubUser } from "@/lib/github/user";

export const metadata: Metadata = {
  title: "Live automation labs",
  description:
    "Real-time, scenario-based automation interview tasks. Write Playwright test code in the browser and watch it drive a shop, an HR portal and a fashion store live, or build a framework and run it on GitHub Actions against saucedemo.com, OrangeHRM and AutomationExercise.",
};

export default async function LabsIndex({ searchParams }: { searchParams?: { github?: string } }) {
  const premium = await hasPremium();
  const ghCfg = githubConfig();
  const ghUser = ghCfg ? await getGitHubUser() : null;
  const ghError = searchParams?.github === "failed" || searchParams?.github === "state" ? "GitHub sign-in didn't complete. Try again." : null;
  const freeCount = SCENARIOS.filter((s) => s.free).length;
  return (
    <div className="space-y-10">
      <section>
        <span className="chip mb-3">New · live coding</span>
        <h1 className="text-3xl font-bold sm:text-4xl">Live automation labs</h1>
        <p className="mt-3 max-w-3xl text-lg muted">
          The scenario round of an automation interview, for real. Read the interviewer&apos;s brief, write the test in the editor, press Run and watch your
          code click through the app. Each scenario then checks the app state and your assertions to tell you whether your test really proves the requirement.
          Framework labs go further: build page objects, fixtures and data-driven suites from scratch. Real-site labs run that framework with real Playwright on
          GitHub Actions against saucedemo.com, the OrangeHRM demo and automationexercise.com, from a repo in your name.
        </p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["✍️", "Write real test code", "Playwright-style TypeScript with getByRole, getByLabel, locators, auto-waiting and expect assertions. Framework labs give you a whole project: page objects, fixtures and tests across files."],
            ["👀", "Watch it run live", "Every step is highlighted in the app as it happens, with a step log and clear failure messages."],
            ["✅", "Get verified", "Hidden checks confirm the app ended in the right state and that you asserted what matters."],
            ["🐙", "Build a portfolio", "Sign in with GitHub and every run is committed to a public repo in your name. Real-site labs run there on GitHub Actions."],
          ].map(([icon, t, d]) => (
            <div key={t} className="card p-4">
              <div className="text-xl">{icon}</div>
              <h2 className="mt-1 font-semibold">{t}</h2>
              <p className="mt-1 text-sm muted">{d}</p>
            </div>
          ))}
        </div>
        {!premium && (
          <p className="mt-4 text-sm muted">
            {freeCount} scenarios are free. Full access ({formatPrice()}, one time) unlocks all {SCENARIOS.length}, plus reference solutions in Playwright and Selenium Java.{" "}
            <Link href="/pricing" className="font-semibold accent hover:underline">See pricing</Link>
          </p>
        )}
      </section>

      {ghCfg && (
        <section className="card flex flex-wrap items-center gap-3 p-4 text-sm">
          <span className="text-xl" aria-hidden>🐙</span>
          {ghUser ? (
            <p className="flex-1">
              Signed in as <b>{ghUser.login}</b>. Every lab run is committed to{" "}
              <a href={`https://github.com/${ghCfg.org}/lab-${ghUser.login.toLowerCase()}`} target="_blank" rel="noreferrer" className="font-mono accent hover:underline">
                {ghCfg.org}/lab-{ghUser.login.toLowerCase()}
              </a>
              , a public repo in your name you can show in interviews.
            </p>
          ) : (
            <>
              <p className="flex-1">
                <b>Build a portfolio while you practise.</b> Sign in with GitHub and every lab run is committed to a repo in your name under {ghCfg.org}.
                {ghError && <span className="ml-2" style={{ color: "#e11d48" }}>{ghError}</span>}
              </p>
              <a href="/api/github/login?next=%2Flabs" className="btn btn-primary">Sign in with GitHub</a>
            </>
          )}
        </section>
      )}

      {LAB_APPS.map((app) => {
        const list = scenariosFor(app.id);
        return (
          <section key={app.id} id={app.id} className="scroll-mt-24">
            <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
              <div>
                <h2 className="text-2xl font-bold">
                  <span aria-hidden>{app.icon}</span> {app.name}
                </h2>
                <p className="text-sm muted">
                  {app.remote ? `${app.styledAfter[0].toUpperCase()}${app.styledAfter.slice(1)}. ${app.blurb}` : `A practice ${app.styledAfter}. ${app.blurb}`}
                </p>
                {app.remote && (
                  <p className="mt-1 text-xs">
                    <span className="chip" style={{ color: "var(--accent)" }}>Real site · runs on GitHub Actions in your repo</span>
                    {!ghUser && ghCfg && <span className="ml-2 muted">Sign in with GitHub above to run these.</span>}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-3">
                <LabPassedCount ids={list.map((s) => s.id)} />
                <a href={app.base} target="_blank" rel="noreferrer" className="text-sm font-semibold accent hover:underline">{app.remote ? "Open the site ↗" : "Open the app ↗"}</a>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {list.map((s) => {
                const locked = !s.free && !premium;
                return (
                  <Link key={s.id} href={`/labs/${s.id}`} className="card flex flex-col p-4 transition hover:-translate-y-0.5 hover:shadow-lg">
                    <div className="mb-2 flex flex-wrap gap-1.5">
                      <span className="chip">{s.level}</span>
                      <span className="chip">~{s.minutes} min</span>
                      {isFramework(s) && <span className="chip" style={{ color: "var(--accent)" }}>Framework · multi-file</span>}
                      {app.remote && <span className="chip">☁ GitHub Actions</span>}
                      {s.free && !premium && <span className="chip" style={{ color: "var(--good)" }}>Free</span>}
                      {locked && <span className="chip">🔒 Full access</span>}
                      <LabPassedBadge id={s.id} />
                    </div>
                    <h3 className="font-semibold">{s.title}</h3>
                    <p className="mt-1 flex-1 text-sm muted">{s.skills.join(" · ")}</p>
                  </Link>
                );
              })}
            </div>
          </section>
        );
      })}

      <section className="card p-5 text-sm">
        <h2 className="font-semibold">Practising with your own framework</h2>
        <p className="mt-1 muted">
          The practice apps are public pages, so you can also point a local Selenium, Playwright or Cypress project at them, for example{" "}
          <code className="inline-code">https://interview.qatechlabs.com/sandbox/swagshop</code>. The real-site labs use sites that exist for automation
          practice: saucedemo.com, the OrangeHRM demo and automationexercise.com. Please do not automate real shopping sites such as Myntra or Amazon: their
          terms forbid it and they block bots.
        </p>
      </section>
    </div>
  );
}
