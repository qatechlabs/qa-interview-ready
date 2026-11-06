import "server-only";

export interface Solution {
  /** Single-file Playwright solution, or a readable bundle of `files` for multi-file scenarios. */
  playwright: string;
  /** Multi-file solution by path (framework scenarios). */
  files?: Record<string, string>;
  selenium: string;
  notes: string[];
}

/** Joins project files into one readable listing. */
export const bundle = (files: Record<string, string>) =>
  Object.entries(files)
    .map(([path, src]) => `// ===== ${path} =====\n${src.trim()}\n`)
    .join("\n");

const pwHeader = `import { test, expect } from '@playwright/test';\n\n`;
const swagLogin = `  await page.goto('/');
  await page.getByPlaceholder('Username').fill('standard_user');
  await page.getByPlaceholder('Password').fill('secret_sauce');
  await page.getByRole('button', { name: 'Login' }).click();`;
const hrLogin = `  await page.goto('/');
  await page.getByLabel('Username').fill('Admin');
  await page.getByLabel('Password').fill('admin123');
  await page.getByRole('button', { name: 'Login' }).click();`;

const javaSwagLogin = `        driver.get(BASE + "#/");
        driver.findElement(By.id("user-name")).sendKeys("standard_user");
        driver.findElement(By.id("password")).sendKeys("secret_sauce");
        driver.findElement(By.id("login-button")).click();`;
const javaHrLogin = `        driver.get(BASE + "#/auth/login");
        driver.findElement(By.id("username")).sendKeys("Admin");
        driver.findElement(By.id("password")).sendKeys("admin123");
        driver.findElement(By.cssSelector("#login-form button[type=submit]")).click();`;

const javaClass = (name: string, base: string, body: string) => `import org.openqa.selenium.*;
import org.openqa.selenium.chrome.ChromeDriver;
import org.openqa.selenium.support.ui.*;
import org.testng.Assert;
import org.testng.annotations.*;
import java.time.Duration;
import java.util.*;

public class ${name} {
    static final String BASE = "${base.startsWith("http") ? base : `https://interview.qatechlabs.com${base}`}";
    WebDriver driver;
    WebDriverWait wait;

    @BeforeMethod
    public void setUp() {
        driver = new ChromeDriver();
        wait = new WebDriverWait(driver, Duration.ofSeconds(10));
    }

${body}

    @AfterMethod
    public void tearDown() {
        driver.quit();
    }
}
`;


/** Builds a Solution for a multi-file scenario; `playwright` becomes the readable bundle of its files. */
/** REST Assured + TestNG equivalent of an API scenario against a practice app. */
const restAssured = (name: string, app: string, body: string) => `// REST Assured + TestNG equivalent (pom.xml: io.rest-assured:rest-assured, org.testng:testng)
import io.restassured.RestAssured;
import io.restassured.filter.session.SessionFilter;
import io.restassured.response.Response;
import io.restassured.specification.RequestSpecification;
import org.testng.Assert;
import org.testng.annotations.*;
import java.util.*;
import static io.restassured.RestAssured.given;

public class ${name} {
    @BeforeClass
    public void setUp() {
        RestAssured.baseURI = "https://interview.qatechlabs.com/api/sandbox/${app}";
    }

${body}
}
`;

const withFiles = (s: Omit<Solution, "playwright"> & { files: Record<string, string> }): Solution => ({ ...s, playwright: bundle(s.files) });


/** Reference playwright.config.ts for the framework workspaces. */
const wsConfig = (defaultBaseURL: string, testIdAttribute?: string, timeout = 30_000) => `import { defineConfig, devices } from '@playwright/test';

/**
 * BASE_URL is set by CI (the lab runner passes the site under test); the default is for local runs.
 */
export default defineConfig({
  testDir: './tests',
  timeout: ${timeout.toLocaleString("en-US").replace(",", "_")},
  expect: { timeout: ${Math.min(timeout, 15_000).toLocaleString("en-US").replace(",", "_")} },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : [['list']],
  use: {
    baseURL: process.env.BASE_URL || '${defaultBaseURL}',${testIdAttribute ? `\n    testIdAttribute: '${testIdAttribute}',` : ""}
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    ...devices['Desktop Chrome'],
  },
});
`;

const wsReadme = (name: string, site: string) => `# ${name} automation framework

Playwright + TypeScript framework for ${site}.

## Structure

- \`playwright.config.ts\`: base URL from \`BASE_URL\`, retries and HTML report on CI, trace on failure
- \`pages/\`: page objects, one class per page; all locators live here
- \`fixtures.ts\`: \`test.extend\` providing ready page objects (\`app\`) and a logged-in state
- \`data/\`: users and test data, unique per run where the app keeps state
- \`tests/\`: specs grouped by feature and tagged \`@smoke\` / \`@regression\`

## Run

\`\`\`bash
npm install
npx playwright install chromium
npx playwright test                      # everything
npx playwright test --grep @smoke        # smoke only
BASE_URL=https://staging.example.com npx playwright test
npx playwright show-report
\`\`\`
`;

const wsSelenium = (name: string) => `// The same framework in Selenium Java + TestNG (Maven layout)
//
// src/test/java/config/Config.java        reads BASE_URL from System.getenv with a default, browser name, timeouts
// src/test/java/pages/*Page.java          one class per page; locators as private By fields; methods return the next page
// src/test/java/base/BaseTest.java        @BeforeMethod creates the driver (WebDriverManager), applies implicit/explicit waits,
//                                         @AfterMethod takes a screenshot on failure (ITestResult) and quits
// src/test/java/data/Users.java           users and products; unique names via System.currentTimeMillis()
// src/test/java/tests/*Test.java          @Test(groups = {"smoke"}) / {"regression"}; assertions only in tests
// src/test/resources/testng.xml           suites per group, parallel="methods", thread-count="2"
// pom.xml                                 selenium-java, testng, webdrivermanager, maven-surefire with <suiteXmlFiles>
//
// Example page object for ${name}:
public class LoginPage {
    private final WebDriver driver;
    private final WebDriverWait wait;
    private final By username = By.cssSelector("input[placeholder='Username']");
    private final By password = By.cssSelector("input[placeholder='Password']");
    private final By submit = By.cssSelector("button[type=submit], #login-button");

    public LoginPage(WebDriver driver) {
        this.driver = driver;
        this.wait = new WebDriverWait(driver, Duration.ofSeconds(15));
    }

    public LoginPage open() { driver.get(Config.baseUrl()); return this; }

    public void login(String user, String pass) {
        wait.until(ExpectedConditions.visibilityOfElementLocated(username)).sendKeys(user);
        driver.findElement(password).sendKeys(pass);
        driver.findElement(submit).click();
    }
}
`;

const WS_NOTES = [
  "The config is the first thing a reviewer opens: environment-driven baseURL, retries only on CI, trace retained on failure, HTML report. Nothing hard-coded.",
  "Every locator lives in a page object; specs read as test cases. If a selector changes, one file changes.",
  "Fixtures compose: app builds the page objects, loggedIn (or adminApp) reuses app. Tests ask for the state they need and nothing more.",
  "Test data is unique per run (Date.now()) wherever the app keeps state, so the suite can run in parallel and on a shared environment.",
  "Grouping with test.describe and @smoke/@regression tags lets CI run a 2-minute smoke suite on every push and the full suite nightly: npx playwright test --grep @smoke.",
];

