# Module: Design patterns and SOLID for SDETs

## How do you apply SOLID principles in a test automation framework?
@topic framework

### 60s
Single responsibility: each class has one reason to change, so page objects model pages, API clients call APIs, and tests verify behaviour. Open-closed: I extend behaviour without editing core code, like adding a new browser through a new factory branch or a new reporter through a listener. Liskov substitution: any WebDriver or any implementation of my ApiClient interface can be swapped without breaking tests. Interface segregation: small interfaces like Clickable or Searchable instead of one huge BasePage. Dependency inversion: tests depend on abstractions injected through fixtures or DI, not on concrete drivers or environments.

### Explain
Smells SOLID fixes in test code:
- A 3,000-line `CommonUtils` (violates SRP).
- `if (browser == ...)` scattered everywhere (OCP).
- Tests instantiating `new ChromeDriver()` directly (DIP).
- `BasePage` with 80 methods nobody fully uses (ISP).

Senior-level point: apply principles pragmatically. Test code should stay simple and readable; over-abstraction is also a smell.

### Example
Payment tests depend on a `PaymentGateway` interface. Locally it's a WireMock-backed fake, in staging the real sandbox. Swapping is a config change, not a code change.

### Code java | Dependency inversion with an interface
```java
public interface PaymentGateway {
    PaymentResult charge(String orderId, BigDecimal amount);
}

public class SandboxGateway implements PaymentGateway { /* real sandbox API */ }
public class FakeGateway implements PaymentGateway {    /* in-memory, deterministic */
    public PaymentResult charge(String id, BigDecimal amt) { return PaymentResult.success(id); }
}

public class CheckoutTest extends BaseTest {
    private final PaymentGateway gateway = Gateways.fromConfig();  // injected by config
}
```

## Which design patterns have you used in automation frameworks?
@topic framework

### 60s
The common ones are: Page Object and Page Component for UI structure; Factory, for creating drivers or API clients based on configuration; Singleton, for configuration that's loaded once, used carefully so it doesn't break parallel runs; Builder, for readable test data objects with sensible defaults; Strategy, to switch behaviour like login via UI, API or SSO at runtime; Facade, to hide multi-step workflows like placing an order behind one method; Decorator or Proxy, to add logging, retries or waits around driver calls; and Observer, through test listeners and event hooks.

### Explain
| Pattern | Framework use |
|---|---|
| Factory | `DriverFactory.create(browser)` |
| Singleton | `Config.get()` (immutable, thread-safe) |
| Builder | `UserBuilder.aUser().premium().withCart(3).build()` |
| Strategy | `LoginStrategy` (UI / API / cookie) |
| Facade | `OrderFlows.placePaidOrder(user)` |
| Decorator | `EventFiringDecorator` + `WebDriverListener` for logging |
| Observer | TestNG listeners, Playwright `page.on(...)` |
| Fluent interface | Page methods returning `this` or next page |

Explain why you chose a pattern, not just its name.

### Example
Selenium 4's `EventFiringDecorator` wrapped the driver to log every click and find with timings, which helped diagnose a slow page without touching test code.

### Code java | Decorator for driver logging (Selenium 4)
```java
WebDriverListener listener = new WebDriverListener() {
    @Override public void beforeClick(WebElement element) {
        log.info("Click {}", element);
    }
    @Override public void afterFindElement(WebDriver d, By locator, WebElement result) {
        log.debug("Found {}", locator);
    }
};
WebDriver driver = new EventFiringDecorator<>(listener).decorate(new ChromeDriver());
```

## How do you use the Builder pattern for test data?
@topic framework

### 60s
The Builder pattern creates complex objects step by step with readable, chainable methods and sensible defaults. For test data it means each test specifies only what matters to it, like "a premium user with an expired card", while everything else gets valid defaults, including unique emails. This removes huge constructors and copy-pasted JSON, makes intent obvious, and when the model gets a new mandatory field I add one default in the builder instead of fixing hundreds of tests. Builders pair well with an API or DB step that actually creates the data.

### Explain
- Defaults should be valid and unique (UUIDs, timestamps) for parallel safety.
- Named factory methods (`aUser()`, `anAdmin()`) improve readability.
- Combine with Faker for realism, but seed it for reproducibility.
- Lombok `@Builder(toBuilder = true)` or Java records with a manual builder.
- "Object Mother" is the related pattern of predefined personas.

### Example
`UserBuilder.aUser().inCity("Pune").withOrders(3).create(api)` creates a realistic customer with three delivered orders in one line.

### Code java | Test data builder
```java
public final class UserBuilder {
    private String email = "qa+" + UUID.randomUUID() + "@test.local";
    private String city = "Bengaluru";
    private boolean premium = false;
    private int orders = 0;

    public static UserBuilder aUser() { return new UserBuilder(); }
    public UserBuilder premium() { this.premium = true; return this; }
    public UserBuilder inCity(String c) { this.city = c; return this; }
    public UserBuilder withOrders(int n) { this.orders = n; return this; }

    public User create(UserApi api) {
        User u = api.create(new CreateUser(email, city, premium));
        for (int i = 0; i < orders; i++) api.createDeliveredOrder(u.id());
        return u;
    }
}

User user = UserBuilder.aUser().premium().withOrders(3).create(userApi);
```

## How would you design an automation framework from scratch for a new product?
@topic strategy

### 60s
I'd start with context, not tools: the product's architecture, tech stack, team skills, release cadence, risks and what's already tested at unit level. Then I'd define a strategy with the test pyramid, deciding what to cover at API, UI and contract levels. I'd choose tools that fit the stack and team, for example Playwright with TypeScript for a React app and its APIs. I'd build a thin vertical slice first, a few critical tests running in CI with reporting, show value, then grow it with conventions, code reviews and documentation, measuring speed, stability and coverage.

### Explain
Steps:
1. **Discover:** architecture, environments, deployment process, pain points, stakeholders.
2. **Strategy:** scope, levels, ownership (devs write unit/component, SDETs drive API/E2E/contract).
3. **Tool selection:** language aligned with developers, community, CI fit, licensing, PoC with 2–3 options.
4. **Foundations:** project structure, config, data strategy, auth shortcut, reporting, parallelism, linting.
5. **CI first:** run on every PR from day one.
6. **Scale:** templates, docs, pairing, contribution guidelines.
7. **Measure:** run time, flaky rate, escaped defects, coverage of critical journeys.

### Example
For a fintech startup: Playwright TS for UI and API in the same repo as the frontend, Pact for service contracts, k6 for performance. The first week delivered 10 critical journey tests in GitHub Actions with traces; by month three, 300 tests ran in 12 minutes on every PR.

### Code text | Decision record summary
```text
ADR-001 UI/E2E tool
Context : React SPA + Node BFF, devs use TypeScript, deploy 10x/day
Options : Selenium+Java, Cypress, Playwright
Decision: Playwright (TS) - same language as devs, multi-browser, API testing,
          tracing, parallel/sharding built in
Consequences: Safari covered via WebKit; real-device mobile stays on Appium/BrowserStack
```

## How do you use dependency injection in test frameworks?
@topic framework

