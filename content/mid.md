# Module: Designing your automation framework

## Explain the architecture of your automation framework.
@topic framework

### 60s
I describe it in layers. At the bottom are utilities and configuration: a config reader for environments, a driver factory, waits, logging, and test data readers. On top is the page layer, page objects and reusable components built on a BasePage. Then the test layer, TestNG or JUnit test classes extending a BaseTest that handles setup and teardown. Cross-cutting pieces are listeners for screenshots and retries, reporting with Extent or Allure, and CI integration with Jenkins or GitHub Actions running suites in parallel on Selenium Grid or a cloud provider. I always mention the design decisions and why.

### Explain
A strong answer covers:
- **Tech stack:** Java 17, Selenium 4, TestNG, Maven, REST Assured, Allure, Docker, GitHub Actions.
- **Structure:** `config/`, `drivers/`, `pages/`, `components/`, `tests/`, `data/`, `utils/`, `listeners/`.
- **Patterns:** POM, Factory (driver), Singleton (config), ThreadLocal (parallel), Builder (test data).
- **Data:** JSON files + API-created data, environment-specific config.
- **Execution:** groups (smoke, regression), parallel by methods, cross-browser via parameters.
- **Reporting:** Allure with screenshots, logs, and history trends.
- **CI:** PR runs smoke, nightly runs full regression, results posted to Slack.
- **Your contribution** and a result ("cut regression from 6 h to 45 min").

### Example
"Our hybrid framework uses Selenium for UI and REST Assured for API setup. Tests create their own users via API, so each UI test starts on the page it needs. 600 tests run in 40 minutes on 8 parallel Grid nodes in Docker."

### Code text | Folder structure
```text
src/main/java/com/acme/
  config/      Config.java, Environment.java
  driver/      DriverFactory.java, DriverManager.java (ThreadLocal)
  pages/       BasePage.java, LoginPage.java, CartPage.java
  components/  Header.java, SearchBar.java
  api/         AuthClient.java, OrderClient.java
  utils/       Waits.java, JsonData.java
src/test/java/com/acme/
  tests/       BaseTest.java, LoginTest.java, CheckoutTest.java
  listeners/   TestListener.java, RetryTransformer.java
src/test/resources/
  config/qa.properties  testdata/users.json  suites/smoke.xml
```

## What is a hybrid framework? Compare data-driven, keyword-driven and BDD frameworks.
@topic framework

### 60s
A data-driven framework separates test data from test logic, so the same test runs with many data sets from Excel, CSV or JSON. A keyword-driven framework defines actions as keywords, like click, enterText, verifyText, in a table, so non-programmers can write tests, but it's harder to maintain. BDD uses Gherkin feature files with Given-When-Then, written in business language and linked to step definitions in code, with tools like Cucumber. A hybrid framework combines these, typically Page Object Model plus data-driven plus optional BDD, to get the benefits of each.

### Explain
| Type | Strength | Weakness |
|---|---|---|
| Linear / record-playback | Quick start | Unmaintainable |
| Modular | Reuse | Needs coding |
| Data-driven | Many inputs, one test | Data management |
| Keyword-driven | Non-coders can author | Abstraction overhead, debugging |
| BDD | Shared understanding, living docs | Extra layer; useless if business doesn't read it |
| Hybrid | Pick what fits | Needs design discipline |

### Example
Our framework is POM-based, with JSON data providers for data-driven checkout tests, and a small Cucumber layer only for acceptance scenarios the product owner reviews.

### Code gherkin | BDD layer on top of page objects
```gherkin
Feature: Checkout
  Scenario Outline: Apply coupons
    Given I have a cart worth <total>
    When I apply coupon "<code>"
    Then I should pay <payable>

    Examples:
      | total | code    | payable |
      | 1000  | SAVE10  | 900     |
      | 1000  | FLAT200 | 800     |
```

## How do you run Selenium tests in parallel safely? What is ThreadLocal?
@topic framework

### 60s
Parallel execution needs every test thread to have its own WebDriver and its own data. If the driver is a static field, threads overwrite each other and close each other's browsers. ThreadLocal solves this: it gives each thread its own copy of a variable. I wrap the driver in a ThreadLocal inside a DriverManager with set, get and quit methods, and always call remove after quitting to avoid memory leaks in thread pools. Then I enable parallel methods or classes in testng.xml and make sure tests don't share accounts or data.

### Explain
Checklist for parallel-safe tests:
- ThreadLocal driver (or a new driver instance passed through fixtures).
- No static mutable state (shared lists, counters, page objects).
- Unique test data per test (unique emails, separate accounts).
- Thread-safe reporting (ExtentTest in ThreadLocal too).
- Tests don't depend on order.
- Enough Grid capacity or machine resources.

### Example
After moving to a ThreadLocal driver and per-test users created via API, a 400-test suite ran with 8 threads in 25 minutes instead of 3 hours, with no cross-test interference.

### Code java | DriverManager with ThreadLocal
```java
public final class DriverManager {
    private static final ThreadLocal<WebDriver> DRIVER = new ThreadLocal<>();

    public static void set(WebDriver driver) { DRIVER.set(driver); }
    public static WebDriver get() { return DRIVER.get(); }

    public static void quit() {
        WebDriver d = DRIVER.get();
        if (d != null) {
            d.quit();
            DRIVER.remove();   // avoid leaks in thread pools
        }
    }
}
```

## How do you build a driver factory for cross-browser and remote execution?
@topic framework

### 60s
A driver factory is a class, following the factory pattern, that creates the right WebDriver based on configuration, so tests never call new ChromeDriver directly. It reads the browser name, headless flag and execution mode, local or remote, builds the matching options, and returns either a local driver or a RemoteWebDriver pointing at Selenium Grid or a cloud provider like BrowserStack. Adding a new browser or environment then means changing one class. Combined with a ThreadLocal manager, it supports parallel cross-browser runs.

### Explain
- Input: `browser` (chrome, firefox, edge, safari), `headless`, `remote` URL, platform/version capabilities.
- Output: configured `WebDriver`.
- Keep common options (window size, timeouts, downloads) in one place.
- For cloud providers, add vendor capabilities (`bstack:options`) from environment variables.

### Example
`mvn test -Dbrowser=firefox -Dremote=http://grid:4444` runs the same suite on the Firefox nodes of our Docker Grid.

### Code java | DriverFactory
```java
public final class DriverFactory {
    public static WebDriver create(String browser) {
        boolean headless = Boolean.parseBoolean(Config.get("headless"));
        MutableCapabilities options = switch (browser.toLowerCase()) {
            case "firefox" -> { var o = new FirefoxOptions(); if (headless) o.addArguments("-headless"); yield o; }
            case "edge"    -> { var o = new EdgeOptions();    if (headless) o.addArguments("--headless=new"); yield o; }
            default        -> { var o = new ChromeOptions();  if (headless) o.addArguments("--headless=new");
                                o.addArguments("--window-size=1920,1080"); yield o; }
        };
        String remote = Config.get("remote");
        try {
            return remote != null && !remote.isBlank()
                ? new RemoteWebDriver(new URL(remote), options)
                : switch (browser.toLowerCase()) {
                    case "firefox" -> new FirefoxDriver((FirefoxOptions) options);
                    case "edge"    -> new EdgeDriver((EdgeOptions) options);
                    default        -> new ChromeDriver((ChromeOptions) options);
                };
        } catch (MalformedURLException e) {
            throw new IllegalArgumentException("Bad remote URL: " + remote, e);
        }
    }
}
```

## What is Selenium Grid 4? How do you run it with Docker?
@topic selenium

### 60s
Selenium Grid lets me run tests on multiple machines, browsers and OS combinations in parallel by sending commands to a central endpoint that routes each session to a free node. Grid 4 was redesigned with components like router, distributor, session map, session queue, event bus and nodes, and can run in standalone, hub-and-node, or fully distributed mode. It supports Docker and Kubernetes natively. With the official docker-selenium images I can start a hub and Chrome and Firefox nodes using docker compose, and point RemoteWebDriver at port 4444.

### Explain
- **Standalone:** everything in one process, good for local use.
- **Hub and node:** the classic setup.
- **Distributed:** each component separately, for large scale.
- Grid UI at `http://localhost:4444/ui` shows sessions and capacity; supports live VNC view.
- `SE_NODE_MAX_SESSIONS` controls concurrent sessions per node.
- Alternatives: cloud providers, Selenoid, Moon, Kubernetes with KEDA autoscaling.

### Example
CI spins up a Grid with docker compose, runs 6 Chrome and 2 Firefox sessions in parallel, then tears it down, so no permanent Grid servers are needed.

### Code yaml | docker-compose.yml
```yaml
services:
  selenium-hub:
    image: selenium/hub:4.25.0
    ports: ["4442:4442", "4443:4443", "4444:4444"]
  chrome:
    image: selenium/node-chrome:4.25.0
    shm_size: 2gb
    depends_on: [selenium-hub]
    environment:
      - SE_EVENT_BUS_HOST=selenium-hub
      - SE_EVENT_BUS_PUBLISH_PORT=4442
      - SE_EVENT_BUS_SUBSCRIBE_PORT=4443
      - SE_NODE_MAX_SESSIONS=4
  firefox:
    image: selenium/node-firefox:4.25.0
    shm_size: 2gb
    depends_on: [selenium-hub]
    environment:
      - SE_EVENT_BUS_HOST=selenium-hub
      - SE_EVENT_BUS_PUBLISH_PORT=4442
      - SE_EVENT_BUS_SUBSCRIBE_PORT=4443
```

## How do you implement reporting and logging in your framework?
@topic framework

### 60s
For reporting I use Allure or Extent Reports, integrated through TestNG listeners, so every test automatically gets its status, steps, duration, a screenshot on failure, and environment details, without code in each test. Allure also shows history and trends across CI runs. For logging I use Log4j2 or SLF4J with Logback, writing step-level logs to the console and to a file per run, and attaching logs to the report. Good reports let anyone, including developers and managers, understand a failure without rerunning the test.

### Explain
What a useful report contains:
- Test name, description, story/Jira ID, group/tags.
- Steps (Allure `@Step` on page methods).
- Screenshot, page source, browser console logs and network HAR on failure.
- API request/response for API tests.
- Environment, browser, build number.
- Trends: pass rate, flaky tests, duration.

Logging levels: DEBUG for detailed steps, INFO for test flow, WARN for retries, ERROR for failures.

### Example
After adding Allure with screenshots and API logs, developers stopped asking QA to reproduce CI failures; they opened the report link posted in Slack.

### Code java | Allure step + attachment
```java
public class CartPage extends BasePage {
    private static final Logger log = LogManager.getLogger(CartPage.class);

    @Step("Apply coupon {code}")
    public CartPage applyCoupon(String code) {
        log.info("Applying coupon {}", code);
        type(couponInput, code);
        click(applyBtn);
        return this;
    }
}

// In a listener on failure:
Allure.addAttachment("Screenshot", new ByteArrayInputStream(
    ((TakesScreenshot) DriverManager.get()).getScreenshotAs(OutputType.BYTES)));
```

## How do you make automated tests independent of each other?
@topic framework

