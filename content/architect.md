# Module: Test strategy at organisation level

## How do you create a test strategy for a product or organisation?
@topic strategy

### 60s
A test strategy describes how we achieve quality across the organisation, not for one release. I start with business goals, risk appetite and compliance needs, then map the product architecture and delivery model. I define quality objectives and measurable targets, such as escaped defect rate, lead time and reliability. I set the testing approach per level: ownership of unit, component, contract, API, UI, performance, security, accessibility and production monitoring; the tooling and environments; data and privacy rules; quality gates in the pipeline; metrics and reporting; and roles and skills. Then I make it a living document reviewed quarterly with results.

### Explain
Sections of a strategy document:
1. Context and goals (business, regulatory, user expectations).
2. Quality principles (whole-team ownership, shift-left and shift-right, risk-based).
3. Test levels and ownership (the pyramid for this organisation).
4. Non-functional strategy (performance, security, accessibility, resilience).
5. Environments, data, tooling and infrastructure.
6. Pipeline quality gates and release criteria.
7. Metrics and feedback loops.
8. Skills, roles and enablement.
9. Roadmap and risks.

Key senior skill: tailoring it to the context (startup vs bank) and getting buy-in from engineering and product leaders.

### Example
For a payments company: contract tests mandatory for every service, performance budgets in CI, quarterly chaos game days, PCI-driven security scans, and a "no escaped P1 for two releases" target that gated expansion to new markets.

### Code text | One-page strategy skeleton
```text
Goal       : Release daily with < 2 escaped P1/P2 per quarter
Ownership  : Devs: unit+component+contract | SDETs: API/E2E/perf/platform | Everyone: exploratory
Gates      : PR: unit+lint+API smoke < 10 min | Main: regression + perf check | Release: can-i-deploy + security scan
NFRs       : p95 < 800 ms, 99.9% availability, WCAG 2.1 AA, OWASP ASVS L2
Metrics    : escaped defects, flaky rate, lead time, MTTR, suite duration
Review     : quarterly with engineering leads
```

## How do you choose between test automation tools and justify the decision?
@topic strategy

### 60s
I run a structured evaluation rather than following trends. First I list requirements: application technology, browsers and devices, languages the team knows, CI integration, parallelism, reporting, licensing and support, community and hiring market, and long-term vendor risk. I shortlist two or three tools and build the same proof of concept with each, covering a hard real scenario, measuring stability, speed and developer experience. I document the decision as an ADR with trade-offs, and plan migration or coexistence if we're replacing something. The cheapest tool that the team will actually maintain usually wins.

### Explain
Evaluation matrix criteria (weighted): fit for tech stack, team skills, speed and reliability, debugging tools, ecosystem, cost (licence + infra + training), vendor lock-in, scalability, security and compliance, community.

Common decisions:
- Selenium vs Playwright vs Cypress for web.
- Open source vs commercial (Tosca, UFT, Katalon, testRigor).
- Build vs buy for test management and reporting.
- Device cloud vs own device lab.

### Example
A bank with a .NET stack and a mostly manual team chose Playwright .NET over Selenium C# after a two-week PoC showed 40% fewer waits and built-in tracing, with a plan to upskill through pairing.

### Code text | Weighted decision matrix
```text
Criterion (weight)       Selenium  Playwright  Cypress
Tech fit (3)               4         5           4
Team skills (3)            5         4           3
Reliability/speed (3)      3         5           4
Debugging (2)              3         5           5
Multi-browser (2)          5         4           3
Cost/lock-in (2)           5         5           4
Weighted total            63        71          58
```

## How do you measure and improve the quality of an engineering organisation?
@topic strategy

### 60s
I use a balanced set of metrics: delivery metrics like DORA, which are deployment frequency, lead time, change failure rate and time to restore; quality outcomes like escaped defects by severity, customer-reported issues and incident counts; engineering health like test suite duration, flaky rate, coverage of critical journeys and code review turnaround; and user-facing signals like availability, performance SLOs and support tickets. I track trends, set targets per team, and run improvement initiatives with clear owners, then show results to leadership in business terms such as fewer rollbacks and faster releases.

### Explain
Improvement loop:
1. Baseline the metrics.
2. Pick the two biggest pain points (e.g., change failure rate, suite duration).
3. Run focused initiatives (contract testing rollout, flaky-test program).
4. Measure after 1–2 quarters; share wins and lessons.