### 60s
Dependency injection means a test or class receives its dependencies from outside instead of creating them itself. In test frameworks that gives isolation, easy swapping of implementations like real versus fake services, and clean lifecycle management. In Playwright, fixtures are the DI mechanism. In Cucumber Java I use PicoContainer or Spring to share a scenario-scoped context between step definition classes. In TestNG or JUnit I can use Guice or Spring's test support. It avoids static singletons and global state, which is what usually breaks parallel execution.

### Explain
- **Scope matters:** per test (page, data), per worker/thread (browser), per suite (config).
- Constructor injection keeps dependencies explicit.
- DI makes it simple to inject a fake clock, fake gateway, or a different environment config.
- Don't over-engineer: for small suites, fixtures or a simple factory may be enough.

### Example
Cucumber steps split across `CartSteps`, `CheckoutSteps` and `PaymentSteps` share one `ScenarioContext` (driver, user, cart) injected by PicoContainer, created fresh for each scenario.

### Code java | Cucumber + PicoContainer
```java
public class ScenarioContext {
    public final WebDriver driver = DriverFactory.create(Config.get("browser"));
    public User user;
    public String orderId;
}

public class CartSteps {
    private final ScenarioContext ctx;
    public CartSteps(ScenarioContext ctx) { this.ctx = ctx; }     // injected

    @Given("a logged-in premium customer")
    public void loggedInPremium() {
        ctx.user = UserBuilder.aUser().premium().create(new UserApi());
        new LoginFlow(ctx.driver).asUser(ctx.user);
    }
}
```

## How do you structure a monorepo or multi-repo for tests across many teams?
@topic strategy

### 60s
It depends on how the product code is organised. My preference is to keep tests close to the code they test: unit, component and API tests live in each service's repository so they change together and run in that service's pipeline. Cross-service end-to-end and contract tests can live in a shared repo or the monorepo's e2e package. Shared utilities, like auth helpers, test data builders and reporting, go into an internal library with versioning. I define ownership with CODEOWNERS and a common style so teams can contribute safely.

### Explain
| | Tests with code | Central test repo |
|---|---|---|
| Ownership | Service team | QA/platform team |
| Change coupling | Same PR as code | Separate PRs, drift risk |
| Pipeline | Per service | Separate, often slower |
| Reuse | Via shared library | Natural |

In monorepos (Nx, Turborepo, Bazel), use affected-project detection to run only relevant tests.

### Example
Moving API tests into each service repo cut "test broke because code changed" tickets by 70%, since developers updated tests in the same pull request.

### Code yaml | CODEOWNERS for shared test assets
```yaml
# .github/CODEOWNERS
/e2e/                     @acme/qa-platform
/packages/test-utils/     @acme/qa-platform
/services/orders/tests/   @acme/orders-team
/services/payments/tests/ @acme/payments-team @acme/qa-platform
```

# Module: Contract, microservice and event-driven testing

## What is consumer-driven contract testing? How does Pact work?
@topic api

### 60s
Contract testing checks that two services agree on the shape of their interactions, without deploying them together. In consumer-driven contracts, the consumer writes tests describing the requests it makes and the responses it needs; Pact runs those against a mock provider and records them into a contract file, the pact. The pact is published to a Pact Broker. The provider then verifies the pact against its real implementation in its own pipeline. can-i-deploy checks the broker before release, so a provider change that would break a consumer is caught before it's deployed.

### Explain
Benefits over E2E: fast, isolated, pinpoints the breaking change, scales with many services.

Key concepts:
- **Interaction:** given (provider state), upon receiving (request), will respond with (response).
- **Matchers:** match types and formats, not exact values, so contracts aren't brittle.
- **Provider states:** setup hooks so the provider has the right data.
- **Broker + can-i-deploy + webhooks** to trigger provider verification when a pact changes.
- Contract tests check the interface, not business logic; functional tests are still needed.

### Example
The web app (consumer) expects `GET /orders/{id}` to return `status` as a string enum. The orders team renames it to `orderStatus`. Provider verification fails in their PR, before anything reaches staging.

### Code typescript | Consumer test with Pact JS
```typescript
import { PactV4, MatchersV3 } from '@pact-foundation/pact';
const { like, regex } = MatchersV3;

const provider = new PactV4({ consumer: 'web-app', provider: 'orders-service' });

it('gets an order', () =>
  provider
    .addInteraction()
    .given('order ORD-1 exists')
    .uponReceiving('a request for order ORD-1')
    .withRequest('GET', '/orders/ORD-1')
    .willRespondWith(200, (b) =>
      b.jsonBody({ id: 'ORD-1', status: regex('PLACED|PAID|SHIPPED', 'PAID'), total: like(999.0) }))
    .executeTest(async (mock) => {
      const order = await new OrdersClient(mock.url).get('ORD-1');
      expect(order.status).toBe('PAID');
    }));
```

## How do you test API versioning and backward compatibility?
@topic api

### 60s
I make sure existing clients keep working when the API changes. Additive changes, like a new optional field, should be safe, and I verify that old clients ignore unknown fields. Breaking changes, like removing or renaming fields, changing types, making a field required, or changing status codes, must go into a new version or follow a deprecation period. I test both versions side by side, run old consumer contract tests against the new provider, diff the OpenAPI specs automatically in CI to flag breaking changes, and check deprecation headers and documentation.

### Explain
Versioning styles: URL (`/v2/orders`), header (`Accept: application/vnd.acme.v2+json`), query (`?version=2`).

Tools:
- `oasdiff` / `openapi-diff` to detect breaking changes between specs.
- Pact for consumer expectations.
- Schema registry compatibility rules for events (Avro/Protobuf).

Mobile apps make this critical: old app versions stay in the field for months.

### Example
A PR changed `price` from a number to an object `{amount, currency}`. The spec diff job in CI failed with "breaking: response property type changed", so the team introduced it as `priceV2` instead.

### Code bash | Breaking-change check in CI
```bash
# Compare the PR's spec against main
git show origin/main:api/openapi.yaml > /tmp/base.yaml
docker run --rm -v "$PWD:/specs" -v /tmp:/base tufin/oasdiff \
  breaking /base/base.yaml /specs/api/openapi.yaml --fail-on ERR
```

## How do you test event-driven systems using Kafka or message queues?
@topic api

### 60s
In event-driven systems, services communicate asynchronously through topics or queues, so I can't just check a synchronous response. I test that producers publish the right events, with correct schema, keys and headers; that consumers process them correctly and idempotently, including duplicates and out-of-order messages; and how failures are handled, like retries, poison messages and dead-letter queues. In automated tests I publish an event or trigger an action, then poll with a timeout for the expected outcome, a database change, an API state or a downstream event, using Testcontainers for a real Kafka in component tests.

### Explain
Test areas:
- **Schema/contract:** Avro/Protobuf with a schema registry; compatibility rules.
- **Ordering:** per-partition ordering; consumers must handle reordering across partitions.
- **Delivery semantics:** at-least-once means duplicates happen; consumers must be idempotent.
- **Failure paths:** consumer down then back up (lag catches up), poison message to DLQ, broker failover.
- **Observability:** correlation IDs in headers, consumer lag metrics.