### 60s
Each test should set up what it needs, run, and clean up, so it can run alone, in any order, and in parallel. I avoid dependencies between tests, like a test that relies on an order created by a previous test. Instead each test creates its own data, ideally through APIs or database seeding, which is faster than the UI, uses unique values like timestamped emails, starts with a fresh browser session, and deletes or isolates its data afterwards. Shared, read-only reference data is fine. This makes failures easier to debug and the suite parallelisable.

### Explain
Anti-patterns:
- `dependsOnMethods` chains for long flows.
- One shared test account used by all tests.
- Tests relying on data left from yesterday's run.
- Static variables carrying state between tests.

Techniques:
- Builders/factories for test data (`UserBuilder.aUser().withPremium().create()`).
- API setup in `@BeforeMethod`.
- Cleanup in `@AfterMethod(alwaysRun = true)` or rely on a disposable environment.
- Unique namespaces per run (`run-20261106-1530-…`).

### Example
"Cancel order" used to depend on "Place order". Now it creates an order through the API in its setup, opens the order page directly, and cancels it, cutting the test from 45 to 12 seconds and removing a chain of skips.

### Code java | Self-contained test
```java
@Test
public void userCanCancelPlacedOrder() {
    User user = UserApi.createUser(Users.unique());           // own data
    String orderId = OrderApi.placeOrder(user, "SKU-101", 1);

    loginViaCookie(user);
    OrderPage page = new OrderPage(driver).open(orderId).cancel();

    Assert.assertEquals(page.status(), "Cancelled");
}

@AfterMethod(alwaysRun = true)
public void cleanUp() { UserApi.deleteCreatedUsers(); }
```

## How do you choose which tests go at the UI, API and unit levels?
@topic strategy

### 60s
I follow the test pyramid. Business logic and calculations, like discount rules or validation, are best covered by fast unit tests, usually written by developers. Service behaviour, contracts, data validation, error handling and permissions go to API tests, which are fast and stable. UI tests cover only critical end-to-end user journeys and things that genuinely need the browser, like rendering, navigation and client-side behaviour. If a UI test is checking twenty combinations of a calculation, those should move down to API or unit level.

### Explain
Typical split: ~70% unit, ~20% API/integration, ~10% UI (the exact ratio depends on the system).

Questions to decide the level:
- Is the logic in the frontend or backend?
- Does it need a real browser to be meaningful?
- How often will it run, and how fast must feedback be?
- What's the cheapest level that would catch this bug?

Anti-pattern: the "ice-cream cone", mostly slow UI tests and few unit tests.

### Example
Coupon rules: 40 combinations tested via API in 20 seconds. UI tests: just two, one coupon applied and shown in the cart and one error message displayed.

### Code text | Pyramid
```text
          /\        UI / E2E   ~10%   critical journeys
         /  \
        /----\      API / integration   ~20%   contracts, rules, auth
       /      \
      /--------\    Unit   ~70%   logic, calculations
```

# Module: Playwright

## What is Playwright and how is it different from Selenium?
@topic playwright

### 60s
Playwright is a modern open-source browser automation framework from Microsoft that supports Chromium, Firefox and WebKit with one API, in TypeScript, JavaScript, Python, Java and .NET. Compared to Selenium, it auto-waits for elements to be actionable, has web-first assertions that retry, isolated browser contexts for fast parallel tests, built-in network interception and mocking, a trace viewer, codegen, and its own test runner with parallelism, retries and reports. Selenium has a bigger ecosystem, real-browser vendor drivers through the W3C standard, and wider language and legacy browser support.

### Explain
| | Playwright | Selenium |
|---|---|---|
| Protocol | CDP / browser-specific, bundled browsers | W3C WebDriver |
| Waiting | Auto-wait + retrying assertions | Manual explicit waits |
| Isolation | Browser contexts (cheap) | New driver per test |
| Network mocking | Built in (`page.route`) | Via BiDi/CDP or proxies |
| Runner | @playwright/test included | Needs TestNG/JUnit |
| Debugging | Trace viewer, UI mode, codegen | Screenshots, logs |
| Safari | WebKit build (not branded Safari) | Real Safari via safaridriver |
| Mobile | Device emulation | Appium for real devices |

### Example
A team migrated a flaky Selenium suite of 300 tests to Playwright TypeScript; auto-waiting removed most explicit waits, and run time dropped from 50 to 15 minutes thanks to contexts and sharding.

### Code typescript | First Playwright test
```typescript
import { test, expect } from '@playwright/test';

test('user can search for a product', async ({ page }) => {
  await page.goto('https://shop.example.com');
  await page.getByRole('searchbox', { name: 'Search' }).fill('laptop');
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('result-card')).toHaveCount(20);
  await expect(page).toHaveTitle(/laptop/i);
});
```

## How do locators and auto-waiting work in Playwright?
@topic playwright

### 60s
Playwright locators are lazy: they describe how to find an element and are re-evaluated every time an action or assertion runs, so they don't go stale. The recommended locators are user-facing: getByRole with an accessible name, getByLabel, getByPlaceholder, getByText and getByTestId, rather than CSS or XPath. Before every action like click or fill, Playwright auto-waits for the element to be attached, visible, stable, enabled and receiving events. Locators are strict, so if more than one element matches, the action fails, which prevents clicking the wrong thing.

### Explain
- Priority: `getByRole` → `getByLabel` → `getByPlaceholder` → `getByText` → `getByTestId` → CSS/XPath.
- Chaining and filtering: `page.getByRole('listitem').filter({ hasText: 'Blue Shirt' }).getByRole('button', { name: 'Add' })`.
- `nth()`, `first()`, `last()` when you really need position.
- Configure the test id attribute: `testIdAttribute: 'data-qa'`.
- No `sleep`; if you must wait for something non-element, use `expect.poll` or `waitForResponse`.

### Example
Add the "Blue Shirt" to the cart from a product grid without relying on position or generated classes.

### Code typescript | Resilient locators
```typescript
const card = page.getByTestId('product-card').filter({ hasText: 'Blue Shirt' });
await card.getByRole('button', { name: 'Add to cart' }).click();

await page.getByLabel('Email').fill('qa@x.com');
await page.getByRole('button', { name: 'Sign in' }).click();
await expect(page.getByRole('alert')).toHaveText('Invalid email or password');
```

## What are web-first assertions in Playwright?
@topic playwright

### 60s
Web-first assertions are the async expect matchers that work on locators and the page, like toBeVisible, toHaveText, toHaveCount, toHaveValue, toHaveURL and toHaveTitle. They automatically retry until the condition is met or the timeout expires, five seconds by default. That makes them reliable for dynamic UIs, unlike reading a value once and comparing it, which is a common source of flakiness. There are also soft assertions with expect.soft, negations with not, and expect.poll or toPass for retrying custom checks like an API value.

### Explain
- Good: `await expect(locator).toHaveText('Paid')` → retries.
- Bad: `expect(await locator.textContent()).toBe('Paid')` → one-shot, flaky.
- `expect.soft(...)` continues after failure; the test still fails at the end.
- `expect.configure({ timeout: 10_000 })` per assertion group.
- `toHaveScreenshot()` for visual comparisons.

### Example
After clicking "Pay", the status badge changes from "Processing" to "Paid" within 3 seconds; a web-first assertion simply waits for it.

### Code typescript | Assertions
```typescript
await page.getByRole('button', { name: 'Pay' }).click();
await expect(page.getByTestId('order-status')).toHaveText('Paid', { timeout: 10_000 });
await expect(page).toHaveURL(/\/orders\/ORD-\d+/);

await expect.soft(page.getByTestId('total')).toHaveText('₹998.00');
await expect.soft(page.getByTestId('items')).toHaveCount(2);

await expect.poll(async () => (await api.getOrder(id)).status, { timeout: 15_000 }).toBe('PAID');
```

## What are fixtures in Playwright? How do you create custom fixtures?
@topic playwright

### 60s
Fixtures are Playwright Test's way of providing setup and teardown to tests. Built-in fixtures like page, context, browser and request are created for each test and cleaned up automatically. I can extend the base test with custom fixtures, for example a loggedInPage, page objects, an API client or test data, using test.extend. The code before the use call is setup, the code after is teardown. Fixtures are lazy, only created when a test asks for them, composable, and can be scoped per test or per worker.

### Explain
- Test-scoped (default) vs worker-scoped (`{ scope: 'worker' }`) for expensive things like a DB connection.
- `auto: true` fixtures run for every test, like a log collector.
- Fixtures replace beforeEach/afterEach hooks and make dependencies explicit in the test signature.
- Page objects as fixtures keep tests short.

### Example
A `cartPage` fixture creates a user via API, logs in with storage state, and opens the cart; after the test it deletes the user.

### Code typescript | Custom fixtures
```typescript
import { test as base, expect } from '@playwright/test';
import { LoginPage } from './pages/login-page';
import { ApiClient } from './api/client';

type Fixtures = { loginPage: LoginPage; api: ApiClient; user: { email: string; password: string } };

export const test = base.extend<Fixtures>({
  api: async ({ request }, use) => { await use(new ApiClient(request)); },
  user: async ({ api }, use) => {
    const user = await api.createUser();     // setup
    await use(user);
    await api.deleteUser(user.email);        // teardown
  },
  loginPage: async ({ page }, use) => { await use(new LoginPage(page)); },
});

test('user can log in', async ({ loginPage, user, page }) => {
  await loginPage.login(user.email, user.password);
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
});
```

## How do you handle authentication once and reuse it in Playwright?
@topic playwright

### 60s
Logging in through the UI in every test is slow. Playwright lets me log in once in a setup project, then save the browser state, cookies and local storage, to a JSON file with context.storageState. In the config, the test projects depend on the setup project and use that file as their storageState, so every test starts already authenticated in its own isolated context. For multiple roles I save one state file per role, like admin and customer. I keep these files out of git because they contain session tokens.

### Explain
- Setup project: `testMatch: /auth\.setup\.ts/`.
- `dependencies: ['setup']` on browser projects.
- `test.use({ storageState: 'playwright/.auth/admin.json' })` per file for another role.
- Or log in via API (`request.post('/login')`) and save `request.storageState()`, which is faster still.
- Tests that modify account state should use their own users.

### Example
120 tests each spent 4 seconds logging in. With storage state, the suite dropped 8 minutes.

### Code typescript | auth.setup.ts and config
```typescript
// tests/auth.setup.ts
import { test as setup, expect } from '@playwright/test';
const file = 'playwright/.auth/customer.json';

setup('authenticate as customer', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill(process.env.CUSTOMER_EMAIL!);
  await page.getByLabel('Password').fill(process.env.CUSTOMER_PASSWORD!);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  await page.context().storageState({ path: file });
});

// playwright.config.ts (projects)
projects: [
  { name: 'setup', testMatch: /.*\.setup\.ts/ },
  { name: 'chromium', use: { ...devices['Desktop Chrome'], storageState: 'playwright/.auth/customer.json' },
    dependencies: ['setup'] },
],
```

## How do you mock or intercept network requests in Playwright?
@topic playwright

### 60s
I use page.route with a URL pattern to intercept requests. Inside the handler I can fulfill the request with a fake response, like a fixed JSON body or a 500 error, continue it with modified headers or body, or abort it to simulate network failure. This lets me test UI states that are hard to reproduce, such as empty lists, server errors, slow responses or specific edge-case data, without changing the backend. I can also wait for and assert on real responses with waitForResponse, and record and replay traffic from a HAR file.