Beware Goodhart's law: metrics become targets and get gamed. Use pairs that balance each other (speed vs stability).

### Example
A platform team cut change failure rate from 18% to 6% in two quarters by introducing PR-level API tests and canary releases, while deployment frequency doubled.

### Code sql | Change failure rate from deployment data
```sql
SELECT date_trunc('month', deployed_at) AS month,
       COUNT(*) AS deployments,
       COUNT(*) FILTER (WHERE caused_incident OR rolled_back) AS failed,
       ROUND(100.0 * COUNT(*) FILTER (WHERE caused_incident OR rolled_back) / COUNT(*), 1) AS cfr_pct
FROM deployments
GROUP BY 1 ORDER BY 1;
```

## How do you plan a migration from manual to automated testing, or from one framework to another?
@topic strategy

### 60s
I plan it as a product, with phases and measurable outcomes. First, assess the current state: test inventory, what's valuable, what's redundant, and the team's skills. Then set the target architecture and conventions, and build the foundation with a vertical slice in CI. Migrate by value, critical journeys first, running old and new in parallel until confidence is there, and retire old tests deliberately rather than migrating everything. Invest in enablement: training, pairing and templates. Track progress with coverage of critical flows, run time and flaky rate, and stop when the business goals are met, not when every old test is ported.

### Explain
Pitfalls:
- Porting 2,000 tests one-to-one, including the useless ones.
- Big-bang switch with no parallel run.
- Framework built by one person that nobody else can maintain.
- No time budget for manual testers to learn.

Phases: assess → pilot (4–6 weeks) → scale by team → retire legacy → continuous improvement.

### Example
Migrating from a 1,800-test Selenium Java suite to Playwright TypeScript: analysis showed 600 tests were duplicates or obsolete; 300 moved to API level; 400 UI journeys were re-implemented over four months with 3× faster runs.

### Code text | Migration roadmap
```text
Phase 0 (2 wks): inventory, value scoring, target architecture ADR
Phase 1 (6 wks): pilot team, 30 critical journeys, CI + reporting, conventions doc
Phase 2 (3 mo) : all teams onboard, 80% of critical journeys, old suite still runs
Phase 3 (1 mo) : retire old suite, redirect budget to API/contract tests
Metrics        : critical journey coverage, PR suite time, flaky rate, escaped defects
```

## How do you handle testing for regulated industries (banking, healthcare)?
@topic strategy

### 60s
Regulated environments need the same engineering practices plus evidence and traceability. I keep requirements traceable to tests and results, with automated reports as audit artefacts, versioned and retained. Test environments and data follow privacy rules, so production data is masked and access is controlled. Risk-based validation decides the depth of testing per feature, with formal sign-off for high-risk changes. Pipelines enforce segregation of duties, reviews and approvals, and generate immutable logs. Security and accessibility testing are mandatory. The trick is automating compliance evidence so it doesn't slow delivery.

### Explain
Typical requirements: SOX, PCI DSS, HIPAA, GDPR, DPDP, FDA 21 CFR Part 11, ISO 13485, ISO 27001.

Practices:
- RTM generated from Jira/Xray links and test results, not hand-written.
- Signed, time-stamped reports stored in an artefact repository.
- Change control via PR approvals and release records.
- Separation of test and production credentials; least privilege.
- Validation of test tools themselves (tool qualification) in some domains.

### Example
A healthcare client needed documented evidence for every release. Allure reports, RTM exports and pipeline approval logs were bundled automatically into a release evidence package, reducing audit prep from two weeks to a day.

### Code yaml | Evidence bundle step
```yaml
- name: Build release evidence package
  run: |
    mkdir evidence
    cp -r target/allure-report evidence/test-report
    ./scripts/export-rtm.sh ${{ github.ref_name }} > evidence/rtm.csv
    gh api repos/${{ github.repository }}/pulls/${{ github.event.pull_request.number }}/reviews > evidence/approvals.json
    tar czf evidence-${{ github.sha }}.tgz evidence
- uses: actions/upload-artifact@v4
  with: { name: release-evidence, path: evidence-*.tgz, retention-days: 2555 }
```

# Module: Automation architecture

## How would you architect an enterprise-wide automation platform used by many teams?
@topic strategy