Never use fixed sleeps; poll with Awaitility or `expect.poll`.

### Example
Placing an order publishes `OrderPlaced`; the inventory service must reserve stock. The test sends the same event twice and verifies stock is reserved only once.

### Code java | Kafka component test with Testcontainers
```java
@Container static KafkaContainer kafka = new KafkaContainer(DockerImageName.parse("apache/kafka:3.8.0"));

@Test
void inventoryReservesStockOnceForDuplicateEvents() {
    var producer = Kafka.producer(kafka.getBootstrapServers());
    var event = new OrderPlaced("ORD-1", "SKU-101", 2);
    producer.send(new ProducerRecord<>("orders", "ORD-1", Json.write(event)));
    producer.send(new ProducerRecord<>("orders", "ORD-1", Json.write(event)));   // duplicate

    await().atMost(Duration.ofSeconds(20)).untilAsserted(() ->
        assertEquals(2, inventoryRepo.reservedQty("SKU-101")));
}
```

## What is chaos engineering and resilience testing?
@topic strategy

### 60s
Resilience testing checks how a system behaves when parts of it fail: a dependency is down, slow or returning errors, a pod is killed, the network partitions, or disk fills up. Chaos engineering is the disciplined practice of running these experiments deliberately, often in production-like or even production environments, with a hypothesis, a small blast radius and monitoring, to find weaknesses before real incidents do. As an SDET I verify timeouts, retries with backoff, circuit breakers, fallbacks, graceful degradation in the UI and that alerts fire, using tools like Toxiproxy, Chaos Mesh, Litmus or AWS FIS.

### Explain
Experiment template:
1. Steady state: define normal metrics (orders/min, error rate).
2. Hypothesis: "If the recommendations service is down, product pages still load within 2 s without recommendations."
3. Inject failure with limited blast radius.
4. Observe metrics, logs, alerts.
5. Roll back, learn, fix, repeat.

Start in test environments with Toxiproxy/WireMock faults in automated tests; graduate to game days.

### Example
Injecting 3 seconds of latency into the pricing service revealed the product API had no timeout, so threads piled up and the whole site slowed. A 500 ms timeout with a cached-price fallback fixed it.

### Code java | Latency injection with Toxiproxy (Testcontainers)
```java
@Container static ToxiproxyContainer toxiproxy = new ToxiproxyContainer("ghcr.io/shopify/toxiproxy:2.9.0");

@Test
void productPageDegradesGracefullyWhenPricingIsSlow() throws IOException {
    Proxy pricing = toxiClient.createProxy("pricing", "0.0.0.0:8666", "pricing:8080");
    pricing.toxics().latency("slow", ToxicDirection.DOWNSTREAM, 3000);

    long start = System.currentTimeMillis();
    Product p = productApi.get("SKU-101");
    assertTrue(System.currentTimeMillis() - start < 1000, "No timeout on pricing call");
    assertEquals("CACHED", p.priceSource());
}
```

## How do you test GraphQL APIs?
@topic api

### 60s
GraphQL has a single endpoint and clients ask for exactly the fields they need with queries and mutations. I test that queries return the right data and only the requested fields; that mutations change state correctly; validation of arguments and types; errors, which usually come back with HTTP 200 and an errors array, so I must assert on the body, not just the status; authorisation at the field level; pagination; and abuse protection like query depth and complexity limits. Schema checks catch breaking changes. I use Postman, REST Assured, Playwright request or dedicated clients.

### Explain
Key differences from REST testing:
- Status 200 even for errors → always check `errors`.
- N+1 query performance problems (use DataLoader) → test with nested queries at volume.
- Introspection should usually be disabled in production.
- Field-level auth: a customer querying `user { email }` of another user must be denied.
- Schema diff tools (GraphQL Inspector) for breaking changes.

### Example
A deeply nested query `user → orders → items → product → reviews → user...` took 30 seconds and spiked CPU. Adding a depth limit of 7 and complexity scoring fixed a denial-of-service risk.

### Code java | GraphQL query with REST Assured
```java
String query = """
  query($id: ID!) { order(id: $id) { id status items { sku qty } } }
  """;

given().spec(req)
       .body(Map.of("query", query, "variables", Map.of("id", "ORD-1")))
.when().post("/graphql")
.then().statusCode(200)
       .body("errors", nullValue())
       .body("data.order.status", equalTo("PAID"))
       .body("data.order.items.size()", greaterThan(0));
```

## How do you test caching behaviour?
@topic strategy

### 60s
Caching improves speed but causes stale-data bugs. I test that cacheable responses are cached with the right headers, like Cache-Control, ETag and max-age, and that repeat requests are faster or return 304 Not Modified. Most importantly I test invalidation: after an update, the next read returns fresh data within the expected time. I check that private, user-specific data is never cached in shared caches or CDNs, that cache keys include everything that changes the response, like language or user role, and that the system works when the cache is cold or down.

### Explain
Layers: browser cache, CDN, API gateway, application cache (Redis), database query cache.

Test cases:
- Cache hit/miss headers (`X-Cache: HIT`).
- TTL expiry.
- Invalidation on write (price updated → product page shows new price).
- Cache key collisions (Hindi and English pages served from the same key).
- Cache stampede when a popular key expires under load.
- Behaviour when Redis is unavailable (fallback to DB, not an error page).

### Example
After an admin changed a product's price, the product page showed the old price for 30 minutes because the CDN cache wasn't purged. A test now updates the price via the admin API and polls the public page for the new price within 60 seconds.

### Code java | Checking headers and invalidation
```java
Response first = given().get("/api/products/101");
String etag = first.header("ETag");
first.then().header("Cache-Control", containsString("max-age"));

given().header("If-None-Match", etag).get("/api/products/101").then().statusCode(304);

adminApi.updatePrice("101", new BigDecimal("1299"));
await().atMost(Duration.ofSeconds(60)).untilAsserted(() ->
    given().get("/api/products/101").then().body("price", equalTo(1299f)));
```

# Module: Performance engineering

## How do you plan a performance test? What is a workload model?
@topic performance

### 60s
I start with goals: which business questions we're answering, the non-functional requirements like p95 latency, throughput and error rate, and the expected peak load. Then I build a workload model from production analytics and logs: which user journeys happen, their mix and frequency, think times, peak arrival rate, and data distribution. Then I design the scenarios and load profiles, prepare a production-like environment and realistic data volumes, set up monitoring on all tiers, agree on entry and exit criteria, run a baseline, then load, stress and soak tests, and analyse and report with recommendations.

### Explain
Workload model example:
| Journey | Share | Per hour at peak |
|---|---|---|
| Browse/search | 60% | 216,000 |
| Product view | 25% | 90,000 |
| Add to cart | 10% | 36,000 |
| Checkout | 5% | 18,000 |

Other planning items:
- Open vs closed model (arrival rate vs fixed users). Arrival-rate executors are more realistic for web traffic.
- Test data: unique users, enough products, realistic DB size.
- Environment parity and known differences.
- Who monitors what (APM, DB, infra).

