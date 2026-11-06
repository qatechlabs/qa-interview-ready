# QA Interview Ready

Interview preparation for QA engineers, from fresher to test architect. Each level has an ordered study path; every question has a 60-second spoken answer, a deeper explanation, a real-world example and sample code. Built with Next.js 14, hosted on Vercel, paid access through Razorpay.

## Features

- Five levels (Fresher, Junior, Mid, Senior SDET, Lead/Architect), each an ordered study path grouped into modules.
- 240+ curated questions across fundamentals, test design, SQL, Git, Java/Python, Selenium, Playwright, API testing, frameworks, CI/CD, performance and strategy.
- Flashcard mode per level with "got it" and "practice again", shuffle, and keyboard shortcuts.
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