### 60s
I'd build a platform, not a single framework: shared, versioned libraries for driver and browser management, authentication, test data, reporting and configuration, published as packages; opinionated project templates so a team can start in minutes; central infrastructure for execution, such as autoscaling browser grids, device clouds and ephemeral environments; a results service and dashboards that aggregate across teams; and clear ownership with a platform team, contribution guidelines and a community of practice. Teams own their tests; the platform team owns the foundations and measures adoption, run time and reliability.

### Explain
Architecture layers:
1. **Core libraries:** config, logging, waits, data builders, API clients, auth.
2. **Adapters:** UI (Playwright/Selenium), API, mobile, performance.
3. **Templates and generators:** `create-test-project`.
4. **Execution platform:** CI templates, grids, environments, secrets.
5. **Insights:** results DB, flaky detection, coverage, cost.
6. **Governance:** versioning, deprecation policy, support channel, docs.

Principles: paved road over mandates, backward compatibility, inner-source contributions.

### Example
A 40-team organisation reduced onboarding from weeks to a day with a template repo and shared library; a central results service exposed flaky rate per team, which drove a 70% flakiness reduction in a year.

### Code text | Platform components
```text
@acme/test-core      config, logging, retry, data builders
@acme/test-ui        Playwright fixtures, auth, page helpers
@acme/test-api       typed clients from OpenAPI, schema checks
@acme/ci-templates   reusable GitHub Actions workflows
results-service      ingest JUnit/Allure -> Postgres -> Grafana
```

## How do you design for testability? What do you ask developers to build in?
@topic strategy

### 60s
Testability is designed, not added later. I ask for stable test hooks like data-testid attributes and accessible roles; APIs for setup and teardown of test data; feature flags and configuration that tests can control; deterministic behaviour through injectable clocks and seeds; observability with correlation IDs, structured logs and health endpoints; idempotent operations and clear error contracts; and the ability to run services locally or in containers with their dependencies stubbed. I raise these in design reviews, and I measure the effect through faster, more reliable tests.

### Explain
Testability checklist for a design review:
- Can we observe state? (APIs, logs, metrics)
- Can we control inputs? (flags, time, data)
- Can we isolate the component? (interfaces, containers)
- Are failures explicit and distinguishable? (error codes)
- Is behaviour deterministic?
- Are there seams for mocking third parties?

Frame requests as reducing cost of change for developers too.

### Example
Adding a test-only `POST /test/orders/{id}/advance-to/SHIPPED` endpoint (disabled in production) cut order-state tests from 4 minutes of waiting to seconds.

### Code typescript | Injectable clock for deterministic behaviour
```typescript
export interface Clock { now(): Date }
export const systemClock: Clock = { now: () => new Date() };

export function isOfferActive(offer: Offer, clock: Clock = systemClock) {
  const t = clock.now().getTime();
  return t >= offer.startsAt.getTime() && t < offer.endsAt.getTime();
}

// Test: pass a fixed clock, no sleeping or time-zone surprises
```

## How do you plan non-functional testing across an organisation?
@topic strategy

### 60s
I define non-functional requirements as measurable SLOs: latency percentiles, throughput, availability, error budgets, security standards like OWASP ASVS, accessibility levels, and resilience targets. Then I decide where each is verified: performance budgets and small load tests in CI, large-scale load and soak tests before major events, continuous security scanning plus periodic penetration tests, accessibility checks on every PR with manual audits per release, and chaos experiments on a schedule. Each has an owner, tooling and reporting. Production monitoring closes the loop, with alerts tied to the same SLOs.

### Explain
Map NFRs to the pipeline:
| NFR | Continuous | Periodic |
|---|---|---|
| Performance | k6 smoke, Lighthouse CI | Full load/soak before peak |
| Security | SAST, SCA, DAST baseline | Pen test, threat modelling |
| Accessibility | axe in UI tests | Manual audit, user testing |
| Resilience | Fault injection in component tests | Game days |
| Compatibility | Core browsers in CI | Device matrix nightly |

### Example
An e-commerce group ran monthly load tests only. After adding k6 checks to every pipeline and a quarterly chaos day, three latency regressions and one failover bug were caught before customers saw them.

### Code javascript | SLO as code shared by tests and alerts
```javascript
// slo.js, imported by k6 thresholds and by alert rule generators
export const SLO = {
  checkout: { p95Ms: 1500, errorRate: 0.01 },
  search:   { p95Ms: 600,  errorRate: 0.005 },
};
```