### Example
For a Black Friday readiness test, analytics showed peak checkout of 300/minute. The plan modelled 3× that, with a 70/20/10 mix of browse/cart/checkout, against a staging environment scaled to 50% of production with results extrapolated cautiously.

### Code javascript | Arrival-rate model in k6
```javascript
export const options = {
  scenarios: {
    browse:   { executor: 'constant-arrival-rate', rate: 60, timeUnit: '1s', duration: '30m',
                preAllocatedVUs: 200, exec: 'browse' },
    checkout: { executor: 'constant-arrival-rate', rate: 5,  timeUnit: '1s', duration: '30m',
                preAllocatedVUs: 100, exec: 'checkout' },
  },
  thresholds: {
    'http_req_duration{scenario:checkout}': ['p(95)<1500'],
    'http_req_duration{scenario:browse}':   ['p(95)<600'],
  },
};
export function browse()   { /* search + product view */ }
export function checkout() { /* cart + pay */ }
```

## How do you identify performance bottlenecks?
@topic performance

### 60s
I correlate load test results with server-side monitoring. When response times rise, I look at where time is spent: application traces in an APM tool like Datadog, New Relic or Grafana Tempo show slow spans; database metrics show slow queries, locks and connection pool exhaustion; infrastructure metrics show CPU, memory, garbage collection pauses, thread pool saturation and network or disk I/O. I find the first resource to saturate as load increases, the knee of the curve, then form a hypothesis, fix or tune one thing, and rerun to confirm the improvement.

### Explain
Common bottlenecks:
- Missing DB indexes, N+1 queries, large result sets.
- Connection pool too small (requests waiting for a DB connection).
- Synchronous calls to slow downstream services without timeouts.
- Excessive logging, serialization, or GC pressure from large objects.
- Locks and contention on hot rows.
- Under-provisioned autoscaling or cold starts.

Method: USE (Utilization, Saturation, Errors) for resources and RED (Rate, Errors, Duration) for services.

### Example
At 400 RPS, p95 jumped from 300 ms to 4 s while CPU was only 40%. APM showed threads waiting on `HikariPool.getConnection`. The pool was 10 connections; raising it to 40 and fixing an N+1 query restored p95 to 350 ms at 800 RPS.

### Code sql | Finding slow queries in PostgreSQL
```sql
SELECT query, calls, mean_exec_time, total_exec_time
FROM pg_stat_statements
ORDER BY total_exec_time DESC
LIMIT 10;

EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM order_items WHERE order_id = 'ORD-1';
```

## How do you include performance testing in a CI/CD pipeline?
@topic performance

### 60s
I run small, fast performance checks on every merge or nightly, and full-scale tests before major releases. The CI checks use a short k6 or Gatling run with a fixed load against a stable environment, with thresholds on p95 latency and error rate that fail the build if breached, and compare results against a stored baseline to catch regressions, say more than 10 percent slower. Results go to a dashboard for trends. I also add frontend performance budgets with Lighthouse CI. Big load, stress and soak tests stay scheduled, because they need dedicated environments.

### Explain
Keys to useful CI performance tests:
- Consistent environment and data, or results are noise.
- Short duration (3–10 minutes), low-to-moderate load.
- Relative comparison against baseline more than absolute numbers.
- Store results (InfluxDB/Prometheus + Grafana, k6 Cloud).
- Don't run against shared environments during other tests.

### Example
A PR added an ORM eager-load that doubled the payload of `/api/orders`. The nightly k6 check failed (p95 420 ms → 910 ms), and the team fixed it before release.

### Code yaml | k6 in GitHub Actions
```yaml
perf-check:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - uses: grafana/setup-k6-action@v1
    - uses: grafana/run-k6-action@v1
      with:
        path: perf/api-smoke.js
      env:
        BASE_URL: ${{ vars.PERF_BASE_URL }}
    # Thresholds in api-smoke.js make this step fail on regression
```

## How do you analyse and report performance test results?
@topic performance

### 60s
I compare results against the agreed goals, show percentiles over time, not just averages, alongside throughput, error rate and active users, and correlate them with server metrics to explain why. I point out where performance degrades, the maximum sustainable load, the bottleneck and its evidence, and the risk for the upcoming peak. The report leads with a clear verdict, pass, fail or pass with risks, followed by key graphs, findings ranked by impact, recommendations and what was out of scope or different from production.

### Explain
Report structure:
1. Summary verdict and headline numbers.
2. Goals vs actuals table.
3. Graphs: response time percentiles vs users, throughput, errors, resource usage.
4. Findings: bottlenecks with evidence (traces, slow queries).
5. Recommendations and owners.
6. Test conditions: environment, data, duration, differences from production.

Watch out for: coordinated omission, client-side bottlenecks (load generator CPU), warm-up periods, caching effects.

### Example
"Pass with risk: checkout meets p95 < 1.5 s up to 600 RPS (target 500). Beyond 650 RPS, payment-service DB CPU saturates and errors reach 4%. Recommend read replica before the sale."

### Code text | Goals vs actuals
```text
Metric                Target      Actual @500 RPS   Status
Checkout p95          < 1500 ms   1120 ms           PASS
Search p95            < 600 ms    540 ms            PASS
Error rate            < 1%        0.3%              PASS
Max sustainable RPS   >= 500      620               PASS (risk above 650)
```

## How do you test frontend performance? What are Core Web Vitals?
@topic performance

### 60s
Frontend performance is how fast a page feels to users, independent of backend load. Core Web Vitals are Google's key user-centric metrics: Largest Contentful Paint, how quickly the main content appears, good under 2.5 seconds; Interaction to Next Paint, how responsive the page is to clicks and taps, good under 200 milliseconds; and Cumulative Layout Shift, how much content jumps around, good under 0.1. I measure them with Lighthouse and WebPageTest in lab conditions, Lighthouse CI budgets in pipelines, and real user monitoring in production.

### Explain
Other useful metrics: Time to First Byte, First Contentful Paint, Total Blocking Time, bundle size.

Common fixes to suggest: image optimisation and lazy loading, code splitting, caching and CDN, reducing third-party scripts, reserving space for images and ads (CLS).

Test on throttled mobile profiles; desktop on office Wi-Fi hides problems.

### Example
Lighthouse CI on the product page flagged LCP 4.2 s on a mid-range mobile profile. The hero image was a 2 MB PNG; converting to AVIF with proper sizing brought LCP to 1.9 s.

### Code json | Lighthouse CI budgets (lighthouserc.json)
```json
{
  "ci": {
    "collect": { "url": ["https://qa.shop.example.com/", "https://qa.shop.example.com/products/101"], "numberOfRuns": 3 },
    "assert": {
      "assertions": {
        "largest-contentful-paint": ["error", { "maxNumericValue": 2500 }],
        "cumulative-layout-shift": ["error", { "maxNumericValue": 0.1 }],
        "total-blocking-time": ["warn", { "maxNumericValue": 200 }],
        "categories:performance": ["error", { "minScore": 0.85 }]
      }
    }
  }
}
```

## How do you run JMeter or k6 at large scale (distributed load)?
@topic performance