### Explain
- `route.fulfill({ status, json, headers })`
- `route.continue({ headers, postData })`
- `route.abort('failed')` or `'internetdisconnected'`
- `route.fetch()` to call the real server and then modify the response.
- `page.routeFromHAR('file.har', { update: false })` for replay.
- Use mocking for UI-state tests; keep some true end-to-end tests unmocked.

### Example
Verify the order history page shows "You have no orders yet" and a "Start shopping" button when the API returns an empty array, and a friendly error banner when it returns 500.

### Code typescript | Mocking responses
```typescript
test('shows empty state', async ({ page }) => {
  await page.route('**/api/orders*', route => route.fulfill({ status: 200, json: [] }));
  await page.goto('/orders');
  await expect(page.getByText('You have no orders yet')).toBeVisible();
});

test('shows error banner on 500', async ({ page }) => {
  await page.route('**/api/orders*', route => route.fulfill({ status: 500, json: { message: 'boom' } }));
  await page.goto('/orders');
  await expect(page.getByRole('alert')).toContainText('Something went wrong');
});

test('modifies a real response', async ({ page }) => {
  await page.route('**/api/products/101', async route => {
    const res = await route.fetch();
    const json = await res.json();
    await route.fulfill({ response: res, json: { ...json, stock: 0 } });
  });
  await page.goto('/products/101');
  await expect(page.getByText('Out of stock')).toBeVisible();
});
```

## How do you configure parallel runs, retries, projects and sharding in Playwright?
@topic playwright

### 60s
It's all in playwright.config.ts. Tests run in parallel across worker processes by default, file by file; fullyParallel true runs tests within a file in parallel too, and workers sets how many. retries sets automatic retries, usually two on CI and zero locally, and Playwright marks tests that passed on retry as flaky. Projects let me run the same tests on Chromium, Firefox, WebKit and mobile device emulation, or with different settings. For large suites on CI, sharding splits tests across machines with the shard option, and I merge the blob reports afterwards.

### Explain
- `workers: process.env.CI ? 4 : undefined`
- `test.describe.configure({ mode: 'serial' })` for the rare dependent tests.
- `--shard=1/4` on each CI machine; `reporter: 'blob'`, then `npx playwright merge-reports`.
- `use: { trace: 'on-first-retry', screenshot: 'only-on-failure', video: 'retain-on-failure' }`.
- `forbidOnly: !!process.env.CI` prevents committed `test.only`.

### Example
900 tests split across 4 GitHub Actions machines with 4 workers each finish in 9 minutes; the merged HTML report is published as an artifact.

### Code typescript | playwright.config.ts
```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 4 : undefined,
  reporter: process.env.CI ? [['blob'], ['github']] : [['html']],
  use: {
    baseURL: process.env.BASE_URL ?? 'https://qa.shop.example.com',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox',  use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit',   use: { ...devices['Desktop Safari'] } },
    { name: 'mobile',   use: { ...devices['Pixel 7'] } },
  ],
});
// CI: npx playwright test --shard=${{ matrix.shard }}/4
```

## How do you debug a failing Playwright test? What is the Trace Viewer?
@topic playwright

### 60s
Locally I use UI mode with npx playwright test --ui, or debug mode with --debug, which opens the inspector so I can step through actions and try locators. For CI failures, the Trace Viewer is the key tool: with trace set to on-first-retry, Playwright records a trace zip with every action, DOM snapshots before and after, screenshots, console logs, network requests and source lines. I open it with npx playwright show-trace or at trace.playwright.dev and see exactly what the page looked like when the test failed.

### Explain
Debugging toolbox:
- `--ui` (watch mode, time-travel), `--debug`, `page.pause()`.
- `PWDEBUG=1` to open the inspector.
- `npx playwright codegen <url>` to generate locators.
- VS Code extension: run/debug tests, pick locators.
- Traces, videos, screenshots in the HTML report.
- `DEBUG=pw:api` for verbose logs.

### Example
A test failed only on CI with "element not visible". The trace showed a cookie banner covering the button in the CI region; the fix was accepting cookies in a setup fixture.

### Code bash | Debug commands
```bash
npx playwright test checkout.spec.ts --ui
npx playwright test checkout.spec.ts --debug
npx playwright test --trace on
npx playwright show-trace test-results/checkout-chromium/trace.zip
npx playwright codegen https://qa.shop.example.com
```

## How do you handle iframes, new tabs and dialogs in Playwright?
@topic playwright

### 60s
For iframes, I use page.frameLocator with the iframe selector, or locator.contentFrame, and then use normal locators inside it; there's no switching like in Selenium. For new tabs or popups, I start waiting for the popup event before clicking, using Promise.all or by creating the waitForEvent promise first, then work with the new page object. For JavaScript dialogs like alert or confirm, I register a page.on dialog handler before the action and call dialog.accept or dismiss, because by default Playwright auto-dismisses dialogs.

### Explain
- Frames: `page.frameLocator('#payment').getByLabel('Card number')`.
- Popups: `const popupPromise = page.waitForEvent('popup'); await click; const popup = await popupPromise;`.
- New tab in the same context: `context.waitForEvent('page')`.
- Dialogs: `page.once('dialog', d => d.accept())`; read `d.message()`.
- Downloads: `page.waitForEvent('download')`, then `download.saveAs(path)`.

### Example
Pay via a card iframe, then confirm the "Leave page?" dialog, and verify the receipt opens in a new tab.

### Code typescript | Frames, popups, dialogs
```typescript
const card = page.frameLocator('iframe[title="Secure card payment"]');
await card.getByLabel('Card number').fill('4111111111111111');

page.once('dialog', async dialog => {
  expect(dialog.message()).toContain('Are you sure');
  await dialog.accept();
});
await page.getByRole('button', { name: 'Cancel order' }).click();

const popupPromise = page.waitForEvent('popup');
await page.getByRole('link', { name: 'View receipt' }).click();
const receipt = await popupPromise;
await expect(receipt).toHaveURL(/receipt/);
```

## Can you do API testing in Playwright?
@topic playwright

### 60s
Yes. Playwright has a built-in APIRequestContext, available as the request fixture, to send HTTP requests: get, post, put, patch, delete, with headers, params and JSON bodies, and then assert the status and response JSON with expect. It shares the base URL and auth config with UI tests, and can share cookies with a browser context. I use it for pure API tests, and more often to set up test data quickly before a UI test, or to verify backend state after a UI action. It's not a replacement for a full API framework in every case, but it's great for hybrid tests.

### Explain
- `request.newContext({ baseURL, extraHTTPHeaders })` for a dedicated client.
- `expect(response).toBeOK()` checks 2xx.
- `page.request` shares cookies with the page's context.
- Use for setup/teardown in fixtures.
- For heavy API suites with schema validation and contract tests, REST Assured or a dedicated stack may still fit better, but Playwright + `ajv` works well too.

### Example
Create a product via API, open its page in the UI, and verify the price shown matches what was created.

### Code typescript | API + UI in one test
```typescript
test('product page shows API price', async ({ request, page }) => {
  const res = await request.post('/api/products', {
    data: { name: 'Test Mug', price: 349 },
    headers: { Authorization: `Bearer ${process.env.ADMIN_TOKEN}` },
  });
  await expect(res).toBeOK();
  const { id } = await res.json();

  await page.goto(`/products/${id}`);
  await expect(page.getByTestId('price')).toHaveText('₹349');

  await request.delete(`/api/products/${id}`, {
    headers: { Authorization: `Bearer ${process.env.ADMIN_TOKEN}` },
  });
});
```

## How do you implement the Page Object Model in Playwright with TypeScript?
@topic playwright

### 60s
I create a class per page or component that takes the Playwright Page in its constructor and defines readonly Locator properties, using getByRole or getByTestId. Methods represent user actions, like login or addToCart, and are async. Because locators are lazy, I can define them once in the constructor safely. Assertions mostly stay in tests using expect, though a page can expose locators for tests to assert on. I then provide page objects through custom fixtures, so tests receive them ready to use without new in every test.

### Explain
- `readonly emailInput: Locator` in constructor.
- Methods return `Promise<void>` or the next page object.
- Components (header, modal) as their own classes composed into pages.
- Avoid huge "god" pages; keep classes focused.
- Fixtures inject page objects: `async ({ loginPage }) => ...`.

### Example
`CartPage` exposes `items`, `total`, `applyCoupon(code)` and `checkout()`; tests assert `await expect(cart.total).toHaveText('₹900')`.

### Code typescript | Page object
```typescript
import { type Page, type Locator, expect } from '@playwright/test';

export class CartPage {
  readonly items: Locator;
  readonly total: Locator;
  private readonly couponInput: Locator;
  private readonly applyButton: Locator;

  constructor(private readonly page: Page) {
    this.items = page.getByTestId('cart-item');
    this.total = page.getByTestId('cart-total');
    this.couponInput = page.getByPlaceholder('Coupon code');
    this.applyButton = page.getByRole('button', { name: 'Apply' });
  }

  async open() { await this.page.goto('/cart'); }

  async applyCoupon(code: string) {
    await this.couponInput.fill(code);
    await this.applyButton.click();
  }
}

// In a test
await cart.applyCoupon('SAVE10');
await expect(cart.total).toHaveText('₹900');
```

# Module: API automation with REST Assured

## What is REST Assured? Explain given(), when() and then().
@topic api

### 60s
REST Assured is a Java library for testing REST APIs with a fluent, BDD-style syntax. given() sets up the request: base URI, headers, auth, path and query parameters, and the body. when() performs the HTTP call, like get, post, put or delete, on an endpoint. then() validates the response: status code, headers, response time and body values using Hamcrest matchers and GPath expressions. I can also extract values from the response to use in later requests. It integrates with TestNG or JUnit, and with Allure for request and response logging.

### Explain
- Body assertions: `body("data.items.size()", equalTo(3))`, `body("items.price", everyItem(greaterThan(0f)))`.
- Extraction: `.extract().path("id")` or `.extract().as(Order.class)`.
- Logging: `.log().ifValidationFails()`.
- Serialization with Jackson/Gson: pass a POJO to `body()`.
- Filters: `AllureRestAssured`, custom auth or logging filters.

### Example
Create a booking, extract its ID, fetch it, and verify the guest name matches.

### Code java | Basic REST Assured test
```java
import static io.restassured.RestAssured.*;
import static org.hamcrest.Matchers.*;

@Test
public void createAndFetchBooking() {
    int id =
        given().baseUri("https://api.hotel.example.com")
               .contentType("application/json")
               .body("{\"guest\":\"Asha\",\"nights\":2}")
        .when().post("/bookings")
        .then().statusCode(201)
               .body("guest", equalTo("Asha"))
               .extract().path("id");

    given().baseUri("https://api.hotel.example.com")
    .when().get("/bookings/{id}", id)
    .then().statusCode(200)
           .body("nights", equalTo(2))
           .time(lessThan(1500L));
}
```

## How do you use RequestSpecification and ResponseSpecification?
@topic api

### 60s
RequestSpecification and ResponseSpecification let me define common request settings and common response checks once and reuse them across tests, which removes duplication. I build them with RequestSpecBuilder, setting base URI, base path, content type, auth headers, filters and logging, and with ResponseSpecBuilder, for example expecting JSON content type and a response time under two seconds. Tests then call given().spec(requestSpec) and then().spec(responseSpec). I usually put them in a base API class or client so every API test gets the same setup.

