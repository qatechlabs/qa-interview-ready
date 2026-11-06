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
const withFiles = (s: Omit<Solution, "playwright"> & { files: Record<string, string> }): Solution => ({ ...s, playwright: bundle(s.files) });

export const SOLUTIONS: Record<string, Solution> = {
  "swagshop-login": {
    playwright:
      pwHeader +
      `test('standard user can log in', async ({ page }) => {
${swagLogin}

  await expect(page).toHaveURL(/inventory/);
  await expect(page.getByTestId('title')).toHaveText('Products');
  await expect(page.getByTestId('inventory-item')).toHaveCount(6);
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
        Assert.assertEquals(driver.findElements(By.cssSelector("[data-test=inventory-item]")).size(), 6);
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

  expect(prices).toHaveLength(6);
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
  await expect(page.getByTestId('employee-row')).toHaveCount(6);

  await page.getByRole('button', { name: 'Delete Vikram Singh' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('button', { name: 'No, Cancel' }).click();
  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(vikram).toHaveCount(1);

  await page.getByRole('button', { name: 'Delete Vikram Singh' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Yes, Delete' }).click();
  await expect(page.getByRole('status')).toContainText('Successfully Deleted');
  await expect(vikram).toHaveCount(0);
  await expect(page.getByTestId('records-found')).toHaveText('(5) Records Found');
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
        Assert.assertEquals(driver.findElement(By.cssSelector("[data-test=records-found]")).getText(), "(5) Records Found");
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
  expect(prices).toHaveLength(6);
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
      "pages/inventory.page.ts": `import type { Page } from '@playwright/test';

export class InventoryPage {
  constructor(private readonly page: Page) {}

  private card(productName: string) {
    return this.page.getByTestId('inventory-item').filter({ hasText: productName });
  }

  async addToCart(productName: string) {
    await this.card(productName).getByRole('button', { name: 'Add to cart' }).click();
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
  await expect(adminPage.getByTestId('employee-row')).toContainText(\`\${employee.first} \${employee.last}\`);
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
  { query: 'kurta', expectedCount: 2, mustContain: 'Kurta' },
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
            { "kurta", 2, "Kurta" },
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
  expect(prices).toHaveLength(6);
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
    await this.card(productName).getByRole('button', { name: 'Add to cart' }).click();
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
        Assert.assertEquals(prices.size(), 6);
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
};