### 60s
A single load generator runs out of CPU, memory or network before the system under test does, which gives false results. For large loads I distribute: JMeter supports a controller with multiple remote worker engines, though it's simpler today to run independent JMeter or k6 instances in containers, on Kubernetes with the k6 operator, or in a cloud service like k6 Cloud, Azure Load Testing or BlazeMeter, and aggregate the results. I monitor the generators themselves, keep them close to realistic network paths, and split test data so virtual users don't collide.

### Explain
- Rule of thumb: keep generator CPU under ~70%.
- Each generator needs its own slice of test data (CSV split by index).
- Time-synchronise machines for accurate merged results.
- Consider geography: generating load from the same data centre skips real network latency.
- Cloud costs and rate limits (WAF/CDN may block load traffic, so get it whitelisted).

### Example
A 50,000-user test ran on 20 k6 pods via the k6 operator on Kubernetes, streaming metrics to Prometheus and Grafana; each pod read its own segment of a 50,000-user dataset.

### Code yaml | k6 operator TestRun
```yaml
apiVersion: k6.io/v1alpha1
kind: TestRun
metadata:
  name: checkout-peak
spec:
  parallelism: 20
  script:
    configMap:
      name: checkout-script
      file: checkout.js
  arguments: --out experimental-prometheus-rw --tag testid=checkout-peak
  runner:
    env:
      - name: BASE_URL
        value: https://staging.shop.example.com
```

# Module: Test infrastructure and scale

## How do you design test infrastructure on Kubernetes or in the cloud?
@topic cicd

### 60s
I treat test infrastructure as code. Browsers run as scalable Selenium Grid or Playwright worker pods on Kubernetes, with autoscaling based on queue length, so capacity grows during big runs and shrinks to zero at night. Test environments are ephemeral: each pull request gets a namespace with the app, its database seeded with known data, and mocked third parties, created by the pipeline and destroyed afterwards. Test data services, a results database and dashboards are shared platform services. Everything is defined with Helm or Terraform so it's reproducible, and costs are tagged and monitored.

### Explain
Components:
- **Execution:** Grid/Moon/Selenoid on K8s, or Playwright containers sharded by CI; KEDA scales on session queue.
- **Environments:** preview deploys per PR (ArgoCD, Helm), with DB seeding jobs.
- **Data:** synthetic data service, masked production snapshots.
- **Observability:** Allure/ReportPortal, Grafana for run metrics, logs aggregated.
- **Secrets:** Vault / cloud secret manager, short-lived credentials.
- **Cost:** spot nodes for browsers, TTL on namespaces.

### Example
Moving from 4 static Jenkins agents to KEDA-scaled Chrome pods on spot nodes cut regression time from 70 to 15 minutes and infrastructure cost by 40%, because capacity existed only during runs.

### Code yaml | Scaling Selenium nodes with KEDA
```yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: selenium-chrome-scaler
spec:
  scaleTargetRef:
    name: selenium-node-chrome
  minReplicaCount: 0
  maxReplicaCount: 40
  triggers:
    - type: selenium-grid
      metadata:
        url: http://selenium-hub:4444/graphql
        browserName: chrome
```

## How do you handle test data at scale (data strategy)?
@topic strategy

### 60s
A test data strategy answers how every test gets correct, isolated, realistic data without manual work. My approach layers: synthetic data generated on demand through APIs or factories for most functional tests, which is fast and parallel-safe; a curated, versioned seed dataset for reference data like products and configurations; and masked, subsetted production snapshots for performance and exploratory testing. I avoid shared mutable records, add a cleanup policy or ephemeral databases, and treat sensitive data with masking rules so no real personal data reaches test environments, which matters under GDPR and India's DPDP Act.

### Explain
Design points:
- Data builders and a test data API ("give me a customer with an expired card").
- Namespacing per run and per test for parallelism.
- Database snapshots/restore for fast resets (Testcontainers, DB clones).
- Masking pipeline for production data (deterministic hashing keeps joins intact).
- Data as code: seed files reviewed in PRs.
- Observability: which tests created which data; TTL cleanup jobs.

### Example
A central "data factory" service exposes `POST /factory/customer?profile=premium-with-orders`. UI, API and performance tests all use it, which removed 300 hand-maintained SQL scripts.

### Code python | Deterministic masking keeps relationships
```python
import hashlib

def mask_email(email: str, salt: str) -> str:
    h = hashlib.sha256((salt + email.lower()).hexdigest()[:10]
    return f"user_{h}@masked.example"

# Same real email -> same masked email in every table, so joins still work
```

## What is the strategy for managing flaky tests at scale across many teams?
@topic strategy

### 60s
At scale, flakiness is a systems problem, not an individual test problem. I set up automatic flaky detection from result history, for example a test that both passed and failed on the same commit, and route those tests into quarantine, where they still run but don't block merges. Each quarantined test gets an owner and a time limit. I report a flaky rate per team and trend it, run root-cause clustering, like waits, data collisions, or environment issues, and fix the top causes with platform changes such as better fixtures or data isolation. Retries are limited and visible, never silent.

