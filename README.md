# QA Interview Ready

Interview preparation for QA engineers, from fresher to test architect. Each level has an ordered study path; every question has a 60-second spoken answer, a deeper explanation, a real-world example and sample code. Built with Next.js 14, hosted on Vercel, paid access through Razorpay.

## Features

- Five levels (Fresher, Junior, Mid, Senior SDET, Lead/Architect), each an ordered study path grouped into modules.
- 240+ curated questions across fundamentals, test design, SQL, Git, Java/Python, Selenium, Playwright, API testing, frameworks, CI/CD, performance and strategy.
- Flashcard mode per level with "got it" and "practice again", shuffle, and keyboard shortcuts.
- Mock interview mode per level: timed 5/10/15-question rounds (mixed, weak-spots or per-topic), self-grading, score, weak-topic tracking on the progress page.
- Topic filters and "hide done" on every level path.
- Search by keyword, level and topic.
- Progress (done, bookmarks, practice-again) saved in the browser. No sign-up.
- Freemium: the first N questions of every level are free; a one-time payment unlocks everything.
- Paid answers never ship to the browser until the visitor has a valid access cookie.

## Local development

```bash
npm install
cp .env.example .env.local   # fill in the values you need
npm run dev                  # http://localhost:3000
```

`npm run dev` and `npm run build` first run `npm run content`, which converts `content/*.md` into JSON in `src/content/questions/` (git-ignored).

## Editing questions

Questions live in `content/<level>.md`, one file per level, in study-path order. Format:

````markdown
# Module: Name of the module

## The question text?
@topic selenium

### 60s
The answer you could say out loud in about a minute.

### Explain
Deeper explanation. Blank lines separate paragraphs. Lines starting with "- " become bullets,
"1. " become numbered lists, and | tables | are rendered as tables. `code` and **bold** work inline.

### Example
A concrete, real-world example.

### Code java | Optional tab label
```java
// one or more code blocks; languages: java, typescript, python, sql, bash, yaml,
// javascript, json, gherkin, groovy, xml, text
```
````

Valid topics: `fundamentals`, `test-design`, `sql`, `git`, `programming`, `selenium`, `playwright`, `api`, `framework`, `cicd`, `performance`, `strategy`.

Run `npm run content` to validate; it fails with a clear message if a section is missing.

## Deploying to Vercel

1. Import the GitHub repo in Vercel (Framework: Next.js, no special settings).
2. Add the environment variables from `.env.example`. `ACCESS_TOKEN_SECRET` is required in production.
3. Add the custom domain (`interview.qatechlabs.com`) under Settings > Domains and point the DNS record Vercel shows you.

## Setting up Razorpay

1. Create a Razorpay account and complete KYC to accept live payments.
2. Settings > API Keys: generate keys. Start with test mode keys (`rzp_test_...`); switch to live keys when ready.
3. Put the key ID and secret in Vercel env vars (`RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`) and redeploy.
4. Test a purchase with Razorpay's test cards / UPI in test mode.
5. Razorpay requires visible Terms, Privacy, Refund and Contact pages for live activation; they are at `/terms`, `/privacy`, `/refunds`, `/shipping`, `/contact`. Update the business name and support email via env vars.

### How purchases work

- `POST /api/checkout/order` creates a Razorpay order for the configured price.
- Razorpay Checkout opens in the browser. On success, the browser posts the payment details to `POST /api/checkout/verify`.
- The server verifies the Razorpay signature, fetches the payment from Razorpay's API, confirms it is captured for this product and amount, then sets a signed, HttpOnly access cookie valid for 5 years.
- "Restore access" (`POST /api/restore`) lets a buyer unlock another browser with the email they paid with plus the Razorpay payment ID from their receipt. No database is needed; Razorpay is the source of truth.

To change the price, update `PRICE_AMOUNT` (in paise). To change how many questions are free, update `FREE_QUESTIONS_PER_LEVEL`.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Build content and start the dev server |
| `npm run build` | Build content and create a production build |
| `npm run start` | Serve the production build |
| `npm run lint` | ESLint |
| `npm run content` | Convert `content/*.md` to JSON and validate it |

## Theme