### Explain
- Set globally with `RestAssured.requestSpecification = ...` (careful with parallel runs) or pass per test with `spec()`.
- Combine with per-test overrides: `given().spec(reqSpec).queryParam("page", 2)`.
- Build API client classes (`OrderClient.create(order)`) on top of specs so tests read like business steps.

### Example
Every request to the orders service needs a bearer token, JSON content type, a correlation ID header and Allure logging. A shared spec makes that one line per test.

### Code java | Specs
```java
public abstract class ApiBase {
    protected static RequestSpecification req = new RequestSpecBuilder()
        .setBaseUri(Config.get("api.baseUrl"))
        .setBasePath("/v1")
        .setContentType(ContentType.JSON)
        .addHeader("Authorization", "Bearer " + TokenProvider.get())
        .addHeader("X-Correlation-Id", UUID.randomUUID().toString())
        .addFilter(new AllureRestAssured())
        .log(LogDetail.URI)
        .build();

    protected static ResponseSpecification okJson = new ResponseSpecBuilder()
        .expectContentType(ContentType.JSON)
        .expectResponseTime(lessThan(2000L))
        .build();
}

given().spec(req).when().get("/orders/{id}", id)
.then().spec(okJson).statusCode(200);
```

## How do you serialize and deserialize JSON with POJOs in API tests?
@topic api

### 60s
Serialization converts a Java object into JSON for the request body; deserialization converts the JSON response into a Java object. With REST Assured and Jackson on the classpath, I just pass a POJO or record to body, and it's serialised automatically; and I call extract().as(MyClass.class) to deserialise the response. This gives type safety and readable tests: I assert on order.getTotal() instead of string paths. I use the builder pattern or Lombok to create request objects, and ignore unknown properties so new API fields don't break tests.

### Explain
- `@JsonIgnoreProperties(ignoreUnknown = true)` for forward compatibility.
- `@JsonProperty("first_name")` to map snake_case.
- `TypeRef<List<Order>>` for lists.
- Lombok `@Data @Builder` or Java records reduce boilerplate.
- Deserialisation fails loudly if a type changes, which is a useful contract check.

### Example
Create an order from an `OrderRequest` built with defaults plus overrides, and assert on the typed `OrderResponse`.

### Code java | POJOs with records
```java
@JsonIgnoreProperties(ignoreUnknown = true)
record OrderResponse(String id, String status, BigDecimal total, List<Item> items) {}
record Item(String sku, int qty) {}
record OrderRequest(String customerId, List<Item> items, String coupon) {}

OrderRequest body = new OrderRequest("C-42", List.of(new Item("SKU-101", 2)), "SAVE10");

OrderResponse order = given().spec(req).body(body)
    .when().post("/orders")
    .then().statusCode(201)
    .extract().as(OrderResponse.class);

assertEquals(order.status(), "PLACED");
assertEquals(order.items().get(0).qty(), 2);
```

## How do you extract values with JsonPath and validate a JSON schema?
@topic api

### 60s
REST Assured uses GPath, a Groovy-based JsonPath syntax, to navigate JSON: I can read nested fields like data.user.email, array items like items[0].price, sizes, and use find and findAll with conditions, like items.find it.sku equals ABC. I extract with extract().path or a JsonPath object. For schema validation, I add the json-schema-validator module and assert matchesJsonSchemaInClasspath with a schema file, which checks required fields, types and formats in one go. Schema checks catch contract changes, like a number becoming a string.

### Explain
GPath examples:
- `items.size()`
- `items.findAll { it.price > 500 }.name`
- `items.find { it.sku == 'SKU-101' }.qty`
- `items.price.sum()`
- `items.collect { it.qty * it.price }.sum()`

Schema tips:
- Generate a starting schema from a sample response, then tighten it (required, enums, formats).
- Set `additionalProperties: false` only if you want to catch unexpected fields.
- Keep schemas versioned with the tests.

### Example
Verify that every item in the cart response has `sku`, `qty` ≥ 1 and numeric `price`, and that the total equals the sum of qty × price.

### Code java | GPath and schema
```java
Response res = given().spec(req).when().get("/carts/{id}", cartId);

res.then().statusCode(200)
   .body(matchesJsonSchemaInClasspath("schemas/cart.json"))
   .body("items.findAll { it.qty < 1 }", empty());

JsonPath json = res.jsonPath();
float expected = json.getFloat("items.collect { it.qty * it.price }.sum()");
assertEquals(json.getFloat("total"), expected, 0.01);
```

## How do you chain API requests and test an end-to-end API flow?
@topic api

### 60s
I extract values from one response, like an auth token, a created ID or a status link, store them in variables, and pass them into the next request. A typical flow is: authenticate and get a token, create a resource, read it back and verify the data, update it, verify the change, delete it, and confirm a GET now returns 404. I wrap each call in a client method so the test reads as business steps, and I clean up in a finally block or after-method so failed tests don't leave data behind.

### Explain
- Prefer independent tests for single behaviours; use chained flows for end-to-end scenarios that genuinely need the sequence.
- Use unique data (UUID in names) so parallel runs don't collide.
- For async processing (e.g., order status changes after a queue), poll with Awaitility instead of sleeping.

### Example
Order lifecycle: create cart → add item → place order → pay → poll until status is CONFIRMED → cancel → verify refund initiated.

### Code java | Chained flow with Awaitility
```java
String token   = AuthClient.login("qa@x.com", System.getenv("QA_PASS"));
String cartId  = CartClient.create(token);
CartClient.addItem(token, cartId, "SKU-101", 1);
String orderId = OrderClient.place(token, cartId);
PaymentClient.payWithTestCard(token, orderId);

await().atMost(Duration.ofSeconds(30)).pollInterval(Duration.ofSeconds(2))
       .until(() -> OrderClient.get(token, orderId).status(), equalTo("CONFIRMED"));

OrderClient.cancel(token, orderId);
assertEquals(OrderClient.get(token, orderId).refundStatus(), "INITIATED");
```

## What is BDD? How do you use Cucumber with step definitions and hooks?
@topic framework

### 60s
BDD, Behaviour-Driven Development, is a collaboration practice where business, developers and testers agree on behaviour using concrete examples written in Gherkin: Feature, Scenario, Given, When, Then. Cucumber executes these feature files by matching each step to a step definition method, using Cucumber expressions or regex. Hooks like Before and After run setup and teardown around scenarios, for example starting the browser and taking a screenshot on failure. A runner class configures features, glue packages, tags and plugins. BDD is valuable only if the business actually reads the scenarios.

### Explain
- **Scenario Outline + Examples** for data-driven scenarios.
- **Background** for common steps in a feature.
- **Tags** (`@smoke`, `@wip`) to select scenarios.
- **Dependency injection** (PicoContainer, Spring) to share state between step classes.
- Keep steps declarative ("When I check out with UPI") rather than imperative ("When I click the button with id pay").
- Step definitions call page objects or API clients, not raw Selenium.

### Example
The product owner reviews scenarios for a new loyalty-points feature during refinement; the same scenarios become automated acceptance tests.

### Code java | Steps, hooks and runner
```java
public class CheckoutSteps {
    private final TestContext ctx;
    public CheckoutSteps(TestContext ctx) { this.ctx = ctx; }

    @Given("I have a cart worth {int}")
    public void cartWorth(int total) { ctx.cart = CartFactory.withTotal(total); }

    @When("I apply coupon {string}")
    public void applyCoupon(String code) { ctx.cartPage().applyCoupon(code); }

    @Then("I should pay {int}")
    public void shouldPay(int payable) { assertEquals(ctx.cartPage().payable(), payable); }
}

public class Hooks {
    @Before public void start(Scenario s) { DriverManager.set(DriverFactory.create("chrome")); }
    @After  public void stop(Scenario s) {
        if (s.isFailed()) s.attach(((TakesScreenshot) DriverManager.get())
            .getScreenshotAs(OutputType.BYTES), "image/png", "failure");
        DriverManager.quit();
    }
}

@CucumberOptions(features = "src/test/resources/features", glue = "steps",
                 tags = "@smoke and not @wip", plugin = {"pretty", "io.qameta.allure.cucumber7jvm.AllureCucumber7Jvm"})
public class RunCucumberTest extends AbstractTestNGCucumberTests {}
```

## What is service virtualization? How do you use WireMock?
@topic api

### 60s
Service virtualization means replacing a real dependency, like a payment gateway, a third-party API or another team's microservice, with a simulated version that returns controlled responses. It lets me test when the dependency is unavailable, costly, rate-limited, or hard to put into specific states like timeouts or rare errors. WireMock is a popular tool: I define stubs that match a request by method, URL, headers or body and return a configured response, optionally with delays or faults. I can also verify that my service called the dependency correctly.

### Explain
- Stubs vs mocks: a stub returns canned data; a mock also verifies interactions.
- WireMock runs embedded in tests (JUnit extension), standalone, or in Docker.
- Features: request matching, response templating, delays (`withFixedDelay`), faults (`CONNECTION_RESET_BY_PEER`), stateful scenarios, record and playback.
- Alternatives: MockServer, Mountebank, Hoverfly, Prism (from OpenAPI).

### Example
Testing the order service: WireMock simulates the payment gateway returning success, decline, a 504 timeout after 10 seconds, and a malformed response, to confirm the order service handles each correctly.

### Code java | WireMock stubs
```java
@RegisterExtension
static WireMockExtension gateway = WireMockExtension.newInstance()
    .options(wireMockConfig().dynamicPort()).build();

@Test
void orderFailsGracefullyWhenGatewayTimesOut() {
    gateway.stubFor(post(urlEqualTo("/v1/charges"))
        .willReturn(aResponse().withStatus(504).withFixedDelay(5000)));

    Order order = orderService.placeOrder(cartWithTotal(999));

    assertEquals("PAYMENT_PENDING", order.status());
    gateway.verify(1, postRequestedFor(urlEqualTo("/v1/charges"))
        .withRequestBody(matchingJsonPath("$.amount", equalTo("99900"))));
}
```

# Module: CI/CD for testers

## What is CI/CD and what is the role of QA in it?
@topic cicd

### 60s
Continuous Integration means developers merge code to the main branch frequently, and every change automatically triggers a build and tests, so problems are found within minutes. Continuous Delivery means every change that passes the pipeline is ready to release with a button press; Continuous Deployment goes further and releases it automatically. QA's role is to design the automated test stages and quality gates in the pipeline, like unit, API, smoke and regression tests, keep them fast and reliable, make results visible, and decide what must pass before code moves forward.

### Explain
Typical pipeline: commit → build → unit tests + static analysis → deploy to test env → API tests → UI smoke → (nightly) full regression → deploy to staging → performance/security checks → production with canary + monitoring.

QA responsibilities:
- Fast feedback on PRs (under 10–15 minutes).
- Stable, non-flaky tests (a flaky gate gets ignored).
- Clear reports and notifications.
- Test environments and data in the pipeline.
- Quality gates (coverage, critical tests, no high-severity vulnerabilities).

### Example
Every pull request runs unit tests and 40 API smoke tests in 6 minutes. After merge, the app deploys to QA and 150 UI regression tests run in parallel. The release job is blocked if any P1 test fails.