export const SOLUTIONS: Record<string, Solution> = {
  "swagshop-login": {
    playwright:
      pwHeader +
      `test('standard user can log in', async ({ page }) => {
${swagLogin}

  await expect(page).toHaveURL(/inventory/);
  await expect(page.getByTestId('title')).toHaveText('Products');
  await expect(page.getByTestId('inventory-item')).toHaveCount(12);
});
`,
    selenium: javaClass(
      "LoginTest",
      "/sandbox/swagshop",
      `    @Test
    public void standardUserCanLogIn() {
${javaSwagLogin}

        wait.until(ExpectedConditions.urlContains("inventory"));
        Assert.assertEquals(driver.findElement(By.cssSelector("[data-test=title]")).getText(), "Products");
        Assert.assertEquals(driver.findElements(By.cssSelector("[data-test=inventory-item]")).size(), 12);
    }`,
    ),
    notes: [
      "User-facing locators (placeholder, role and name) survive CSS refactors far better than XPath.",
      "toHaveURL and toHaveCount retry automatically, so no explicit waits are needed in Playwright.",
      "In Selenium you need an explicit wait (urlContains) before asserting, or the test becomes flaky.",
    ],
  },
  "swagshop-locked-user": {
    playwright:
      pwHeader +
      `test('locked out user sees an error', async ({ page }) => {
  await page.goto('/');
  await page.getByPlaceholder('Username').fill('locked_out_user');
  await page.getByPlaceholder('Password').fill('secret_sauce');
  await page.getByRole('button', { name: 'Login' }).click();

  await expect(page.getByRole('alert')).toContainText('locked out');
  await expect(page).not.toHaveURL(/inventory/);
});
`,
    selenium: javaClass(
      "LockedUserTest",
      "/sandbox/swagshop",
      `    @Test
    public void lockedOutUserSeesError() {
        driver.get(BASE + "#/");
        driver.findElement(By.id("user-name")).sendKeys("locked_out_user");
        driver.findElement(By.id("password")).sendKeys("secret_sauce");
        driver.findElement(By.id("login-button")).click();

        WebElement error = wait.until(ExpectedConditions.visibilityOfElementLocated(By.cssSelector("[data-test=error]")));
        Assert.assertTrue(error.getText().contains("locked out"));
        Assert.assertFalse(driver.getCurrentUrl().contains("inventory"));
    }`,
    ),
    notes: [
      "Assert on the part of the message that matters (\"locked out\"), so copy tweaks don't break the test.",
      "A negative URL assertion proves the user was not let in, which is the real requirement.",
    ],
  },
  "swagshop-sort-price": {
    playwright:
      pwHeader +
      `test('sort by price low to high', async ({ page }) => {
${swagLogin}

  await page.getByTestId('product-sort-container').selectOption('lohi');

  const texts = await page.getByTestId('inventory-item-price').allTextContents();
  const prices = texts.map((t) => Number(t.replace('$', '')));
  const sorted = [...prices].sort((a, b) => a - b);

  expect(prices).toHaveLength(12);
  expect(prices).toEqual(sorted);
});
`,
    selenium: javaClass(
      "SortTest",
      "/sandbox/swagshop",
      `    @Test
    public void sortByPriceLowToHigh() {
${javaSwagLogin}

        new Select(driver.findElement(By.cssSelector("[data-test=product-sort-container]"))).selectByValue("lohi");

        List<Double> prices = new ArrayList<>();
        for (WebElement e : driver.findElements(By.cssSelector("[data-test=inventory-item-price]"))) {
            prices.add(Double.parseDouble(e.getText().replace("$", "")));
        }
        List<Double> sorted = new ArrayList<>(prices);
        Collections.sort(sorted);
        Assert.assertEquals(prices, sorted);
    }`,
    ),
    notes: [
      "Checking only the first item is the classic weak assertion. Compare the full list with a sorted copy.",
      "Run it as problem_user: sorting is deliberately broken for that user, and this test catches it.",
      "Copy before sorting ([...prices]); sort() mutates the array and would make the test always pass.",
    ],
  },
  "swagshop-cart": {
    playwright:
      pwHeader +
      `test.beforeEach(async ({ page }) => {
${swagLogin}
});

test('add two items to the cart', async ({ page }) => {
  const card = (name: string) => page.getByTestId('inventory-item').filter({ hasText: name });

  await card('Trail Runner Backpack').getByRole('button', { name: 'Add to cart' }).click();
  await card('Night Ride Bike Light').getByRole('button', { name: 'Add to cart' }).click();
  await expect(page.getByTestId('shopping-cart-badge')).toHaveText('2');

  await page.getByRole('button', { name: 'Shopping cart' }).click();
  await expect(page.getByTestId('inventory-item')).toHaveCount(2);
  await expect(page.getByTestId('inventory-item-name')).toHaveText(['Trail Runner Backpack', 'Night Ride Bike Light']);
});
`,
    selenium: javaClass(
      "CartTest",
      "/sandbox/swagshop",
      `    @Test
    public void addTwoItemsToCart() {
${javaSwagLogin}

        driver.findElement(By.cssSelector("[data-test=add-to-cart-trail-runner-backpack]")).click();
        driver.findElement(By.cssSelector("[data-test=add-to-cart-night-ride-bike-light]")).click();
        Assert.assertEquals(driver.findElement(By.cssSelector("[data-test=shopping-cart-badge]")).getText(), "2");

        driver.findElement(By.cssSelector("[data-test=shopping-cart-link]")).click();
        List<WebElement> names = driver.findElements(By.cssSelector("[data-test=inventory-item-name]"));
        Assert.assertEquals(names.size(), 2);
        Assert.assertEquals(names.get(0).getText(), "Trail Runner Backpack");
        Assert.assertEquals(names.get(1).getText(), "Night Ride Bike Light");
    }`,
    ),
    notes: [
      "filter({ hasText }) scopes the Add button to one card, which avoids a strict mode violation on six identical buttons.",
      "A helper like card(name) keeps the test readable and is a small step toward a page object.",
      "toHaveText with an array checks the count and the order in one assertion.",
    ],
  },
  "swagshop-checkout-validation": {
    playwright:
      pwHeader +
      `test('postal code is required at checkout', async ({ page }) => {
${swagLogin}

  await page.getByTestId('add-to-cart-classic-cotton-tee').click();
  await page.getByRole('button', { name: 'Shopping cart' }).click();
  await page.getByRole('button', { name: 'Checkout' }).click();

  await page.getByPlaceholder('First Name').fill('Asha');
  await page.getByPlaceholder('Last Name').fill('Rao');
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByTestId('error')).toHaveText('Error: Postal Code is required');

  await page.getByPlaceholder('Zip/Postal Code').fill('560001');
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByTestId('title')).toHaveText('Checkout: Overview');
});
`,
    selenium: javaClass(
      "CheckoutValidationTest",
      "/sandbox/swagshop",
      `    @Test
    public void postalCodeIsRequired() {
${javaSwagLogin}
        driver.findElement(By.cssSelector("[data-test=add-to-cart-classic-cotton-tee]")).click();
        driver.findElement(By.cssSelector("[data-test=shopping-cart-link]")).click();
        driver.findElement(By.id("checkout")).click();

        driver.findElement(By.id("first-name")).sendKeys("Asha");
        driver.findElement(By.id("last-name")).sendKeys("Rao");
        driver.findElement(By.id("continue")).click();
        Assert.assertEquals(driver.findElement(By.cssSelector("[data-test=error]")).getText(), "Error: Postal Code is required");

        driver.findElement(By.id("postal-code")).sendKeys("560001");
        driver.findElement(By.id("continue")).click();
        Assert.assertEquals(driver.findElement(By.cssSelector("[data-test=title]")).getText(), "Checkout: Overview");
    }`,
    ),
    notes: [
      "Testing the failure and then the recovery in one flow shows that the error state is not sticky.",
      "In an interview, mention you would cover first and last name the same way with a data-driven test.",
    ],
  },
  "swagshop-checkout-e2e": {
    playwright:
      pwHeader +
      `const money = (s: string | null) => Number((s ?? '').replace(/[^0-9.]/g, ''));

test('order total is calculated correctly', async ({ page }) => {
${swagLogin}

  await test.step('add items and check out', async () => {
    await page.getByTestId('add-to-cart-fleece-zip-jacket').click();
    await page.getByTestId('add-to-cart-classic-cotton-tee').click();
    await page.getByRole('button', { name: 'Shopping cart' }).click();
    await page.getByRole('button', { name: 'Checkout' }).click();
    await page.getByPlaceholder('First Name').fill('Asha');
    await page.getByPlaceholder('Last Name').fill('Rao');
    await page.getByPlaceholder('Zip/Postal Code').fill('560001');
    await page.getByRole('button', { name: 'Continue' }).click();
    await expect(page).toHaveURL(/checkout-step-two/);
  });

  await test.step('verify the maths', async () => {
    const prices = (await page.getByTestId('inventory-item-price').allTextContents()).map(money);
    const expectedSub = prices.reduce((a, b) => a + b, 0);
    const sub = money(await page.getByTestId('subtotal-label').textContent());
    const tax = money(await page.getByTestId('tax-label').textContent());
    const total = money(await page.getByTestId('total-label').textContent());

    expect(prices).toHaveLength(2);
    expect(sub).toBeCloseTo(expectedSub, 2);
    expect(tax).toBeCloseTo(Math.round(expectedSub * 0.08 * 100) / 100, 2);
    expect(total).toBeCloseTo(sub + tax, 2);
  });

  await page.getByRole('button', { name: 'Finish' }).click();
  await expect(page.getByRole('heading', { name: 'Thank you for your order!' })).toBeVisible();
});
`,
    selenium: javaClass(
      "CheckoutE2ETest",
      "/sandbox/swagshop",
      `    static double money(String s) { return Double.parseDouble(s.replaceAll("[^0-9.]", "")); }

    @Test
    public void orderTotalIsCorrect() {
${javaSwagLogin}
        driver.findElement(By.cssSelector("[data-test=add-to-cart-fleece-zip-jacket]")).click();
        driver.findElement(By.cssSelector("[data-test=add-to-cart-classic-cotton-tee]")).click();
        driver.findElement(By.cssSelector("[data-test=shopping-cart-link]")).click();
        driver.findElement(By.id("checkout")).click();
        driver.findElement(By.id("first-name")).sendKeys("Asha");
        driver.findElement(By.id("last-name")).sendKeys("Rao");
        driver.findElement(By.id("postal-code")).sendKeys("560001");
        driver.findElement(By.id("continue")).click();

        double expectedSub = 0;
        for (WebElement e : driver.findElements(By.cssSelector("[data-test=inventory-item-price]"))) expectedSub += money(e.getText());
        double sub = money(driver.findElement(By.cssSelector("[data-test=subtotal-label]")).getText());
        double tax = money(driver.findElement(By.cssSelector("[data-test=tax-label]")).getText());
        double total = money(driver.findElement(By.cssSelector("[data-test=total-label]")).getText());

        Assert.assertEquals(sub, expectedSub, 0.001);
        Assert.assertEquals(tax, Math.round(expectedSub * 0.08 * 100) / 100.0, 0.001);
        Assert.assertEquals(total, sub + tax, 0.001);

        driver.findElement(By.id("finish")).click();
        Assert.assertEquals(driver.findElement(By.cssSelector("[data-test=complete-header]")).getText(), "Thank you for your order!");
    }`,
    ),
    notes: [
      "Recomputing totals from line items catches bugs that a hard-coded \"Total: $71.26\" would hide.",
      "Floating point: compare money with toBeCloseTo (or a delta in TestNG), never exact equality.",
      "test.step groups the report into readable chunks, which interviewers notice in senior rounds.",
    ],
  },
  "peopledesk-login": {
    playwright:
      pwHeader +
      `test('admin can log in', async ({ page }) => {
${hrLogin}

  await expect(page).toHaveURL(/dashboard/);
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  const sidebar = page.getByRole('navigation', { name: 'Sidebar' });
  await expect(sidebar.getByRole('link', { name: 'PIM' })).toBeVisible();
  await expect(sidebar.getByRole('link', { name: 'Leave' })).toBeVisible();
});
`,
    selenium: javaClass(
      "AdminLoginTest",
      "/sandbox/peopledesk",
      `    @Test
    public void adminCanLogIn() {
${javaHrLogin}

        wait.until(ExpectedConditions.urlContains("dashboard"));
        Assert.assertEquals(driver.findElement(By.cssSelector(".topbar h1")).getText(), "Dashboard");
        Assert.assertTrue(driver.findElement(By.xpath("//aside//a[normalize-space()='PIM']")).isDisplayed());
        Assert.assertTrue(driver.findElement(By.xpath("//aside//a[normalize-space()='Leave']")).isDisplayed());
    }`,
    ),
    notes: [
      "getByLabel is the most robust locator for form fields that have real <label> elements.",
      "Scoping links to the sidebar avoids matching the same words elsewhere on the page.",
    ],
  },
  "peopledesk-invalid-login": {
    playwright:
      pwHeader +
      `test('username and password are required', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Login' }).click();
  await expect(page.getByText('Required')).toHaveCount(2);
  await expect(page).toHaveURL(/login/);
});

test('wrong password shows Invalid credentials', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Username').fill('Admin');
  await page.getByLabel('Password').fill('wrong-password');
  await page.getByRole('button', { name: 'Login' }).click();
  await expect(page.getByRole('alert')).toHaveText('Invalid credentials');
  await expect(page).toHaveURL(/login/);
});
`,
    selenium: javaClass(
      "InvalidLoginTest",
      "/sandbox/peopledesk",
      `    @Test
    public void fieldsAreRequired() {
        driver.get(BASE + "#/auth/login");
        driver.findElement(By.cssSelector("#login-form button[type=submit]")).click();
        Assert.assertEquals(driver.findElements(By.xpath("//div[@class='req' and text()='Required']")).size(), 2);
    }

    @Test
    public void wrongPasswordShowsError() {
        driver.get(BASE + "#/auth/login");
        driver.findElement(By.id("username")).sendKeys("Admin");
        driver.findElement(By.id("password")).sendKeys("wrong-password");
        driver.findElement(By.cssSelector("#login-form button[type=submit]")).click();
        Assert.assertEquals(driver.findElement(By.cssSelector("[role=alert]")).getText(), "Invalid credentials");
    }`,
    ),
    notes: [
      "One behaviour per test: when one fails, the name alone tells you what broke.",
      "Each test starts from a fresh state, which is what Playwright gives you with a new browser context.",
    ],
  },
  "peopledesk-add-employee": {
    playwright:
      pwHeader +
      `test('new employee is searchable', async ({ page }) => {
  const first = \`Auto\${Date.now()}\`;
  const last = 'Tester';

${hrLogin}

  await page.getByRole('link', { name: 'PIM' }).click();
  await page.getByRole('button', { name: '+ Add' }).click();
  await page.getByLabel('First Name').fill(first);
  await page.getByLabel('Last Name').fill(last);
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByRole('status')).toContainText('Successfully Saved');
  await expect(page.getByTestId('employee-name')).toHaveText(\`\${first} \${last}\`);

  await page.getByRole('button', { name: 'Back to Employee List' }).click();
  await page.getByLabel('Employee Name').fill(first);
  await page.getByRole('button', { name: 'Search' }).click();

  await expect(page.getByTestId('records-found')).toHaveText('(1) Record Found');
  await expect(page.getByTestId('employee-row')).toHaveCount(1);
  await expect(page.getByTestId('employee-row')).toContainText(first);
});
`,
    selenium: javaClass(
      "AddEmployeeTest",
      "/sandbox/peopledesk",
      `    @Test
    public void newEmployeeIsSearchable() {
        String first = "Auto" + System.currentTimeMillis();
${javaHrLogin}
        wait.until(ExpectedConditions.elementToBeClickable(By.xpath("//aside//a[text()='PIM']"))).click();
        driver.findElement(By.xpath("//button[text()='+ Add']")).click();
        driver.findElement(By.id("firstName")).sendKeys(first);
        driver.findElement(By.id("lastName")).sendKeys("Tester");
        driver.findElement(By.xpath("//button[text()='Save']")).click();
        WebElement toast = wait.until(ExpectedConditions.visibilityOfElementLocated(By.cssSelector("[role=status]")));
        Assert.assertTrue(toast.getText().contains("Successfully Saved"));

        driver.findElement(By.xpath("//button[text()='Back to Employee List']")).click();
        driver.findElement(By.id("search-name")).sendKeys(first);
        driver.findElement(By.xpath("//button[text()='Search']")).click();
        Assert.assertEquals(driver.findElement(By.cssSelector("[data-test=records-found]")).getText(), "(1) Record Found");
        Assert.assertTrue(driver.findElement(By.cssSelector("[data-test=employee-row]")).getText().contains(first));
    }`,
    ),
    notes: [
      "Unique test data (a timestamp) makes the test re-runnable and safe in parallel runs.",
      "Verifying through search proves the record was persisted, not just that a toast appeared.",
      "In a real suite you would create the employee through the API and only test the UI search.",
    ],
  },
  "peopledesk-leave": {
    playwright:
      pwHeader +
      `test('leave dates are validated', async ({ page }) => {
${hrLogin}
  await page.getByRole('link', { name: 'Leave' }).click();

  await page.getByLabel('Leave Type').selectOption('Casual Leave');
  await page.getByLabel('From Date').fill('2026-12-10');
  await page.getByLabel('To Date').fill('2026-12-08');
  await page.getByRole('button', { name: 'Apply' }).click();
  await expect(page.getByText('To date should be after from date')).toBeVisible();

  await page.getByLabel('To Date').fill('2026-12-12');
  await page.getByRole('button', { name: 'Apply' }).click();
  await expect(page.getByRole('status')).toContainText('Successfully Submitted');

  const row = page.getByTestId('leave-row');
  await expect(row).toHaveCount(1);
  await expect(row.getByTestId('leave-status')).toHaveText('Pending Approval');
  await expect(row.getByRole('cell').nth(2)).toHaveText('3');
});
`,
    selenium: javaClass(
      "ApplyLeaveTest",
      "/sandbox/peopledesk",
      `    @Test
    public void leaveDatesAreValidated() {
${javaHrLogin}
        wait.until(ExpectedConditions.elementToBeClickable(By.xpath("//aside//a[text()='Leave']"))).click();

        new Select(driver.findElement(By.id("leaveType"))).selectByVisibleText("Casual Leave");
        // Date inputs: send keys in the browser's locale format, or set the value with JavaScript
        JavascriptExecutor js = (JavascriptExecutor) driver;
        js.executeScript("arguments[0].value='2026-12-10'", driver.findElement(By.id("fromDate")));
        js.executeScript("arguments[0].value='2026-12-08'", driver.findElement(By.id("toDate")));
        driver.findElement(By.xpath("//button[text()='Apply']")).click();
        Assert.assertTrue(driver.findElement(By.xpath("//*[text()='To date should be after from date']")).isDisplayed());

        js.executeScript("arguments[0].value='2026-12-12'", driver.findElement(By.id("toDate")));
        driver.findElement(By.xpath("//button[text()='Apply']")).click();
        Assert.assertEquals(driver.findElement(By.cssSelector("[data-test=leave-status]")).getText(), "Pending Approval");
    }`,
    ),
    notes: [
      "Test the boundary rule first, then the happy path, in the same flow to show the form recovers.",
      "Asserting the day count (3) checks the inclusive date maths, a common source of off-by-one bugs.",
      "Date pickers are a classic Selenium pain point; mention the JavaScript value approach and its trade-off.",
    ],
  },
  "peopledesk-delete": {
    playwright:
      pwHeader +
      `test('delete employee with confirmation', async ({ page }) => {
${hrLogin}
  await page.getByRole('link', { name: 'PIM' }).click();

  const vikram = page.getByTestId('employee-row').filter({ hasText: 'Vikram' });
  await expect(page.getByTestId('employee-row')).toHaveCount(14);

  await page.getByRole('button', { name: 'Delete Vikram Singh' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('button', { name: 'No, Cancel' }).click();
  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(vikram).toHaveCount(1);

  await page.getByRole('button', { name: 'Delete Vikram Singh' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Yes, Delete' }).click();
  await expect(page.getByRole('status')).toContainText('Successfully Deleted');
  await expect(vikram).toHaveCount(0);
  await expect(page.getByTestId('records-found')).toHaveText('(13) Records Found');
});
`,
    selenium: javaClass(
      "DeleteEmployeeTest",
      "/sandbox/peopledesk",
      `    @Test
    public void deleteWithConfirmation() {
${javaHrLogin}
        wait.until(ExpectedConditions.elementToBeClickable(By.xpath("//aside//a[text()='PIM']"))).click();
        By vikram = By.xpath("//tr[@data-test='employee-row'][contains(., 'Vikram')]");

        driver.findElement(By.cssSelector("[aria-label='Delete Vikram Singh']")).click();
        driver.findElement(By.xpath("//button[text()='No, Cancel']")).click();
        Assert.assertEquals(driver.findElements(vikram).size(), 1);

        driver.findElement(By.cssSelector("[aria-label='Delete Vikram Singh']")).click();
        driver.findElement(By.xpath("//button[text()='Yes, Delete']")).click();
        wait.until(ExpectedConditions.invisibilityOfElementLocated(vikram));
        Assert.assertEquals(driver.findElement(By.cssSelector("[data-test=records-found]")).getText(), "(13) Records Found");
    }`,
    ),
    notes: [
      "Always test the Cancel branch of a destructive action. It is the one users rely on most.",
      "Checking the total count (5) proves only one record was removed.",
      "toHaveCount(0) is the web-first way to wait for something to disappear.",
    ],
  },
  "trendkart-search": {
    playwright:
      pwHeader +
      `test('search returns only shirts', async ({ page }) => {
  await page.goto('/');
  const search = page.getByPlaceholder('Search for products, brands and more');
  await search.fill('shirt');
  await search.press('Enter');

  await expect(page.getByTestId('results-count')).toHaveText('- 5 items');
  const names = await page.getByTestId('product-card').locator('.product-product').allInnerTexts();
  expect(names).toHaveLength(5);
  for (const name of names) {
    expect(name).toContain('Shirt');
  }
});
`,
    selenium: javaClass(
      "SearchTest",
      "/sandbox/trendkart",
      `    @Test
    public void searchReturnsOnlyShirts() {
        driver.get(BASE + "#/");
        WebElement search = driver.findElement(By.id("search"));
        search.sendKeys("shirt");
        search.sendKeys(Keys.ENTER);

        wait.until(ExpectedConditions.invisibilityOfElementLocated(By.cssSelector("[data-testid=loader]")));
        Assert.assertEquals(driver.findElement(By.cssSelector("[data-testid=results-count]")).getText(), "- 5 items");
        List<WebElement> names = driver.findElements(By.cssSelector("[data-testid=product-card] .product-product"));
        Assert.assertEquals(names.size(), 5);
        for (WebElement n : names) Assert.assertTrue(n.getText().contains("Shirt"), n.getText());
    }`,
    ),
    notes: [
      "The first web-first assertion waits for the spinner to go away, so allInnerTexts() reads the final list.",
      "Reading the list before that assertion would race the loader. That is the bug sleeps try to hide.",
      "In Selenium, wait for the loader to disappear explicitly instead of Thread.sleep.",
    ],
  },
  "trendkart-filters": {
    playwright:
      pwHeader +
      `const price = (s: string) => Number(s.replace(/[^0-9]/g, ''));

test('filters and sort apply together', async ({ page }) => {
  await page.goto('/');
  await page.getByPlaceholder('Search for products, brands and more').fill('shirt');
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('results-count')).toHaveText('- 5 items');

  await page.getByLabel('Roadway').check();
  await expect(page.getByTestId('results-count')).toHaveText('- 2 items');
  await page.getByLabel('Urbanline').check();
  await expect(page.getByTestId('results-count')).toHaveText('- 3 items');
  await page.getByLabel('₹0 to ₹999').check();
  await expect(page.getByTestId('results-count')).toHaveText('- 2 items');
  await page.getByLabel('Sort by').selectOption('price_desc');
  await expect(page.getByLabel('Sort by')).toHaveValue('price_desc');

  const cards = page.getByTestId('product-card');
  const brands = await cards.locator('.product-brand').allTextContents();
  const prices = (await cards.getByTestId('product-price').allTextContents()).map(price);

  for (const b of brands) expect(['Roadway', 'Urbanline']).toContain(b);
  for (const p of prices) expect(p).toBeLessThanOrEqual(999);
  expect(prices).toEqual([...prices].sort((a, b) => b - a));
});
`,
    selenium: javaClass(
      "FilterSortTest",
      "/sandbox/trendkart",
      `    static int price(String s) { return Integer.parseInt(s.replaceAll("[^0-9]", "")); }

    void waitForCount(String text) {
        wait.until(ExpectedConditions.textToBe(By.cssSelector("[data-testid=results-count]"), text));
    }

    @Test
    public void filtersAndSortApplyTogether() {
        driver.get(BASE + "#/products?q=shirt");
        waitForCount("- 5 items");
        driver.findElement(By.xpath("//label[contains(., 'Roadway')]/input")).click();
        waitForCount("- 2 items");
        driver.findElement(By.xpath("//label[contains(., 'Urbanline')]/input")).click();
        waitForCount("- 3 items");
        driver.findElement(By.xpath("//label[contains(., '₹0 to ₹999')]/input")).click();
        waitForCount("- 2 items");
        new Select(driver.findElement(By.id("sort"))).selectByValue("price_desc");
        wait.until(ExpectedConditions.urlContains("sort=price_desc"));
        waitForCount("- 2 items");

        List<Integer> prices = new ArrayList<>();
        for (WebElement card : driver.findElements(By.cssSelector("[data-testid=product-card]"))) {
            String brand = card.findElement(By.cssSelector(".product-brand")).getText();
            Assert.assertTrue(brand.equals("Roadway") || brand.equals("Urbanline"), brand);
            prices.add(price(card.findElement(By.cssSelector("[data-testid=product-price]")).getText()));
        }
        List<Integer> sorted = new ArrayList<>(prices);
        sorted.sort(Collections.reverseOrder());
        Assert.assertEquals(prices, sorted);
        for (int p : prices) Assert.assertTrue(p <= 999);
    }`,
    ),
    notes: [
      "Each filter reloads the list. Waiting on the count text after every step stops you reading stale cards.",
      "Assert every card against every rule: brand, price ceiling and order. One card is not proof.",
      "In Selenium, a stale element exception here means you kept a reference across a re-render.",
    ],
  },
  "trendkart-size-bag": {
    playwright:
      pwHeader +
      `test('size must be chosen before adding to bag', async ({ page }) => {
  await page.goto('/');
  await page.getByPlaceholder('Search for products, brands and more').fill('shirt');
  await page.keyboard.press('Enter');
  await page.getByTestId('product-card').filter({ hasText: 'Men Slim Fit Casual Shirt' }).click();
  await expect(page.getByTestId('pdp-name')).toHaveText('Men Slim Fit Casual Shirt');

  await page.getByRole('button', { name: 'ADD TO BAG' }).click();
  await expect(page.getByRole('alert')).toHaveText('Please select a size');

  const sizes = page.getByRole('group', { name: 'Select size' });
  await expect(sizes.getByRole('button', { name: 'XL', exact: true })).toBeDisabled();
  await sizes.getByRole('button', { name: 'M', exact: true }).click();
  await page.getByRole('button', { name: 'ADD TO BAG' }).click();
  await expect(page.getByTestId('bag-count')).toHaveText('1');

  await page.getByRole('button', { name: 'Bag', exact: true }).click();
  await expect(page.getByTestId('bag-item')).toHaveCount(1);
  await expect(page.getByTestId('bag-item-name')).toHaveText('Men Slim Fit Casual Shirt');
  await expect(page.getByTestId('bag-item-size')).toHaveText('Size: M');
});
`,
    selenium: javaClass(
      "SizeAndBagTest",
      "/sandbox/trendkart",
      `    @Test
    public void sizeIsRequired() {
        driver.get(BASE + "#/p/101");
        driver.findElement(By.cssSelector("[data-testid=add-to-bag]")).click();
        Assert.assertEquals(driver.findElement(By.cssSelector("[data-testid=size-error]")).getText(), "Please select a size");

        Assert.assertFalse(driver.findElement(By.cssSelector("[data-size=XL]")).isEnabled());
        driver.findElement(By.cssSelector("[data-size=M]")).click();
        driver.findElement(By.cssSelector("[data-testid=add-to-bag]")).click();
        Assert.assertEquals(driver.findElement(By.cssSelector("[data-testid=bag-count]")).getText(), "1");

        driver.findElement(By.cssSelector("[data-testid=bag-link]")).click();
        Assert.assertEquals(driver.findElement(By.cssSelector("[data-testid=bag-item-size]")).getText(), "Size: M");
    }`,
    ),
    notes: [
      "exact: true matters here: without it, the button named \"M\" also matches nothing else today, but \"L\" would match \"XL\".",
      "A disabled out-of-stock size is a business rule, so assert it instead of skipping it.",
      "Verify the result on the bag page as well, not only the header badge.",
    ],
  },
  "trendkart-coupon": {
    playwright:
      pwHeader +
      `test('coupon and delivery rules', async ({ page }) => {
  await page.goto('/p/104');
  await page.getByRole('button', { name: 'M', exact: true }).click();
  await page.getByRole('button', { name: 'ADD TO BAG' }).click();
  await page.getByRole('button', { name: 'Bag', exact: true }).click();

  const coupon = page.getByLabel('Coupon code');
  await coupon.fill('WRONG');
  await page.getByRole('button', { name: 'Apply' }).click();
  await expect(page.getByTestId('coupon-message')).toHaveText('Invalid coupon code');

  await coupon.fill('TRENDY10');
  await page.getByRole('button', { name: 'Apply' }).click();
  await expect(page.getByTestId('coupon-discount')).toHaveText('-₹40');
  await expect(page.getByTestId('delivery-fee')).toHaveText('₹99');
  await expect(page.getByTestId('total-amount')).toHaveText('₹458');

  await page.getByLabel(/Quantity/).selectOption('3');
  await expect(page.getByTestId('delivery-fee')).toHaveText('FREE');
  await expect(page.getByTestId('coupon-discount')).toHaveText('-₹120');
  await expect(page.getByTestId('total-amount')).toHaveText('₹1,077');
});
`,
    selenium: javaClass(
      "CouponTest",
      "/sandbox/trendkart",
      `    String text(String testId) { return driver.findElement(By.cssSelector("[data-testid=" + testId + "]")).getText(); }

    @Test
    public void couponAndDeliveryRules() {
        driver.get(BASE + "#/p/104");
        driver.findElement(By.cssSelector("[data-size=M]")).click();
        driver.findElement(By.cssSelector("[data-testid=add-to-bag]")).click();
        driver.findElement(By.cssSelector("[data-testid=bag-link]")).click();

        WebElement coupon = driver.findElement(By.id("coupon"));
        coupon.sendKeys("WRONG");
        driver.findElement(By.xpath("//form[@id='coupon-form']//button")).click();
        Assert.assertEquals(text("coupon-message"), "Invalid coupon code");

        coupon = driver.findElement(By.id("coupon"));
        coupon.clear();
        coupon.sendKeys("TRENDY10");
        driver.findElement(By.xpath("//form[@id='coupon-form']//button")).click();
        Assert.assertEquals(text("coupon-discount"), "-₹40");
        Assert.assertEquals(text("delivery-fee"), "₹99");

        new Select(driver.findElement(By.cssSelector("select[data-qty='0']"))).selectByVisibleText("3");
        wait.until(ExpectedConditions.textToBe(By.cssSelector("[data-testid=delivery-fee]"), "FREE"));
        Assert.assertEquals(text("total-amount"), "₹1,077");
    }`,
    ),
    notes: [
      "₹399 minus 10% is ₹359.10, below ₹999, so delivery is ₹99. Three items: ₹1,197 minus ₹120 is ₹1,077, so delivery is free.",
      "Crossing a threshold in the same test (₹99 then FREE) proves the rule is recalculated, not set once.",
      "Re-find elements after the page re-renders (coupon = driver.findElement(...)) to avoid stale references.",
    ],
  },
  "swagshop-pom-framework": withFiles({
    files: {
      "tests/checkout.spec.ts": `import { test, expect } from '../fixtures';

test('badge shows the number of items in the cart', async ({ inventory }) => {
  await inventory.addToCart('Trail Runner Backpack');
  await inventory.addToCart('Night Ride Bike Light');
  expect(await inventory.cartCount()).toBe(2);
});

test('products sort by price low to high', async ({ inventory }) => {
  await inventory.sortBy('lohi');
  const prices = await inventory.prices();
  expect(prices).toHaveLength(12);
  expect(prices).toEqual([...prices].sort((a, b) => a - b));
});
`,
      "fixtures.ts": `import { test as base } from '@playwright/test';
import { LoginPage } from './pages/login.page';
import { InventoryPage } from './pages/inventory.page';

export const test = base.extend<{ inventory: InventoryPage }>({
  inventory: async ({ page }, use) => {
    const login = new LoginPage(page);
    await login.goto();
    await login.login('standard_user', 'secret_sauce');
    await use(new InventoryPage(page));
  },
});

export { expect } from '@playwright/test';
`,
      "pages/login.page.ts": `import type { Page } from '@playwright/test';

export class LoginPage {
  constructor(private readonly page: Page) {}

  async goto() {
    await this.page.goto('/');
  }

  async login(username: string, password: string) {
    await this.page.getByPlaceholder('Username').fill(username);
    await this.page.getByPlaceholder('Password').fill(password);
    await this.page.getByRole('button', { name: 'Login' }).click();
  }
}
`,
      "pages/inventory.page.ts": `import { expect, type Page } from '@playwright/test';

export class InventoryPage {
  constructor(private readonly page: Page) {}

  private card(productName: string) {
    return this.page.getByTestId('inventory-item').filter({ hasText: productName });
  }

  async addToCart(productName: string) {
    const card = this.card(productName);
    await card.getByRole('button', { name: 'Add to cart' }).click();
    await expect(card.getByRole('button', { name: 'Remove' })).toBeVisible(); // the cart call has completed
  }

  async cartCount(): Promise<number> {
    const badge = this.page.getByTestId('shopping-cart-badge');
    return (await badge.count()) ? Number(await badge.textContent()) : 0;
  }

  async sortBy(value: 'az' | 'za' | 'lohi' | 'hilo') {
    await this.page.getByTestId('product-sort-container').selectOption(value);
  }

  async prices(): Promise<number[]> {
    const texts = await this.page.getByTestId('inventory-item-price').allTextContents();
    return texts.map((t) => Number(t.replace('$', '')));
  }
}
`,
    },
    selenium: `// ===== src/test/java/pages/LoginPage.java =====
package pages;

import org.openqa.selenium.By;
import org.openqa.selenium.WebDriver;

public class LoginPage {
    private final WebDriver driver;
    public LoginPage(WebDriver driver) { this.driver = driver; }

    public void open(String baseUrl) { driver.get(baseUrl + "#/"); }

    public InventoryPage login(String user, String password) {
        driver.findElement(By.id("user-name")).sendKeys(user);
        driver.findElement(By.id("password")).sendKeys(password);
        driver.findElement(By.id("login-button")).click();
        return new InventoryPage(driver);
    }
}

// ===== src/test/java/pages/InventoryPage.java =====
package pages;

import org.openqa.selenium.*;
import org.openqa.selenium.support.ui.Select;
import java.util.*;

public class InventoryPage {
    private final WebDriver driver;
    public InventoryPage(WebDriver driver) { this.driver = driver; }

    public void addToCart(String productName) {
        driver.findElement(By.xpath("//div[@data-test='inventory-item'][contains(., '" + productName + "')]//button")).click();
    }

    public int cartCount() {
        List<WebElement> badge = driver.findElements(By.cssSelector("[data-test=shopping-cart-badge]"));
        return badge.isEmpty() ? 0 : Integer.parseInt(badge.get(0).getText());
    }

    public void sortBy(String value) {
        new Select(driver.findElement(By.cssSelector("[data-test=product-sort-container]"))).selectByValue(value);
    }

    public List<Double> prices() {
        List<Double> out = new ArrayList<>();
        for (WebElement e : driver.findElements(By.cssSelector("[data-test=inventory-item-price]")))
            out.add(Double.parseDouble(e.getText().replace("$", "")));
        return out;
    }
}

// ===== src/test/java/tests/BaseTest.java =====
package tests;

import org.openqa.selenium.WebDriver;
import org.openqa.selenium.chrome.ChromeDriver;
import org.testng.annotations.*;
import pages.*;

public class BaseTest {
    protected static final String BASE = "https://interview.qatechlabs.com/sandbox/swagshop";
    protected WebDriver driver;
    protected InventoryPage inventory;   // the "fixture": every test starts logged in

    @BeforeMethod
    public void setUp() {
        driver = new ChromeDriver();
        LoginPage login = new LoginPage(driver);
        login.open(BASE);
        inventory = login.login("standard_user", "secret_sauce");
    }

    @AfterMethod(alwaysRun = true)
    public void tearDown() { driver.quit(); }
}

// ===== src/test/java/tests/CheckoutTest.java =====
package tests;

import org.testng.Assert;
import org.testng.annotations.Test;
import java.util.*;

public class CheckoutTest extends BaseTest {
    @Test
    public void badgeShowsCartCount() {
        inventory.addToCart("Trail Runner Backpack");
        inventory.addToCart("Night Ride Bike Light");
        Assert.assertEquals(inventory.cartCount(), 2);
    }

    @Test
    public void sortsByPriceLowToHigh() {
        inventory.sortBy("lohi");
        List<Double> prices = inventory.prices();
        List<Double> sorted = new ArrayList<>(prices);
        Collections.sort(sorted);
        Assert.assertEquals(prices, sorted);
    }
}
`,
    notes: [
      "Page objects own the locators; tests own the intent. If the spec contains getByRole, the abstraction leaked.",
      "A fixture that logs in replaces copy-pasted beforeEach blocks and makes every test start from a known state.",
      "In Selenium the same shape is a BaseTest with @BeforeMethod; in Playwright it is test.extend, which is lazy and composable.",
      "Keep page object methods returning data (prices()) rather than asserting. Assertions belong in the test.",
    ],
  }),
  "peopledesk-fixture-teardown": withFiles({
    files: {
      "tests/employee-search.spec.ts": `import { test, expect } from '../fixtures';
import { EmployeesPage } from '../pages/employees.page';

test('a new employee can be found by name', async ({ adminPage, employee }) => {
  const employees = new EmployeesPage(adminPage);
  await employees.open();
  await employees.search(employee.first);

  await expect(adminPage.getByTestId('records-found')).toHaveText('(1) Record Found');
  await expect(adminPage.getByTestId('employee-row')).toContainText(employee.last);
});
`,
      "fixtures.ts": `import { test as base, type Page } from '@playwright/test';
import { LoginPage } from './pages/login.page';
import { EmployeesPage } from './pages/employees.page';

export interface Employee {
  first: string;
  last: string;
  id: string;
}

export const test = base.extend<{ adminPage: Page; employee: Employee }>({
  adminPage: async ({ page }, use) => {
    await new LoginPage(page).login('Admin', 'admin123');
    await use(page);
  },

  employee: async ({ adminPage }, use) => {
    const first = \`Auto\${Date.now()}\`;
    const last = 'Fixture';
    const employees = new EmployeesPage(adminPage);
    await employees.open();
    const id = await employees.add(first, last);

    await use({ first, last, id });

    // teardown: leave the system as we found it
    await employees.open();
    await employees.delete(first, last);
  },
});

export { expect } from '@playwright/test';
`,
      "pages/login.page.ts": `import type { Page } from '@playwright/test';

export class LoginPage {
  constructor(private readonly page: Page) {}

  async login(username: string, password: string) {
    await this.page.goto('/');
    await this.page.getByLabel('Username').fill(username);
    await this.page.getByLabel('Password').fill(password);
    await this.page.getByRole('button', { name: 'Login' }).click();
  }
}
`,
      "pages/employees.page.ts": `import type { Page } from '@playwright/test';

export class EmployeesPage {
  constructor(private readonly page: Page) {}

  async open() {
    await this.page.getByRole('link', { name: 'PIM' }).click();
  }

  async add(first: string, last: string): Promise<string> {
    await this.page.getByRole('button', { name: '+ Add' }).click();
    await this.page.getByLabel('First Name').fill(first);
    await this.page.getByLabel('Last Name').fill(last);
    const id = await this.page.getByLabel('Employee Id').inputValue();
    await this.page.getByRole('button', { name: 'Save' }).click();
    await this.page.getByRole('status').filter({ hasText: 'Successfully Saved' }).waitFor();
    return id;
  }

  async search(name: string) {
    await this.page.getByLabel('Employee Name').fill(name);
    await this.page.getByRole('button', { name: 'Search' }).click();
  }

  async delete(first: string, last: string) {
    await this.page.getByRole('button', { name: \`Delete \${first} \${last}\` }).click();
    await this.page.getByRole('dialog').getByRole('button', { name: 'Yes, Delete' }).click();
    await this.page.getByRole('status').filter({ hasText: 'Successfully Deleted' }).waitFor();
  }
}
`,
    },
    selenium: `// ===== src/test/java/pages/EmployeesPage.java =====
package pages;

import org.openqa.selenium.*;
import org.openqa.selenium.support.ui.*;
import java.time.Duration;

public class EmployeesPage {
    private final WebDriver driver;
    private final WebDriverWait wait;
    public EmployeesPage(WebDriver driver) {
        this.driver = driver;
        this.wait = new WebDriverWait(driver, Duration.ofSeconds(10));
    }

    public void open() { driver.findElement(By.xpath("//aside//a[text()='PIM']")).click(); }

    public String add(String first, String last) {
        driver.findElement(By.xpath("//button[text()='+ Add']")).click();
        driver.findElement(By.id("firstName")).sendKeys(first);
        driver.findElement(By.id("lastName")).sendKeys(last);
        String id = driver.findElement(By.id("employeeId")).getAttribute("value");
        driver.findElement(By.xpath("//button[text()='Save']")).click();
        wait.until(ExpectedConditions.textToBePresentInElementLocated(By.cssSelector("[role=status]"), "Successfully Saved"));
        return id;
    }

    public void search(String name) {
        driver.findElement(By.id("search-name")).sendKeys(name);
        driver.findElement(By.xpath("//button[text()='Search']")).click();
    }

    public void delete(String first, String last) {
        driver.findElement(By.cssSelector("[aria-label='Delete " + first + " " + last + "']")).click();
        driver.findElement(By.xpath("//button[text()='Yes, Delete']")).click();
        wait.until(ExpectedConditions.textToBePresentInElementLocated(By.cssSelector("[role=status]"), "Successfully Deleted"));
    }
}

// ===== src/test/java/tests/EmployeeSearchTest.java =====
package tests;

import org.openqa.selenium.*;
import org.openqa.selenium.chrome.ChromeDriver;
import org.testng.Assert;
import org.testng.annotations.*;
import pages.*;

public class EmployeeSearchTest {
    static final String BASE = "https://interview.qatechlabs.com/sandbox/peopledesk";
    WebDriver driver;
    EmployeesPage employees;
    String first, last = "Fixture";

    @BeforeMethod
    public void createEmployee() {               // the "fixture" setup
        driver = new ChromeDriver();
        driver.get(BASE + "#/auth/login");
        driver.findElement(By.id("username")).sendKeys("Admin");
        driver.findElement(By.id("password")).sendKeys("admin123");
        driver.findElement(By.cssSelector("#login-form button[type=submit]")).click();
        employees = new EmployeesPage(driver);
        employees.open();
        first = "Auto" + System.currentTimeMillis();
        employees.add(first, last);
    }

    @Test
    public void newEmployeeIsSearchable() {
        employees.open();
        employees.search(first);
        Assert.assertEquals(driver.findElement(By.cssSelector("[data-test=records-found]")).getText(), "(1) Record Found");
        Assert.assertTrue(driver.findElement(By.cssSelector("[data-test=employee-row]")).getText().contains(first + " " + last));
    }

    @AfterMethod(alwaysRun = true)
    public void deleteEmployee() {               // the "fixture" teardown, runs even when the test fails
        try {
            employees.open();
            employees.delete(first, last);
        } finally {
            driver.quit();
        }
    }
}
`,
    notes: [
      "Everything after await use() is teardown and runs even when the test fails, so the data never leaks into the next run.",
      "Fixture dependencies (employee needs adminPage) make the setup order explicit instead of hidden in beforeEach ordering.",
      "In a real project the fixture would create the employee through the API and only use the UI for the behaviour under test.",
      "Waiting for the toast inside add() and delete() makes the page object safe to call back to back.",
    ],
  }),
  "trendkart-data-driven": withFiles({
    files: {
      "tests/search.spec.ts": `import { test, expect } from '@playwright/test';
import { SEARCHES } from '../data/searches';
import { parsePrice } from '../helpers/money';
import { SearchPage } from '../pages/search.page';

for (const row of SEARCHES) {
  test(\`search "\${row.query}" returns \${row.expectedCount} matching products\`, async ({ page }) => {
    const search = new SearchPage(page);
    await search.goto();
    await search.search(row.query);

    expect(await search.resultCount()).toBe(row.expectedCount);
    const names = await search.productNames();
    expect(names).toHaveLength(row.expectedCount);
    for (const name of names) expect(name).toContain(row.mustContain);
  });
}

test('results sort by price low to high', async ({ page }) => {
  const search = new SearchPage(page);
  await search.goto();
  await search.search('shirt');
  await search.sortBy('price_asc');

  const prices = (await search.prices()).map(parsePrice);
  expect(prices).toHaveLength(5);
  expect(prices).toEqual([...prices].sort((a, b) => a - b));
});
`,
      "data/searches.ts": `export interface SearchCase {
  query: string;
  expectedCount: number;
  mustContain: string;
}

export const SEARCHES: SearchCase[] = [
  { query: 'shirt', expectedCount: 5, mustContain: 'Shirt' },
  { query: 'jeans', expectedCount: 2, mustContain: 'Jeans' },
  { query: 'kurta', expectedCount: 3, mustContain: 'Kurta' },
];
`,
      "helpers/money.ts": `/** "₹1,199" → 1199 */
export function parsePrice(text: string): number {
  return Number(text.replace(/[^0-9.]/g, ''));
}
`,
      "pages/search.page.ts": `import { expect, type Page } from '@playwright/test';

export class SearchPage {
  constructor(private readonly page: Page) {}

  async goto() {
    await this.page.goto('/');
  }

  async search(query: string) {
    const box = this.page.getByPlaceholder('Search for products, brands and more');
    await box.fill(query);
    await box.press('Enter');
    await expect(this.page.getByTestId('loader')).toBeHidden();
  }

  async resultCount(): Promise<number> {
    const text = await this.page.getByTestId('results-count').textContent();
    return Number((text ?? '').replace(/[^0-9]/g, ''));
  }

  async productNames(): Promise<string[]> {
    return this.page.getByTestId('product-card').locator('.product-product').allInnerTexts();
  }

  async prices(): Promise<string[]> {
    return this.page.getByTestId('product-card').getByTestId('product-price').allTextContents();
  }

  async sortBy(value: 'price_asc' | 'price_desc' | 'rating' | 'discount') {
    await this.page.getByLabel('Sort by').selectOption(value);
    await expect(this.page.getByTestId('loader')).toBeHidden();
    await expect(this.page.getByLabel('Sort by')).toHaveValue(value);
  }
}
`,
    },
    selenium: `// ===== src/test/java/data/SearchCases.java =====
package data;

import org.testng.annotations.DataProvider;

public class SearchCases {
    @DataProvider(name = "searches")
    public static Object[][] searches() {
        return new Object[][] {
            { "shirt", 5, "Shirt" },
            { "jeans", 2, "Jeans" },
            { "kurta", 3, "Kurta" },
        };
    }
}

// ===== src/test/java/helpers/Money.java =====
package helpers;

public class Money {
    public static int parsePrice(String text) { return Integer.parseInt(text.replaceAll("[^0-9]", "")); }
}

// ===== src/test/java/pages/SearchPage.java =====
package pages;

import org.openqa.selenium.*;
import org.openqa.selenium.support.ui.*;
import java.time.Duration;
import java.util.*;
import java.util.stream.Collectors;

public class SearchPage {
    private final WebDriver driver;
    private final WebDriverWait wait;
    public SearchPage(WebDriver driver) {
        this.driver = driver;
        this.wait = new WebDriverWait(driver, Duration.ofSeconds(10));
    }

    public void search(String query) {
        WebElement box = driver.findElement(By.id("search"));
        box.clear();
        box.sendKeys(query, Keys.ENTER);
        wait.until(ExpectedConditions.invisibilityOfElementLocated(By.cssSelector("[data-testid=loader]")));
    }

    public int resultCount() {
        return Integer.parseInt(driver.findElement(By.cssSelector("[data-testid=results-count]")).getText().replaceAll("[^0-9]", ""));
    }

    public List<String> productNames() {
        return driver.findElements(By.cssSelector("[data-testid=product-card] .product-product")).stream().map(WebElement::getText).collect(Collectors.toList());
    }

    public List<String> prices() {
        return driver.findElements(By.cssSelector("[data-testid=product-card] [data-testid=product-price]")).stream().map(WebElement::getText).collect(Collectors.toList());
    }

    public void sortBy(String value) {
        new Select(driver.findElement(By.id("sort"))).selectByValue(value);
        wait.until(ExpectedConditions.urlContains("sort=" + value));
        wait.until(ExpectedConditions.invisibilityOfElementLocated(By.cssSelector("[data-testid=loader]")));
    }
}

// ===== src/test/java/tests/SearchTest.java =====
package tests;

import data.SearchCases;
import helpers.Money;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.chrome.ChromeDriver;
import org.testng.Assert;
import org.testng.annotations.*;
import pages.SearchPage;
import java.util.*;

public class SearchTest {
    static final String BASE = "https://interview.qatechlabs.com/sandbox/trendkart";
    WebDriver driver;
    SearchPage search;

    @BeforeMethod
    public void setUp() {
        driver = new ChromeDriver();
        driver.get(BASE + "#/");
        search = new SearchPage(driver);
    }

    @Test(dataProvider = "searches", dataProviderClass = SearchCases.class)
    public void searchReturnsMatchingProducts(String query, int expectedCount, String mustContain) {
        search.search(query);
        Assert.assertEquals(search.resultCount(), expectedCount);
        List<String> names = search.productNames();
        Assert.assertEquals(names.size(), expectedCount);
        for (String n : names) Assert.assertTrue(n.contains(mustContain), n);
    }

    @Test
    public void sortsByPriceLowToHigh() {
        search.search("shirt");
        search.sortBy("price_asc");
        List<Integer> prices = new ArrayList<>();
        for (String p : search.prices()) prices.add(Money.parsePrice(p));
        List<Integer> sorted = new ArrayList<>(prices);
        Collections.sort(sorted);
        Assert.assertEquals(prices, sorted);
    }

    @AfterMethod(alwaysRun = true)
    public void tearDown() { driver.quit(); }
}
`,
    notes: [
      "A loop at file level registers one named test per row, so a failure names the exact search term instead of \"row 3\".",
      "The page object waits for the loader to disappear inside search() and sortBy(), so no test needs a sleep.",
      "Helpers like parsePrice are pure functions: unit-test them separately and reuse them across page objects.",
      "TestNG's @DataProvider is the Java equivalent. Interviewers often ask you to compare the two.",
    ],
  }),
  // ---------------- Real sites ----------------
  "saucedemo-login": {
    playwright:
      pwHeader +
      `test('standard user lands on the products page', async ({ page }) => {
  await page.goto('/');
  await page.getByPlaceholder('Username').fill('standard_user');
  await page.getByPlaceholder('Password').fill('secret_sauce');
  await page.getByRole('button', { name: 'Login' }).click();

  await expect(page).toHaveURL(/inventory\\.html/);
  await expect(page.getByTestId('title')).toHaveText('Products');
  await expect(page.getByTestId('inventory-item')).toHaveCount(6);
});

test('locked out user sees an error', async ({ page }) => {
  await page.goto('/');
  await page.getByPlaceholder('Username').fill('locked_out_user');
  await page.getByPlaceholder('Password').fill('secret_sauce');
  await page.getByRole('button', { name: 'Login' }).click();

  await expect(page.getByTestId('error')).toContainText('locked out');
  await expect(page).toHaveURL(/saucedemo\\.com\\/?$/);
});
`,
    selenium: javaClass(
      "SauceDemoLoginTest",
      "https://www.saucedemo.com",
      `    private void login(String user) {
        driver.get(BASE + "/");
        driver.findElement(By.id("user-name")).sendKeys(user);
        driver.findElement(By.id("password")).sendKeys("secret_sauce");
        driver.findElement(By.id("login-button")).click();
    }

    @Test
    public void standardUserLandsOnProducts() {
        login("standard_user");
        wait.until(ExpectedConditions.urlContains("/inventory.html"));
        Assert.assertEquals(driver.findElement(By.cssSelector("[data-test=title]")).getText(), "Products");
        Assert.assertEquals(driver.findElements(By.cssSelector("[data-test=inventory-item]")).size(), 6);
    }

    @Test
    public void lockedOutUserSeesError() {
        login("locked_out_user");
        WebElement error = wait.until(ExpectedConditions.visibilityOfElementLocated(By.cssSelector("[data-test=error]")));
        Assert.assertTrue(error.getText().contains("locked out"), error.getText());
    }`,
    ),
    notes: [
      "The locked-out test asserts the error text and that the URL did not change: a negative test proves both that the wrong thing didn't happen and that the right message appeared.",
      "getByTestId maps to data-testid by default; Playwright's config here sets it to data-test, which is what Sauce Demo uses. Mention the config, interviewers notice.",
      "On CI the run is identical to local: the project's playwright.config.ts gets the base URL from LAB_BASE_URL.",
    ],
  },
  "saucedemo-pom-framework": withFiles({
    files: {
      "tests/shop.spec.ts": `import { test, expect } from '../fixtures';
import { CartPage } from '../pages/cart.page';

test('two items added show in the badge and the cart', async ({ inventory, page }) => {
  await inventory.addToCart('Sauce Labs Backpack');
  await inventory.addToCart('Sauce Labs Bike Light');
  expect(await inventory.cartCount()).toBe(2);

  await inventory.openCart();
  const cart = new CartPage(page);
  expect(await cart.itemNames()).toEqual(['Sauce Labs Backpack', 'Sauce Labs Bike Light']);
});

test('sorting low to high orders prices ascending', async ({ inventory }) => {
  await inventory.sortBy('lohi');
  const prices = await inventory.prices();
  expect(prices).toHaveLength(12);
  expect(prices).toEqual([...prices].sort((a, b) => a - b));
});
`,
      "fixtures.ts": `import { test as base } from '@playwright/test';
import { LoginPage } from './pages/login.page';
import { InventoryPage } from './pages/inventory.page';

export const test = base.extend<{ inventory: InventoryPage }>({
  inventory: async ({ page }, use) => {
    const login = new LoginPage(page);
    await login.goto();
    await login.login('standard_user', 'secret_sauce');
    await use(new InventoryPage(page));
  },
});

export { expect } from '@playwright/test';
`,
      "pages/login.page.ts": `import type { Page } from '@playwright/test';

export class LoginPage {
  constructor(private readonly page: Page) {}

  async goto() {
    await this.page.goto('/');
  }

  async login(username: string, password: string) {
    await this.page.getByPlaceholder('Username').fill(username);
    await this.page.getByPlaceholder('Password').fill(password);
    await this.page.getByRole('button', { name: 'Login' }).click();
    await this.page.waitForURL(/inventory\\.html/);
  }
}
`,
      "pages/inventory.page.ts": `import type { Page } from '@playwright/test';

export class InventoryPage {
  constructor(private readonly page: Page) {}

  private card(productName: string) {
    return this.page.locator('.inventory_item').filter({ hasText: productName });
  }

  async addToCart(productName: string) {
    const card = this.card(productName);
    await card.getByRole('button', { name: 'Add to cart' }).click();
    await expect(card.getByRole('button', { name: 'Remove' })).toBeVisible(); // the cart call has completed
  }

  async cartCount(): Promise<number> {
    const badge = this.page.locator('.shopping_cart_badge');
    return (await badge.count()) ? Number(await badge.textContent()) : 0;
  }

  async sortBy(value: 'az' | 'za' | 'lohi' | 'hilo') {
    await this.page.locator('select[data-test="product-sort-container"]').selectOption(value);
  }

  async prices(): Promise<number[]> {
    const texts = await this.page.locator('.inventory_item_price').allTextContents();
    return texts.map((t) => Number(t.replace('$', '')));
  }

  async openCart() {
    await this.page.locator('.shopping_cart_link').click();
    await this.page.waitForURL(/cart\\.html/);
  }
}
`,
      "pages/cart.page.ts": `import type { Page } from '@playwright/test';

export class CartPage {
  constructor(private readonly page: Page) {}

  async itemNames(): Promise<string[]> {
    return this.page.locator('.cart_item .inventory_item_name').allTextContents();
  }
}
`,
    },
    selenium: `// pages/LoginPage.java
public class LoginPage {
    private final WebDriver driver;
    public LoginPage(WebDriver driver) { this.driver = driver; }
    public void open() { driver.get("https://www.saucedemo.com/"); }
    public InventoryPage login(String user, String password) {
        driver.findElement(By.id("user-name")).sendKeys(user);
        driver.findElement(By.id("password")).sendKeys(password);
        driver.findElement(By.id("login-button")).click();
        new WebDriverWait(driver, Duration.ofSeconds(10)).until(ExpectedConditions.urlContains("/inventory.html"));
        return new InventoryPage(driver);
    }
}

// pages/InventoryPage.java
public class InventoryPage {
    private final WebDriver driver;
    public InventoryPage(WebDriver driver) { this.driver = driver; }
    private WebElement card(String name) {
        return driver.findElements(By.cssSelector(".inventory_item")).stream()
            .filter(c -> c.getText().contains(name)).findFirst().orElseThrow();
    }
    public void addToCart(String name) { card(name).findElement(By.cssSelector("button")).click(); }
    public int cartCount() {
        List<WebElement> b = driver.findElements(By.cssSelector(".shopping_cart_badge"));
        return b.isEmpty() ? 0 : Integer.parseInt(b.get(0).getText());
    }
    public void sortBy(String value) {
        new Select(driver.findElement(By.cssSelector("select[data-test=product-sort-container]"))).selectByValue(value);
    }
    public List<Double> prices() {
        return driver.findElements(By.cssSelector(".inventory_item_price")).stream()
            .map(e -> Double.parseDouble(e.getText().replace("$", ""))).toList();
    }
    public CartPage openCart() { driver.findElement(By.cssSelector(".shopping_cart_link")).click(); return new CartPage(driver); }
}

// pages/CartPage.java
public class CartPage {
    private final WebDriver driver;
    public CartPage(WebDriver driver) { this.driver = driver; }
    public List<String> itemNames() {
        return driver.findElements(By.cssSelector(".cart_item .inventory_item_name")).stream().map(WebElement::getText).toList();
    }
}

// tests/BaseTest.java  (the fixture)
public class BaseTest {
    protected WebDriver driver;
    protected InventoryPage inventory;
    @BeforeMethod public void setUp() {
        driver = new ChromeDriver();
        LoginPage login = new LoginPage(driver);
        login.open();
        inventory = login.login("standard_user", "secret_sauce");
    }
    @AfterMethod public void tearDown() { driver.quit(); }
}

// tests/ShopTest.java
public class ShopTest extends BaseTest {
    @Test public void twoItemsShowInBadgeAndCart() {
        inventory.addToCart("Sauce Labs Backpack");
        inventory.addToCart("Sauce Labs Bike Light");
        Assert.assertEquals(inventory.cartCount(), 2);
        Assert.assertEquals(inventory.openCart().itemNames(), List.of("Sauce Labs Backpack", "Sauce Labs Bike Light"));
    }
    @Test public void sortLowToHighOrdersPrices() {
        inventory.sortBy("lohi");
        List<Double> prices = inventory.prices();
        Assert.assertEquals(prices.size(), 12);
        Assert.assertEquals(prices, prices.stream().sorted().toList());
    }
}
`,
    notes: [
      "login() waits for the inventory URL before returning, so the fixture never hands over a half-loaded page. The wait belongs in the page object, not in every test.",
      "card(name) scopes every action to one product card. Scoped locators survive the page being reordered, which is exactly what the sort test does.",
      "cartCount() returns 0 when the badge is absent instead of throwing: a page object answers questions, it does not assert.",
      "On GitHub Actions the same code runs with a real browser, which is the point: the framework you built in the browser is a real Playwright project.",
    ],
  }),
  "orangehrm-login": {
    playwright:
      pwHeader +
      `test('Admin can log in and sees the dashboard', async ({ page }) => {
  await page.goto('/web/index.php/auth/login');
  await page.getByPlaceholder('Username').fill('Admin');
  await page.getByPlaceholder('Password').fill('admin123');
  await page.getByRole('button', { name: 'Login' }).click();

  await expect(page).toHaveURL(/\\/dashboard/);
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
});

test('wrong password shows Invalid credentials', async ({ page }) => {
  await page.goto('/web/index.php/auth/login');
  await page.getByPlaceholder('Username').fill('Admin');
  await page.getByPlaceholder('Password').fill('wrong-password');
  await page.getByRole('button', { name: 'Login' }).click();

  await expect(page.getByText('Invalid credentials')).toBeVisible();
  await expect(page).toHaveURL(/auth\\/login/);
});
`,
    selenium: javaClass(
      "OrangeHrmLoginTest",
      "https://opensource-demo.orangehrmlive.com",
      `    private void login(String user, String password) {
        driver.get(BASE + "/web/index.php/auth/login");
        wait.until(ExpectedConditions.visibilityOfElementLocated(By.name("username"))).sendKeys(user);
        driver.findElement(By.name("password")).sendKeys(password);
        driver.findElement(By.cssSelector("button[type=submit]")).click();
    }

    @Test
    public void adminSeesDashboard() {
        login("Admin", "admin123");
        wait.until(ExpectedConditions.urlContains("/dashboard"));
        WebElement heading = wait.until(ExpectedConditions.visibilityOfElementLocated(By.xpath("//h6[text()='Dashboard']")));
        Assert.assertTrue(heading.isDisplayed());
    }

    @Test
    public void wrongPasswordShowsError() {
        login("Admin", "wrong-password");
        WebElement alert = wait.until(ExpectedConditions.visibilityOfElementLocated(By.cssSelector(".oxd-alert-content-text")));
        Assert.assertEquals(alert.getText(), "Invalid credentials");
        Assert.assertTrue(driver.getCurrentUrl().contains("auth/login"));
    }`,
    ),
    notes: [
      "The OrangeHRM demo renders the login form after a loader, so the first action must wait for the input: web-first assertions and auto-waiting do that; Thread.sleep does not.",
      "The negative test asserts the message and that the URL stayed on the login page.",
      "Role-based locators (heading named Dashboard, button named Login) survive the CSS class changes OrangeHRM makes between versions; .oxd-* classes are a last resort.",
    ],
  },
  "orangehrm-pim-framework": withFiles({
    files: {
      "tests/employee.spec.ts": `import { test, expect } from '../fixtures';

test('a new employee appears on the personal details page', async ({ pim }) => {
  const first = 'Lab';
  const last = 'User' + Date.now().toString().slice(-8);

  await pim.addEmployee(first, last);

  expect(await pim.employeeName()).toBe(first + ' ' + last);
});
`,
      "fixtures.ts": `import { test as base } from '@playwright/test';
import { LoginPage } from './pages/login.page';
import { PimPage } from './pages/pim.page';

export const test = base.extend<{ pim: PimPage }>({
  pim: async ({ page }, use) => {
    const login = new LoginPage(page);
    await login.goto();
    await login.login('Admin', 'admin123');
    const pim = new PimPage(page);
    await pim.gotoAddEmployee();
    await use(pim);
  },
});

export { expect } from '@playwright/test';
`,
      "pages/login.page.ts": `import type { Page } from '@playwright/test';

export class LoginPage {
  constructor(private readonly page: Page) {}

  async goto() {
    await this.page.goto('/web/index.php/auth/login');
  }

  async login(username: string, password: string) {
    await this.page.getByPlaceholder('Username').fill(username);
    await this.page.getByPlaceholder('Password').fill(password);
    await this.page.getByRole('button', { name: 'Login' }).click();
    await this.page.waitForURL(/\\/dashboard/);
  }
}
`,
      "pages/pim.page.ts": `import { expect, type Page } from '@playwright/test';

export class PimPage {
  constructor(private readonly page: Page) {}

  async gotoAddEmployee() {
    await this.page.goto('/web/index.php/pim/addEmployee');
    await expect(this.page.getByRole('heading', { name: 'Add Employee' })).toBeVisible();
  }

  async addEmployee(firstName: string, lastName: string) {
    await this.page.locator('input[name="firstName"]').fill(firstName);
    await this.page.locator('input[name="lastName"]').fill(lastName);
    await this.page.getByRole('button', { name: 'Save' }).click();
    await this.page.waitForURL(/viewPersonalDetails/, { timeout: 30_000 });
  }

  async employeeName(): Promise<string> {
    const heading = this.page.locator('.orangehrm-edit-employee-name h6');
    await expect(heading).not.toHaveText('');
    return (await heading.textContent())?.trim() ?? '';
  }
}
`,
    },
    selenium: `// pages/PimPage.java
public class PimPage {
    private final WebDriver driver;
    private final WebDriverWait wait;
    public PimPage(WebDriver driver) {
        this.driver = driver;
        this.wait = new WebDriverWait(driver, Duration.ofSeconds(30));
    }
    public void openAddEmployee() {
        driver.get("https://opensource-demo.orangehrmlive.com/web/index.php/pim/addEmployee");
        wait.until(ExpectedConditions.visibilityOfElementLocated(By.name("firstName")));
    }
    public void addEmployee(String first, String last) {
        driver.findElement(By.name("firstName")).sendKeys(first);
        driver.findElement(By.name("lastName")).sendKeys(last);
        driver.findElement(By.cssSelector("button[type=submit]")).click();
        wait.until(ExpectedConditions.urlContains("viewPersonalDetails"));
    }
    public String employeeName() {
        By heading = By.cssSelector(".orangehrm-edit-employee-name h6");
        wait.until(d -> !d.findElement(heading).getText().isBlank());
        return driver.findElement(heading).getText().trim();
    }
}

// tests/BaseTest.java  (the fixture: logs in, opens Add Employee)
public class BaseTest {
    protected WebDriver driver;
    protected PimPage pim;
    @BeforeMethod public void setUp() {
        driver = new ChromeDriver();
        LoginPage login = new LoginPage(driver);   // same as in the login lab
        login.open();
        login.login("Admin", "admin123");
        pim = new PimPage(driver);
        pim.openAddEmployee();
    }
    @AfterMethod public void tearDown() { driver.quit(); }
}

// tests/EmployeeTest.java
public class EmployeeTest extends BaseTest {
    @Test public void newEmployeeShowsOnPersonalDetails() {
        String first = "Lab";
        String last = "User" + String.valueOf(System.currentTimeMillis()).substring(5);
        pim.addEmployee(first, last);
        Assert.assertEquals(pim.employeeName(), first + " " + last);
    }
}
`,
    notes: [
      "Date.now() in the last name makes every run unique, so two learners (or two retries) never collide on the shared demo database.",
      "The heading on the personal details page is filled asynchronously; employeeName() waits until it is non-empty before returning. Without that wait the test is flaky on a slow demo.",
      "Fixtures do setup (login, navigate). Tests do actions and assertions. Keep the fixture free of assertions about the feature under test.",
      "The demo resets regularly, so the test leaves its employee behind on purpose; in a real suite you'd delete it in the fixture's teardown after use().",
    ],
  }),
  "orangehrm-ui-api-employees": {
    playwright:
      pwHeader +
      `const EMPLOYEES = '/web/index.php/api/v2/pim/employees?limit=50&offset=0&includeEmployees=onlyCurrent&sortField=employee.firstName&sortOrder=ASC';

type EmployeeList = { data: { empNumber: number; firstName: string; lastName: string }[]; meta: { total: number } };

test('the Employee List count matches the PIM API', async ({ page }) => {
  await page.goto('/web/index.php/auth/login');
  await page.getByPlaceholder('Username').fill('Admin');
  await page.getByPlaceholder('Password').fill('admin123');
  await page.getByRole('button', { name: 'Login' }).click();
  await expect(page).toHaveURL(/\\/dashboard/);

  // UI layer: the employee list and its record count
  await page.goto('/web/index.php/pim/viewEmployeeList');
  const counter = page.getByText(/\\(\\d+\\) Records? Found/);
  await expect(counter).toBeVisible();
  const shown = Number((await counter.textContent())?.match(/\\d+/)?.[0]);
  expect(shown).toBeGreaterThan(0);

  // API layer, through the same browser session (page.request carries the cookies)
  const res = await page.request.get(EMPLOYEES);
  expect(res).toBeOK();
  const body = (await res.json()) as EmployeeList;
  expect(body.data.length).toBeGreaterThan(0);
  for (const e of body.data) {
    expect(e.empNumber).toEqual(expect.any(Number));
    expect(e.firstName).toEqual(expect.any(String));
  }
  // The demo is shared: someone may add an employee between the two reads, so allow a small drift.
  expect(Math.abs(shown - body.meta.total)).toBeLessThanOrEqual(3);
});

test('the API refuses a caller without a session', async ({ request }) => {
  const res = await request.get(EMPLOYEES, { maxRedirects: 0 });
  // Unauthenticated calls get a 401, or a 302 to the login page depending on the build.
  expect([401, 302]).toContain(res.status());
  expect(res.ok()).toBeFalsy();
});
`,
    selenium: `// Selenium Java + REST Assured + TestNG: the browser logs in, REST Assured reuses its session cookie
// (pom.xml: org.seleniumhq.selenium:selenium-java, io.rest-assured:rest-assured, org.testng:testng, com.google.code.gson:gson)
import io.restassured.RestAssured;
import io.restassured.response.Response;
import org.openqa.selenium.*;
import org.openqa.selenium.chrome.ChromeDriver;
import org.openqa.selenium.support.ui.*;
import org.testng.Assert;
import org.testng.annotations.*;
import java.time.Duration;
import java.util.regex.*;
import static io.restassured.RestAssured.given;

public class EmployeeListUiApiTest {
    static final String BASE = "https://opensource-demo.orangehrmlive.com";
    static final String EMPLOYEES = "/web/index.php/api/v2/pim/employees?limit=50&offset=0&includeEmployees=onlyCurrent";
    WebDriver driver;
    WebDriverWait wait;

    @BeforeClass
    public void setUp() {
        RestAssured.baseURI = BASE;
        driver = new ChromeDriver();
        wait = new WebDriverWait(driver, Duration.ofSeconds(30));
    }

    @Test
    public void employeeListCountMatchesApi() {
        driver.get(BASE + "/web/index.php/auth/login");
        wait.until(ExpectedConditions.visibilityOfElementLocated(By.name("username"))).sendKeys("Admin");
        driver.findElement(By.name("password")).sendKeys("admin123");
        driver.findElement(By.cssSelector("button[type=submit]")).click();
        wait.until(ExpectedConditions.urlContains("/dashboard"));

        driver.get(BASE + "/web/index.php/pim/viewEmployeeList");
        WebElement counter = wait.until(ExpectedConditions.visibilityOfElementLocated(By.xpath("//span[contains(., 'Records Found') or contains(., 'Record Found')]")));
        Matcher m = Pattern.compile("\\\\d+").matcher(counter.getText());
        Assert.assertTrue(m.find(), counter.getText());
        int shown = Integer.parseInt(m.group());

        // Same session, other layer: hand the browser's session cookie to REST Assured
        Cookie session = driver.manage().getCookieNamed("orangehrm");
        Response res = given().cookie(session.getName(), session.getValue()).get(EMPLOYEES);
        Assert.assertEquals(res.statusCode(), 200);
        var body = com.google.gson.JsonParser.parseString(res.asString()).getAsJsonObject();
        Assert.assertTrue(body.getAsJsonArray("data").size() > 0);
        int total = body.getAsJsonObject("meta").get("total").getAsInt();
        Assert.assertTrue(Math.abs(shown - total) <= 3, "UI " + shown + " vs API " + total);
    }

    @Test
    public void apiRefusesCallerWithoutSession() {
        Response res = given().redirects().follow(false).get(EMPLOYEES);
        Assert.assertTrue(res.statusCode() == 401 || res.statusCode() == 302, "status " + res.statusCode());
    }

    @AfterClass
    public void tearDown() {
        driver.quit();
    }
}
`,
    notes: [
      "page.request is the browser context's own APIRequestContext: it sends the cookies the UI login set, so no second login or CSRF dance is needed. The request fixture is a clean context, which is exactly what the negative test wants.",
      "OrangeHRM's UI calls this same endpoint to render the list, so the comparison proves the screen and the API read the same data. The tolerance exists because the demo database is shared and changes under you.",
      "Shape assertions (expect.any(Number) for empNumber) catch contract changes without hard-coding demo data that resets every few hours.",
      "The Selenium version reuses the browser's session cookie in REST Assured: the standard way to combine the layers in a Java stack.",
    ],
  },
  "automationexercise-signup": {
    playwright:
      pwHeader +
      `const stamp = Date.now();
const name = 'QIR Learner';
const email = \`qir-\${stamp}@example.com\`;

test('register a new user and delete the account', async ({ page }) => {
  await page.goto('/');
  await page.locator('a[href="/login"]').click();

  await page.locator('input[data-qa="signup-name"]').fill(name);
  await page.locator('input[data-qa="signup-email"]').fill(email);
  await page.locator('button[data-qa="signup-button"]').click();

  await expect(page.getByText('Enter Account Information')).toBeVisible();
  await page.locator('#id_gender1').check();
  await page.locator('input[data-qa="password"]').fill('Secret123!');
  await page.locator('select[data-qa="days"]').selectOption('10');
  await page.locator('select[data-qa="months"]').selectOption('May');
  await page.locator('select[data-qa="years"]').selectOption('1990');
  await page.locator('input[data-qa="first_name"]').fill('QIR');
  await page.locator('input[data-qa="last_name"]').fill('Learner');
  await page.locator('input[data-qa="address"]').fill('1 Test Street');
  await page.locator('select[data-qa="country"]').selectOption('India');
  await page.locator('input[data-qa="state"]').fill('Telangana');
  await page.locator('input[data-qa="city"]').fill('Hyderabad');
  await page.locator('input[data-qa="zipcode"]').fill('500001');
  await page.locator('input[data-qa="mobile_number"]').fill('9999999999');
  await page.locator('button[data-qa="create-account"]').click();

  await expect(page.locator('h2[data-qa="account-created"]')).toBeVisible();
  await page.locator('a[data-qa="continue-button"]').click();
  await expect(page.getByText(\`Logged in as \${name}\`)).toBeVisible();

  await page.locator('a[href="/delete_account"]').click();
  await expect(page.locator('h2[data-qa="account-deleted"]')).toBeVisible();
});
`,
    selenium: javaClass(
      "SignupTest",
      "https://automationexercise.com",
      `    @Test
    public void registerAndDeleteAccount() {
        String email = "qir-" + System.currentTimeMillis() + "@example.com";
        driver.get(BASE + "/");
        driver.findElement(By.cssSelector("a[href='/login']")).click();
        driver.findElement(By.cssSelector("input[data-qa=signup-name]")).sendKeys("QIR Learner");
        driver.findElement(By.cssSelector("input[data-qa=signup-email]")).sendKeys(email);
        driver.findElement(By.cssSelector("button[data-qa=signup-button]")).click();

        wait.until(ExpectedConditions.visibilityOfElementLocated(By.cssSelector("input[data-qa=password]")));
        driver.findElement(By.id("id_gender1")).click();
        driver.findElement(By.cssSelector("input[data-qa=password]")).sendKeys("Secret123!");
        new Select(driver.findElement(By.cssSelector("select[data-qa=days]"))).selectByValue("10");
        new Select(driver.findElement(By.cssSelector("select[data-qa=months]"))).selectByVisibleText("May");
        new Select(driver.findElement(By.cssSelector("select[data-qa=years]"))).selectByValue("1990");
        driver.findElement(By.cssSelector("input[data-qa=first_name]")).sendKeys("QIR");
        driver.findElement(By.cssSelector("input[data-qa=last_name]")).sendKeys("Learner");
        driver.findElement(By.cssSelector("input[data-qa=address]")).sendKeys("1 Test Street");
        new Select(driver.findElement(By.cssSelector("select[data-qa=country]"))).selectByVisibleText("India");
        driver.findElement(By.cssSelector("input[data-qa=state]")).sendKeys("Telangana");
        driver.findElement(By.cssSelector("input[data-qa=city]")).sendKeys("Hyderabad");
        driver.findElement(By.cssSelector("input[data-qa=zipcode]")).sendKeys("500001");
        driver.findElement(By.cssSelector("input[data-qa=mobile_number]")).sendKeys("9999999999");
        driver.findElement(By.cssSelector("button[data-qa=create-account]")).click();

        Assert.assertTrue(wait.until(ExpectedConditions.visibilityOfElementLocated(By.cssSelector("h2[data-qa=account-created]"))).isDisplayed());
        driver.findElement(By.cssSelector("a[data-qa=continue-button]")).click();
        Assert.assertTrue(driver.findElement(By.xpath("//a[contains(.,'Logged in as')]")).isDisplayed());

        driver.findElement(By.cssSelector("a[href='/delete_account']")).click();
        Assert.assertTrue(wait.until(ExpectedConditions.visibilityOfElementLocated(By.cssSelector("h2[data-qa=account-deleted]"))).isDisplayed());
    }`,
    ),
    notes: [
      "A unique email per run makes the test repeatable; deleting the account at the end keeps the site clean and proves the full lifecycle.",
      "data-qa attributes are the site's stable test hooks. Prefer them over text, which the site translates and restyles.",
      "Three assertions mark the three state changes: created, logged in, deleted. Each one is where a bug would show up.",
      "Ads on this site sometimes cover elements. Playwright's actionability checks retry; if an ad iframe steals the click, scope locators and avoid force: true.",
    ],
  },
  "automationexercise-products-framework": withFiles({
    files: {
      "tests/products.spec.ts": `import { test, expect } from '@playwright/test';
import { ProductsPage } from '../pages/products.page';
import { CartPage } from '../pages/cart.page';

test('search results all match the term', async ({ page }) => {
  const products = new ProductsPage(page);
  await products.goto();
  await products.search('dress');

  const names = await products.productNames();
  expect(names.length).toBeGreaterThan(0);
  for (const name of names) {
    expect(name.toLowerCase()).toContain('dress');
  }
});

test('adding two products puts two rows in the cart', async ({ page }) => {
  const products = new ProductsPage(page);
  await products.goto();
  await products.addToCart(0);
  await products.addToCart(1);

  const cart = new CartPage(page);
  await cart.goto();
  expect(await cart.rowCount()).toBe(2);
});
`,
      "pages/products.page.ts": `import { expect, type Page } from '@playwright/test';

export class ProductsPage {
  constructor(private readonly page: Page) {}

  async goto() {
    await this.page.goto('/products');
    await expect(this.page.locator('.features_items')).toBeVisible();
  }

  async search(term: string) {
    await this.page.locator('#search_product').fill(term);
    await this.page.locator('#submit_search').click();
    await expect(this.page.getByRole('heading', { name: 'Searched Products' })).toBeVisible();
  }

  async productNames(): Promise<string[]> {
    return this.page.locator('.features_items .productinfo p').allTextContents();
  }

  async addToCart(index: number) {
    await this.page.locator('.productinfo a.add-to-cart').nth(index).click();
    const modal = this.page.locator('#cartModal');
    await expect(modal).toBeVisible();
    await modal.getByRole('button', { name: 'Continue Shopping' }).click();
    await expect(modal).toBeHidden();
  }
}
`,
      "pages/cart.page.ts": `import type { Page } from '@playwright/test';

export class CartPage {
  constructor(private readonly page: Page) {}

  async goto() {
    await this.page.goto('/view_cart');
  }

  async rowCount(): Promise<number> {
    return this.page.locator('#cart_info_table tbody tr').count();
  }
}
`,
    },
    selenium: `// pages/ProductsPage.java
public class ProductsPage {
    private final WebDriver driver;
    private final WebDriverWait wait;
    public ProductsPage(WebDriver driver) { this.driver = driver; this.wait = new WebDriverWait(driver, Duration.ofSeconds(15)); }
    public void open() { driver.get("https://automationexercise.com/products"); }
    public void search(String term) {
        driver.findElement(By.id("search_product")).sendKeys(term);
        driver.findElement(By.id("submit_search")).click();
        wait.until(ExpectedConditions.visibilityOfElementLocated(By.xpath("//h2[contains(.,'Searched Products')]")));
    }
    public List<String> productNames() {
        return driver.findElements(By.cssSelector(".features_items .productinfo p")).stream().map(WebElement::getText).toList();
    }
    public void addToCart(int index) {
        WebElement button = driver.findElements(By.cssSelector(".productinfo a.add-to-cart")).get(index);
        ((JavascriptExecutor) driver).executeScript("arguments[0].scrollIntoView({block:'center'})", button);
        button.click();
        WebElement modal = wait.until(ExpectedConditions.visibilityOfElementLocated(By.id("cartModal")));
        modal.findElement(By.cssSelector("button.close-modal")).click();
        wait.until(ExpectedConditions.invisibilityOf(modal));
    }
}

// pages/CartPage.java
public class CartPage {
    private final WebDriver driver;
    public CartPage(WebDriver driver) { this.driver = driver; }
    public void open() { driver.get("https://automationexercise.com/view_cart"); }
    public int rowCount() { return driver.findElements(By.cssSelector("#cart_info_table tbody tr")).size(); }
}

// tests/ProductsTest.java
public class ProductsTest {
    WebDriver driver;
    @BeforeMethod public void setUp() { driver = new ChromeDriver(); }
    @AfterMethod public void tearDown() { driver.quit(); }

    @Test public void searchResultsMatchTerm() {
        ProductsPage products = new ProductsPage(driver);
        products.open();
        products.search("dress");
        List<String> names = products.productNames();
        Assert.assertFalse(names.isEmpty());
        for (String n : names) Assert.assertTrue(n.toLowerCase().contains("dress"), n);
    }

    @Test public void twoProductsMakeTwoCartRows() {
        ProductsPage products = new ProductsPage(driver);
        products.open();
        products.addToCart(0);
        products.addToCart(1);
        CartPage cart = new CartPage(driver);
        cart.open();
        Assert.assertEquals(cart.rowCount(), 2);
    }
}
`,
    notes: [
      "addToCart() owns the modal: click, wait for it, close it, wait for it to go. The test never knows a modal exists, which is what a page object is for.",
      "Looping over every result with expect inside the loop fails on the first mismatch and names it. Checking only the first result is the classic interview trap.",
      "goto() and search() end with a visibility wait on the thing the next step needs, so the page objects compose safely.",
    ],
  }),
  "automationexercise-api": {
    playwright:
      pwHeader +
      `// The API answers with content-type text/html, so parse the body yourself.
const json = async (res: { text(): Promise<string> }) => JSON.parse(await res.text());

test('GET productsList returns products', async ({ request }) => {
  const res = await request.get('/api/productsList');
  expect(res.status()).toBe(200);
  const body = await json(res);
  expect(body.responseCode).toBe(200);
  expect(Array.isArray(body.products)).toBe(true);
  expect(body.products.length).toBeGreaterThan(0);
  expect(body.products[0]).toHaveProperty('name');
});

test('POST searchProduct filters by name', async ({ request }) => {
  const res = await request.post('/api/searchProduct', { form: { search_product: 'tshirt' } });
  const body = await json(res);
  expect(body.responseCode).toBe(200);
  expect(body.products.length).toBeGreaterThan(0);
  for (const p of body.products) {
    expect(p.name.toLowerCase()).toContain('shirt');
  }
});

test('POST verifyLogin without email is a 400', async ({ request }) => {
  const res = await request.post('/api/verifyLogin', { form: { password: 'x' } });
  const body = await json(res);
  expect(body.responseCode).toBe(400);
  expect(body.message).toContain('email or password parameter is missing');
});
`,
    selenium: `// REST Assured + TestNG equivalent (pom.xml: io.rest-assured:rest-assured)
import io.restassured.RestAssured;
import io.restassured.response.Response;
import org.testng.Assert;
import org.testng.annotations.*;
import static io.restassured.RestAssured.given;

public class ProductsApiTest {
    @BeforeClass
    public void setUp() {
        RestAssured.baseURI = "https://automationexercise.com";
    }

    @Test
    public void productsListReturnsProducts() {
        Response res = given().get("/api/productsList");
        Assert.assertEquals(res.statusCode(), 200);
        // content-type is text/html, so force JSON parsing
        var body = new com.google.gson.JsonParser().parse(res.asString()).getAsJsonObject();
        Assert.assertEquals(body.get("responseCode").getAsInt(), 200);
        Assert.assertTrue(body.getAsJsonArray("products").size() > 0);
    }

    @Test
    public void searchProductFiltersByName() {
        Response res = given().formParam("search_product", "tshirt").post("/api/searchProduct");
        var body = new com.google.gson.JsonParser().parse(res.asString()).getAsJsonObject();
        Assert.assertEquals(body.get("responseCode").getAsInt(), 200);
        for (var p : body.getAsJsonArray("products")) {
            String name = p.getAsJsonObject().get("name").getAsString().toLowerCase();
            Assert.assertTrue(name.contains("shirt"), name);
        }
    }

    @Test
    public void verifyLoginWithoutEmailIs400() {
        Response res = given().formParam("password", "x").post("/api/verifyLogin");
        var body = new com.google.gson.JsonParser().parse(res.asString()).getAsJsonObject();
        Assert.assertEquals(body.get("responseCode").getAsInt(), 400);
        Assert.assertTrue(body.get("message").getAsString().contains("email or password parameter is missing"));
    }
}
`,
    notes: [
      "This API returns HTTP 200 for everything and puts the real status in responseCode. Say so out loud in the interview: it shows you read responses instead of assuming.",
      "res.json() would throw on text/html; parsing the text yourself is the fix, wrapped in one helper so the tests stay readable.",
      "The request fixture shares baseURL with the browser tests, so the same playwright.config.ts serves UI and API suites.",
      "Three layers of assertion: transport status, API status code, and the shape and content of the data.",
    ],
  },
  // ---------------- Framework workspaces (reference frameworks) ----------------
  "workspace-swagshop": withFiles({
    files: {
      "playwright.config.ts": wsConfig("https://interview.qatechlabs.com/sandbox/swagshop"),
      "README.md": wsReadme("SwagShop", "the SwagShop practice store"),
      "data/users.ts": `export const users = {
  standard: { username: 'standard_user', password: 'secret_sauce' },
  locked: { username: 'locked_out_user', password: 'secret_sauce' },
} as const;

export const products = {
  backpack: 'Trail Runner Backpack',
  bikeLight: 'Night Ride Bike Light',
} as const;
`,
      "pages/login.page.ts": `import type { Page } from '@playwright/test';

export class LoginPage {
  readonly error;
  constructor(private readonly page: Page) {
    this.error = page.getByRole('alert');
  }

  async goto() {
    await this.page.goto('/');
  }

  async login(username: string, password: string) {
    await this.page.getByPlaceholder('Username').fill(username);
    await this.page.getByPlaceholder('Password').fill(password);
    await this.page.getByRole('button', { name: 'Login' }).click();
  }
}
`,
      "pages/inventory.page.ts": `import { expect, type Page } from '@playwright/test';

export class InventoryPage {
  readonly title;
  readonly items;
  readonly badge;
  constructor(private readonly page: Page) {
    this.title = page.getByTestId('title');
    this.items = page.getByTestId('inventory-item');
    this.badge = page.getByTestId('shopping-cart-badge');
  }

  async goto() {
    await this.page.goto('/inventory');
  }

  private card(name: string) {
    return this.items.filter({ hasText: name });
  }

  async addToCart(name: string) {
    const card = this.card(name);
    await card.getByRole('button', { name: 'Add to cart' }).click();
    await expect(card.getByRole('button', { name: 'Remove' })).toBeVisible(); // the cart call has completed
  }

  async sortBy(value: 'az' | 'za' | 'lohi' | 'hilo') {
    await this.page.getByTestId('product-sort-container').selectOption(value);
  }

  async prices(): Promise<number[]> {
    return (await this.page.getByTestId('inventory-item-price').allTextContents()).map((t) => Number(t.replace('$', '')));
  }

  async openCart() {
    await this.page.getByRole('button', { name: 'Shopping cart' }).click();
  }
}
`,
      "pages/cart.page.ts": `import type { Page } from '@playwright/test';

export class CartPage {
  readonly items;
  readonly names;
  constructor(page: Page) {
    this.items = page.getByTestId('inventory-item');
    this.names = page.getByTestId('inventory-item-name');
  }
}
`,
      "fixtures.ts": `import { test as base } from '@playwright/test';
import { LoginPage } from './pages/login.page';
import { InventoryPage } from './pages/inventory.page';
import { CartPage } from './pages/cart.page';
import { ShopApi } from './api/shop.api';
import { users } from './data/users';

type Pages = { login: LoginPage; inventory: InventoryPage; cart: CartPage };

export const test = base.extend<{ app: Pages; loggedIn: Pages; api: ShopApi }>({
  api: async ({ request }, use) => {
    await use(new ShopApi(request));
  },
  app: async ({ page }, use) => {
    const app = { login: new LoginPage(page), inventory: new InventoryPage(page), cart: new CartPage(page) };
    await app.login.goto();
    await use(app);
  },
  loggedIn: async ({ app }, use) => {
    await app.login.login(users.standard.username, users.standard.password);
    await use(app);
  },
});

export { expect } from '@playwright/test';
`,
      "api/shop.api.ts": `import type { APIRequestContext } from '@playwright/test';

/** Thin client for the SwagShop REST API (GET /api lists every endpoint). */
export class ShopApi {
  constructor(private readonly request: APIRequestContext) {}

  async login(username: string, password: string) {
    const res = await this.request.post('/api/auth/login', { data: { username, password } });
    if (!res.ok()) throw new Error(\`login failed: \${res.status()} \${await res.text()}\`);
    return (await res.json()) as { token: string; user: { username: string } };
  }

  async products(params: Record<string, string> = {}) {
    const res = await this.request.get('/api/products', { params });
    return (await res.json()) as { items: { id: number; name: string; price: number }[]; total: number };
  }

  addToCart(productId: number, qty = 1) {
    return this.request.post('/api/cart/items', { data: { productId, qty } });
  }

  async cart() {
    return (await (await this.request.get('/api/cart')).json()) as { count: number; subtotal: number; total: number; items: { productId: number; qty: number }[] };
  }
}
`,
      "tests/api.spec.ts": `import { test, expect } from '../fixtures';
import { users } from '../data/users';

test.describe('Catalogue and cart API @regression', () => {
  test('wrong password is rejected with a stable error code', async ({ request }) => {
    const res = await request.post('/api/auth/login', { data: { username: users.standard.username, password: 'nope' } });
    expect(res.status()).toBe(401);
    expect((await res.json()).error.code).toBe('invalid_credentials');
  });

  test('cart totals add up after two lines', async ({ api }) => {
    await api.login(users.standard.username, users.standard.password);
    const { items } = await api.products();
    expect(items).toHaveLength(12);
    expect(await api.addToCart(items[0].id, 2)).toBeOK();
    expect(await api.addToCart(items[1].id)).toBeOK();
    const cart = await api.cart();
    expect(cart.count).toBe(3);
    expect(cart.subtotal).toBeCloseTo(items[0].price * 2 + items[1].price, 2);
  });
});
`,
      "tests/hybrid.spec.ts": `import { test, expect } from '../fixtures';
import { users, products } from '../data/users';
import { ShopApi } from '../api/shop.api';

test.describe('Cart seeded by API @regression', () => {
  test('items added through the API appear in the cart page', async ({ app, page }) => {
    const api = new ShopApi(page.request); // shares the browser session
    await api.login(users.standard.username, users.standard.password);
    const { items } = await api.products({ q: 'backpack' });
    expect(await api.addToCart(items[0].id)).toBeOK();

    await app.inventory.goto();
    await app.inventory.openCart();
    await expect(app.cart.items).toHaveCount(1);
    await expect(app.cart.names).toHaveText([products.backpack]);
  });
});
`,
      "tests/login.spec.ts": `import { test, expect } from '../fixtures';
import { users } from '../data/users';

test.describe('Login @smoke', () => {
  test('standard user lands on the products page', async ({ app }) => {
    await app.login.login(users.standard.username, users.standard.password);
    await expect(app.inventory.title).toHaveText('Products');
    await expect(app.inventory.items).toHaveCount(12);
  });

  test('locked out user is told why', async ({ app }) => {
    await app.login.login(users.locked.username, users.locked.password);
    await expect(app.login.error).toContainText('locked out');
    await expect(app.inventory.items).toHaveCount(0);
  });
});
`,
      "tests/shopping.spec.ts": `import { test, expect } from '../fixtures';
import { products } from '../data/users';

test.describe('Shopping @regression', () => {
  test('two items added show in the badge and the cart', async ({ loggedIn: app }) => {
    await app.inventory.addToCart(products.backpack);
    await app.inventory.addToCart(products.bikeLight);
    await expect(app.inventory.badge).toHaveText('2');

    await app.inventory.openCart();
    await expect(app.cart.items).toHaveCount(2);
    await expect(app.cart.names).toHaveText([products.backpack, products.bikeLight]);
  });

  test('sorting low to high orders prices ascending', async ({ loggedIn: app }) => {
    await app.inventory.sortBy('lohi');
    const prices = await app.inventory.prices();
    expect(prices).toHaveLength(12);
    expect(prices).toEqual([...prices].sort((a, b) => a - b));
  });
});
`,
    },
    selenium: wsSelenium("SwagShop"),
    notes: WS_NOTES,
  }),
  "workspace-peopledesk": withFiles({
    files: {
      "playwright.config.ts": wsConfig("https://interview.qatechlabs.com/sandbox/peopledesk"),
      "README.md": wsReadme("PeopleDesk HR", "the PeopleDesk practice portal"),
      "data/users.ts": `export const admin = { username: 'Admin', password: 'admin123' } as const;

/** Unique per run so tests never collide with each other's data. */
export const newEmployee = () => ({ first: \`Auto\${Date.now()}\`, last: 'Framework' });
`,
      "pages/login.page.ts": `import type { Page } from '@playwright/test';

export class LoginPage {
  readonly error;
  /** visible once the session is established */
  readonly dashboardLink;
  constructor(private readonly page: Page) {
    this.error = page.getByRole('alert');
    this.dashboardLink = page.getByRole('link', { name: 'Dashboard' });
  }

  async goto() {
    await this.page.goto('/');
  }

  async login(username: string, password: string) {
    await this.page.getByLabel('Username').fill(username);
    await this.page.getByLabel('Password').fill(password);
    await this.page.getByRole('button', { name: 'Login' }).click();
  }
}
`,
      "pages/employees.page.ts": `import type { Page } from '@playwright/test';

export class EmployeesPage {
  readonly recordsFound;
  readonly rows;
  readonly status;
  constructor(private readonly page: Page) {
    this.recordsFound = page.getByTestId('records-found');
    this.rows = page.getByTestId('employee-row');
    this.status = page.getByRole('status');
  }

  async open() {
    await this.page.getByRole('link', { name: 'PIM' }).click();
  }

  async add(first: string, last: string): Promise<string> {
    await this.page.getByRole('button', { name: '+ Add' }).click();
    await this.page.getByLabel('First Name').fill(first);
    await this.page.getByLabel('Last Name').fill(last);
    const id = await this.page.getByLabel('Employee Id').inputValue();
    await this.page.getByRole('button', { name: 'Save' }).click();
    await this.status.filter({ hasText: 'Successfully Saved' }).waitFor();
    await this.page.getByRole('button', { name: 'Back to Employee List' }).click();
    return id;
  }

  async search(name: string) {
    await this.page.getByLabel('Employee Name').fill(name);
    await this.page.getByRole('button', { name: 'Search' }).click();
  }

  async delete(first: string, last: string) {
    await this.page.getByRole('button', { name: \`Delete \${first} \${last}\` }).click();
    await this.page.getByRole('dialog').getByRole('button', { name: 'Yes, Delete' }).click();
    await this.status.filter({ hasText: 'Successfully Deleted' }).waitFor();
  }
}
`,
      "pages/leave.page.ts": `import type { Page } from '@playwright/test';

export class LeavePage {
  readonly status;
  readonly rows;
  constructor(private readonly page: Page) {
    this.status = page.getByRole('status');
    this.rows = page.getByTestId('leave-row');
  }

  async open() {
    await this.page.getByRole('link', { name: 'Leave' }).click();
  }

  async apply(type: string, from: string, to: string) {
    await this.page.getByLabel('Leave Type').selectOption(type);
    await this.page.getByLabel('From Date').fill(from);
    await this.page.getByLabel('To Date').fill(to);
    await this.page.getByRole('button', { name: 'Apply' }).click();
  }

  validationError(text: string) {
    return this.page.getByText(text);
  }
}
`,
      "fixtures.ts": `import { test as base, expect } from '@playwright/test';
import { LoginPage } from './pages/login.page';
import { EmployeesPage } from './pages/employees.page';
import { LeavePage } from './pages/leave.page';
import { HrApi } from './api/hr.api';
import { admin, newEmployee } from './data/users';

type Pages = { login: LoginPage; employees: EmployeesPage; leave: LeavePage };

export const test = base.extend<{ app: Pages; adminApp: Pages; api: HrApi; employee: { first: string; last: string; id: string } }>({
  api: async ({ request }, use) => {
    await use(new HrApi(request));
  },
  app: async ({ page }, use) => {
    const app = { login: new LoginPage(page), employees: new EmployeesPage(page), leave: new LeavePage(page) };
    await app.login.goto();
    await use(app);
  },
  adminApp: async ({ app }, use) => {
    await app.login.login(admin.username, admin.password);
    await expect(app.login.dashboardLink).toBeVisible(); // the session exists before any test or API call runs
    await use(app);
  },
  // creates an employee for the test and removes it afterwards
  employee: async ({ adminApp }, use) => {
    const e = newEmployee();
    await adminApp.employees.open();
    const id = await adminApp.employees.add(e.first, e.last);
    await use({ ...e, id });
    await adminApp.employees.open();
    await adminApp.employees.delete(e.first, e.last);
  },
});

export { expect } from '@playwright/test';
`,
      "api/hr.api.ts": `import type { APIRequestContext } from '@playwright/test';

/** Client for the PeopleDesk REST API; one instance per session (cookies live in the request context). */
export class HrApi {
  constructor(readonly request: APIRequestContext) {}

  async login(username: string, password: string) {
    const res = await this.request.post('/api/auth/login', { data: { username, password } });
    if (!res.ok()) throw new Error(\`login failed: \${res.status()}\`);
    return res;
  }

  async createEmployee(data: { firstName: string; lastName: string; jobTitle?: string; department?: string }) {
    const res = await this.request.post('/api/employees', { data });
    if (res.status() !== 201) throw new Error(\`create failed: \${await res.text()}\`);
    return (await res.json()).employee as { id: string; first: string; last: string };
  }

  async findByName(name: string) {
    return (await (await this.request.get('/api/employees', { params: { name } })).json()) as { total: number; items: { id: string }[] };
  }

  deleteEmployee(id: string) {
    return this.request.delete(\`/api/employees/\${id}\`);
  }

  async balance(employeeId?: string) {
    const res = await this.request.get('/api/leave/balance', { params: employeeId ? { employeeId } : {} });
    return (await res.json()).balances as { type: string; used: number; available: number }[];
  }
}
`,
      "tests/api.spec.ts": `import { test, expect } from '../fixtures';
import { admin, newEmployee } from '../data/users';

test.describe('Employee API @regression', () => {
  test('validation returns field-level details', async ({ api }) => {
    await api.login(admin.username, admin.password);
    const res = await api.request.post('/api/employees', { data: { firstName: 'Nolast' } });
    expect(res.status()).toBe(400);
    expect((await res.json()).error.details.lastName).toBe('Required');
  });

  test('an employee can be created, found and removed', async ({ api }) => {
    await api.login(admin.username, admin.password);
    const e = newEmployee();
    const created = await api.createEmployee({ firstName: e.first, lastName: e.last, jobTitle: 'SDET', department: 'Quality Engineering' });
    expect((await api.findByName(e.last)).total).toBe(1);
    expect(await api.deleteEmployee(created.id)).toBeOK();
    expect((await api.findByName(e.last)).total).toBe(0);
  });
});
`,
      "tests/hybrid.spec.ts": `import { test, expect } from '../fixtures';
import { admin, newEmployee } from '../data/users';
import { HrApi } from '../api/hr.api';

test.describe('PIM search with API-seeded data @regression', () => {
  test('an employee created through the API is found in the UI and removed afterwards', async ({ adminApp, page }) => {
    const api = new HrApi(page.request); // same session as the UI login
    const e = newEmployee();
    const created = await api.createEmployee({ firstName: e.first, lastName: e.last, jobTitle: 'QA Engineer', department: 'Quality Engineering' });

    await adminApp.employees.open();
    await adminApp.employees.search(e.last);
    await expect(adminApp.employees.recordsFound).toHaveText('(1) Record Found');
    await expect(adminApp.employees.rows).toContainText([e.last]);

    expect(await api.deleteEmployee(created.id)).toBeOK();
    expect((await api.findByName(e.last)).total).toBe(0);
  });
});
`,
      "tests/login.spec.ts": `import { test, expect } from '../fixtures';
import { admin } from '../data/users';

test.describe('Login @smoke', () => {
  test('admin reaches the dashboard', async ({ app }) => {
    await app.login.login(admin.username, admin.password);
    await expect(app.login.error).toHaveCount(0);
    await expect(app.employees.rows).toHaveCount(0);
  });

  test('wrong password is rejected', async ({ app }) => {
    await app.login.login(admin.username, 'wrong-password');
    await expect(app.login.error).toHaveText('Invalid credentials');
  });
});
`,
      "tests/pim.spec.ts": `import { test, expect } from '../fixtures';

test.describe('PIM @regression', () => {
  test('a new employee can be found by name', async ({ adminApp: app, employee }) => {
    await app.employees.search(employee.first);
    await expect(app.employees.recordsFound).toHaveText('(1) Record Found');
    await expect(app.employees.rows).toContainText(employee.last);
  });

  test('leave dates are validated before submission', async ({ adminApp: app }) => {
    await app.leave.open();
    await app.leave.apply('Casual Leave', '2026-12-10', '2026-12-08');
    await expect(app.leave.validationError('To date should be after from date')).toBeVisible();
    await app.leave.apply('Casual Leave', '2026-12-10', '2026-12-12');
    await expect(app.leave.status).toContainText('Successfully Submitted');
    await expect(app.leave.rows).toHaveCount(1);
  });
});
`,
    },
    selenium: wsSelenium("PeopleDesk"),
    notes: WS_NOTES,
  }),
  "workspace-trendkart": withFiles({
    files: {
      "playwright.config.ts": wsConfig("https://interview.qatechlabs.com/sandbox/trendkart"),
      "README.md": wsReadme("TrendKart", "the TrendKart practice marketplace"),
      "data/searches.ts": `export const SEARCHES = [
  { query: 'shirt', expectedCount: 5, mustContain: 'Shirt' },
  { query: 'jeans', expectedCount: 2, mustContain: 'Jeans' },
  { query: 'kurta', expectedCount: 3, mustContain: 'Kurta' },
] as const;
`,
      "utils/money.ts": `/** "₹1,199" → 1199 */
export const parsePrice = (text: string) => Number(text.replace(/[^0-9.]/g, ''));
`,
      "pages/search.page.ts": `import { expect, type Page } from '@playwright/test';

export class SearchPage {
  readonly cards;
  constructor(private readonly page: Page) {
    this.cards = page.getByTestId('product-card');
  }

  async goto() {
    await this.page.goto('/');
  }

  async search(query: string) {
    const box = this.page.getByPlaceholder('Search for products, brands and more');
    await box.fill(query);
    await box.press('Enter');
    await expect(this.page.getByTestId('loader')).toBeHidden();
  }

  async resultCount(): Promise<number> {
    return Number(((await this.page.getByTestId('results-count').textContent()) ?? '').replace(/[^0-9]/g, ''));
  }

  async productNames(): Promise<string[]> {
    return this.cards.locator('.product-product').allInnerTexts();
  }

  async prices(): Promise<string[]> {
    return this.cards.getByTestId('product-price').allTextContents();
  }

  async sortBy(value: 'price_asc' | 'price_desc' | 'rating' | 'discount') {
    await this.page.getByLabel('Sort by').selectOption(value);
    await expect(this.page.getByTestId('loader')).toBeHidden();
    await expect(this.page.getByLabel('Sort by')).toHaveValue(value);
  }

  async openProduct(name: string) {
    await this.cards.filter({ hasText: name }).click();
  }
}
`,
      "pages/product.page.ts": `import type { Page } from '@playwright/test';

export class ProductPage {
  readonly name;
  readonly alert;
  readonly bagCount;
  constructor(private readonly page: Page) {
    this.name = page.getByTestId('pdp-name');
    this.alert = page.getByRole('alert');
    this.bagCount = page.getByTestId('bag-count');
  }

  async addToBag() {
    await this.page.getByRole('button', { name: 'ADD TO BAG' }).click();
  }

  async chooseSize(size: string) {
    await this.page.getByRole('group', { name: 'Select size' }).getByRole('button', { name: size, exact: true }).click();
  }
}
`,
      "fixtures.ts": `import { test as base } from '@playwright/test';
import { SearchPage } from './pages/search.page';
import { ProductPage } from './pages/product.page';
import { BagPage } from './pages/bag.page';
import { StoreApi } from './api/store.api';

export const test = base.extend<{ search: SearchPage; product: ProductPage; bag: BagPage; api: StoreApi }>({
  api: async ({ request }, use) => {
    await use(new StoreApi(request));
  },
  bag: async ({ page }, use) => {
    await use(new BagPage(page));
  },
  search: async ({ page }, use) => {
    const search = new SearchPage(page);
    await search.goto();
    await use(search);
  },
  product: async ({ page }, use) => {
    await use(new ProductPage(page));
  },
});

export { expect } from '@playwright/test';
`,
      "api/store.api.ts": `import type { APIRequestContext } from '@playwright/test';

export interface BagTotals { mrp: number; discount: number; coupon: number; delivery: number; total: number; count: number }

/** Client for the TrendKart REST API. */
export class StoreApi {
  constructor(private readonly request: APIRequestContext) {}

  async search(q: string, params: Record<string, string> = {}) {
    const res = await this.request.get('/api/products', { params: { q, ...params } });
    return (await res.json()) as { total: number; items: { id: number; name: string; price: number }[] };
  }

  addToBag(productId: number, size: string, qty = 1) {
    return this.request.post('/api/bag/items', { data: { productId, size, qty } });
  }

  applyCoupon(code: string) {
    return this.request.post('/api/bag/coupon', { data: { code } });
  }

  async bag() {
    return (await (await this.request.get('/api/bag')).json()) as { coupon: string | null; totals: BagTotals };
  }
}
`,
      "tests/api.spec.ts": `import { test, expect } from '../fixtures';
import { SEARCHES } from '../data/searches';

test.describe('Search and bag API @regression', () => {
  for (const row of SEARCHES) {
    test(\`API search "\${row.query}" returns \${row.expectedCount} products\`, async ({ api }) => {
      const body = await api.search(row.query);
      expect(body.total).toBe(row.expectedCount);
      for (const p of body.items) expect(p.name).toContain(row.mustContain);
    });
  }

  test('bag rules: size required, coupon applied, totals consistent', async ({ api }) => {
    expect((await api.addToBag(104, '')).status()).toBe(400);
    expect(await api.addToBag(104, 'M', 3)).toBeOK();
    expect(await api.applyCoupon('TRENDY10')).toBeOK();
    const { coupon, totals } = await api.bag();
    expect(coupon).toBe('TRENDY10');
    expect(totals.total).toBe(totals.mrp - totals.discount - totals.coupon + totals.delivery);
  });
});
`,
      "tests/hybrid.spec.ts": `import { test, expect } from '../fixtures';
import { StoreApi } from '../api/store.api';
import { parsePrice } from '../utils/money';

test.describe('Bag seeded by API @regression', () => {
  test('the bag page shows the total the API computed', async ({ product, bag, page }) => {
    const api = new StoreApi(page.request); // same session as the page
    expect(await api.addToBag(104, 'M', 2)).toBeOK();
    expect(await api.applyCoupon('TRENDY10')).toBeOK();
    const { totals } = await api.bag();

    await bag.open();
    await expect(bag.items).toHaveCount(1);
    await expect(bag.total).toHaveText(\`₹\${totals.total.toLocaleString('en-IN')}\`);
    expect(parsePrice(await bag.total.innerText())).toBe(totals.total);
    await expect(product.bagCount).toHaveText(String(totals.count));
  });
});
`,
      "pages/bag.page.ts": `import type { Page } from '@playwright/test';

export class BagPage {
  readonly items;
  readonly total;
  constructor(private readonly page: Page) {
    this.items = page.getByTestId('bag-item');
    this.total = page.getByTestId('total-amount');
  }

  async open() {
    await this.page.goto('/bag');
  }
}
`,
      "tests/search.spec.ts": `import { test, expect } from '../fixtures';
import { SEARCHES } from '../data/searches';
import { parsePrice } from '../utils/money';

test.describe('Search @regression', () => {
  for (const row of SEARCHES) {
    test(\`"\${row.query}" returns \${row.expectedCount} matching products\`, async ({ search }) => {
      await search.search(row.query);
      expect(await search.resultCount()).toBe(row.expectedCount);
      for (const name of await search.productNames()) expect(name).toContain(row.mustContain);
    });
  }

  test('results sort by price low to high', async ({ search }) => {
    await search.search('shirt');
    await search.sortBy('price_asc');
    const prices = (await search.prices()).map(parsePrice);
    expect(prices).toEqual([...prices].sort((a, b) => a - b));
  });
});
`,
      "tests/bag.spec.ts": `import { test, expect } from '../fixtures';

test.describe('Bag @smoke', () => {
  test('a size must be chosen before adding to the bag', async ({ search, product }) => {
    await search.search('shirt');
    await search.openProduct('Men Slim Fit Casual Shirt');
    await expect(product.name).toHaveText('Men Slim Fit Casual Shirt');

    await product.addToBag();
    await expect(product.alert).toHaveText('Please select a size');

    await product.chooseSize('M');
    await product.addToBag();
    await expect(product.bagCount).toHaveText('1');
  });
});
`,
    },
    selenium: wsSelenium("TrendKart"),
    notes: WS_NOTES,
  }),
  "workspace-saucedemo": withFiles({
    files: {
      "playwright.config.ts": wsConfig("https://www.saucedemo.com", "data-test"),
      "README.md": wsReadme("Sauce Demo", "https://www.saucedemo.com"),
      "data/users.ts": `export const users = {
  standard: { username: 'standard_user', password: 'secret_sauce' },
  locked: { username: 'locked_out_user', password: 'secret_sauce' },
} as const;

export const products = { backpack: 'Sauce Labs Backpack', bikeLight: 'Sauce Labs Bike Light' } as const;
`,
      "pages/login.page.ts": `import type { Page } from '@playwright/test';

export class LoginPage {
  readonly error;
  constructor(private readonly page: Page) {
    this.error = page.getByTestId('error');
  }

  async goto() {
    await this.page.goto('/');
  }

  async login(username: string, password: string) {
    await this.page.getByPlaceholder('Username').fill(username);
    await this.page.getByPlaceholder('Password').fill(password);
    await this.page.getByRole('button', { name: 'Login' }).click();
  }
}
`,
      "pages/inventory.page.ts": `import { expect, type Page } from '@playwright/test';

export class InventoryPage {
  readonly title;
  readonly items;
  readonly badge;
  constructor(private readonly page: Page) {
    this.title = page.getByTestId('title');
    this.items = page.getByTestId('inventory-item');
    this.badge = page.getByTestId('shopping-cart-badge');
  }

  async addToCart(name: string) {
    const card = this.items.filter({ hasText: name });
    await card.getByRole('button', { name: 'Add to cart' }).click();
    await expect(card.getByRole('button', { name: 'Remove' })).toBeVisible(); // the cart call has completed
  }

  async sortBy(value: 'az' | 'za' | 'lohi' | 'hilo') {
    await this.page.getByTestId('product-sort-container').selectOption(value);
  }

  async prices(): Promise<number[]> {
    return (await this.page.getByTestId('inventory-item-price').allTextContents()).map((t) => Number(t.replace('$', '')));
  }

  async openCart() {
    await this.page.getByTestId('shopping-cart-link').click();
  }
}
`,
      "pages/cart.page.ts": `import type { Page } from '@playwright/test';

export class CartPage {
  readonly items;
  readonly names;
  constructor(page: Page) {
    this.items = page.getByTestId('inventory-item');
    this.names = page.getByTestId('inventory-item-name');
  }
}
`,
      "fixtures.ts": `import { test as base } from '@playwright/test';
import { LoginPage } from './pages/login.page';
import { InventoryPage } from './pages/inventory.page';
import { CartPage } from './pages/cart.page';
import { users } from './data/users';

type Pages = { login: LoginPage; inventory: InventoryPage; cart: CartPage };

export const test = base.extend<{ app: Pages; loggedIn: Pages }>({
  app: async ({ page }, use) => {
    const app = { login: new LoginPage(page), inventory: new InventoryPage(page), cart: new CartPage(page) };
    await app.login.goto();
    await use(app);
  },
  loggedIn: async ({ app, page }, use) => {
    await app.login.login(users.standard.username, users.standard.password);
    await page.waitForURL(/inventory\\.html/);
    await use(app);
  },
});

export { expect } from '@playwright/test';
`,
      "tests/login.spec.ts": `import { test, expect } from '../fixtures';
import { users } from '../data/users';

test.describe('Login @smoke', () => {
  test('standard user lands on the products page', async ({ app }) => {
    await app.login.login(users.standard.username, users.standard.password);
    await expect(app.inventory.title).toHaveText('Products');
    await expect(app.inventory.items).toHaveCount(6);
  });

  test('locked out user is told why', async ({ app }) => {
    await app.login.login(users.locked.username, users.locked.password);
    await expect(app.login.error).toContainText('locked out');
  });
});
`,
      "tests/shopping.spec.ts": `import { test, expect } from '../fixtures';
import { products } from '../data/users';

test.describe('Shopping @regression', () => {
  test('two items added show in the badge and the cart', async ({ loggedIn: app }) => {
    await app.inventory.addToCart(products.backpack);
    await app.inventory.addToCart(products.bikeLight);
    await expect(app.inventory.badge).toHaveText('2');
    await app.inventory.openCart();
    await expect(app.cart.names).toHaveText([products.backpack, products.bikeLight]);
  });

  test('sorting low to high orders prices ascending', async ({ loggedIn: app }) => {
    await app.inventory.sortBy('lohi');
    const prices = await app.inventory.prices();
    expect(prices).toHaveLength(6);
    expect(prices).toEqual([...prices].sort((a, b) => a - b));
  });
});
`,
    },
    selenium: wsSelenium("SauceDemo"),
    notes: [...WS_NOTES, "testIdAttribute: 'data-test' in the config is what makes getByTestId work on saucedemo.com. Interviewers like candidates who know that knob exists."],
  }),
  "workspace-orangehrm": withFiles({
    files: {
      "playwright.config.ts": wsConfig("https://opensource-demo.orangehrmlive.com", undefined, 60_000),
      "README.md": wsReadme("OrangeHRM", "https://opensource-demo.orangehrmlive.com"),
      "data/users.ts": `export const admin = { username: 'Admin', password: 'admin123' } as const;

/** The demo database is shared with the whole internet: every name must be unique. */
export const newEmployee = () => ({ first: 'Lab', last: 'User' + Date.now().toString().slice(-8) });
`,
      "api/hr.api.ts": `import { expect, type APIRequestContext } from '@playwright/test';

export type Employee = { empNumber: number; firstName: string; lastName: string; employeeId: string | null };
export type EmployeeList = { data: Employee[]; meta: { total: number } };

/**
 * OrangeHRM's own REST API, the one its screens call. Build it on page.request so the calls carry the
 * browser's login session; the plain request fixture has no cookies and is refused.
 */
export class HrApi {
  static readonly employees = '/web/index.php/api/v2/pim/employees';
  constructor(readonly request: APIRequestContext) {}

  async employees(limit = 50): Promise<EmployeeList> {
    const res = await this.request.get(HrApi.employees, { params: { limit, offset: 0, includeEmployees: 'onlyCurrent', sortField: 'employee.firstName', sortOrder: 'ASC' } });
    expect(res, 'GET employees').toBeOK();
    return res.json();
  }

  async employee(empNumber: number): Promise<Employee> {
    const res = await this.request.get(\`\${HrApi.employees}/\${empNumber}\`);
    expect(res, \`GET employee \${empNumber}\`).toBeOK();
    return (await res.json()).data;
  }

  /** Best-effort clean-up for employees a test created; the demo resets anyway. */
  async deleteEmployees(ids: number[]) {
    return this.request.delete(HrApi.employees, { data: { ids } });
  }
}
`,
      "pages/login.page.ts": `import type { Page } from '@playwright/test';

export class LoginPage {
  readonly error;
  readonly dashboardHeading;
  constructor(private readonly page: Page) {
    this.error = page.getByText('Invalid credentials');
    this.dashboardHeading = page.getByRole('heading', { name: 'Dashboard' });
  }

  async goto() {
    await this.page.goto('/web/index.php/auth/login');
  }

  async login(username: string, password: string) {
    await this.page.getByPlaceholder('Username').fill(username);
    await this.page.getByPlaceholder('Password').fill(password);
    await this.page.getByRole('button', { name: 'Login' }).click();
  }
}
`,
      "pages/pim.page.ts": `import { expect, type Page } from '@playwright/test';

export class PimPage {
  readonly employeeName;
  readonly recordsFound;
  constructor(private readonly page: Page) {
    this.employeeName = page.locator('.orangehrm-edit-employee-name h6');
    this.recordsFound = page.getByText(/\\(\\d+\\) Records? Found/);
  }

  async gotoAddEmployee() {
    await this.page.goto('/web/index.php/pim/addEmployee');
    await expect(this.page.getByRole('heading', { name: 'Add Employee' })).toBeVisible();
  }

  async gotoEmployeeList() {
    await this.page.goto('/web/index.php/pim/viewEmployeeList');
    await expect(this.recordsFound).toBeVisible();
  }

  /** The number in "(N) Records Found" on the employee list. */
  async recordCount() {
    return Number((await this.recordsFound.textContent())?.match(/\\d+/)?.[0]);
  }

  /** empNumber of the employee whose personal details page is open (from /pim/viewPersonalDetails/empNumber/<n>). */
  currentEmpNumber() {
    return Number(this.page.url().match(/empNumber\\/(\\d+)/)?.[1]);
  }

  async addEmployee(first: string, last: string) {
    await this.page.locator('input[name="firstName"]').fill(first);
    await this.page.locator('input[name="lastName"]').fill(last);
    await this.page.getByRole('button', { name: 'Save' }).click();
    await this.page.waitForURL(/viewPersonalDetails/, { timeout: 30_000 });
    await expect(this.employeeName).not.toHaveText('');
  }
}
`,
      "fixtures.ts": `import { test as base } from '@playwright/test';
import { LoginPage } from './pages/login.page';
import { PimPage } from './pages/pim.page';
import { HrApi } from './api/hr.api';
import { admin } from './data/users';

type Pages = { login: LoginPage; pim: PimPage };

export const test = base.extend<{ app: Pages; adminApp: Pages; api: HrApi }>({
  app: async ({ page }, use) => {
    const app = { login: new LoginPage(page), pim: new PimPage(page) };
    await app.login.goto();
    await use(app);
  },
  adminApp: async ({ app, page }, use) => {
    await app.login.login(admin.username, admin.password);
    await page.waitForURL(/\\/dashboard/);
    await use(app);
  },
  /** The API with the Admin session: depends on adminApp so the UI login has happened first. */
  api: async ({ adminApp: _app, page }, use) => {
    await use(new HrApi(page.request));
  },
});

export { expect } from '@playwright/test';
`,
      "tests/login.spec.ts": `import { test, expect } from '../fixtures';
import { admin } from '../data/users';

test.describe('Login @smoke', () => {
  test('Admin can log in and sees the dashboard', async ({ app }) => {
    await app.login.login(admin.username, admin.password);
    await expect(app.login.dashboardHeading).toBeVisible();
  });

  test('wrong password shows Invalid credentials', async ({ app }) => {
    await app.login.login(admin.username, 'wrong-password');
    await expect(app.login.error).toBeVisible();
  });
});
`,
      "tests/pim.spec.ts": `import { test, expect } from '../fixtures';
import { newEmployee } from '../data/users';

test.describe('PIM @regression', () => {
  test('a new employee appears on the personal details page', async ({ adminApp: app }) => {
    const e = newEmployee();
    await app.pim.gotoAddEmployee();
    await app.pim.addEmployee(e.first, e.last);
    await expect(app.pim.employeeName).toHaveText(\`\${e.first} \${e.last}\`);
  });

  test('the add employee form requires a first name', async ({ adminApp: app }) => {
    await app.pim.gotoAddEmployee();
    await app.pim.addEmployee('', 'NoFirstName').catch(() => undefined);
    await expect(app.pim.employeeName).toHaveCount(0);
  });
});
`,
      "tests/api.spec.ts": `import { test, expect } from '../fixtures';
import { HrApi } from '../api/hr.api';

test.describe('PIM API @regression', () => {
  test('the employee list returns current employees with the fields the UI needs', async ({ api }) => {
    const list = await api.employees(10);
    expect(list.data.length).toBeGreaterThan(0);
    expect(list.data.length).toBeLessThanOrEqual(10);
    expect(list.meta.total).toBeGreaterThanOrEqual(list.data.length);
    for (const e of list.data) {
      expect(e.empNumber).toEqual(expect.any(Number));
      expect(e.firstName).toEqual(expect.any(String));
    }
  });

  test('a single employee can be read back by empNumber', async ({ api }) => {
    const [first] = (await api.employees(1)).data;
    const one = await api.employee(first.empNumber);
    expect(one.empNumber).toBe(first.empNumber);
    expect(one.firstName).toBe(first.firstName);
  });

  test('the API refuses a caller without a session', async ({ request }) => {
    const res = await request.get(HrApi.employees, { params: { limit: 1 }, maxRedirects: 0 });
    expect([401, 302]).toContain(res.status());
  });
});
`,
      "tests/hybrid.spec.ts": `import { test, expect } from '../fixtures';
import { newEmployee } from '../data/users';

test.describe('UI and API agree @regression', () => {
  test('the Employee List shows the total the API reports', async ({ adminApp: app, api }) => {
    await app.pim.gotoEmployeeList();
    const shown = await app.pim.recordCount();
    const { meta } = await api.employees(1);
    // Shared demo: someone may add an employee between the two reads.
    expect(Math.abs(shown - meta.total)).toBeLessThanOrEqual(3);
  });

  test('an employee added in the UI is readable through the API', async ({ adminApp: app, api }) => {
    const e = newEmployee();
    await app.pim.gotoAddEmployee();
    await app.pim.addEmployee(e.first, e.last);
    const empNumber = app.pim.currentEmpNumber();
    expect(empNumber).toBeGreaterThan(0);

    const fromApi = await api.employee(empNumber);
    expect(fromApi.firstName).toBe(e.first);
    expect(fromApi.lastName).toBe(e.last);

    await api.deleteEmployees([empNumber]).catch(() => undefined);
  });
});
`,
    },
    selenium: wsSelenium("OrangeHRM"),
    notes: [...WS_NOTES, "The demo is slow: timeout and expect.timeout are raised in the config instead of sprinkling waits in tests.", "api/hr.api.ts wraps the REST API the OrangeHRM screens call. The api fixture builds it on page.request after the adminApp login, so the API calls ride the browser's session; the plain request fixture is kept for the negative test.", "The hybrid spec creates through the UI and verifies through the API (and deletes through the API): the fastest way to prove a screen really persisted what it showed."],
  }),
  "workspace-automationexercise": withFiles({
    files: {
      "playwright.config.ts": wsConfig("https://automationexercise.com"),
      "README.md": wsReadme("AutomationExercise", "https://automationexercise.com"),
      "data/users.ts": `/** A fresh user for every run; the suite deletes it afterwards. */
export const newUser = () => ({ name: 'QIR Learner', email: \`qir-\${Date.now()}@example.com\`, password: 'Secret123!' });
`,
      "utils/api.ts": `import type { APIResponse } from '@playwright/test';

/** The API answers with text/html, so the body has to be parsed by hand. */
export const json = async (res: APIResponse) => JSON.parse(await res.text());
`,
      "pages/products.page.ts": `import { expect, type Page } from '@playwright/test';

export class ProductsPage {
  readonly names;
  constructor(private readonly page: Page) {
    this.names = page.locator('.features_items .productinfo p');
  }

  async goto() {
    await this.page.goto('/products');
    await expect(this.page.locator('.features_items')).toBeVisible();
  }

  async search(term: string) {
    await this.page.locator('#search_product').fill(term);
    await this.page.locator('#submit_search').click();
    await expect(this.page.getByRole('heading', { name: 'Searched Products' })).toBeVisible();
  }

  async addToCart(index: number) {
    await this.page.locator('.productinfo a.add-to-cart').nth(index).click();
    const modal = this.page.locator('#cartModal');
    await expect(modal).toBeVisible();
    await modal.getByRole('button', { name: 'Continue Shopping' }).click();
    await expect(modal).toBeHidden();
  }
}
`,
      "pages/cart.page.ts": `import type { Page } from '@playwright/test';

export class CartPage {
  readonly rows;
  constructor(private readonly page: Page) {
    this.rows = page.locator('#cart_info_table tbody tr');
  }

  async goto() {
    await this.page.goto('/view_cart');
  }
}
`,
      "fixtures.ts": `import { test as base } from '@playwright/test';
import { ProductsPage } from './pages/products.page';
import { CartPage } from './pages/cart.page';

export const test = base.extend<{ products: ProductsPage; cart: CartPage }>({
  products: async ({ page }, use) => {
    const products = new ProductsPage(page);
    await products.goto();
    await use(products);
  },
  cart: async ({ page }, use) => {
    await use(new CartPage(page));
  },
});

export { expect } from '@playwright/test';
`,
      "tests/products.spec.ts": `import { test, expect } from '../fixtures';
import { json } from '../utils/api';

test.describe('Products @smoke', () => {
  test('search results all match the term', async ({ products }) => {
    await products.search('dress');
    const names = await products.names.allTextContents();
    expect(names.length).toBeGreaterThan(0);
    for (const name of names) expect(name.toLowerCase()).toContain('dress');
  });

  test('adding two products puts two rows in the cart', async ({ products, cart }) => {
    await products.addToCart(0);
    await products.addToCart(1);
    await cart.goto();
    await expect(cart.rows).toHaveCount(2);
  });

  test('every product shown in the UI exists in the products API', async ({ products, request }) => {
    const api = await json(await request.get('/api/productsList'));
    const known = new Set(api.products.map((p) => p.name));
    await products.search('dress');
    const names = await products.names.allTextContents();
    expect(names.length).toBeGreaterThan(0);
    for (const name of names) expect(known.has(name.trim())).toBe(true);
  });
});
`,
      "tests/api.spec.ts": `import { test, expect } from '../fixtures';
import { json } from '../utils/api';

test.describe('Products API @regression', () => {
  test('GET productsList returns products', async ({ request }) => {
    const body = await json(await request.get('/api/productsList'));
    expect(body.responseCode).toBe(200);
    expect(body.products.length).toBeGreaterThan(0);
  });

  test('POST verifyLogin without email is a 400', async ({ request }) => {
    const body = await json(await request.post('/api/verifyLogin', { form: { password: 'x' } }));
    expect(body.responseCode).toBe(400);
    expect(body.message).toContain('email or password parameter is missing');
  });
});
`,
    },
    selenium: wsSelenium("AutomationExercise"),
    notes: [...WS_NOTES, "UI and API specs share one config and one fixtures file; the request fixture comes from Playwright itself."],
  }),
  // ---------------- API and UI+API labs ----------------
  "swagshop-api-login": {
    playwright:
      pwHeader +
      `test('valid login returns a token', async ({ request }) => {
  const res = await request.post('/api/auth/login', { data: { username: 'standard_user', password: 'secret_sauce' } });
  expect(res).toBeOK();
  const body = await res.json();
  expect(body.token).toMatch(/^swg\\./);
  expect(body.user.username).toBe('standard_user');
});

test('wrong password is a 401', async ({ request }) => {
  const res = await request.post('/api/auth/login', { data: { username: 'standard_user', password: 'wrong' } });
  expect(res.status()).toBe(401);
  const body = await res.json();
  expect(body.error.code).toBe('invalid_credentials');
});

test('locked out user is a 423', async ({ request }) => {
  const res = await request.post('/api/auth/login', { data: { username: 'locked_out_user', password: 'secret_sauce' } });
  expect(res.status()).toBe(423);
  expect((await res.json()).error.code).toBe('locked');
});

test('GET /api/me without a session is a 401', async ({ request }) => {
  const res = await request.get('/api/me');
  expect(res.status()).toBe(401);
});
`,
    selenium: restAssured(
      "SwagShopLoginApiTest",
      "swagshop",
      `    @Test
    public void validLoginReturnsToken() {
        Response res = given().contentType("application/json")
            .body(Map.of("username", "standard_user", "password", "secret_sauce"))
            .post("/auth/login");
        Assert.assertEquals(res.statusCode(), 200);
        Assert.assertTrue(res.jsonPath().getString("token").startsWith("swg."));
        Assert.assertEquals(res.jsonPath().getString("user.username"), "standard_user");
    }

    @Test
    public void wrongPasswordIs401() {
        Response res = given().contentType("application/json")
            .body(Map.of("username", "standard_user", "password", "wrong"))
            .post("/auth/login");
        Assert.assertEquals(res.statusCode(), 401);
        Assert.assertEquals(res.jsonPath().getString("error.code"), "invalid_credentials");
    }

    @Test
    public void lockedUserIs423() {
        Response res = given().contentType("application/json")
            .body(Map.of("username", "locked_out_user", "password", "secret_sauce"))
            .post("/auth/login");
        Assert.assertEquals(res.statusCode(), 423);
    }

    @Test
    public void meWithoutSessionIs401() {
        Assert.assertEquals(given().get("/me").statusCode(), 401);
    }`,
    ),
    notes: [
      "The request fixture is a real HTTP client with its own cookie jar; each test gets a fresh one, which is why /api/me is anonymous in the last test.",
      "Assert both the status code and the error code in the body: a 401 with the wrong code is still a bug.",
      "expect(res).toBeOK() is the quick 2xx check; use res.status() when the exact code is part of the contract.",
    ],
  },
  "swagshop-api-cart": {
    playwright:
      pwHeader +
      `test.beforeEach(async ({ request }) => {
  const res = await request.post('/api/auth/login', { data: { username: 'standard_user', password: 'secret_sauce' } });
  expect(res).toBeOK();
});

test('cart totals, coupon, stock rule and line edits', async ({ request }) => {
  await request.post('/api/cart/items', { data: { productId: 4, qty: 2 } });
  let cart = await (await request.post('/api/cart/items', { data: { productId: 0 } })).json();
  expect(cart.count).toBe(3);
  expect(cart.subtotal).toBeCloseTo(45.97, 2);

  cart = await (await request.post('/api/cart/coupon', { data: { code: 'SAVE10' } })).json();
  expect(cart.coupon).toBe('SAVE10');
  expect(cart.discount).toBeCloseTo(4.6, 2);
  expect(cart.total).toBeCloseTo(44.68, 2);

  const oos = await request.post('/api/cart/items', { data: { productId: 10 } });
  expect(oos.status()).toBe(409);
  expect((await oos.json()).error.message).toContain('out of stock');

  const patched = await request.patch('/api/cart/items/4', { data: { qty: 1 } });
  expect(patched).toBeOK();
  cart = await (await request.delete('/api/cart/items/0')).json();
  expect(cart.count).toBe(1);
  expect(cart.items).toHaveLength(1);
  expect(cart.items[0].productId).toBe(4);
});
`,
    selenium: restAssured(
      "SwagShopCartApiTest",
      "swagshop",
      `    @Test
    public void cartTotalsCouponAndStockRule() {
        RequestSpecification s = given().contentType("application/json").filter(new SessionFilter());
        s.body(Map.of("username", "standard_user", "password", "secret_sauce")).post("/auth/login").then().statusCode(200);

        s.body(Map.of("productId", 4, "qty", 2)).post("/cart/items").then().statusCode(201);
        Response cart = s.body(Map.of("productId", 0)).post("/cart/items");
        Assert.assertEquals(cart.jsonPath().getInt("count"), 3);
        Assert.assertEquals(cart.jsonPath().getDouble("subtotal"), 45.97, 0.001);

        cart = s.body(Map.of("code", "SAVE10")).post("/cart/coupon");
        Assert.assertEquals(cart.jsonPath().getDouble("discount"), 4.6, 0.001);
        Assert.assertEquals(cart.jsonPath().getDouble("total"), 44.68, 0.001);

        Assert.assertEquals(s.body(Map.of("productId", 10)).post("/cart/items").statusCode(), 409);

        s.body(Map.of("qty", 1)).patch("/cart/items/4").then().statusCode(200);
        cart = s.delete("/cart/items/0");
        Assert.assertEquals(cart.jsonPath().getInt("count"), 1);
    }`,
    ),
    notes: [
      "Playwright's request context stores cookies, so the session created in beforeEach carries into every call of the test.",
      "Assert derived numbers (discount, tax, total), not just that the call succeeded; that is where cart bugs live.",
      "In REST Assured the cookies do not persist by default: reuse one RequestSpecification with a SessionFilter or pass the cookie explicitly.",
    ],
  },
  "swagshop-ui-api-checkout": {
    playwright:
      pwHeader +
      `test.beforeEach(async ({ page }) => {
  const api = page.request;
  expect(await api.post('/api/auth/login', { data: { username: 'standard_user', password: 'secret_sauce' } })).toBeOK();
  expect(await api.post('/api/cart/items', { data: { productId: 0 } })).toBeOK();
  expect(await api.post('/api/cart/items', { data: { productId: 4, qty: 2 } })).toBeOK();
  expect(await api.put('/api/checkout/info', { data: { firstName: 'Asha', lastName: 'Rao', postalCode: '560001' } })).toBeOK();
});

test('seeded cart checks out in the UI', async ({ page }) => {
  await page.goto('/checkout-step-two');
  await expect(page.getByTestId('title')).toHaveText('Checkout: Overview');
  await expect(page.getByTestId('inventory-item')).toHaveCount(2);
  await expect(page.getByTestId('ship-to')).toContainText('Asha Rao');
  await expect(page.getByTestId('total-label')).toHaveText('Total: $49.65');

  await page.getByRole('button', { name: 'Finish' }).click();
  await expect(page.getByTestId('complete-header')).toHaveText('Thank you for your order!');

  const orders = await (await page.request.get('/api/orders')).json();
  expect(orders.items).toHaveLength(1);
  expect(orders.items[0].status).toBe('placed');
  expect(orders.items[0].total).toBeCloseTo(49.65, 2);
});
`,
    selenium: javaClass(
      "SeededCheckoutTest",
      "/sandbox/swagshop",
      `    // Seed through REST Assured, then hand the session cookie to the browser.
    static final String API = "https://interview.qatechlabs.com/api/sandbox/swagshop";

    @Test
    public void seededCartChecksOutInTheUi() {
        io.restassured.filter.session.SessionFilter session = new io.restassured.filter.session.SessionFilter();
        io.restassured.specification.RequestSpecification api = io.restassured.RestAssured.given().baseUri(API).contentType("application/json").filter(session);
        api.body(Map.of("username", "standard_user", "password", "secret_sauce")).post("/auth/login").then().statusCode(200);
        api.body(Map.of("productId", 0)).post("/cart/items").then().statusCode(201);
        api.body(Map.of("productId", 4, "qty", 2)).post("/cart/items").then().statusCode(201);
        Map<String, String> cookies = api.put("/checkout/info").getCookies(); // session cookies set by the API

        driver.get(BASE + "#/");
        for (Map.Entry<String, String> c : cookies.entrySet()) driver.manage().addCookie(new Cookie(c.getKey(), c.getValue(), "/"));
        driver.get(BASE + "#/checkout-step-two");
        wait.until(ExpectedConditions.textToBe(By.cssSelector("[data-test=title]"), "Checkout: Overview"));
        Assert.assertEquals(driver.findElements(By.cssSelector("[data-test=inventory-item]")).size(), 2);
        Assert.assertEquals(driver.findElement(By.cssSelector("[data-test=total-label]")).getText(), "Total: $49.65");
        driver.findElement(By.id("finish")).click();
        wait.until(ExpectedConditions.textToBe(By.cssSelector("[data-test=complete-header]"), "Thank you for your order!"));
    }`,
    ),
    notes: [
      "page.request shares the browser context's cookies, so API seeding and UI steps see the same session. The standalone request fixture does not.",
      "Seed with the API, verify with the UI, confirm with the API: each layer is used for what it is best at.",
      "In Selenium there is no shared jar: copy the cookies the API returned into the driver before navigating.",
    ],
  },
  "peopledesk-api-employee-crud": {
    playwright:
      pwHeader +
      `test.beforeEach(async ({ request }) => {
  expect(await request.post('/api/auth/login', { data: { username: 'Admin', password: 'admin123' } })).toBeOK();
});

test('missing last name is rejected with field details', async ({ request }) => {
  const res = await request.post('/api/employees', { data: { firstName: 'Nolast' } });
  expect(res.status()).toBe(400);
  const body = await res.json();
  expect(body.error.code).toBe('validation_error');
  expect(body.error.details.lastName).toBe('Required');
});

test('create, search, update and delete an employee', async ({ request }) => {
  const lastName = 'Api' + Date.now();
  const created = await request.post('/api/employees', {
    data: { firstName: 'Priya', lastName, jobTitle: 'SDET', department: 'Quality Engineering', employmentStatus: 'Full-Time Permanent' },
  });
  expect(created.status()).toBe(201);
  const { employee } = await created.json();
  expect(employee.id).toMatch(/^\\d{4}$/);

  const found = await (await request.get('/api/employees', { params: { name: lastName } })).json();
  expect(found.total).toBe(1);
  expect(found.items[0].last).toBe(lastName);

  const updated = await request.patch(\`/api/employees/\${employee.id}\`, { data: { jobTitle: 'Test Lead' } });
  expect(updated).toBeOK();
  expect((await updated.json()).employee.job).toBe('Test Lead');

  expect(await request.delete(\`/api/employees/\${employee.id}\`)).toBeOK();
  const gone = await request.get(\`/api/employees/\${employee.id}\`);
  expect(gone.status()).toBe(404);
});
`,
    selenium: restAssured(
      "EmployeeCrudApiTest",
      "peopledesk",
      `    RequestSpecification admin;

    @BeforeMethod
    public void login() {
        admin = given().contentType("application/json").filter(new SessionFilter());
        admin.body(Map.of("username", "Admin", "password", "admin123")).post("/auth/login").then().statusCode(200);
    }

    @Test
    public void missingLastNameIsRejected() {
        Response res = admin.body(Map.of("firstName", "Nolast")).post("/employees");
        Assert.assertEquals(res.statusCode(), 400);
        Assert.assertEquals(res.jsonPath().getString("error.details.lastName"), "Required");
    }

    @Test
    public void createSearchUpdateDelete() {
        String lastName = "Api" + System.currentTimeMillis();
        Response created = admin.body(Map.of("firstName", "Priya", "lastName", lastName, "jobTitle", "SDET", "department", "Quality Engineering")).post("/employees");
        Assert.assertEquals(created.statusCode(), 201);
        String id = created.jsonPath().getString("employee.id");

        Assert.assertEquals(admin.queryParam("name", lastName).get("/employees").jsonPath().getInt("total"), 1);
        Assert.assertEquals(admin.body(Map.of("jobTitle", "Test Lead")).patch("/employees/" + id).jsonPath().getString("employee.job"), "Test Lead");
        admin.delete("/employees/" + id).then().statusCode(200);
        Assert.assertEquals(admin.get("/employees/" + id).statusCode(), 404);
    }`,
    ),
    notes: [
      "A unique last name per run keeps the search deterministic and lets the suite run in parallel against the same data.",
      "Reading the record back (search and GET after DELETE) proves the write happened; a 2xx on the write alone does not.",
      "Validation details are part of the contract: the UI shows error.details.lastName under the field, so the API test should pin it.",
    ],
  },
  "peopledesk-api-leave-workflow": {
    playwright:
      pwHeader +
      `const login = (request, username: string, password: string) => request.post('/api/auth/login', { data: { username, password } });

test('employee applies, admin approves, balance moves', async ({ request }) => {
  expect(await login(request, 'vikram.singh', 'Welcome@1')).toBeOK();
  const before = await (await request.get('/api/leave/balance')).json();
  expect(before.balances.find((b) => b.type === 'Casual Leave').available).toBe(12);

  const invalid = await request.post('/api/leave', { data: { leaveType: 'Casual Leave', fromDate: '2026-12-10', toDate: '2026-12-08' } });
  expect(invalid.status()).toBe(400);
  expect((await invalid.json()).error.details.toDate).toContain('after from date');

  const applied = await request.post('/api/leave', { data: { leaveType: 'Casual Leave', fromDate: '2026-12-10', toDate: '2026-12-12', comment: 'Family trip' } });
  expect(applied.status()).toBe(201);
  const { leave } = await applied.json();
  expect(leave.status).toBe('Pending Approval');
  expect(leave.days).toBe(3);

  const selfApprove = await request.post(\`/api/leave/\${leave.id}/approve\`);
  expect(selfApprove.status()).toBe(403);

  await request.post('/api/auth/logout');
  expect(await login(request, 'Admin', 'admin123')).toBeOK();
  const pending = await (await request.get('/api/leave', { params: { status: 'Pending Approval' } })).json();
  expect(pending.items.map((l) => l.id)).toContain(leave.id);

  const approved = await (await request.post(\`/api/leave/\${leave.id}/approve\`, { data: { comment: 'Enjoy' } })).json();
  expect(approved.leave.status).toBe('Scheduled');

  const after = await (await request.get('/api/leave/balance', { params: { employeeId: '0004' } })).json();
  const casual = after.balances.find((b) => b.type === 'Casual Leave');
  expect(casual.used).toBe(3);
  expect(casual.available).toBe(9);
});
`,
    selenium: restAssured(
      "LeaveWorkflowApiTest",
      "peopledesk",
      `    @Test
    public void employeeAppliesAdminApproves() {
        RequestSpecification s = given().contentType("application/json").filter(new SessionFilter());
        s.body(Map.of("username", "vikram.singh", "password", "Welcome@1")).post("/auth/login").then().statusCode(200);
        Assert.assertEquals(s.get("/leave/balance").jsonPath().getInt("balances.find { it.type == 'Casual Leave' }.available"), 12);

        Assert.assertEquals(s.body(Map.of("leaveType", "Casual Leave", "fromDate", "2026-12-10", "toDate", "2026-12-08")).post("/leave").statusCode(), 400);
        Response applied = s.body(Map.of("leaveType", "Casual Leave", "fromDate", "2026-12-10", "toDate", "2026-12-12")).post("/leave");
        Assert.assertEquals(applied.statusCode(), 201);
        int id = applied.jsonPath().getInt("leave.id");
        Assert.assertEquals(applied.jsonPath().getString("leave.status"), "Pending Approval");
        Assert.assertEquals(s.post("/leave/" + id + "/approve").statusCode(), 403);

        s.post("/auth/logout");
        s.body(Map.of("username", "Admin", "password", "admin123")).post("/auth/login").then().statusCode(200);
        Assert.assertEquals(s.body(Map.of("comment", "Enjoy")).post("/leave/" + id + "/approve").jsonPath().getString("leave.status"), "Scheduled");
        Response balance = s.queryParam("employeeId", "0004").get("/leave/balance");
        Assert.assertEquals(balance.jsonPath().getInt("balances.find { it.type == 'Casual Leave' }.available"), 9);
    }`,
    ),
    notes: [
      "Authorization tests (the 403) are as important as the happy path: a workflow where anyone can approve is a security bug.",
      "Switching roles inside one request context keeps the data the first role created, which is what makes the end-to-end assertion possible.",
      "Assert the side effect (the balance), not only the status transition; that is what the business actually cares about.",
    ],
  },
  "peopledesk-ui-api-seeded-search": {
    playwright:
      pwHeader +
      `let employeeId = '';
const lastName = 'Seed' + Date.now();

test.beforeEach(async ({ page }) => {
  const api = page.request;
  expect(await api.post('/api/auth/login', { data: { username: 'Admin', password: 'admin123' } })).toBeOK();
  const created = await api.post('/api/employees', { data: { firstName: 'Zara', lastName, jobTitle: 'QA Engineer', department: 'Quality Engineering' } });
  expect(created.status()).toBe(201);
  employeeId = (await created.json()).employee.id;
});

test.afterEach(async ({ page }) => {
  expect(await page.request.delete(\`/api/employees/\${employeeId}\`)).toBeOK();
  expect((await page.request.get(\`/api/employees/\${employeeId}\`)).status()).toBe(404);
});

test('seeded employee is found by name', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Username').fill('Admin');
  await page.getByLabel('Password').fill('admin123');
  await page.getByRole('button', { name: 'Login' }).click();
  await page.getByRole('link', { name: 'PIM' }).click();

  await page.getByLabel('Employee Name').fill(lastName);
  await page.getByRole('button', { name: 'Search' }).click();
  await expect(page.getByTestId('records-found')).toHaveText('(1) Record Found');
  await expect(page.getByTestId('employee-row')).toHaveCount(1);
  await expect(page.getByTestId('employee-row')).toContainText(lastName);
});
`,
    selenium: javaClass(
      "SeededSearchTest",
      "/sandbox/peopledesk",
      `    static final String API = "https://interview.qatechlabs.com/api/sandbox/peopledesk";
    io.restassured.specification.RequestSpecification api;
    String lastName, id;

    @BeforeMethod
    public void seed() {
        api = io.restassured.RestAssured.given().baseUri(API).contentType("application/json").filter(new io.restassured.filter.session.SessionFilter());
        api.body(Map.of("username", "Admin", "password", "admin123")).post("/auth/login").then().statusCode(200);
        lastName = "Seed" + System.currentTimeMillis();
        id = api.body(Map.of("firstName", "Zara", "lastName", lastName, "jobTitle", "QA Engineer", "department", "Quality Engineering")).post("/employees").jsonPath().getString("employee.id");
    }

    @Test
    public void seededEmployeeIsFoundByName() {
${javaHrLogin}
        driver.findElement(By.linkText("PIM")).click();
        driver.findElement(By.id("search-name")).sendKeys(lastName);
        driver.findElement(By.xpath("//button[text()='Search']")).click();
        wait.until(ExpectedConditions.textToBe(By.cssSelector("[data-test=records-found]"), "(1) Record Found"));
        Assert.assertTrue(driver.findElement(By.cssSelector("[data-test=employee-row]")).getText().contains(lastName));
    }

    @AfterMethod
    public void cleanUp() {
        api.delete("/employees/" + id).then().statusCode(200);
        Assert.assertEquals(api.get("/employees/" + id).statusCode(), 404);
    }`,
    ),
    notes: [
      "Seeding through the API makes the UI test faster and keeps it focused on the behaviour under test: the search.",
      "afterEach runs on failure too, so the clean-up never depends on the test passing; asserting the 404 proves the clean-up itself.",
      "Sharing state between hooks through a file-level variable works for one worker; a custom fixture is the scalable version.",
    ],
  },
  "trendkart-api-search": {
    playwright:
      pwHeader +
      `test('search returns matching products', async ({ request }) => {
  const res = await request.get('/api/products', { params: { q: 'shirt' } });
  expect(res).toBeOK();
  const body = await res.json();
  expect(body.total).toBe(5);
  expect(body.items).toHaveLength(5);
  for (const p of body.items) expect(p.name.toLowerCase()).toContain('shirt');
});

test('price_asc sorts ascending', async ({ request }) => {
  const body = await (await request.get('/api/products', { params: { q: 'shirt', sort: 'price_asc' } })).json();
  const prices = body.items.map((p) => p.price);
  expect(prices).toEqual([...prices].sort((a, b) => a - b));
});

test('product by id and unknown id', async ({ request }) => {
  const tee = await (await request.get('/api/products/104')).json();
  expect(tee.product.name).toBe('Men Printed Round Neck T-shirt');
  expect(tee.product.price).toBe(399);
  expect(tee.product.sizes).toContain('M');

  const missing = await request.get('/api/products/999');
  expect(missing.status()).toBe(404);
  expect((await missing.json()).error.code).toBe('not_found');
});
`,
    selenium: restAssured(
      "ProductSearchApiTest",
      "trendkart",
      `    @Test
    public void searchReturnsMatchingProducts() {
        Response res = given().queryParam("q", "shirt").get("/products");
        Assert.assertEquals(res.statusCode(), 200);
        Assert.assertEquals(res.jsonPath().getInt("total"), 5);
        for (String name : res.jsonPath().getList("items.name", String.class)) Assert.assertTrue(name.toLowerCase().contains("shirt"), name);
    }

    @Test
    public void priceAscSortsAscending() {
        List<Integer> prices = given().queryParam("q", "shirt").queryParam("sort", "price_asc").get("/products").jsonPath().getList("items.price", Integer.class);
        Assert.assertEquals(prices, prices.stream().sorted().toList());
    }

    @Test
    public void productByIdAndUnknownId() {
        Response tee = given().get("/products/104");
        Assert.assertEquals(tee.jsonPath().getString("product.name"), "Men Printed Round Neck T-shirt");
        Assert.assertEquals(given().get("/products/999").statusCode(), 404);
    }`,
    ),
    notes: [
      "Pass query parameters with params instead of building strings; Playwright encodes them for you.",
      "Checking every returned name against the query is a contract test for search relevance, not just for the count.",
      "A 404 with a stable error.code lets the UI show the right message; pin it in the API test.",
    ],
  },
  "trendkart-api-checkout": {
    playwright:
      pwHeader +
      `test('new customer journey through the API', async ({ request }) => {
  const email = 'buyer' + Date.now() + '@example.com';
  const reg = await request.post('/api/auth/register', { data: { name: 'Test Buyer', email, password: 'Buyer@123' } });
  expect(reg.status()).toBe(201);
  expect((await reg.json()).token).toMatch(/^tk\\./);

  const noSize = await request.post('/api/bag/items', { data: { productId: 104 } });
  expect(noSize.status()).toBe(400);
  expect((await noSize.json()).error.message).toBe('Please select a size');

  const oos = await request.post('/api/bag/items', { data: { productId: 101, size: 'XL' } });
  expect(oos.status()).toBe(409);

  let bag = await (await request.post('/api/bag/items', { data: { productId: 104, size: 'M', qty: 3 } })).json();
  expect(bag.totals.total).toBe(1197);
  expect(bag.totals.count).toBe(3);

  bag = await (await request.post('/api/bag/coupon', { data: { code: 'TRENDY10' } })).json();
  expect(bag.totals.coupon).toBe(120);
  expect(bag.totals.total).toBe(1077);

  const addr = await (await request.post('/api/addresses', {
    data: { name: 'Test Buyer', phone: '9876543210', line1: '12 MG Road', city: 'Bengaluru', state: 'Karnataka', pincode: '560001' },
  })).json();
  const placed = await request.post('/api/orders', { data: { addressId: addr.address.id, payment: 'upi' } });
  expect(placed.status()).toBe(201);
  const { order } = await placed.json();
  expect(order.status).toBe('confirmed');
  expect(order.totals.total).toBe(1077);

  const list = await (await request.get('/api/orders')).json();
  expect(list.items).toHaveLength(1);
  expect(list.items[0].id).toBe(order.id);

  const cancelled = await (await request.post(\`/api/orders/\${order.id}/cancel\`)).json();
  expect(cancelled.order.status).toBe('cancelled');
});
`,
    selenium: restAssured(
      "CheckoutJourneyApiTest",
      "trendkart",
      `    @Test
    public void newCustomerJourney() {
        RequestSpecification s = given().contentType("application/json").filter(new SessionFilter());
        String email = "buyer" + System.currentTimeMillis() + "@example.com";
        Assert.assertEquals(s.body(Map.of("name", "Test Buyer", "email", email, "password", "Buyer@123")).post("/auth/register").statusCode(), 201);

        Assert.assertEquals(s.body(Map.of("productId", 104)).post("/bag/items").statusCode(), 400);
        Assert.assertEquals(s.body(Map.of("productId", 101, "size", "XL")).post("/bag/items").statusCode(), 409);
        Assert.assertEquals(s.body(Map.of("productId", 104, "size", "M", "qty", 3)).post("/bag/items").jsonPath().getInt("totals.total"), 1197);
        Assert.assertEquals(s.body(Map.of("code", "TRENDY10")).post("/bag/coupon").jsonPath().getInt("totals.total"), 1077);

        int addressId = s.body(Map.of("name", "Test Buyer", "phone", "9876543210", "line1", "12 MG Road", "city", "Bengaluru", "state", "Karnataka", "pincode", "560001")).post("/addresses").jsonPath().getInt("address.id");
        Response placed = s.body(Map.of("addressId", addressId, "payment", "upi")).post("/orders");
        Assert.assertEquals(placed.statusCode(), 201);
        String orderId = placed.jsonPath().getString("order.id");
        Assert.assertEquals(placed.jsonPath().getInt("order.totals.total"), 1077);
        Assert.assertEquals(s.get("/orders").jsonPath().getList("items").size(), 1);
        Assert.assertEquals(s.post("/orders/" + orderId + "/cancel").jsonPath().getString("order.status"), "cancelled");
    }`,
    ),
    notes: [
      "One long journey test is fine for an API smoke; split it into focused tests once a step starts failing for unrelated reasons.",
      "Negative cases in the same session (400, 409) prove the rules without leaving anything in the bag.",
      "Register with a unique email so the test is repeatable; the practice API resets per session, real ones do not.",
    ],
  },
  "trendkart-ui-api-bag": {
    playwright:
      pwHeader +
      `test.beforeEach(async ({ page }) => {
  const api = page.request;
  expect(await api.post('/api/bag/items', { data: { productId: 104, size: 'M', qty: 3 } })).toBeOK();
  expect(await api.post('/api/bag/coupon', { data: { code: 'TRENDY10' } })).toBeOK();
});

test('seeded bag checks out in the UI', async ({ page }) => {
  await page.goto('/bag');
  await expect(page.getByTestId('bag-item')).toHaveCount(1);
  await expect(page.getByTestId('bag-item-size')).toContainText('M');
  await expect(page.getByTestId('coupon-discount')).toHaveText('-₹120');
  await expect(page.getByTestId('total-amount')).toHaveText('₹1,077');

  await page.getByRole('button', { name: 'PLACE ORDER' }).click();
  await page.getByLabel('Full name').fill('Test Buyer');
  await page.getByLabel('Mobile number').fill('9876543210');
  await page.getByLabel('Address line').fill('12 MG Road');
  await page.getByLabel('City').fill('Bengaluru');
  await page.getByLabel('State').fill('Karnataka');
  await page.getByLabel('Pincode').fill('560001');
  await page.getByRole('button', { name: 'CONFIRM ORDER' }).click();
  await expect(page.getByTestId('order-confirmed')).toBeVisible();

  const orders = await (await page.request.get('/api/orders')).json();
  expect(orders.items).toHaveLength(1);
  expect(orders.items[0].status).toBe('confirmed');
  expect(orders.items[0].totals.total).toBe(1077);
});
`,
    selenium: javaClass(
      "SeededBagCheckoutTest",
      "/sandbox/trendkart",
      `    static final String API = "https://interview.qatechlabs.com/api/sandbox/trendkart";

    @Test
    public void seededBagChecksOutInTheUi() {
        io.restassured.filter.session.SessionFilter session = new io.restassured.filter.session.SessionFilter();
        io.restassured.specification.RequestSpecification api = io.restassured.RestAssured.given().baseUri(API).contentType("application/json").filter(session);
        api.body(Map.of("productId", 104, "size", "M", "qty", 3)).post("/bag/items").then().statusCode(201);
        Map<String, String> cookies = api.body(Map.of("code", "TRENDY10")).post("/bag/coupon").getCookies();

        driver.get(BASE + "#/");
        for (Map.Entry<String, String> c : cookies.entrySet()) driver.manage().addCookie(new Cookie(c.getKey(), c.getValue(), "/"));
        driver.get(BASE + "#/bag");
        wait.until(ExpectedConditions.textToBe(By.cssSelector("[data-testid=total-amount]"), "₹1,077"));
        Assert.assertEquals(driver.findElements(By.cssSelector("[data-testid=bag-item]")).size(), 1);
        driver.findElement(By.cssSelector("[data-testid=place-order]")).click();
        driver.findElement(By.cssSelector("[aria-label='Full name']")).sendKeys("Test Buyer");
        driver.findElement(By.cssSelector("[aria-label='Mobile number']")).sendKeys("9876543210");
        driver.findElement(By.cssSelector("[aria-label='Address line']")).sendKeys("12 MG Road");
        driver.findElement(By.cssSelector("[aria-label='City']")).sendKeys("Bengaluru");
        driver.findElement(By.cssSelector("[aria-label='State']")).sendKeys("Karnataka");
        driver.findElement(By.cssSelector("[aria-label='Pincode']")).sendKeys("560001");
        driver.findElement(By.cssSelector("[data-testid=confirm-order]")).click();
        wait.until(ExpectedConditions.visibilityOfElementLocated(By.cssSelector("[data-testid=order-confirmed]")));
    }`,
    ),
    notes: [
      "The UI test starts on the page under test because the API did the shopping; that is the whole point of hybrid tests.",
      "Assert the formatted money the customer sees (₹1,077), then the raw number from the API (1077): two layers, one truth.",
      "Guests can check out, so no account is needed; add a login step only when the scenario is about member features.",
    ],
  },
  // ---------------- Production-grade end-to-end journeys ----------------
  "swagshop-e2e-purchase-journey": {
    playwright:
      pwHeader +
      `const money = (t: string | null) => Number((t || '').match(/\\$([0-9.]+)/)?.[1] || 0); // the $ amount in the label
const r2 = (n: number) => Math.round(n * 100) / 100;

test('purchase journey: catalogue, cart, checkout, order', async ({ page }) => {
  const api = page.request;
  let jacket = 0;
  let tee = 0;
  let orderId = '';

  await test.step('catalogue is healthy (API)', async () => {
    const res = await api.get('/api/products');
    expect(res).toBeOK();
    const { items, total } = await res.json();
    expect(total).toBe(12);
    jacket = items.find((p) => p.name === 'Fleece Zip Jacket').price;
    tee = items.find((p) => p.name === 'Classic Cotton Tee').price;
    expect(jacket).toBeGreaterThan(0);
  });

  await test.step('shop as a customer (UI)', async () => {
    await page.goto('/');
    await page.getByPlaceholder('Username').fill('standard_user');
    await page.getByPlaceholder('Password').fill('secret_sauce');
    await page.getByRole('button', { name: 'Login' }).click();
    await expect(page.getByTestId('inventory-item')).toHaveCount(12);

    await page.getByTestId('add-to-cart-fleece-zip-jacket').click();
    await page.getByTestId('add-to-cart-classic-cotton-tee').click();
    await expect(page.getByTestId('shopping-cart-badge')).toHaveText('2');

    await page.getByRole('button', { name: 'Shopping cart' }).click();
    await page.getByLabel('Quantity for Classic Cotton Tee').selectOption('2');
    await expect(page.getByTestId('shopping-cart-badge')).toHaveText('3');
    await page.getByLabel('Coupon code').fill('SAVE10');
    await page.getByRole('button', { name: 'Apply' }).click();
    await expect(page.getByTestId('coupon-message')).toContainText('10% off');
  });

  await test.step('checkout maths (UI vs API prices)', async () => {
    await page.getByRole('button', { name: 'Checkout' }).click();
    await page.getByPlaceholder('First Name').fill('Asha');
    await page.getByPlaceholder('Last Name').fill('Rao');
    await page.getByPlaceholder('Zip/Postal Code').fill('560001');
    await page.getByRole('button', { name: 'Continue' }).click();
    await expect(page).toHaveURL(/checkout-step-two/);
    await expect(page.getByTestId('inventory-item')).toHaveCount(2);

    const subtotal = r2(jacket + 2 * tee);
    const discount = r2(subtotal * 0.1);
    const tax = r2((subtotal - discount) * 0.08);
    const total = r2(subtotal - discount + tax);
    expect(money(await page.getByTestId('subtotal-label').textContent())).toBeCloseTo(subtotal, 2);
    expect(money(await page.getByTestId('discount-label').textContent())).toBeCloseTo(discount, 2);
    expect(money(await page.getByTestId('tax-label').textContent())).toBeCloseTo(tax, 2);
    expect(money(await page.getByTestId('total-label').textContent())).toBeCloseTo(total, 2);

    await page.getByRole('button', { name: 'Finish' }).click();
    await expect(page.getByTestId('complete-header')).toHaveText('Thank you for your order!');
    orderId = (await page.getByTestId('order-id').textContent()) || '';
  });

  await test.step('order placed, then cancelled (API + UI)', async () => {
    const orders = await (await api.get('/api/orders')).json();
    expect(orders.items).toHaveLength(1);
    const order = orders.items[0];
    expect(order.id).toBe(orderId);
    expect(order.coupon).toBe('SAVE10');
    expect(order.total).toBeCloseTo(r2(jacket + 2 * tee) * 0.9 * 1.08, 1);

    const cancelled = await api.post(\`/api/orders/\${orderId}/cancel\`);
    expect(cancelled).toBeOK();

    await page.goto(\`/orders/\${orderId}\`);
    await expect(page.getByTestId('order-status')).toHaveText('cancelled');
    await expect(page.getByTestId('cancel-order')).toHaveCount(0);
  });
});
`,
    selenium: javaClass(
      "PurchaseJourneyTest",
      "/sandbox/swagshop",
      `    static final String API = "https://interview.qatechlabs.com/api/sandbox/swagshop";

    @Test
    public void purchaseJourney() {
        // Catalogue through REST Assured
        io.restassured.response.Response products = io.restassured.RestAssured.given().baseUri(API).get("/products");
        Assert.assertEquals(products.jsonPath().getInt("total"), 12);
        double jacket = products.jsonPath().getDouble("items.find { it.name == 'Fleece Zip Jacket' }.price");
        double tee = products.jsonPath().getDouble("items.find { it.name == 'Classic Cotton Tee' }.price");

        // Shop in the UI
${javaSwagLogin}
        wait.until(ExpectedConditions.numberOfElementsToBe(By.cssSelector("[data-test=inventory-item]"), 12));
        driver.findElement(By.cssSelector("[data-test=add-to-cart-fleece-zip-jacket]")).click();
        driver.findElement(By.cssSelector("[data-test=add-to-cart-classic-cotton-tee]")).click();
        wait.until(ExpectedConditions.textToBe(By.cssSelector("[data-test=shopping-cart-badge]"), "2"));
        driver.findElement(By.cssSelector("[data-test=shopping-cart-link]")).click();
        new Select(driver.findElement(By.cssSelector("[aria-label='Quantity for Classic Cotton Tee']"))).selectByVisibleText("2");
        driver.findElement(By.id("coupon")).sendKeys("SAVE10");
        driver.findElement(By.cssSelector("[data-test=apply-coupon]")).click();
        wait.until(ExpectedConditions.textToBePresentInElementLocated(By.cssSelector("[data-test=coupon-message]"), "10% off"));

        driver.findElement(By.cssSelector("[data-test=checkout]")).click();
        driver.findElement(By.id("first-name")).sendKeys("Asha");
        driver.findElement(By.id("last-name")).sendKeys("Rao");
        driver.findElement(By.id("postal-code")).sendKeys("560001");
        driver.findElement(By.id("continue")).click();
        wait.until(ExpectedConditions.urlContains("checkout-step-two"));

        double subtotal = Math.round((jacket + 2 * tee) * 100) / 100.0;
        double discount = Math.round(subtotal * 10) / 100.0;
        double tax = Math.round((subtotal - discount) * 8) / 100.0;
        Assert.assertEquals(money(driver.findElement(By.cssSelector("[data-test=total-label]")).getText()), subtotal - discount + tax, 0.01);
        driver.findElement(By.id("finish")).click();
        wait.until(ExpectedConditions.textToBe(By.cssSelector("[data-test=complete-header]"), "Thank you for your order!"));
        String orderId = driver.findElement(By.cssSelector("[data-test=order-id]")).getText();

        // Verify and cancel through the API with the browser's session cookies
        io.restassured.specification.RequestSpecification api = io.restassured.RestAssured.given().baseUri(API);
        for (Cookie c : driver.manage().getCookies()) api = api.cookie(c.getName(), c.getValue());
        Assert.assertEquals(api.get("/orders").jsonPath().getString("items[0].coupon"), "SAVE10");
        Assert.assertEquals(api.post("/orders/" + orderId + "/cancel").statusCode(), 200);
        driver.get(BASE + "#/orders/" + orderId);
        wait.until(ExpectedConditions.textToBe(By.cssSelector("[data-test=order-status]"), "cancelled"));
    }

    static double money(String t) { return Double.parseDouble(t.replaceAll("[^0-9.]", "")); }`,
    ),
    notes: [
      "Reading prices from the API and computing the expected totals makes the test survive a price change; hard-coded totals break on the first catalogue update.",
      "test.step gives the report (and the delivery manager) the four phases of the journey; a failure points at a phase, not at line 57.",
      "Every state change is verified on the other layer: the UI order through GET /api/orders, the API cancellation through the order page.",
    ],
  },
  "peopledesk-e2e-hire-to-leave": {
    playwright:
      pwHeader +
      `const lastName = 'Hire' + Date.now();
let employeeId = '';

const loginUi = async (page, username: string, password: string) => {
  await page.goto('/');
  await page.getByLabel('Username').fill(username);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Login' }).click();
  await expect(page.getByRole('link', { name: 'Dashboard' })).toBeVisible();
};

test.beforeEach(async ({ page }) => {
  const api = page.request;
  expect(await api.post('/api/auth/login', { data: { username: 'Admin', password: 'admin123' } })).toBeOK();
  const created = await api.post('/api/employees', { data: { firstName: 'Rhea', lastName, jobTitle: 'QA Engineer', department: 'Quality Engineering' } });
  expect(created.status()).toBe(201);
  employeeId = (await created.json()).employee.id;
});

test.afterEach(async ({ page }) => {
  const api = page.request;
  await api.post('/api/auth/login', { data: { username: 'Admin', password: 'admin123' } });
  expect(await api.delete(\`/api/employees/\${employeeId}\`)).toBeOK();
  expect((await api.get(\`/api/employees/\${employeeId}\`)).status()).toBe(404);
});

test('hire to leave approval', async ({ page }) => {
  const api = page.request;

  await test.step('employee logs in and applies (UI)', async () => {
    await loginUi(page, \`rhea.\${lastName.toLowerCase()}\`, 'Welcome@1');
    await page.getByRole('link', { name: 'My Info' }).click();
    await expect(page.getByTestId('my-name')).toHaveText(\`Rhea \${lastName}\`);
    await expect(page.getByTestId('my-id')).toHaveText(employeeId);

    await page.getByRole('link', { name: 'Leave' }).click();
    await page.getByLabel('Leave Type').selectOption('Sick Leave');
    await page.getByLabel('From Date').fill('2026-12-01');
    await page.getByLabel('To Date').fill('2026-12-02');
    await page.getByRole('button', { name: 'Apply' }).click();
    await expect(page.getByRole('status')).toContainText('Successfully Submitted');
    await expect(page.getByTestId('leave-row').getByTestId('leave-status')).toHaveText('Pending Approval');

    await page.getByRole('link', { name: 'Time' }).click();
    await page.getByRole('button', { name: 'Punch In' }).click();
    await expect(page.getByTestId('punch-status')).toContainText('Punched in');
  });

  await test.step('request and punch exist (API)', async () => {
    const leave = await (await api.get('/api/leave')).json();
    expect(leave.items).toHaveLength(1);
    expect(leave.items[0]).toMatchObject({ days: 2, status: 'Pending Approval', employeeId });
    const attendance = await (await api.get('/api/attendance')).json();
    expect(attendance.open).not.toBeNull();
  });

  await test.step('admin approves (UI) and the balance moves (API)', async () => {
    await page.getByTestId('user-menu').click();
    await page.getByRole('menuitem', { name: 'Logout' }).click();
    await loginUi(page, 'Admin', 'admin123');
    await page.getByRole('link', { name: 'Leave' }).click();
    const row = page.getByTestId('leave-row').filter({ hasText: lastName });
    await row.getByRole('button', { name: 'Approve' }).click();
    await expect(row.getByTestId('leave-status')).toHaveText('Scheduled');

    const balance = await (await api.get('/api/leave/balance', { params: { employeeId } })).json();
    const sick = balance.balances.find((b) => b.type === 'Sick Leave');
    expect(sick.used).toBe(2);
    expect(sick.available).toBe(8);
  });
});
`,
    selenium: javaClass(
      "HireToLeaveTest",
      "/sandbox/peopledesk",
      `    static final String API = "https://interview.qatechlabs.com/api/sandbox/peopledesk";
    io.restassured.specification.RequestSpecification admin;
    String lastName, id;

    @BeforeMethod
    public void seedHire() {
        admin = io.restassured.RestAssured.given().baseUri(API).contentType("application/json").filter(new io.restassured.filter.session.SessionFilter());
        admin.body(Map.of("username", "Admin", "password", "admin123")).post("/auth/login").then().statusCode(200);
        lastName = "Hire" + System.currentTimeMillis();
        id = admin.body(Map.of("firstName", "Rhea", "lastName", lastName, "jobTitle", "QA Engineer", "department", "Quality Engineering")).post("/employees").jsonPath().getString("employee.id");
    }

    @Test
    public void hireToLeaveApproval() {
        login("rhea." + lastName.toLowerCase(), "Welcome@1");
        driver.findElement(By.linkText("Leave")).click();
        new Select(driver.findElement(By.id("leaveType"))).selectByVisibleText("Sick Leave");
        driver.findElement(By.id("fromDate")).sendKeys("2026-12-01");
        driver.findElement(By.id("toDate")).sendKeys("2026-12-02");
        driver.findElement(By.xpath("//button[text()='Apply']")).click();
        wait.until(ExpectedConditions.textToBe(By.cssSelector("[data-test=leave-status]"), "Pending Approval"));
        driver.findElement(By.linkText("Time")).click();
        driver.findElement(By.cssSelector("[data-test=punch-in]")).click();
        wait.until(ExpectedConditions.textToBePresentInElementLocated(By.cssSelector("[data-test=punch-status]"), "Punched in"));

        // Verify through the API with the browser's cookies
        io.restassured.specification.RequestSpecification me = io.restassured.RestAssured.given().baseUri(API);
        for (Cookie c : driver.manage().getCookies()) me = me.cookie(c.getName(), c.getValue());
        Assert.assertEquals(me.get("/leave").jsonPath().getInt("items[0].days"), 2);

        driver.findElement(By.cssSelector("[data-test=user-menu]")).click();
        driver.findElement(By.xpath("//a[@role='menuitem' and text()='Logout']")).click();
        login("Admin", "admin123");
        driver.findElement(By.linkText("Leave")).click();
        WebElement row = driver.findElement(By.xpath("//tr[@data-test='leave-row'][contains(., '" + lastName + "')]"));
        row.findElement(By.xpath(".//button[text()='Approve']")).click();
        wait.until(ExpectedConditions.textToBe(By.xpath("//tr[@data-test='leave-row'][contains(., '" + lastName + "')]//*[@data-test='leave-status']"), "Scheduled"));
        Assert.assertEquals(admin.queryParam("employeeId", id).get("/leave/balance").jsonPath().getInt("balances.find { it.type == 'Sick Leave' }.available"), 8);
    }

    @AfterMethod
    public void cleanUp() {
        admin.delete("/employees/" + id).then().statusCode(200);
        Assert.assertEquals(admin.get("/employees/" + id).statusCode(), 404);
    }

    void login(String user, String pw) {
        driver.get(BASE + "#/auth/login");
        driver.findElement(By.id("username")).clear();
        driver.findElement(By.id("username")).sendKeys(user);
        driver.findElement(By.id("password")).sendKeys(pw);
        driver.findElement(By.cssSelector("#login-form button[type=submit]")).click();
        wait.until(ExpectedConditions.visibilityOfElementLocated(By.linkText("Dashboard")));
    }`,
    ),
    notes: [
      "One browser session carries both roles in sequence, and page.request follows it, so the API checks always run as the user the UI is logged in as.",
      "Seed and clean up through the API; the UI is for the behaviour under test (apply, punch, approve), not for data setup.",
      "afterEach logs in as Admin again before deleting: never assume the session state a failed test left behind.",
    ],
  },
  "trendkart-e2e-member-journey": {
    playwright:
      pwHeader +
      `const inr = (t: string | null) => Number((t || '').replace(/[^0-9]/g, ''));
const email = 'member' + Date.now() + '@example.com';

test('new member: sign up, wishlist, bag, coupon, order, cancel', async ({ page }) => {
  const api = page.request;
  let expectedTotal = 0;
  let orderId = '';

  await test.step('sign up (UI) and verify the session (API)', async () => {
    await page.goto('/register');
    await page.getByLabel('Name').fill('Meera Member');
    await page.getByLabel('Mobile').fill('9876543210');
    await page.getByTestId('auth-email').fill(email);
    await page.getByTestId('auth-password').fill('Member@123');
    await page.getByTestId('auth-submit').click();
    await expect(page.getByTestId('account-name')).toContainText('Meera Member');
    const me = await (await api.get('/api/me')).json();
    expect(me.user.email).toBe(email);
  });

  await test.step('wishlist (API) to bag (UI) with a member coupon', async () => {
    expect(await api.post('/api/wishlist', { data: { productId: 106 } })).toBeOK();
    await page.goto('/wishlist');
    await expect(page.getByTestId('wishlist-item')).toHaveCount(1);
    await page.getByLabel('Size for Women Floral Print Kurta').selectOption('S');
    await page.getByTestId('move-to-bag').click();
    await expect(page.getByTestId('bag-count')).toHaveText('1');

    await page.goto('/p/104');
    await page.getByRole('button', { name: 'M', exact: true }).click();
    await page.getByTestId('add-to-bag').click();
    await expect(page.getByTestId('bag-count')).toHaveText('2');

    await page.goto('/bag');
    await page.getByLabel('Quantity for Men Printed Round Neck T-shirt').selectOption('2');
    await expect(page.getByTestId('bag-count')).toHaveText('3');
    await page.getByLabel('Coupon code').fill('NEWUSER');
    await page.getByRole('button', { name: 'Apply' }).click();
    await expect(page.getByTestId('coupon-message')).toContainText('NEWUSER applied');
  });

  await test.step('bag totals agree between UI and API', async () => {
    const bag = await (await api.get('/api/bag')).json();
    expect(bag.coupon).toBe('NEWUSER');
    expect(bag.totals.count).toBe(3);
    expectedTotal = bag.totals.total;
    expect(inr(await page.getByTestId('total-amount').textContent())).toBe(expectedTotal);
    expect(inr(await page.getByTestId('coupon-discount').textContent())).toBe(bag.totals.coupon);
  });

  await test.step('order to a saved address, verify, cancel', async () => {
    expect(await api.post('/api/addresses', { data: { name: 'Meera Member', phone: '9876543210', line1: '7 Residency Road', city: 'Bengaluru', state: 'Karnataka', pincode: '560025' } })).toBeOK();
    await page.getByTestId('place-order').click();
    await page.getByTestId('saved-address').getByRole('radio').first().check();
    await page.getByLabel('Cash on delivery').check();
    await page.getByTestId('confirm-order').click();
    await expect(page.getByTestId('order-confirmed')).toBeVisible();
    orderId = (await page.getByTestId('order-id').textContent()) || '';

    const orders = await (await api.get('/api/orders')).json();
    expect(orders.items).toHaveLength(1);
    expect(orders.items[0]).toMatchObject({ id: orderId, status: 'confirmed', payment: 'cod' });
    expect(orders.items[0].totals.total).toBe(expectedTotal);

    await page.goto(\`/orders/\${orderId}\`);
    await page.getByTestId('cancel-order').click();
    await expect(page.getByTestId('order-status')).toHaveText('cancelled');
    const after = await (await api.get(\`/api/orders/\${orderId}\`)).json();
    expect(after.order.status).toBe('cancelled');
  });
});
`,
    selenium: javaClass(
      "MemberJourneyTest",
      "/sandbox/trendkart",
      `    static final String API = "https://interview.qatechlabs.com/api/sandbox/trendkart";

    @Test
    public void newMemberJourney() {
        String email = "member" + System.currentTimeMillis() + "@example.com";
        driver.get(BASE + "#/register");
        driver.findElement(By.cssSelector("[data-testid=auth-name]")).sendKeys("Meera Member");
        driver.findElement(By.cssSelector("[data-testid=auth-phone]")).sendKeys("9876543210");
        driver.findElement(By.cssSelector("[data-testid=auth-email]")).sendKeys(email);
        driver.findElement(By.cssSelector("[data-testid=auth-password]")).sendKeys("Member@123");
        driver.findElement(By.cssSelector("[data-testid=auth-submit]")).click();
        wait.until(ExpectedConditions.visibilityOfElementLocated(By.cssSelector("[data-testid=account-name]")));

        io.restassured.specification.RequestSpecification api = io.restassured.RestAssured.given().baseUri(API).contentType("application/json");
        for (Cookie c : driver.manage().getCookies()) api = api.cookie(c.getName(), c.getValue());
        api.body(Map.of("productId", 106)).post("/wishlist").then().statusCode(201);

        driver.get(BASE + "#/wishlist");
        new Select(driver.findElement(By.cssSelector("[aria-label='Size for Women Floral Print Kurta']"))).selectByVisibleText("S");
        driver.findElement(By.cssSelector("[data-testid=move-to-bag]")).click();
        wait.until(ExpectedConditions.textToBe(By.cssSelector("[data-testid=bag-count]"), "1"));
        driver.get(BASE + "#/p/104");
        driver.findElement(By.xpath("//button[text()='M']")).click();
        driver.findElement(By.cssSelector("[data-testid=add-to-bag]")).click();
        wait.until(ExpectedConditions.textToBe(By.cssSelector("[data-testid=bag-count]"), "2"));
        driver.get(BASE + "#/bag");
        new Select(driver.findElement(By.cssSelector("[aria-label='Quantity for Men Printed Round Neck T-shirt']"))).selectByVisibleText("2");
        driver.findElement(By.id("coupon")).sendKeys("NEWUSER");
        driver.findElement(By.cssSelector("#coupon-form button")).click();
        wait.until(ExpectedConditions.textToBePresentInElementLocated(By.cssSelector("[data-testid=coupon-message]"), "applied"));

        for (Cookie c : driver.manage().getCookies()) api = api.cookie(c.getName(), c.getValue());
        int expectedTotal = api.get("/bag").jsonPath().getInt("totals.total");
        Assert.assertEquals(inr(driver.findElement(By.cssSelector("[data-testid=total-amount]")).getText()), expectedTotal);

        api.body(Map.of("name", "Meera Member", "phone", "9876543210", "line1", "7 Residency Road", "city", "Bengaluru", "state", "Karnataka", "pincode", "560025")).post("/addresses").then().statusCode(201);
        driver.findElement(By.cssSelector("[data-testid=place-order]")).click();
        driver.findElement(By.cssSelector("[data-testid=saved-address] input")).click();
        driver.findElement(By.cssSelector("input[name=payment][value=cod]")).click();
        driver.findElement(By.cssSelector("[data-testid=confirm-order]")).click();
        wait.until(ExpectedConditions.visibilityOfElementLocated(By.cssSelector("[data-testid=order-confirmed]")));
        String orderId = driver.findElement(By.cssSelector("[data-testid=order-id]")).getText();
        Assert.assertEquals(api.get("/orders").jsonPath().getInt("items[0].totals.total"), expectedTotal);

        driver.get(BASE + "#/orders/" + orderId);
        driver.findElement(By.cssSelector("[data-testid=cancel-order]")).click();
        wait.until(ExpectedConditions.textToBe(By.cssSelector("[data-testid=order-status]"), "cancelled"));
        Assert.assertEquals(api.get("/orders/" + orderId).jsonPath().getString("order.status"), "cancelled");
    }

    static int inr(String t) { return Integer.parseInt(t.replaceAll("[^0-9]", "")); }`,
    ),
    notes: [
      "The expected total comes from the API in the same session, so the test reconciles two layers instead of trusting either one.",
      "Member-only behaviour (NEWUSER, saved addresses, order history) is exactly what a sign-up journey must cover; a guest flow would miss it.",
      "Cancelling in the UI and reading the status back from the API closes the loop on the order lifecycle.",
    ],
  },
};