## How do you manage environments and test data governance across many teams?
@topic strategy

### 60s
I move from a few shared, contended environments to on-demand ones: ephemeral environments per branch for functional testing, a stable integration environment, and a production-like performance environment. A platform team owns provisioning as code with clear SLAs. For data, a governance policy defines what data may exist in each environment, how production data is masked, retention and clean-up rules, and ownership of reference datasets. A self-service test data service and seeding tools give teams what they need without manual tickets. Usage and cost are monitored to keep it sustainable.

### Explain
Elements:
- Environment catalogue with purpose, owner, refresh cadence.
- Infrastructure as code (Terraform/Helm), GitOps.
- Data classification and masking rules; DPDP/GDPR compliance.
- Booking only for scarce resources (performance env).
- Observability on environment health to separate product failures from env failures.
- Cost controls: TTL, scale-to-zero.

### Example
Replacing two shared QA environments with per-PR namespaces (average lifetime 3 hours) removed "environment blocked" as the top cause of delayed releases.

### Code yaml | Ephemeral environment per PR (conceptual Helm values)
```yaml
# values-pr.yaml
namespace: pr-${PR_NUMBER}
ttlHours: 24
database:
  seed: datasets/core-v12.sql
  masked: true
integrations:
  payments: mock
  email: mailpit
```

# Module: Leading quality

## How do you build and structure a QA or quality engineering team?
@topic strategy

### 60s
I align structure to how the product is built. Most quality engineers embed in product teams, so they test early and own quality with developers. A small central platform or enablement group builds shared tooling, infrastructure and standards, and runs communities of practice. Roles span manual and exploratory testing, SDET or automation engineering, performance, security and accessibility specialists shared across teams. I hire for curiosity and collaboration, define career ladders with clear expectations, and measure the team by outcomes like escaped defects and release speed, not by test counts.

### Explain
Models:
- **Embedded:** QA in each squad, dotted line to a quality lead. Best for Agile product orgs.
- **Centralised:** one QA department serving teams. Good for consistency, risky for bottlenecks.
- **Hybrid (recommended):** embedded engineers + central platform/enablement.
- **Quality coaching:** few testers coach teams to test themselves.

Ratios vary (1:4 to 1:8 QA to dev); focus on skills and automation leverage instead of ratios.

### Example
A 120-engineer org moved from a 15-person central QA team to 12 embedded quality engineers plus a 3-person platform team. Lead time dropped 35% and QA attrition fell because engineers worked on products end to end.

### Code text | Career ladder snippet
```text
QE I    : executes and designs tests, writes simple automation, learns the product
QE II   : owns feature testing, automates at API/UI, improves CI feedback
Senior  : designs test approach for a team, mentors, leads flaky/perf initiatives
Staff   : cross-team strategy, platform architecture, org-level metrics
```

## How do you influence leadership to invest in quality?
@topic strategy

### 60s
I translate quality into business outcomes and risk. I collect data on the cost of poor quality, such as incidents, rollbacks, support load and lost revenue, and compare it to the cost of the investment. I propose a small, time-boxed initiative with a clear hypothesis and metrics, deliver visible results, then scale. I use the language of the audience: reliability and revenue for executives, speed and fewer interruptions for engineering leads. I build allies in product and operations, and report progress regularly with simple dashboards so quality becomes part of the business conversation.

### Explain
Framing tools:
- Cost of quality model (prevention, appraisal, internal failure, external failure).
- DORA metrics tied to business goals.
- Risk heat map for the roadmap.
- Pilot → proof → scale.
- Stories from real incidents (with numbers).

### Example
A proposal showing that 3 production incidents cost ~₹1.2 crore in lost orders and engineering time secured funding for a contract-testing platform and two SDET hires; incidents fell to zero the next two quarters.

### Code text | Executive summary slide
```text
Problem   : 7 customer-facing incidents in H1, ~₹1.2 cr impact, 2 of them during sales
Root cause: cross-service changes untested before deploy (no contract tests, 2 shared envs)
Proposal  : contract testing + ephemeral environments (6 months, 2 SDETs + infra ₹18 L)
Outcome   : target 70% fewer integration incidents, releases 2x faster
```

## How do you handle a release under heavy time pressure with incomplete testing?
@topic strategy