### Code yaml | Pipeline stages (conceptual)
```yaml
stages:
  - build          # compile, unit tests, lint
  - deploy-qa      # deploy to QA environment
  - api-tests      # REST Assured / Playwright API
  - ui-smoke       # critical journeys
  - regression     # nightly or pre-release
  - deploy-prod    # with approval / canary
```

## Write a GitHub Actions workflow to run automated tests.
@topic cicd

### 60s
A GitHub Actions workflow is a YAML file in .github/workflows. I define triggers with on, like pull_request, push to main, a nightly schedule and workflow_dispatch for manual runs. A job runs on ubuntu-latest and has steps: check out the code, set up Java or Node with dependency caching, install browsers if needed, run the tests with environment variables and secrets, and always upload the reports as artifacts, even when tests fail. A matrix lets me run browsers or shards in parallel.

### Explain
- `secrets.X` for passwords and tokens; never hard-code.
- `if: always()` on the upload step so reports exist for failed runs.
- `concurrency` to cancel outdated runs on the same branch.
- `timeout-minutes` so hung jobs don't burn minutes.
- Required status checks in branch protection make it a real gate.

### Example
PRs run the smoke suite; a nightly schedule runs full regression across Chromium and Firefox and posts the report link.

### Code yaml | .github/workflows/tests.yml
```yaml
name: UI tests
on:
  pull_request:
  schedule: [{ cron: "30 20 * * *" }]   # nightly 02:00 IST
  workflow_dispatch:

concurrency: { group: tests-${{ github.ref }}, cancel-in-progress: true }

jobs:
  playwright:
    runs-on: ubuntu-latest
    timeout-minutes: 30
    strategy:
      fail-fast: false
      matrix: { shard: [1, 2, 3, 4] }
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm }
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npx playwright test --shard=${{ matrix.shard }}/4
        env:
          BASE_URL: ${{ vars.QA_BASE_URL }}
          CUSTOMER_PASSWORD: ${{ secrets.CUSTOMER_PASSWORD }}
      - uses: actions/upload-artifact@v4
        if: always()
        with: { name: report-${{ matrix.shard }}, path: blob-report, retention-days: 7 }
```

## Write a Jenkins pipeline (Jenkinsfile) for a test suite.
@topic cicd

### 60s
A declarative Jenkinsfile starts with pipeline, an agent, and options like a timeout. I add parameters so people can choose the environment, browser and suite. Stages typically are Checkout, Build, Test, where I run mvn test with those parameters and credentials injected using withCredentials, and Report. In the post section, always, I publish JUnit results and the Allure or HTML report and archive screenshots; on failure I notify Slack or email. Triggers can be SCM changes, a cron schedule or an upstream deployment job.

### Explain
- Declarative vs scripted pipelines: declarative is simpler and standard now.
- `parallel` stages for browsers or suites.
- `credentials()` / `withCredentials` for secrets; masked in logs.
- `junit` step marks the build UNSTABLE on test failures; decide if that should fail the build.
- Use Docker agents for reproducible environments.

### Example
A deploy job for QA triggers the regression pipeline downstream with `ENV=qa`; results appear in Allure with trend graphs.

### Code groovy | Jenkinsfile
```groovy
pipeline {
  agent { docker { image 'maven:3.9-eclipse-temurin-17' } }
  options { timeout(time: 60, unit: 'MINUTES'); timestamps() }
  parameters {
    choice(name: 'ENV', choices: ['qa', 'staging'], description: 'Target environment')
    choice(name: 'SUITE', choices: ['smoke', 'regression'], description: 'Suite')
    choice(name: 'BROWSER', choices: ['chrome', 'firefox'], description: 'Browser')
  }
  triggers { cron('H 21 * * 1-5') }
  stages {
    stage('Test') {
      steps {
        withCredentials([string(credentialsId: 'qa-user-password', variable: 'QA_PASS')]) {
          sh "mvn -B clean test -Denv=${params.ENV} -Dbrowser=${params.BROWSER} -DsuiteXmlFile=suites/${params.SUITE}.xml -Dheadless=true"
        }
      }
    }
  }
  post {
    always {
      junit 'target/surefire-reports/*.xml'
      allure results: [[path: 'target/allure-results']]
      archiveArtifacts artifacts: 'screenshots/**', allowEmptyArchive: true
    }
    failure { slackSend channel: '#qa-alerts', message: "Tests failed: ${env.BUILD_URL}" }
  }
}
```

## How do you run tests inside Docker? Why would you?
@topic cicd

### 60s
Running tests in Docker gives a consistent, reproducible environment: the same Java or Node version, browsers and dependencies on every laptop and CI agent, which removes "works on my machine" problems. I write a Dockerfile based on an official image, like the Playwright image with browsers preinstalled, or Maven plus Selenium nodes, copy the project, install dependencies, and run the tests as the default command. With docker compose I can start the app, its database and a Selenium Grid together, run tests against them, and tear everything down.

### Explain
- Use pinned image tags for reproducibility.
- Mount a volume for reports: `-v $PWD/reports:/app/playwright-report`.
- Use `--ipc=host` or `shm_size` for Chrome stability.
- Layer caching: copy dependency files first, install, then copy source.
- Compose `depends_on` with health checks so tests start when the app is ready.

### Example
New joiners run the whole suite with `docker compose up --abort-on-container-exit` without installing Java, browsers or drivers.

### Code bash | Dockerfile and run
```bash
# Dockerfile
FROM mcr.microsoft.com/playwright:v1.48.2-jammy
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
CMD ["npx", "playwright", "test"]

# Build and run, keeping the report on the host
docker build -t ui-tests .
docker run --rm --ipc=host -e BASE_URL=https://qa.shop.example.com \
  -v "$PWD/playwright-report:/app/playwright-report" ui-tests
```

## What are quality gates? When should the pipeline fail?
@topic cicd

### 60s
Quality gates are automated checks in the pipeline that code must pass before moving to the next stage or being released. Examples are: all unit tests pass, code coverage doesn't drop below a threshold, no new critical issues in static analysis like SonarQube, no high-severity vulnerabilities in dependency scans, critical API and smoke tests pass, and performance stays within budget. The pipeline should fail on anything that signals real risk to users. But gates must be reliable: a flaky gate that fails randomly trains people to ignore or bypass it.

### Explain
Gate design:
- **Hard gates:** block merge/release (failing smoke, critical vulns, compile errors).
- **Soft gates:** warn but don't block (minor coverage drop, low-priority lint).
- Quarantine flaky tests out of the gate, fix them, then bring them back.
- Make reasons visible: the PR should say exactly which gate failed and why.
- Review thresholds regularly with the team.

### Example
SonarQube quality gate: new code coverage ≥ 80%, zero new blocker/critical issues, duplication < 3%. The release pipeline additionally requires 100% pass on P1 tests and a k6 check that p95 latency stays under 500 ms.

### Code yaml | Gate in GitHub Actions
```yaml
- name: Run smoke tests (gate)
  run: mvn -B test -Dgroups=smoke

- name: SonarQube quality gate
  uses: sonarsource/sonarqube-quality-gate-action@v1
  timeout-minutes: 5
  env: { SONAR_TOKEN: ${{ secrets.SONAR_TOKEN }} }

- name: Dependency vulnerability scan
  run: npm audit --audit-level=high
```

## How do you speed up a slow automation suite?
@topic framework

### 60s
First I measure, to find which tests and steps are slow. Then: run tests in parallel with enough workers or Grid nodes and shard across CI machines; move setup like login and test data creation from the UI to APIs or storage state; replace sleeps with proper waits; push checks that don't need a browser down to API or unit level; remove duplicate and low-value tests; run headless; reuse browser contexts instead of new browsers where safe; and split suites so PRs run a fast smoke subset while full regression runs nightly.

### Explain
Common time sinks:
- UI login in every test (seconds × hundreds of tests).
- `Thread.sleep` and long implicit waits.
- Sequential execution.
- Navigating through many pages to reach the page under test.
- Heavy test data creation through forms.
- Overlapping tests covering the same thing.

Track suite duration as a metric and set a budget (e.g., PR suite < 10 minutes).

### Example
A 3-hour regression went to 28 minutes: parallel (8 workers) took it to 40 minutes, API-based setup and cookie login to 30, and deleting 60 redundant UI tests already covered by API tests to 28.

### Code typescript | API setup instead of UI clicks
```typescript
test.beforeEach(async ({ request, page }) => {
  // Before: 6 UI steps to create a cart (~12 s)
  // After: one API call (~200 ms) and direct navigation
  const res = await request.post('/api/carts', { data: { items: [{ sku: 'SKU-101', qty: 2 }] } });
  const { id } = await res.json();
  await page.goto(`/cart/${id}`);
});
```

# Module: Flaky tests and reliability

## What causes flaky tests and how do you fix them?
@topic framework

### 60s
A flaky test passes and fails on the same code without any change. The common causes are: timing issues, like missing waits or fixed sleeps around async UI updates; test interdependence and shared data, for example two tests using the same account; unstable environments or third-party services; non-deterministic data like dates, time zones, random values or ordering; animations and overlays; and resource limits in parallel runs. I fix them by finding the root cause from traces and logs, using proper waits, isolating data, mocking unstable dependencies, and quarantining a flaky test until it's fixed instead of blindly retrying.

### Explain
Process:
1. **Detect:** track pass/fail history; Playwright marks "flaky", Allure shows retries.
2. **Reproduce:** run the test 50 times (`--repeat-each=50`), in parallel, with CPU throttling.
3. **Diagnose:** traces, videos, network logs, app logs.
4. **Fix the cause:** waits on conditions, unique data, deterministic clocks (`page.clock`), mock third parties, wait for network idle on specific calls.
5. **Quarantine** if not fixable now, with a ticket and owner.
6. **Prevent:** code review checklist (no sleeps, no shared accounts).

### Example
A checkout test failed 1 in 10 runs. The trace showed the "Pay" button was clicked while the shipping cost was still recalculating, so the total changed. Waiting for the shipping API response before clicking fixed it.

### Code typescript | Waiting for the real condition
```typescript
// Flaky: clicks while totals are still updating
await page.getByLabel('Pincode').fill('411001');
await page.getByRole('button', { name: 'Pay' }).click();

// Stable: wait for the recalculation response, then assert
const shipping = page.waitForResponse(r => r.url().includes('/api/shipping') && r.ok());
await page.getByLabel('Pincode').fill('411001');
await shipping;
await expect(page.getByTestId('total')).toHaveText('₹1,049');
await page.getByRole('button', { name: 'Pay' }).click();

// Reproduce locally: npx playwright test checkout.spec.ts --repeat-each=50 --workers=8
```

## How do you handle dates, time zones and randomness in tests?
@topic framework

### 60s
Tests that depend on the current date or time, the machine's time zone, or random data often pass today and fail tomorrow or on CI. I make them deterministic: compute expected dates relative to "now" using the same time zone as the application, or better, control the clock, using Playwright's page.clock or an injectable Clock in Java. I run CI in a fixed time zone, set the browser's timezoneId and locale explicitly, seed random generators so data can be reproduced, and log the seed and generated data on failure.

### Explain
Common traps:
- Month-end and leap-year bugs (31 Jan + 1 month).
- Daylight saving changes.
- Server in UTC, browser in IST: "today" differs between 00:00 and 05:30 IST.
- Sorting by timestamps created in the same millisecond.
- Faker generating an invalid value occasionally (e.g., a name with an apostrophe).