Dark-only, sharing the palette of karthik.qatechlabs.com (midnight navy, burgundy bloom, rose-gold accent, warm paper text). The tokens live in `src/app/globals.css` (`--bg`, `--surface`, `--accent`, `--good`, `--warn`, `--bad`, ...); components use the tokens, never raw colours. The run report uses the same palette; the Word evidence document stays white for printing. Contact email defaults to karthik@qatechlabs.com (`NEXT_PUBLIC_SUPPORT_EMAIL` overrides).

## Pricing tiers

Three cumulative one-time tiers (`TIERS` in `src/lib/config.ts`): **Prep** (all questions), **Pro** (Prep + every lab) and **Architect** (Pro + the framework workspaces). Amounts come from `PRICE_PREP_AMOUNT` / `PRICE_PRO_AMOUNT` / `PRICE_ARCHITECT_AMOUNT` (paise; `PRICE_AMOUNT` still sets Prep). The Razorpay order note `product` identifies the tier (`qir-prep`, `qir-pro`, `qir-architect`; the pre-tier `qir-lifetime` counts as Architect) and the access cookie carries `tier`. An upgrade creates an order for the difference with `upgrade_from: <payment id>`, which verification follows back to the original payment. Pages gate with `hasTier("pro")` for labs and `hasTier("architect")` for workspaces; questions need any tier.

## Live automation labs

`/labs` hosts scenario-based coding rounds. Learners write Playwright-style TypeScript in the browser and watch it drive a practice app in an iframe.

- Practice apps (static, same origin): `public/sandbox/{swagshop,peopledesk,trendkart}/index.html`, served at `/sandbox/<app>` via a rewrite in `next.config.mjs`. Each app keeps state in `sessionStorage` under `lab:<app>:` and exposes it on `window.__lab` for scenario checks.
- Runtime: `src/lib/lab/runtime.ts` implements a Playwright-compatible subset (locators, auto-waiting actions, web-first `expect`, `test`/`describe`/`beforeEach`/`step`, `test.extend` fixtures with teardown). `runProject()` takes a map of files, resolves relative imports between them (sucrase compiles TypeScript to CommonJS in the browser) and runs every `*.spec.ts`.
- Framework scenarios set `files` instead of `starter` to give the learner a multi-file project. The workbench lets them add, rename and delete files, and `src/lib/lab/zip.ts` downloads the project as a runnable Playwright repo.
- Real-site labs (`LabApp.remote`): saucedemo.com, the OrangeHRM demo and automationexercise.com cannot be embedded, so the workbench commits the files to the learner's repo and dispatches its `Lab run` workflow (`/api/labs/run`, `src/lib/github/labrun.ts`). The route polls the Actions API, downloads the `results` artifact and turns Playwright's JSON report into per-test results and assertion steps for the same scenario checks. Requires GitHub sign-in; `/api/github/status` reports the App configuration.
- Framework workspaces (`Scenario.workspace`, one per application in `WORKSPACES`): a blank project where the learner writes everything, from `playwright.config.ts` to page objects, fixtures, test data and specs, and is graded by `FRAMEWORK_RUBRIC` (config, env-driven base URL, retries/reporters/traces, page objects, fixtures, no raw locators in specs, tags, no hard waits, README). Practice-app workspaces run in the browser or on GitHub Actions; real-site workspaces run on Actions only. The seeded `lab.yml` (runner v2) uses the lab folder's own `playwright.config.ts` when it exists, and a custom reporter (`lab-reporter.js`) writes `assertions.json` so every `expect` shows up as a check.
- Run outputs: every run opens an Allure-style report in a new tab (`src/lib/lab/report.ts`, opened on the Run click and filled when the run finishes) and downloads a Word evidence document with event-based screenshots (`src/lib/lab/evidence.ts`, built with `docx` in the browser). Browser runs snapshot the practice-app iframe after every action and assertion (`src/lib/lab/snapshot.ts`); GitHub runs record a trace and `lab-evidence.js` (seeded into the learner's repo) picks the screencast frame after each step. Practice-app runs on GitHub serve a copy of the app on the runner (`lab-serve.js`) so `page.goto('/')` behaves as in the browser. Both outputs can be switched off per learner (stored in localStorage).
- Scenarios and checks: `src/lab/scenarios.ts`. Reference solutions (Playwright + Selenium Java) are server-only in `src/lab/solutions.ts` and only sent for free scenarios or to full-access users.
