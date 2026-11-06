# GitHub setup for per-learner lab repos

This is everything the Live labs need from the qatechlabs GitHub organisation so that learners can sign in with GitHub, get a repo of their own under `qatechlabs`, have their lab code committed there automatically, and run it against real sites with GitHub Actions. There is no database to set up: the repo name is derived from the learner's GitHub login, and run results are read back from the Actions API.

It takes about 10 minutes. Only an owner of the `qatechlabs` organisation can do it.

## 1. Create the GitHub App

Go to https://github.com/organizations/qatechlabs/settings/apps/new and fill in:

| Field | Value |
| --- | --- |
| GitHub App name | `QA Interview Ready Labs` (any unique name is fine) |
| Homepage URL | `https://interview.qatechlabs.com` |
| Callback URL | `https://interview.qatechlabs.com/api/github/callback` |
| Expire user authorization tokens | leave on (we never store the token) |
| Request user authorization (OAuth) during installation | **off** |
| Webhook → Active | **off** (untick it) |

**Repository permissions** (leave everything else at "No access"):

| Permission | Access | Why |
| --- | --- | --- |
| Administration | Read and write | create `qatechlabs/lab-<login>` and add the learner as a collaborator |
| Contents | Read and write | commit the learner's files |
| Workflows | Read and write | add the `.github/workflows/lab.yml` runner file to each repo |
| Actions | Read and write | start a run on a real site and read its result |
| Metadata | Read-only | set automatically |

**Organization permissions**: none. **Account permissions**: none.

**Where can this GitHub App be installed?** → **Any account**. This makes the app public, which is required: a private app can only be authorised by members of the organisation, and every other GitHub user (every learner) gets a 404 from GitHub on sign-in. Public only means anyone can *authorise* it; it is still installed only where you install it (step 3). If the app was created as private, fix it under the app's **Advanced** page → "Make this GitHub App public".

Click **Create GitHub App**.

## 2. Collect the credentials

On the app's page after creating it:

1. Note the **App ID** (top of the General page).
2. Note the **Client ID**.
3. Click **Generate a new client secret** and copy it. It is shown once.
4. Scroll to **Private keys** → **Generate a private key**. A `.pem` file downloads.

## 3. Install the app on the organisation

In the left menu click **Install App** → **Install** next to `qatechlabs` → choose **All repositories** (new learner repos must be covered automatically) → **Install**.

## 4. Add the environment variables in Vercel

In the Vercel project `qa-interview-ready` → Settings → Environment Variables, add these for Production (and Preview if you want to test on preview deployments):

| Name | Value |
| --- | --- |
| `GITHUB_APP_ID` | the App ID |
| `GITHUB_APP_CLIENT_ID` | the Client ID |
| `GITHUB_APP_CLIENT_SECRET` | the client secret |
| `GITHUB_APP_PRIVATE_KEY` | the whole contents of the `.pem` file, including the `-----BEGIN RSA PRIVATE KEY-----` and `-----END RSA PRIVATE KEY-----` lines. Vercel keeps the line breaks when you paste it. |
| `GITHUB_LAB_ORG` | `qatechlabs` |

`ACCESS_TOKEN_SECRET` is already set and is reused to sign the GitHub sign-in cookie.

Redeploy after saving. Until these are set, the labs work exactly as today and the "Sign in with GitHub" button is hidden.

## 5. Check it works

Open https://interview.qatechlabs.com/api/github/status first. It lists any missing variable by name, says whether the private key parses, whether GitHub accepts the App credentials (`app.slug`) and whether the app is installed on the lab organisation. It never shows secret values. When `configured` is false the sign-in button is hidden and `missing` tells you why.

1. Open https://interview.qatechlabs.com/labs, click **Sign in with GitHub** and authorise the app with any GitHub account (your personal one is fine).
2. Open a lab and press **Run tests**. Within a few seconds the lab shows a link to the new repo `qatechlabs/lab-<your-login>` and the commit that was just made.
3. The learner (you, in this test) receives a collaborator invitation by email; accepting it gives them push access. The repo is public, the commits are authored in their name, so they show up on their GitHub profile.
4. On a real-site scenario, press **Run on GitHub**. The run appears under the repo's Actions tab and the result comes back to the lab in about two minutes.
5. Every run (browser or GitHub) opens the run report in a new tab and downloads the Word evidence document; the Actions run records a Playwright trace that the evidence step turns into one screenshot per step.
6. Open a **framework workspace** (the "Build a framework from scratch" section on /labs), add `playwright.config.ts`, `pages/`, `fixtures.ts` and `tests/` and press **Run on GitHub**. The workflow runs with the learner's own config and grades the project against the framework rubric.

## Things to know

- Sign-in lands on a GitHub 404 page ("This is not the web page you are looking for"): the app is private. See step 1.
- Real-site labs need GitHub Actions enabled for repos in the organisation (Organization settings → Actions → General → "Allow all actions and reusable workflows", which is the default). Each run takes 1–3 minutes on GitHub's free runners because it installs Playwright and Chromium.
- The runner files (`.github/workflows/lab.yml`, `lab-reporter.js`, `lab-evidence.js`, `lab-serve.js`, root `playwright.config.ts`) are managed by the app: when they change in a release, the next run commits "Update the lab runner files" to the learner's repo before dispatching.
- Repos are **public** on purpose. GitHub Actions is free for public repos; private repos would share the organisation's 2,000 free minutes a month and run out quickly. Public repos also give learners a portfolio link.
- The app only ever touches repos named `lab-*`. It cannot see or change `qa-interview-ready`.
- To stop a learner, delete their `lab-<login>` repo in GitHub. To stop everything, uninstall the app from the organisation.
- If you later want learners' repos in their own accounts instead, the same app can do that with the `repo` scope on sign-in; it is a small change.