### 60s
I make the risk explicit and let the business decide with data. I prioritise ruthlessly by risk: critical journeys and changed areas get tested first, automated regression runs in full, and low-risk areas are sampled. I present what has been tested, what hasn't, known defects and their impact, and options such as releasing behind a feature flag, a staged rollout to a small percentage of users with monitoring, deferring risky parts, or delaying. I document the decision and the accepted risks, and schedule the remaining testing immediately after release.

### Explain
Options to reduce risk without delaying:
- Feature flags and canary releases.
- Dark launches.
- Increased production monitoring and a rollback plan rehearsed.
- Hotfix readiness: on-call and a fast pipeline.

What not to do: silently skip tests, or sign off on something you didn't test.

### Example
With two days left and 40% of regression pending, we released the new payment option behind a flag to 5% of users with alerts on error rates, finished regression during the week, and rolled out fully after no issues.

### Code text | Go/no-go summary
```text
Tested      : checkout, payments (all methods), order history   -> PASS
Not tested  : returns flow, admin reports (low change)           -> risk: medium/low
Open bugs   : 1 P3 (wishlist badge count)                         -> accepted by PO
Mitigation  : 5% canary, rollback in < 10 min, on-call assigned
Recommend   : GO with canary
```

## How do you run a post-incident review from a quality perspective?
@topic strategy

### 60s
I run a blameless post-mortem focused on systems, not people. We build a timeline, identify the triggering change and the root causes, including why testing, reviews, monitoring and rollout didn't catch or contain it, and ask which test level should have found it. Then we define actions: a regression test, a contract test, a quality gate, better monitoring, a process change, each with an owner and due date, and we track them to completion. I also look for patterns across incidents, because repeated causes point to systemic gaps like missing contract tests or weak data isolation.

### Explain
Questions to ask:
- What was the first signal, and how long until detection? (MTTD)
- Could a cheaper test level have caught it?
- Was the change risky by nature, and did it get the right scrutiny?
- Did the rollout strategy limit the blast radius?
- Is this a repeat of an earlier incident category?

Share learnings widely; the goal is organisational memory.

### Example
An incident where a renamed API field broke the mobile app led to: a consumer contract for the mobile app (owner: mobile team), an OpenAPI breaking-change check in CI (platform), and a rule that mobile-facing APIs need a deprecation window.

### Code text | Action items format
```text
#  Action                                              Owner      Due        Status
1  Add Pact contract mobile-app -> orders-service      Mobile     2026-11-20 In progress
2  oasdiff breaking-change gate in orders pipeline     Platform   2026-11-15 Done
3  Deprecation policy for public API fields            Arch guild 2026-12-01 Planned
```

# Module: Emerging practices and the future of QA

## How are AI and LLMs changing test automation, and how would you adopt them responsibly?
@topic strategy

### 60s
AI is useful for generating test ideas and edge cases from requirements, drafting test code and page objects, self-healing locators, visual testing with smarter diffing, summarising failures and logs, and prioritising tests by risk using historical data. I adopt it with guardrails: humans review generated tests, generated assertions must be meaningful, sensitive data is never sent to external models without approval, and we measure whether it actually reduces effort or defects. For testing AI-powered features themselves, we need new techniques like evaluating outputs against rubrics, testing for bias and safety, and monitoring drift.

### Explain
Practical uses today:
- Assistants in IDEs for boilerplate and refactoring.
- Test case suggestion from user stories; review for coverage gaps.
- Failure triage: cluster failures, suggest root causes.
- Self-healing locators and visual AI (Applitools, Healenium).
- Synthetic test data generation.

Risks: hallucinated tests that pass but check nothing, data leakage, over-reliance, licensing. Define policy and evaluate ROI.

Testing AI features: golden datasets, LLM-as-judge with human calibration, red-teaming, non-determinism handling (thresholds, not exact matches).

### Example
A team used an AI assistant to draft API tests from the OpenAPI spec, then reviewed them. Drafting time dropped 50%, but reviewers rejected 20% of generated assertions as meaningless, so the review step stayed mandatory.

### Code python | Evaluating an AI feature against a golden set
```python
import json

def test_support_bot_quality(bot, judge):
    cases = json.load(open("golden/support_cases.json"))
    scores = []
    for c in cases:
        answer = bot.reply(c["question"])
        scores.append(judge.score(answer, rubric=c["rubric"]))   # 0..1, calibrated vs humans
    assert sum(scores) / len(scores) >= 0.85
    assert all(not contains_pii(bot.reply(q)) for q in load("golden/pii_probe_questions.json"))
```