### Example
"Delivery date is shown as tomorrow" failed every night after 18:30 UTC because the server was in UTC while the expected value was calculated in IST. Setting `timezoneId: 'Asia/Kolkata'` and using the app's time zone for expectations fixed it.

### Code typescript | Controlling time in Playwright
```typescript
test.use({ timezoneId: 'Asia/Kolkata', locale: 'en-IN' });

test('offer banner expires at midnight', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-11-06T23:59:00+05:30') });
  await page.goto('/offers');
  await expect(page.getByText('Ends in 1 minute')).toBeVisible();

  await page.clock.fastForward('02:00');
  await expect(page.getByText('Offer expired')).toBeVisible();
});
```

# Module: Introduction to performance testing

## What is performance testing? Explain load, stress, spike and endurance testing.
@topic performance

### 60s
Performance testing checks how fast, stable and scalable a system is under a given workload. Load testing runs the expected normal and peak traffic to confirm response times and error rates meet the targets. Stress testing goes beyond peak until the system breaks, to find the limit and see how it fails and recovers. Spike testing applies a sudden jump in users, like a flash sale. Endurance or soak testing runs a steady load for hours to find memory leaks and resource exhaustion. Scalability testing checks how performance changes as we add resources.

### Explain
| Type | Load pattern | Question answered |
|---|---|---|
| Load | Expected peak, steady | Do we meet SLAs at peak? |
| Stress | Increasing beyond peak | Where and how do we break? |
| Spike | Sudden jump | Do we survive sudden traffic? |
| Endurance / soak | Normal load, long time | Any leaks or degradation? |
| Volume | Large data sizes | Does big data slow us down? |
| Scalability | Add resources | Do we scale linearly? |

Always start with clear, measurable goals: "p95 < 800 ms at 500 requests per second with < 1% errors".

### Example
Before a Diwali sale: load test at 3× normal traffic, spike test from 1,000 to 20,000 users in one minute, and a 6-hour soak to check memory.

### Code javascript | Load profiles in k6
```javascript
export const options = {
  scenarios: {
    load:  { executor: 'constant-vus', vus: 200, duration: '15m' },
    spike: { executor: 'ramping-vus', startTime: '16m',
             stages: [{ duration: '30s', target: 2000 }, { duration: '2m', target: 2000 },
                      { duration: '30s', target: 0 }] },
  },
};
```

## What are the key performance metrics? What is p95 and why not use the average?
@topic performance

### 60s
The key metrics are response time, throughput in requests or transactions per second, error rate, concurrent users, and server-side resource usage like CPU, memory, database connections and garbage collection. For response time I use percentiles: p95 means 95 percent of requests were faster than that value. The average hides outliers: if most requests take 200 milliseconds but 5 percent take 8 seconds, the average looks fine while thousands of real users are suffering. p95 and p99 show the tail experience, which is what SLAs and user complaints are about.

### Explain
- **Latency vs response time:** latency is time to first byte; response time includes full download.
- **Throughput** should rise with load until a saturation point; after that, response times climb sharply.
- **Apdex** is a satisfaction score based on a target time.
- Correlate client metrics with server metrics (APM tools like Datadog, New Relic, Grafana).
- Little's Law: concurrency = throughput × response time.

### Example
Results: average 350 ms, p95 2.8 s, p99 6 s, 0.4% errors at 300 RPS. The p95 breaches the 1-second SLA; the database CPU is at 95%, pointing to a slow query.

### Code javascript | Thresholds in k6
```javascript
export const options = {
  thresholds: {
    http_req_duration: ['p(95)<800', 'p(99)<1500'],
    http_req_failed:   ['rate<0.01'],
    http_reqs:         ['rate>300'],
  },
};
```

## What are the main components of a JMeter test plan?
@topic performance

### 60s
A JMeter test plan contains a Thread Group, which defines the number of virtual users, ramp-up time and loop count or duration. Inside it are Samplers, like HTTP Request, that send requests. Config Elements set shared values, such as HTTP Request Defaults, the Header Manager, Cookie Manager and CSV Data Set Config for test data. Pre and Post Processors prepare and extract data, like the JSON Extractor for correlation. Assertions validate responses, Timers add think time, and Listeners collect results. I run real tests in non-GUI mode and generate the HTML dashboard.

### Explain
- **Thread group variants:** standard, Concurrency/Ultimate (plugins), setUp/tearDown.
- **Correlation:** extract dynamic values (tokens, IDs) with JSON/Regex extractors and reuse via `${var}`.
- **Parameterisation:** CSV Data Set Config for unique users.
- **Timers:** Constant, Gaussian Random, Constant Throughput.
- **Non-GUI:** `jmeter -n -t plan.jmx -l results.jtl -e -o report/`.
- GUI listeners like "View Results Tree" only for debugging, never during load.

### Example
Login → search → add to cart → checkout, with 500 users from a CSV, a 2–5 second think time, and assertions on status code and response time.

### Code bash | Running JMeter in non-GUI mode
```bash
jmeter -n -t checkout.jmx \
  -Jusers=500 -Jrampup=300 -Jduration=1800 \
  -l results/checkout.jtl \
  -e -o results/html-report
# In the plan, read properties with ${__P(users,10)}
```

## Write a simple k6 load test script.
@topic performance

### 60s
k6 is a modern, open-source load testing tool where tests are written in JavaScript and run by a fast Go engine. A script exports options, with virtual users, duration or stages and thresholds, and a default function that each virtual user runs in a loop: make HTTP requests, add checks to validate responses, and sleep for think time. Thresholds turn the test into pass or fail, which fits CI. I run it with k6 run, and can stream results to Grafana or k6 Cloud.

### Explain
- `check()` records pass rates but doesn't stop the test; thresholds decide pass/fail.
- `stages` for ramping.
- `group()` to organise transactions.
- `SharedArray` for loading test data efficiently.
- Exit code is non-zero when thresholds fail, perfect for pipelines.

### Example
Ramp to 100 users over 2 minutes, hold for 5 minutes, verify the products API returns 200 and p95 stays under 500 ms.

### Code javascript | k6 script
```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '2m', target: 100 },
    { duration: '5m', target: 100 },
    { duration: '1m', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],
    http_req_failed: ['rate<0.01'],
  },
};

const BASE = __ENV.BASE_URL || 'https://qa.shop.example.com';

export default function () {
  const res = http.get(`${BASE}/api/products?category=laptops`);
  check(res, {
    'status is 200': (r) => r.status === 200,
    'has products': (r) => r.json('items').length > 0,
  });
  sleep(Math.random() * 3 + 1);
}
// k6 run -e BASE_URL=https://staging.shop.example.com products.js
```

## What is correlation in performance testing?
@topic performance

### 60s
Correlation means capturing dynamic values that the server returns, like session IDs, CSRF tokens, auth tokens, order IDs or view states, and passing them into later requests, instead of replaying the hard-coded values from the recording. Without correlation, a recorded script works once and then fails, because the server rejects the stale token. In JMeter I use extractors like the JSON Extractor or Regular Expression Extractor and reference the variable; in k6 I parse the response in code. Parameterisation is the related idea of using different input data per virtual user.

### Explain
How to find values to correlate: record the flow twice and diff the requests; anything that changes between recordings needs correlation (or parameterisation).

- **Correlation:** server-generated dynamic data → extract and reuse.
- **Parameterisation:** client-side input data (usernames, search terms) → from CSV/data files.
- Missing correlation symptoms: 401/403, "session expired", or every user acting on the same order.

### Example
Login returns `{"token":"eyJ..."}`. Extract it with `$.token` and send `Authorization: Bearer ${token}` on all subsequent requests.

### Code javascript | Correlation in k6
```javascript
import http from 'k6/http';
import { check } from 'k6';

export default function () {
  const login = http.post(`${__ENV.BASE}/api/login`,
    JSON.stringify({ email: `user${__VU}@test.com`, password: 'Perf@123' }),  // parameterised
    { headers: { 'Content-Type': 'application/json' } });

  const token = login.json('token');                                        // correlated
  const params = { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } };

  const cart = http.post(`${__ENV.BASE}/api/carts`, '{}', params);
  const cartId = cart.json('id');                                           // correlated
  const add = http.post(`${__ENV.BASE}/api/carts/${cartId}/items`,
    JSON.stringify({ sku: 'SKU-101', qty: 1 }), params);
  check(add, { 'item added': (r) => r.status === 201 });
}
```

# Module: Modern testing practices

## What is shift-left testing?
@topic strategy

### 60s
Shift-left means moving testing activities earlier in the development life cycle, instead of testing only after development is finished. In practice: testers join requirement and design discussions, write acceptance criteria and examples before coding, review designs and API contracts, developers write unit and component tests, static analysis and API tests run on every pull request, and testers pair with developers on stories. The goal is to prevent defects and catch the rest when they're cheapest to fix. It's paired with shift-right, which is testing and monitoring in production.

### Explain
Shift-left practices:
- Three amigos sessions (BA/PO, dev, QA) during refinement.
- BDD / specification by example.
- Testable acceptance criteria and Definition of Ready.
- Contract tests and API tests before the UI is built.
- Linting, SAST and unit tests in pre-commit hooks and PR checks.
- Test environments per pull request (preview deploys).

### Example
For a new refunds API, QA reviewed the OpenAPI spec and found that partial refunds weren't modelled. Fixed in the spec before any code was written, saving a sprint of rework.

### Code yaml | Checks that run on every PR
```yaml
on: pull_request
jobs:
  shift-left:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm run lint
      - run: npm run test:unit
      - run: npx @stoplight/spectral-cli lint openapi.yaml   # API spec rules
      - run: npm run test:api
```

## What is the basic approach to security testing for a QA engineer?
@topic strategy

### 60s
As a QA engineer I cover the common, high-impact risks from the OWASP Top 10 as part of normal testing, and leave deep penetration testing to security specialists. I check authentication, like password rules, lockout, session timeout and logout; authorisation, like users accessing other users' data by changing an ID in the URL or API; input validation against SQL injection and cross-site scripting; sensitive data exposure, like passwords or tokens in responses, logs or URLs; HTTPS and secure cookie flags; and error messages that leak stack traces. Tools like OWASP ZAP and Burp Suite help, and dependency scanners catch vulnerable libraries.

### Explain
OWASP Top 10 (2021) highlights: Broken Access Control, Cryptographic Failures, Injection, Insecure Design, Security Misconfiguration, Vulnerable Components, Authentication Failures, Integrity Failures, Logging/Monitoring Failures, SSRF.

QA-level checks:
- IDOR: change `/orders/1001` to `/orders/1002`.
- Role escalation: call admin APIs with a customer token.
- XSS payload in inputs: `<script>alert(1)</script>`.
- SQLi payload: `' OR '1'='1`.
- Rate limiting on login and OTP.
- ZAP baseline scan in CI.

### Example
Changing the order ID in `GET /api/orders/{id}` while logged in as user A returned user B's address. Logged as a critical access-control bug.

### Code bash | OWASP ZAP baseline scan in CI
```bash
docker run --rm -v "$PWD:/zap/wrk" ghcr.io/zaproxy/zaproxy:stable \
  zap-baseline.py -t https://qa.shop.example.com -r zap-report.html -I
```

## How do you test microservices?
@topic api