### Explain
Process:
1. Measure: flaky rate = tests needing retry ÷ tests run; track per suite and owner.
2. Quarantine automatically with a ticket; auto-delete if not fixed in N weeks (with owner's agreement).
3. Categorise root causes monthly; fix platform-level causes first.
4. Budget: e.g., < 1% flaky rate, PR suite < 10 min.
5. Culture: flaky tests block releases just like bugs; celebrate fixes.

Tools: Playwright's flaky status, Allure/ReportPortal analytics, BuildPulse, Datadog CI Visibility, Gradle Enterprise/Develocity.

### Example
A 4,000-test suite had a 6% flaky rate. Clustering showed 60% came from shared test accounts; introducing per-test accounts via a data factory dropped the rate to 0.8% in two months.

### Code typescript | Quarantine via tags in Playwright
```typescript
// Quarantined tests run but never block; reported separately
test('apply gift card @quarantine', async ({ page }) => { /* ... */ });

// playwright.config.ts: two projects
projects: [
  { name: 'gate',       grepInvert: /@quarantine/ },
  { name: 'quarantine', grep: /@quarantine/, retries: 0 },
],
// CI: npx playwright test --project=gate   (required check)
//     npx playwright test --project=quarantine || true   (informational)
```

## How do you measure test coverage meaningfully beyond code coverage?
@topic strategy

### 60s
Code coverage tells me which lines ran, not whether behaviour was verified, so I use it only as a floor for unit tests. More meaningful measures are requirement or user-story coverage, risk coverage where each high-risk area has tests at the right level, critical user journey coverage, API endpoint and status-code coverage from the OpenAPI spec, and mutation testing, which checks that tests actually fail when code is deliberately broken. I combine these with escaped-defect analysis: every production bug is mapped to the test level that should have caught it.

### Explain
- **Mutation score** (PIT for Java, Stryker for JS/TS): percentage of mutants killed.
- **API coverage:** compare called endpoints/status codes in test traffic with the spec (e.g., Swagger Coverage tool).
- **Journey coverage:** list of top journeys from analytics, each mapped to automated tests.
- **Risk matrix coverage:** every high-score risk has named tests.
- Escaped defect reviews drive which coverage to add.

### Example
Unit coverage was 85%, but mutation testing showed a 45% score in the pricing module: many tests had no assertions on totals. Fixing those found two real rounding bugs.

### Code bash | Mutation testing with Stryker
```bash
npx stryker run
# Mutation score 72% -> inspect survived mutants in reports/mutation/html
```

## How do you test mobile apps at scale with Appium and device farms?
@topic selenium

### 60s
At scale I keep the mobile suite focused on journeys that behave differently on mobile, and push logic to API tests. Tests run in parallel on a device farm like BrowserStack, Sauce Labs or AWS Device Farm, selected by a matrix of the top devices and OS versions from analytics. I use accessibility IDs for cross-platform locators, share page objects across Android and iOS where possible, and handle platform differences with small strategy classes. Builds come from CI with test-only configuration, like fixed OTP and disabled analytics, and I verify installs, upgrades, permissions, interruptions and network conditions.

### Explain
Scaling practices:
- Device matrix from real usage (top 10 devices cover ~80% of users).
- Parallel sessions on the farm; local emulators for development.
- Appium 2 drivers: UiAutomator2, XCUITest; Espresso/XCUITest native tests for developers.
- Flakiness: wait for idle, avoid XPath, disable animations on test builds.
- Visual checks per device class.
- Real device for payments, biometrics, camera; emulators for the rest.

### Example
Checkout runs nightly on 12 devices in parallel in 25 minutes; a Samsung One UI keyboard issue that hid the "Pay" button was caught only on a real Galaxy device.

### Code java | BrowserStack capabilities (Appium 2)
```java
UiAutomator2Options options = new UiAutomator2Options()
    .setDeviceName("Samsung Galaxy S23")
    .setPlatformVersion("13.0")
    .setApp("bs://" + System.getenv("BS_APP_ID"));
options.setCapability("bstack:options", Map.of(
    "projectName", "Shop app", "buildName", System.getenv("BUILD_NUMBER"),
    "networkLogs", true, "interactiveDebugging", true));

AndroidDriver driver = new AndroidDriver(
    new URL("https://" + System.getenv("BS_USER") + ":" + System.getenv("BS_KEY") + "@hub.browserstack.com/wd/hub"),
    options);
```

## How do you secure your test automation and pipelines?
@topic cicd

### 60s
Test code and pipelines have real credentials and access, so they're an attack surface. I keep secrets out of code and logs, using the CI's secret store or Vault with short-lived tokens, and mask them in output. Test accounts get least privilege and are separate per environment. Pipelines pin action and image versions, scan dependencies, and don't expose secrets to pull requests from forks. Test environments don't contain real customer data. I also make sure test-only backdoors, like fixed OTPs, are disabled in production builds and verified by a test.

### Explain
Checklist:
- No secrets in repos (pre-commit scanners like gitleaks); rotate if leaked.
- Scoped tokens; separate credentials per team/environment.
- Don't log request bodies with passwords/tokens (filters in REST Assured, redaction in logs).
- Pin GitHub Actions to SHAs; Dependabot/Renovate for updates.
- Protect branches; required reviews for pipeline changes.
- Network: test runners can reach only test environments.
- Verify production build has no debug endpoints.

### Example
A gitleaks pre-commit hook caught a BrowserStack key pasted into a config file before it reached GitHub.

### Code yaml | Secret scanning in CI
```yaml
- name: Scan for secrets
  uses: gitleaks/gitleaks-action@v2
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

## How do you test in production (shift-right)?
@topic strategy

### 60s
Shift-right means validating in production safely, because some things can only be seen with real traffic and data. Techniques include synthetic monitoring, where scripted journeys run every few minutes against production with test accounts; canary and blue-green releases with automatic rollback on error-rate or latency regressions; feature flags and A/B tests with metrics; and observability with logs, traces and alerts tied to business metrics like orders per minute. Automated tests in production must be safe: no real payments, tagged test data, and no side effects on real users.

### Explain
Design rules for production tests:
- Dedicated test accounts and products, clearly flagged and excluded from analytics and finance.
- Read-mostly checks; writes only in sandbox modes.
- Rate-limited and low frequency.
- Alerting with on-call ownership.
- Rollback automation: canary analysis (Argo Rollouts, Flagger) compares error rates and p95 between versions.

### Example
A synthetic checkout runs every 5 minutes in production using a test card in sandbox mode. It detected a payment-provider outage 12 minutes before the first customer complaint.

### Code typescript | Synthetic check with Playwright (scheduled)
```typescript
test('prod: search and product page are healthy', async ({ page }) => {
  test.skip(process.env.TARGET !== 'prod');
  await page.goto('https://shop.example.com');
  await page.getByRole('searchbox').fill('qa-synthetic-product');
  await page.keyboard.press('Enter');
  await page.getByTestId('result-card').first().click();
  await expect(page.getByTestId('price')).toBeVisible({ timeout: 5000 });
});
// Scheduled every 5 minutes in CI; failures page the on-call via webhook
```

# Module: Leadership for senior SDETs

## How do you mentor junior testers and raise the team's automation skills?
@topic strategy

### 60s
I pair with juniors on real tasks rather than lecturing: we write a test together, I review their first pull requests closely with explanations, and I gradually hand over ownership. I set up templates, a contribution guide and example tests so the right way is the easy way. I run short, regular sessions on one topic, like waits or locators, and ask juniors to present what they learned. I give specific, timely feedback, set stretch goals tied to their interests, and measure growth by the quality of their PRs and the problems they can solve alone.

### Explain
Practices:
- Code review as teaching: explain the why, link to docs, praise good patterns.
- Learning paths per level (fundamentals → API → UI → CI).
- Pairing/mobbing on hard problems (flaky test hunts).
- Safe to fail: juniors break things in sandboxes, not releases.
- Rotate responsibilities (release testing, triage, CI maintenance).
- Celebrate contributions publicly.

### Example
A manual tester joined with no coding background. Over six months, through paired sessions and a graded backlog of "good first automation tasks", they wrote 60 API tests and now review others' PRs.

### Code text | Review comment that teaches
```text
Suggestion (non-blocking):
`Thread.sleep(3000)` will make this test slow and still flaky on CI.
Try `wait.until(ExpectedConditions.visibilityOfElementLocated(TOAST))`
so it continues as soon as the toast appears. See docs/waits.md for
the patterns we use. Happy to pair on this if useful.
```

## How do you handle a situation where developers push back on quality or testing?
@topic strategy

### 60s
I try to understand their constraints first, usually time pressure or unclear value. Then I make quality concrete and shared: show data such as escaped defects, incident costs or time lost to flaky builds, and propose small changes with obvious payoff, like fast PR checks that find bugs before review. I make testing easier for them: templates, fixtures, fast feedback, clear failure messages. I involve them in deciding what to test and keep the gates reliable so they're trusted. Collaboration beats enforcement; quality has to be owned by the whole team, with QA enabling it.

### Explain
Tactics:
- Speak in their currency: fewer rollbacks, fewer interruptions, faster merges.
- Pilot with one team, publish results.
- Remove friction: run tests locally in one command, reports that pinpoint the failure.
- Agree on a Definition of Done together.
- Escalate only with data, and after trying to fix the real issue.

### Example
Developers ignored UI test failures because 20% were flaky. After we quarantined and fixed them and cut the PR suite to 8 minutes, failures were taken seriously and escaped defects dropped by half.

### Code text | A pitch framed in outcomes
```text
Problem : 3 rollbacks last quarter, each ~6 engineer-days
Proposal: 40 API tests on checkout run on every PR (6 min)
Cost    : 2 weeks of SDET time + 10 min/week per dev to maintain
Expected: catch ~70% of the root causes seen in those rollbacks
```

## How do you decide what to automate and how to prioritise automation backlog?
@topic strategy

### 60s
I prioritise by risk and value: business-critical journeys, areas with frequent changes or escaped defects, tests that run most often such as regression and smoke, and tests that are slow or error-prone manually. I score candidates on impact, frequency, stability of the feature and automation cost, and pick the highest value per effort. I also consider the level: automate at the API or component level before UI. I keep the backlog visible to the team, re-prioritise each sprint based on new data like production incidents, and retire tests that no longer add value.

### Explain
Scoring example (1–5 each): business impact, change frequency, defect history, manual effort saved, feasibility. Divide by estimated cost.

Also consider:
- Coverage gaps from escaped-defect analysis.
- Upcoming roadmap (automate before a big refactor to make it safe).
- Tooling improvements that unlock many tests (auth fixture, data factory).

### Example
The backlog had 120 candidate tests. The scoring put "refund flow API tests" first (two production incidents, manual regression 3 hours) and "profile theme colour" last.

### Code text | Prioritised backlog snippet
```text
Candidate                     Impact Freq Defects Effort  Score
Refund flow (API)               5     4     5      2      8.0
Coupon rules (API)              4     5     3      2      6.0
Checkout UI (Chrome+Safari)     5     3     4      4      3.0
Profile theme (UI)              1     1     1      2      0.5
```

## Describe a difficult bug you found and how you investigated it.
@topic strategy

### 60s
I use a structure: context, symptom, investigation, root cause, fix and lesson. For example: customers were occasionally charged twice. It reproduced only under load, so I correlated payment logs by order ID and found two charge requests 300 milliseconds apart. Tracing showed the mobile app retried on a timeout while the first request was still processing, and the payment API had no idempotency key. I wrote a test that sent concurrent duplicate requests, proved the issue, and the fix was an idempotency key per order plus a shorter server timeout. Lesson: always test retries and concurrency on money flows.

### Explain
What interviewers assess: curiosity, systematic approach, use of logs/traces/data, collaboration, and whether you improved the process afterwards.

Structure (STAR): Situation, Task, Action, Result. Quantify the result.

Keep a personal log of 3–4 such stories: a concurrency bug, a data/time-zone bug, an environment issue, a flaky test root cause.

### Example
Another story: orders disappeared from the history page for some users. Root cause: pagination used `OFFSET` on a list sorted by a non-unique timestamp, so rows shuffled between pages. Fix: sort by timestamp and ID. A SQL test now checks pagination stability.

### Code java | Reproducing the double charge
```java
@Test
void duplicateChargeRequestsChargeOnlyOnce() throws Exception {
    ExecutorService pool = Executors.newFixedThreadPool(2);
    Callable<Response> charge = () -> paymentApi.charge("ORD-1", new BigDecimal("999"), /*idempotencyKey*/ "ORD-1");
    List<Future<Response>> results = pool.invokeAll(List.of(charge, charge));

    long successes = results.stream().filter(f -> get(f).statusCode() == 201).count();
    assertEquals(1, successes);
    assertEquals(1, paymentDb.countCharges("ORD-1"));
}
```

## How do you run a bug bash or exploratory testing session for a team?
@topic test-design

### 60s
A bug bash is a time-boxed session where the whole team, developers, designers, product and support, tests a feature together before release. I prepare: a stable build, test accounts and data, charters or focus areas per person, a simple way to log findings like a shared board, and a short brief on what's new. During the session I keep energy up, triage duplicates live and encourage unusual paths. Afterwards I run triage with the product owner, prioritise fixes, and share results. It finds usability and edge-case issues fast and builds shared ownership of quality.

### Explain
Charters examples: "Explore checkout as a first-time user on mobile", "Try to break coupon stacking", "Use only the keyboard".

Make it fun: leaderboard for bugs, prizes for the weirdest bug, 60–90 minutes max.

Measure: bugs found by severity, and later, how many would have escaped.

### Example
A 90-minute bug bash with 12 people before launching a loyalty program found 31 issues, 4 critical, including points being awarded for cancelled orders.

### Code text | Bug bash sheet
```text
Who     Charter                              Bugs  Notes
Asha    Checkout on Android, poor network    3     Payment spinner never ends offline
Ravi    Coupon + loyalty combinations        5     Points on cancelled orders (CRIT)
Meera   Keyboard-only + screen reader        4     Focus trapped in address modal
```

# Module: Senior coding and system questions

## How do you implement a thread-safe singleton and when should you avoid singletons in tests?
@topic programming

### 60s
A thread-safe singleton in Java is simplest with an enum or a static holder class, which the JVM initialises lazily and safely. Double-checked locking with a volatile field also works. In test frameworks, singletons are fine for immutable, read-only things like configuration. I avoid them for mutable state like the WebDriver, test context or reports, because parallel tests would share and corrupt that state; those belong in ThreadLocal or dependency-injected, per-test instances. A singleton that holds a driver is the most common cause of a framework not scaling to parallel runs.

### Explain
- Enum singleton: serialization-safe, reflection-safe, concise.
- Holder idiom: lazy and thread-safe without synchronization cost.
- Avoid singletons that hide dependencies; they make tests order-dependent.
- If you must share expensive resources (DB pool), make them immutable or thread-safe and worker-scoped.

### Example
A `ReportManager` singleton with a single `ExtentTest` field produced garbled reports under parallel runs. Moving the current test into a `ThreadLocal` fixed it.

### Code java | Holder idiom
```java
public final class Config {
    private final Properties props;
    private Config() { props = load(); }

    private static class Holder { static final Config INSTANCE = new Config(); }
    public static Config get() { return Holder.INSTANCE; }

    public String value(String key) { return props.getProperty(key); }
}
```

## Write a utility that retries an operation with exponential backoff.
@topic programming

### 60s
A generic retry helper takes an operation, a maximum number of attempts, a base delay and the exceptions worth retrying. It runs the operation, and on a retryable failure waits base delay times two to the power of the attempt, optionally with jitter to avoid thundering herds, then tries again, finally rethrowing the last exception. In automation I use it for transient infrastructure errors like connection resets or 503s, and for polling until a condition holds. I never use it to mask assertion failures or genuine product bugs.

### Explain
- Make it generic: `Supplier<T>` plus a predicate on the exception.
- Cap the maximum delay.
- Log every retry with the reason, so retries are visible.
- Libraries exist: Resilience4j, Failsafe, Awaitility (for polling), Spring Retry.

### Example
A REST Assured call to a flaky staging gateway retries up to 3 times on 502/503 with 500 ms, 1 s, 2 s delays, then fails clearly.

### Code java | Retry with backoff
```java
public static <T> T retry(Supplier<T> op, int maxAttempts, Duration base, Predicate<Exception> retryable) {
    Exception last = null;
    for (int attempt = 0; attempt < maxAttempts; attempt++) {
        try {
            return op.get();
        } catch (Exception e) {
            last = e;
            if (!retryable.test(e) || attempt == maxAttempts - 1) break;
            long delay = base.toMillis() * (1L << attempt) + ThreadLocalRandom.current().nextLong(100);
            log.warn("Attempt {} failed ({}), retrying in {} ms", attempt + 1, e.getMessage(), delay);
            try { Thread.sleep(delay); } catch (InterruptedException ie) { Thread.currentThread().interrupt(); break; }
        }
    }
    throw new RuntimeException("Operation failed after " + maxAttempts + " attempts", last);
}

// Usage
Response res = retry(() -> given().spec(req).get("/orders"), 3, Duration.ofMillis(500),
                     e -> e instanceof ConnectException || e.getMessage().contains("503"));
```

## How do you write a custom ExpectedCondition or a custom Playwright matcher?
@topic framework

### 60s
When built-in conditions aren't enough, I write my own. In Selenium, an ExpectedCondition is a function from WebDriver to a result that's falsy while waiting; for example, waiting until a table has at least N rows, or until an element's text matches a regex, or until a JavaScript variable is set. In Playwright I use expect.extend to add custom async matchers that retry, like toHaveCartTotal, or expect.poll for one-off polling. Custom conditions make tests read like intent and centralise tricky waiting logic in one reviewed place.

### Explain
- Selenium: return `null`/`false` to keep polling; return the value to stop. Handle `StaleElementReferenceException` inside if needed.
- Playwright: custom matchers should loop with a timeout and return `{ pass, message }`.
- Keep conditions small and well-named; add unit-ish tests for complex ones.

### Example
Waiting until the order list stops changing (stable for 1 second) before reading it, to avoid reading mid-refresh.

### Code java | Custom ExpectedCondition
```java
public static ExpectedCondition<List<WebElement>> rowsAtLeast(By table, int min) {
    return driver -> {
        List<WebElement> rows = driver.findElements(table);
        return rows.size() >= min ? rows : null;
    };
}

List<WebElement> rows = new WebDriverWait(driver, Duration.ofSeconds(10))
    .withMessage("Expected at least 5 rows")
    .until(rowsAtLeast(By.cssSelector("#orders tbody tr"), 5));
```

## How do you handle secrets, config and multiple tenants in a large framework?
@topic framework

### 60s
Configuration is layered and explicit: defaults in code, environment files per target, and overrides from environment variables or command-line flags, resolved by one config module that validates required keys at start-up. Secrets never live in files: they come from the CI secret store or a vault, injected as environment variables, and are redacted in logs and reports. For multi-tenant products, the tenant is a first-class test parameter: fixtures create or select a tenant, and the suite can run per tenant to catch isolation bugs, like one tenant seeing another's data.

### Explain
- Typed config object (`AppConfig`) built once, immutable, passed via DI/fixtures.
- Fail fast with helpful errors: "Missing API_TOKEN for env=staging".
- Tenant isolation tests are security tests: cross-tenant reads must return 403/404.
- Separate credentials per tenant and per environment.
- Document config in one README table.

### Example
Running `ENV=staging TENANT=acme npx playwright test` uses staging URLs, pulls `ACME_ADMIN_TOKEN` from secrets, and a fixture asserts data from tenant `globex` is never visible.

### Code typescript | Typed config with validation
```typescript
import { z } from 'zod';

const schema = z.object({
  ENV: z.enum(['qa', 'staging']).default('qa'),
  BASE_URL: z.string().url(),
  API_TOKEN: z.string().min(10),
  TENANT: z.string().default('default'),
});

export const config = schema.parse(process.env);   // throws a clear error if a key is missing
```

## How do you test concurrency and race conditions?
@topic strategy

### 60s
Race conditions appear when two operations touch the same data at the same time: double booking, double spending a coupon, inventory going negative. I test them deliberately by sending concurrent requests, using an executor or Promise.all, against the same resource and asserting the invariant afterwards: exactly one success, stock never below zero, totals consistent. I vary timing and repeat the test many times, since races are probabilistic. At the design level I check for idempotency keys, optimistic locking with version fields, database constraints and transactional boundaries, and I review how retries interact with these.

### Explain
Classic scenarios:
- Last item in stock bought by two users.
- Single-use coupon applied in two tabs.
- Concurrent profile updates (last write wins vs conflict).
- Payment webhook arriving twice.
- Two admins approving the same refund.

Verification: database invariants (`stock >= 0`, unique constraint), audit logs, and application responses (409 Conflict).

### Example
Twenty parallel requests to buy the last unit of a product succeeded 3 times. Root cause: read-then-write without locking. Fix: `UPDATE inventory SET stock = stock - 1 WHERE sku = ? AND stock > 0` with the affected-rows check.

### Code typescript | Concurrent purchase test in Playwright
```typescript
test('only one buyer gets the last unit', async ({ request }) => {
  await adminApi.setStock('SKU-LAST', 1);
  const attempts = Array.from({ length: 20 }, (_, i) =>
    request.post('/api/orders', { data: { sku: 'SKU-LAST', qty: 1, userId: `u${i}` } }));
  const results = await Promise.all(attempts);
  const successes = results.filter(r => r.status() === 201).length;
  expect(successes).toBe(1);
  expect(await adminApi.getStock('SKU-LAST')).toBe(0);
});
```

## How do you design tests for a third-party integration you don't control?
@topic strategy

### 60s
I separate our side from theirs. For our integration code I use contract-style tests against recorded or stubbed responses, including error and edge cases they document: timeouts, rate limits, partial failures, webhooks delivered late or twice. I run a small set of live sandbox tests on a schedule to detect when the partner changes behaviour, not on every PR, because sandboxes are slow and flaky. I verify our resilience: timeouts, retries, circuit breakers and fallbacks, and that we log enough to debug production issues. I also monitor the integration in production with synthetic checks and alerts.

### Explain
- Record real sandbox responses (WireMock recording, Playwright HAR) and version them.
- Keep a "partner change" test: live call compared against the recorded schema; alerts on drift.
- Webhook tests: signature validation, replay, out-of-order events, idempotency.
- Document sandbox credentials and limits; isolate per environment.

### Example
Payment-provider webhooks occasionally arrived before the synchronous response. A test that replays the webhook first caught an "order not found" bug that would have lost payments.

### Code java | Webhook signature and replay test
```java
@Test
void duplicateWebhookIsIgnored() {
    String payload = Fixtures.read("webhooks/payment_captured.json");
    String sig = Hmac.sha256(System.getenv("WEBHOOK_SECRET"), payload);

    given().header("X-Signature", sig).body(payload).post("/webhooks/payments").then().statusCode(200);
    given().header("X-Signature", sig).body(payload).post("/webhooks/payments").then().statusCode(200);

    assertEquals(1, orderDb.countPaymentEvents("ORD-1", "CAPTURED"));
}
```