## What is observability-driven testing and how do you use production data to improve tests?
@topic strategy

### 60s
Observability-driven testing uses logs, metrics and traces, from both test and production environments, to decide what to test and to verify behaviour. In tests, I assert on traces and metrics, for example that a request produced the expected downstream calls and no errors were logged. From production, I mine real user journeys, traffic mix and failure patterns to build realistic test scenarios and performance models, prioritise automation by actual usage, and detect gaps by comparing tested endpoints against those actually hit. It connects testing to how the system is really used.

### Explain
Uses:
- Analytics → top journeys → critical E2E suite.
- Error logs → new negative tests.
- Trace comparison in tests: expected spans present, no unexpected external calls.
- Replay sanitised production traffic in staging (shadow testing).
- Alert on SLO breaches as "tests in production".

Tools: OpenTelemetry, Grafana/Tempo, Datadog, Honeycomb, Sentry.

### Example
Production traces showed 30% of search requests hit an endpoint that had zero automated tests. Adding tests there caught a sorting bug in the next release.

### Code java | Asserting on traces in a test (OpenTelemetry)
```java
@Test
void checkoutCallsPaymentOnce() {
    String traceId = checkoutApi.placeOrder(cartId).header("X-Trace-Id");
    List<Span> spans = tracing.spansFor(traceId);
    assertEquals(1, spans.stream().filter(s -> s.name().equals("POST /payments/charge")).count());
    assertTrue(spans.stream().noneMatch(s -> s.status() == StatusCode.ERROR));
}
```

## How do you approach testing for data-intensive and ML systems?
@topic strategy

### 60s
For data pipelines and ML systems, correctness depends on data quality as much as code. I test the data with automated expectations on schema, ranges, null rates, uniqueness and freshness at every pipeline stage, using tools like Great Expectations or dbt tests. For ML models, I validate training data, test feature engineering code, check model performance on held-out and slice-level datasets to catch bias, run regression tests against a golden set so new models don't degrade known cases, and monitor drift and performance in production. Reproducibility, versioning of data and models, and rollback are part of the test strategy.

### Explain
Layers:
- **Data tests:** contracts between producers and consumers, anomaly detection.
- **Pipeline tests:** unit tests for transformations, end-to-end with sample data, idempotent reruns.
- **Model tests:** metrics thresholds, fairness across slices, invariance and directional tests, latency of inference.
- **Integration:** model served behind an API: contract and performance tests.
- **Production:** shadow deployments, A/B, drift monitoring, feedback loops.

### Example
A recommendation model passed overall accuracy but performed badly for new users (cold start). A slice-level test on "users with < 3 orders" now gates model releases.

### Code python | Data expectations with Great Expectations style checks
```python
def test_orders_table_quality(df):
    assert df["order_id"].is_unique
    assert df["total"].between(0, 500000).all()
    assert df["status"].isin(["PLACED", "PAID", "SHIPPED", "DELIVERED", "CANCELLED"]).all()
    assert df["created_at"].max() >= pd.Timestamp.now() - pd.Timedelta(hours=2)   # freshness
    assert df["customer_id"].isna().mean() < 0.001
```

## What is your vision for the QA role over the next five years, and how do you prepare a team for it?
@topic strategy

### 60s
I see the role moving from testing at the end to engineering quality into the whole system: quality engineers who design testability, build platforms and tooling, work with data and observability, and coach teams, while AI handles more of the repetitive generation and maintenance. Deep skills that stay valuable are risk thinking, system design, test design, exploratory testing, performance and security, and communication. I prepare a team with a skills map, learning time, rotations into platform and SRE work, hands-on experiments with AI tools under clear guidelines, and by measuring outcomes instead of activity.

### Explain
Likely shifts:
- From scripted execution to risk analysis and system-level design.
- From UI-heavy to API, contract, data and observability testing.
- From separate QA phases to continuous quality signals in pipelines and production.
- AI as a co-pilot for generation, triage and maintenance; humans define intent and judge value.
- Quality engineers as enablers across product, data and infrastructure.

### Example
A quality team created a two-year skills roadmap: every engineer learns API testing and CI in year one, with specialisation tracks (performance, security, data, platform) in year two, and quarterly hack days on AI-assisted testing.