### 60s
I test microservices at several layers. Unit tests inside each service. Component tests that run one service in isolation with its dependencies stubbed, using tools like WireMock or Testcontainers for its database. Contract tests, with tools like Pact, to make sure a provider still meets what its consumers expect, without deploying everything. A smaller number of integration and end-to-end tests across services for critical flows. And production monitoring, tracing and logs, because distributed failures like timeouts, retries and partial failures are hard to cover before release.

### Explain
Challenges: many independent deployments, network failures, eventual consistency, versioning, data spread across services, async messaging (Kafka, RabbitMQ).

Techniques:
- **Testcontainers** for real databases/brokers in tests.
- **Consumer-driven contracts** (Pact) to replace most cross-service E2E tests.
- **Async testing:** publish an event, poll for the outcome (Awaitility).
- **Resilience tests:** dependency down, slow, returning errors; check timeouts, retries, circuit breakers.
- **Observability:** correlation IDs to trace a request across services.

### Example
Order service tests run with Testcontainers Postgres and a WireMock payment service. A Pact contract with the notification service replaces a fragile E2E test that used to fail whenever any of 5 services was being deployed.

### Code java | Component test with Testcontainers
```java
@Testcontainers
class OrderServiceComponentTest {
    @Container
    static PostgreSQLContainer<?> db = new PostgreSQLContainer<>("postgres:16-alpine");

    @Test
    void placesOrderAndStoresIt() {
        OrderService svc = new OrderService(DataSources.from(db), new FakePaymentClient(true));
        Order order = svc.place(new Cart("C-1", List.of(new Item("SKU-101", 2))));
        assertEquals("PLACED", order.status());
        assertEquals(1, Jdbc.count(db, "SELECT count(*) FROM orders WHERE id = ?", order.id()));
    }
}
```

## How do you automate accessibility testing?
@topic strategy

### 60s
I integrate an automated accessibility engine like axe-core into existing UI tests, using axe-playwright or axe for Selenium, so key pages are scanned against WCAG 2.1 AA rules on every run, and the build fails on serious or critical violations. Lighthouse in CI gives an accessibility score too. But automated tools only catch around a third to half of issues, things like missing alt text, labels, contrast and ARIA misuse. So I add manual checks: keyboard-only navigation, focus order and visibility, screen readers like NVDA and VoiceOver, zoom to 200 percent, and meaningful error messages.

### Explain
WCAG principles: **POUR** — Perceivable, Operable, Understandable, Robust.

Automatable: colour contrast, missing labels, missing alt, duplicate IDs, invalid ARIA, landmark structure.

Manual: logical reading order, meaningful link text, keyboard traps, focus management in modals, captions, cognitive clarity.

Start by excluding known issues with tickets, then ratchet: no new violations allowed.

### Example
The axe scan found 14 violations on checkout, including an unlabeled card-number field and a 2.8:1 contrast on the "Place order" button. Both fixed before launch; the scan now runs on every PR.

### Code typescript | axe in Playwright, failing on serious issues
```typescript
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('checkout has no serious a11y violations', async ({ page }) => {
  await page.goto('/checkout');
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .exclude('#third-party-chat')
    .analyze();
  const serious = results.violations.filter(v => ['serious', 'critical'].includes(v.impact ?? ''));
  expect(serious, JSON.stringify(serious.map(v => v.id))).toEqual([]);
});
```

## What is visual regression testing?
@topic strategy

### 60s
Visual regression testing compares screenshots of the application against approved baseline images to catch unintended visual changes, like broken layouts, overlapping elements, wrong fonts or missing icons, that functional assertions don't notice. Playwright has it built in with toHaveScreenshot, and tools like Percy, Applitools and BackstopJS add smart diffing and review workflows. The keys to making it reliable are stable test data, fixed viewport, fonts and time, masking dynamic areas like dates and ads, running in a consistent environment like Docker, and a sensible diff threshold.

### Explain
- First run creates baselines; later runs diff against them.
- Update baselines intentionally (`--update-snapshots`) after reviewing changes.
- Baselines differ by OS/browser; generate them in the same Docker image as CI.
- Use component-level screenshots for focused checks.
- AI-based tools (Applitools) ignore minor rendering noise.

### Example
A CSS refactor shifted the "Add to cart" button below the fold on 1366×768 screens. Every functional test passed; the visual test flagged a 4% pixel difference on the product page.

### Code typescript | Visual check with masking
```typescript
test('product page looks right', async ({ page }) => {
  await page.goto('/products/101');
  await expect(page).toHaveScreenshot('product-101.png', {
    fullPage: true,
    mask: [page.getByTestId('recommendations'), page.getByTestId('delivery-date')],
    maxDiffPixelRatio: 0.01,
    animations: 'disabled',
  });
});
// Update after an intended change: npx playwright test --update-snapshots
```

# Module: Advanced tooling and tricky automation problems

## What's new in Selenium 4? Explain relative locators, CDP and BiDi.
@topic selenium

### 60s
Selenium 4 moved fully to the W3C WebDriver standard, which made browser behaviour more consistent. It added relative locators like above, below, toLeftOf, toRightOf and near; element screenshots; opening new tabs and windows directly; a redesigned Grid with Docker and observability support; and Selenium Manager, which downloads drivers automatically. It also exposed Chrome DevTools Protocol for Chromium browsers, for network interception, geolocation and console logs, and is moving to WebDriver BiDi, a cross-browser standard for two-way communication like listening to console and network events.

### Explain
- **Relative locators:** `RelativeLocator.with(By.tagName("input")).below(By.id("email"))`.
- **CDP (Chromium only):** `DevTools` API for network conditions, mocking, performance metrics.
- **BiDi:** event-driven, cross-browser replacement for CDP features (log, network, script modules), still evolving.
- **Other:** `getDomAttribute` / `getDomProperty`, `Duration`-based timeouts, `ChromiumDriver` base class, deprecation of `DesiredCapabilities` in favour of Options classes.

### Example
Using CDP to emulate a slow 3G network and verify the checkout shows a skeleton loader instead of a blank page.

### Code java | Relative locator and CDP network throttling
```java
WebElement password = driver.findElement(
    RelativeLocator.with(By.tagName("input")).below(By.id("email")));

DevTools devTools = ((HasDevTools) driver).getDevTools();
devTools.createSession();
devTools.send(Network.enable(Optional.empty(), Optional.empty(), Optional.empty()));
devTools.send(Network.emulateNetworkConditions(false, 400, 50_000, 25_000,
        Optional.of(ConnectionType.CELLULAR3G), Optional.empty(), Optional.empty(), Optional.empty()));
```

## How do you handle Shadow DOM elements?
@topic selenium

### 60s
Shadow DOM encapsulates part of a page inside a shadow root, used by web components, so normal CSS or XPath from the document can't reach inside. In Selenium 4, I find the host element, call getShadowRoot, and then use findElement with a CSS selector inside it; XPath isn't supported within shadow roots. For nested components I repeat the step for each level. Playwright pierces open shadow roots automatically with its CSS and role locators, so no special handling is needed. Closed shadow roots can't be accessed by either tool, which is worth raising with developers.

### Explain
- `SearchContext shadow = host.getShadowRoot();`
- Only CSS selectors work inside `SearchContext` from a shadow root.
- Older approach: `executeScript("return arguments[0].shadowRoot", host)`.
- Playwright: `page.locator('my-app >> button')` isn't needed; `page.getByRole('button', { name: 'Save' })` works through open shadow roots.

### Example
A design-system date picker is a web component `<ds-date-picker>`; its input lives inside the shadow root.

### Code java | Selenium 4 shadow root
```java
WebElement host = driver.findElement(By.cssSelector("ds-date-picker"));
SearchContext shadow = host.getShadowRoot();
shadow.findElement(By.cssSelector("input.ds-input")).sendKeys("25/12/2026");

// Nested component
SearchContext inner = shadow.findElement(By.cssSelector("ds-calendar")).getShadowRoot();
inner.findElement(By.cssSelector("button[aria-label='Next month']")).click();
```

## How do you automate flows that involve OTP, CAPTCHA or email verification?
@topic framework

### 60s
CAPTCHA is designed to block automation, so I don't try to solve it. In test environments I ask developers to disable it, use the provider's test keys that always pass, or whitelist test traffic. For OTP, I avoid reading real SMS: the test environment can use a fixed OTP for test numbers, expose a test-only API to fetch the latest OTP, or I read it from the database. For email verification, I use a test inbox service like Mailosaur, MailHog or Mailpit, fetch the email through its API and extract the link or code.

### Explain
Options ranked:
1. Test-environment configuration (fixed OTP, CAPTCHA test keys, feature flags).
2. Backdoor/test-only APIs secured and disabled in production.
3. Read from DB or message queue.
4. Test inbox APIs for email; virtual numbers for SMS (last resort, flaky and costly).

Keep at least one manual or monitored check in production that the real CAPTCHA/OTP works.

### Example
Sign-up test: register with `qa+<uuid>@inbox.mailpit.local`, poll Mailpit's API for the verification email, extract the link with a regex, open it, and assert the account is active.

### Code java | Fetching a verification link from Mailpit
```java
String email = "qa+" + UUID.randomUUID() + "@test.local";
signupPage.register(email, "Valid@123");

String link = await().atMost(Duration.ofSeconds(30)).pollInterval(Duration.ofSeconds(2))
    .until(() -> given().baseUri("http://mailpit:8025")
                        .queryParam("query", "to:" + email)
                        .get("/api/v1/search")
                        .jsonPath().getString("messages[0].ID"), notNullValue())
    .transform(id -> given().baseUri("http://mailpit:8025").get("/api/v1/message/" + id)
                            .jsonPath().getString("Text"))
    .transform(text -> text.replaceAll("(?s).*(https://\\S+/verify\\?token=\\S+).*", "$1"));

driver.get(link);
```

## What is a CTE in SQL and how do you use SQL to test data migrations?
@topic sql

### 60s
A CTE, Common Table Expression, is a named temporary result defined with WITH at the start of a query. It makes complex queries readable by breaking them into steps, and recursive CTEs can walk hierarchies like org charts or category trees. For data migrations, I use SQL to compare source and target: row counts per table and per key group, checksums or hashes of important columns, EXCEPT or MINUS queries to find rows that differ, null and default checks, referential integrity, and spot checks on transformed fields like split names or converted currencies.

### Explain
Migration test checklist:
- Counts: total and grouped (by status, by month).
- Completeness: every source key exists in the target.
- Accuracy: transformed values correct (sample + full diff where possible).
- Integrity: foreign keys, uniqueness, no orphans.
- Edge data: nulls, special characters, max lengths, time zones.
- Performance of the migration job and rollback plan.

### Example
Migrating `customers_old` to `customers` where `full_name` is split into `first_name` and `last_name`: compare counts, then diff the recombined name.

### Code sql | CTE-based migration diff
```sql
WITH src AS (
  SELECT id, LOWER(TRIM(email)) AS email, full_name FROM customers_old
),
tgt AS (
  SELECT id, email, CONCAT(first_name, ' ', last_name) AS full_name FROM customers
)
SELECT 'missing_in_target' AS issue, s.id FROM src s LEFT JOIN tgt t ON t.id = s.id WHERE t.id IS NULL
UNION ALL
SELECT 'value_mismatch', s.id FROM src s JOIN tgt t ON t.id = s.id
WHERE s.email <> t.email OR s.full_name <> t.full_name;
```