### Code text | Skills map
```text
Core (everyone)   : risk-based test design, API testing, CI/CD, Git, SQL, observability basics
Track: Platform   : K8s, IaC, grids, results services
Track: Performance: k6/JMeter, profiling, capacity planning
Track: Security   : OWASP, threat modelling, DAST/SAST
Track: Data/ML    : data quality, pipelines, model evaluation
```

# Module: Architecture case studies

## Design a test strategy for migrating a monolith to microservices.
@topic strategy

### 60s
The risk during a migration is behaviour drift between old and new. I'd start by capturing the monolith's current behaviour with characterisation tests at the API level, which become the safety net. For each extracted service, I'd add component tests with its own dependencies containerised, consumer-driven contracts between the monolith and the new services, and parallel-run or shadow traffic comparing responses from both paths. End-to-end journeys stay few but critical. Data migration gets reconciliation tests. Observability with correlation IDs and canary releases per service limit blast radius, and I'd track escaped defects per migrated service as the key metric.

### Explain
Strategy elements:
- **Characterisation tests:** record-and-compare on the monolith's APIs before changing anything.
- **Strangler pattern support:** route-level tests for both old and new paths while they coexist.
- **Contract tests:** every new service boundary.
- **Data:** dual-write/dual-read verification, migration reconciliation.
- **Non-functional:** latency added by network hops, resilience to partial failures.
- **Governance:** definition of done for "service extracted" includes test evidence.

### Example
Extracting the pricing service: 400 characterisation tests captured monolith pricing outputs for real-world carts; the new service was validated against them, then shadowed for two weeks comparing 100% of production requests before cut-over.

### Code typescript | Shadow comparison harness
```typescript
for (const cart of sampleCarts) {
  const [legacy, modern] = await Promise.all([
    monolith.post('/pricing', { data: cart }),
    pricingService.post('/v1/price', { data: cart }),
  ]);
  const a = await legacy.json(), b = await modern.json();
  if (Math.abs(a.total - b.total) > 0.005) mismatches.push({ cart, a, b });
}
expect(mismatches, JSON.stringify(mismatches.slice(0, 5))).toHaveLength(0);
```

## Design a quality approach for a mobile-first consumer app with weekly releases.
@topic strategy

### 60s
Weekly mobile releases need fast, layered feedback and controlled rollout. Developers own unit and UI component tests on each platform. API and contract tests protect the backend the app depends on, with backward-compatibility checks because old app versions stay in use. A focused Appium or native E2E suite runs on a device matrix from analytics, nightly and on release candidates. Each release goes through a bug bash, beta channels, then staged rollout with crash and performance monitoring and kill switches via feature flags. Release health metrics, crash-free rate and key funnel conversion, decide whether to continue the rollout.

### Explain
Specifics:
- App versions in the wild: API versioning, deprecation policy, forced-update mechanism tested.
- Device/OS matrix refreshed quarterly from analytics.
- Performance: app start time, memory, battery, network conditions.
- Store compliance checks and accessibility.
- Staged rollout: 1% → 10% → 50% → 100% with automated halt on crash-rate regression.
- Hotfix path tested regularly.

### Example
A fintech app's crash-free rate threshold of 99.5% halted a rollout at 10% when a new SDK crashed on Android 12; the fix shipped two days later without affecting most users.

### Code yaml | Release pipeline stages
```yaml
stages:
  - unit_and_component   # per platform, every PR
  - api_contract         # backend compatibility with app versions N, N-1, N-2
  - e2e_device_matrix    # nightly + release candidate, 12 devices
  - beta                 # TestFlight / Play internal, 48 h soak
  - staged_rollout       # 1% -> 10% -> 50% -> 100%, auto-halt on crash-free < 99.5%
```

## Design a performance and resilience plan for a high-traffic sale event.
@topic performance

### 60s
I'd start months ahead with a capacity model from last year's data and growth forecasts, defining target peak traffic with a safety margin. Then a workload model of real journeys, load tests on a production-like environment scaling up to 2 to 3 times expected peak, stress tests to find the breaking point, and soak tests for the sale duration. Each bottleneck gets fixed and retested. Resilience comes from chaos experiments on key dependencies, degraded modes like read-only or queue-based checkout, and rate limiting. A war room with dashboards, runbooks and rehearsed rollbacks runs on the day, and a retrospective feeds next year's plan.

### Explain
Timeline:
- T-12 weeks: targets, workload model, environment provisioning.
- T-8: baseline and load tests; fix bottlenecks.
- T-4: full-scale tests, chaos experiments, failover drills, CDN/WAF tuning.
- T-2: freeze risky changes, final soak, runbooks, on-call rota.
- T-0: war room, real-time dashboards, feature kill switches.
- T+1: retrospective, metrics vs predictions.

### Example
For a flash sale expecting 15× normal traffic, load tests found the coupon service saturating at 4×; caching coupon rules and pre-scaling pods got it to 20×. A queueing page was prepared as a degraded mode and never needed.

### Code javascript | k6 stress stage to find the breaking point
```javascript
export const options = {
  scenarios: {
    stress: {
      executor: 'ramping-arrival-rate', startRate: 100, timeUnit: '1s', preAllocatedVUs: 2000,
      stages: [
        { duration: '5m', target: 500 },
        { duration: '5m', target: 1000 },
        { duration: '5m', target: 2000 },   // beyond expected peak
        { duration: '5m', target: 3000 },
      ],
    },
  },
  thresholds: { http_req_failed: [{ threshold: 'rate<0.02', abortOnFail: true }] },
};
```

## How do you govern test automation quality across an organisation without becoming a bottleneck?
@topic strategy

### 60s
I use lightweight, automated governance. Standards are encoded as tooling rather than documents: lint rules that ban sleeps and fragile locators, templates with the right structure, shared libraries that make the good path the easy path, and CI templates with built-in gates and reporting. Health metrics per team, like flaky rate, duration and coverage of critical journeys, are visible on dashboards, and teams own their numbers. A community of practice reviews patterns, and the platform team consults rather than approves. Audits are occasional and data-driven. The goal is autonomy with guardrails.

### Explain
Guardrail examples:
- ESLint plugin for Playwright (`no-wait-for-timeout`, `prefer-web-first-assertions`).
- Required reporters and tags in CI templates.
- Automatic quarantine of flaky tests with SLAs.
- Scorecards: each repo graded on standards adoption.
- Office hours and paired onboarding instead of gatekeeping.

### Example
A quality scorecard across 35 repos showed 8 with no critical-journey tests; targeted support brought them up within a quarter without any mandate.

### Code json | Lint rules as governance
```json
{
  "extends": ["plugin:playwright/recommended"],
  "rules": {
    "playwright/no-wait-for-timeout": "error",
    "playwright/no-element-handle": "error",
    "playwright/prefer-web-first-assertions": "error",
    "playwright/expect-expect": "error"
  }
}
```

## How do you build a business case and roadmap for a quality engineering platform?
@topic strategy

### 60s
The business case quantifies current pain, such as engineering hours lost to flaky tests, slow suites, environment waits, and the cost of incidents, and compares that with the investment in people, infrastructure and tools, and the expected return in faster releases and fewer failures. The roadmap is phased with measurable milestones, starting with the highest pain, often CI speed and reliability, then expanding to environments, data, contract testing and observability. Each phase has success metrics, and I report progress quarterly. I include risks, dependencies and what we'll stop doing to free capacity.

### Explain
Business case structure:
1. Current state and cost of poor quality (with data).
2. Target state and benefits (quantified).
3. Options with costs (do nothing, incremental, platform).
4. Recommendation, roadmap, resourcing.
5. Risks and mitigations.
6. Metrics and governance.

Roadmap themes: fast feedback → reliable infrastructure → self-service data/environments → contracts and observability → AI-assisted testing.

### Example
Data showed 1,400 engineer-hours a quarter lost to flaky tests and environment waits (~₹85 lakh). A ₹1.1 crore annual platform investment projected a 60% reduction plus faster releases; the first two quarters achieved 55%.

### Code text | 12-month roadmap
```text
Q1  Fast feedback  : PR suites < 10 min, flaky quarantine, shared Playwright libs
Q2  Infrastructure : autoscaled browser grid, ephemeral envs for top 5 services
Q3  Data/contracts : test data service, Pact broker, breaking-change gates
Q4  Insights       : results service, quality scorecards, AI-assisted triage pilot
KPIs: suite time, flaky rate, env wait time, change failure rate, escaped defects
```