## How do you review automation code? What does good test code look like?
@topic framework

### 60s
I review test code with the same standards as production code. Good test code is readable, so the test name and steps describe the behaviour; independent, creating its own data and not relying on order; deterministic, with no sleeps, proper waits and controlled data; focused, testing one behaviour with meaningful assertions and clear failure messages; at the right level of the pyramid; and maintainable, using page objects and helpers without duplication, with no hard-coded secrets or environment URLs. I also check it fails for the right reason, ideally by seeing it fail once.

### Explain
Review checklist:
- Name says what and expected outcome (`cancelledOrderShowsRefundBanner`).
- Arrange–Act–Assert structure.
- No `Thread.sleep`, no `try/catch` swallowing failures.
- Locators stable (role/test-id), not absolute XPath.
- Assertions specific (exact text/value), not just "not null".
- Test data unique and cleaned up.
- Tags/groups correct; runs in parallel.
- Logs/reports useful on failure.

### Example
A PR added a test that always passed because it caught the assertion error in a `try` block and only logged it. Review caught it; the test was failing silently for a real bug.

### Code java | Before and after review
```java
// Before
@Test public void test1() throws Exception {
    driver.findElement(By.xpath("/html/body/div[3]/button")).click();
    Thread.sleep(5000);
    try { Assert.assertTrue(driver.getPageSource().contains("Success")); } catch (AssertionError e) { log(e); }
}

// After
@Test(groups = "regression")
public void savingProfileShowsConfirmation() {
    profilePage.updatePhone(TestData.uniquePhone()).save();
    Assert.assertEquals(profilePage.toastText(), "Profile updated", "Toast after saving profile");
}
```

## What testing metrics do you report to stakeholders?
@topic strategy

### 60s
I report metrics that support decisions, not vanity numbers. For a release: test execution progress and pass rate, requirement or risk coverage, open defects by severity and their trend, and known risks with a clear go or no-go recommendation. For automation health: suite duration, flaky test rate, pass rate over time and coverage of critical journeys. For process improvement: defect leakage to production, escaped defects by area, and mean time to detect or fix. I keep it visual and short, and always explain what the numbers mean and what action is needed.

### Explain
Good metrics are actionable, trend-based and hard to game. Avoid:
- "Number of test cases" as a productivity measure.
- Raw bug counts per tester.
- 100% automation targets.

Pair numbers with narrative: "Pass rate is 96%; the 4% are two known bugs in loyalty points, both P3, accepted by the PO."

### Example
Weekly dashboard: regression pass rate 97% (↑2), flaky rate 1.5% (↓), 3 open P2 bugs (owners assigned), leakage last release 2 bugs (both in promotions → adding contract tests there).

### Code sql | Escaped defects by module
```sql
SELECT module,
       COUNT(*) FILTER (WHERE found_in = 'PROD') AS escaped,
       COUNT(*) AS total,
       ROUND(100.0 * COUNT(*) FILTER (WHERE found_in = 'PROD') / COUNT(*), 1) AS leakage_pct
FROM defects
WHERE release = '3.2'
GROUP BY module
ORDER BY leakage_pct DESC;
```

## How do you use pytest fixtures and parametrization?
@topic programming

### 60s
pytest fixtures are functions decorated with pytest.fixture that provide setup and teardown for tests. A test asks for a fixture just by naming it as a parameter. Code before yield is setup, code after yield is teardown. Fixtures have scopes, function, class, module or session, so I can create a browser or API session once per session and fresh test data per test, and share fixtures across files with conftest.py. pytest.mark.parametrize runs one test with many input sets, and fixtures themselves can be parametrised, for example to run every test on two browsers.

### Explain
- `conftest.py` fixtures are auto-discovered.
- `autouse=True` for fixtures every test needs.
- `request.param` in parametrised fixtures.
- Markers: `@pytest.mark.smoke`, run with `pytest -m smoke`.
- Plugins: pytest-xdist (parallel), pytest-html, allure-pytest, pytest-playwright.

### Example
A session-scoped authenticated API client, a function-scoped user that's deleted after each test, and a test parametrised over three roles.

### Code python | Fixtures and parametrize
```python
# conftest.py
import pytest, requests, uuid

@pytest.fixture(scope="session")
def api(base_url, admin_token):
    s = requests.Session()
    s.headers["Authorization"] = f"Bearer {admin_token}"
    s.base_url = base_url
    yield s
    s.close()

@pytest.fixture
def user(api):
    u = api.post(f"{api.base_url}/users", json={"email": f"qa+{uuid.uuid4()}@x.com"}).json()
    yield u
    api.delete(f"{api.base_url}/users/{u['id']}")

# test_roles.py
@pytest.mark.parametrize("role, can_refund", [("admin", True), ("support", True), ("customer", False)])
def test_refund_permission(api, user, role, can_refund):
    api.patch(f"{api.base_url}/users/{user['id']}", json={"role": role})
    r = api.post(f"{api.base_url}/refunds", json={"orderId": "ORD-1", "asUser": user["id"]})
    assert (r.status_code == 201) == can_refund
```

## What is the Screenplay pattern and how is it different from POM?
@topic framework

### 60s
The Screenplay pattern models tests around actors who have abilities, like browsing the web or calling an API, perform tasks, like "place an order", made of smaller interactions, like click or enter, and ask questions to verify state. Page Object Model is organised around pages and their elements. Screenplay follows SOLID principles more strictly, keeps classes small and composable, and scales better for large suites with many roles and channels, but it has more classes and a steeper learning curve. Serenity BDD in Java and Serenity/JS implement it.

### Explain
| | POM | Screenplay |
|---|---|---|
| Organised by | Pages | Actors, tasks, interactions, questions |
| Class size | Pages can grow large | Small, single-purpose |
| Reuse | Page methods | Composable tasks |
| Multi-channel (UI + API) | Separate layers | Same actor with multiple abilities |
| Learning curve | Low | Higher |

### Example
"Given Priya, a customer, when she places an order for 2 mugs, then she should see the order confirmation." Priya is the actor; `PlaceOrder.of(2, "Mug")` is a task built from interactions.

### Code java | Screenplay with Serenity
```java
Actor priya = Actor.named("Priya").whoCan(BrowseTheWeb.with(driver));

priya.attemptsTo(
    Open.url("/products/mug"),
    SelectQuantity.of(2),
    Click.on(ProductPage.ADD_TO_CART),
    Checkout.withUpi("priya@upi")
);

priya.should(seeThat(OrderConfirmation.message(), equalTo("Thank you for your order")));
```

## How do you test file processing, batch jobs or ETL pipelines?
@topic strategy

### 60s
For batch and ETL jobs, I test the data rather than a UI. I prepare controlled input files or source records covering normal, boundary and bad data: wrong formats, missing columns, duplicates, special characters, very large files. I trigger the job, wait for it to finish, then verify the output: row counts, transformations, rejected-record handling and error logs, idempotency when the job is rerun, and behaviour when it fails halfway and restarts. I also check performance with production-sized volumes and that schedules, notifications and alerts work.

### Explain
Validation layers:
- **Schema:** columns, types, mandatory fields.
- **Completeness:** source count = target count + rejected count.
- **Accuracy:** transformation rules on sample and full data.
- **Uniqueness and integrity.**
- **Reconciliation:** totals and checksums match (sum of amounts).
- **Reruns and recovery.**
- Tools: SQL, Python/pandas, Great Expectations, dbt tests.

### Example
A nightly job imports 2 million transactions from a bank CSV. Tests cover a file with a missing header, a row with a negative amount, a duplicate transaction ID, and a rerun of the same file (must not double-insert).

### Code python | Reconciliation with pandas
```python
import pandas as pd

src = pd.read_csv("input/transactions_2026-11-05.csv")
tgt = pd.read_sql("SELECT txn_id, amount FROM transactions WHERE batch_date = '2026-11-05'", conn)
rej = pd.read_sql("SELECT txn_id FROM rejected_txns WHERE batch_date = '2026-11-05'", conn)

assert len(src) == len(tgt) + len(rej), "Counts don't reconcile"
assert tgt["txn_id"].is_unique, "Duplicate transactions loaded"
valid = src[~src["txn_id"].isin(rej["txn_id"])]
assert round(valid["amount"].sum(), 2) == round(tgt["amount"].sum(), 2), "Amount totals differ"
```

## How do you test a feature behind a feature flag?
@topic strategy

### 60s
Feature flags let teams deploy code without exposing it to everyone, then turn it on for a percentage of users, specific segments or internal testers. I test both states, flag on and flag off, to make sure the old behaviour still works when the flag is off and the new behaviour works when it's on. I also test switching the flag while users are mid-session, targeting rules, and that the default is safe if the flag service is down. In automation, I set the flag per test through the flag provider's API or a test override header, never by relying on whatever state it's in.

### Explain
Risks with flags:
- Combinatorial explosion with many flags: test meaningful combinations, not all.
- Stale flags: code paths that nobody tests anymore. Push to remove flags after rollout.
- Inconsistent experience across services reading the flag at different times.

Tools: LaunchDarkly, Unleash, Flagsmith, ConfigCat, or in-house config.

### Example
A new checkout flow is behind `new_checkout`. Regression runs once with the flag off (current customers) and the checkout suite runs with it on; a canary rollout to 5% of users is monitored for conversion and errors before going wider.

### Code typescript | Forcing a flag per test
```typescript
test.describe('new checkout', () => {
  test.beforeEach(async ({ context }) => {
    await context.setExtraHTTPHeaders({ 'x-feature-override': 'new_checkout=on' });
  });
  test('shows one-page checkout', async ({ page }) => {
    await page.goto('/checkout');
    await expect(page.getByRole('heading', { name: 'Checkout' })).toBeVisible();
    await expect(page.getByTestId('step-indicator')).toHaveCount(0);
  });
});
```

## How do you handle environment instability and test data in shared environments?
@topic strategy

### 60s
Shared environments break tests for reasons unrelated to the code: other teams deploying, data being changed or deleted, services down, or limited capacity. I reduce the impact by running a quick health check before the suite and failing fast with a clear "environment down" message; creating each test's data with unique identifiers instead of relying on shared records; mocking or virtualizing unstable third-party dependencies; tagging environment failures separately from product failures in reports; and pushing for ephemeral, per-branch environments with containers so each run has its own clean setup.

### Explain
Tactics:
- Pre-suite smoke/health endpoint checks.
- Data isolation per run (prefixes, tenants, separate accounts).
- Seeding scripts to reset known reference data.
- Retry only on infrastructure errors (connection refused, 502/503), never on assertion failures.
- Environment booking/calendar for performance tests.
- Long-term: ephemeral environments (Kubernetes namespaces, preview deploys).

### Example
Nightly runs failed 3 times a week because another team reset the QA database at 2 a.m. Moving the run to 4 a.m. was a quick fix; the lasting fix was a dedicated namespace spun up per run with seeded data.

### Code java | Pre-suite health check
```java
@BeforeSuite(alwaysRun = true)
public void environmentHealthCheck() {
    for (String svc : List.of("/api/health", "/auth/health", "/payments/health")) {
        int code = given().baseUri(Config.get("baseUrl")).get(svc).statusCode();
        if (code != 200) {
            throw new SkipException("Environment unhealthy: " + svc + " returned " + code);
        }
    }
}
```
