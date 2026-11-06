import type { RunResult } from "@/lib/lab/runtime";

export type LabAppId = "swagshop" | "peopledesk" | "trendkart";

export interface LabApp {
  id: LabAppId;
  name: string;
  styledAfter: string;
  icon: string;
  base: string;
  blurb: string;
  credentials: string;
}

export const LAB_APPS: LabApp[] = [
  {
    id: "swagshop",
    name: "SwagShop",
    styledAfter: "e-commerce demo store (Saucedemo-style)",
    icon: "🛒",
    base: "/sandbox/swagshop",
    blurb: "Login with test users, product sorting, cart and a three-step checkout with tax.",
    credentials: "standard_user, locked_out_user, problem_user, performance_glitch_user / secret_sauce",
  },
  {
    id: "peopledesk",
    name: "PeopleDesk HR",
    styledAfter: "HR management portal (OrangeHRM-style)",
    icon: "🧑‍💼",
    base: "/sandbox/peopledesk",
    blurb: "Admin login, employee search, add and delete employees, apply for leave with date validation.",
    credentials: "Admin / admin123",
  },
  {
    id: "trendkart",
    name: "TrendKart",
    styledAfter: "fashion marketplace (Myntra-style)",
    icon: "👗",
    base: "/sandbox/trendkart",
    blurb: "Search with a loading state, brand and price filters, sorting, size selection, bag, coupons and delivery fee.",
    credentials: "No login needed",
  },
];

export const labApp = (id: LabAppId) => LAB_APPS.find((a) => a.id === id)!;

/** State exposed by each practice app on window.__lab. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type LabState = any;

export interface CheckContext {
  lab: LabState;
  result: RunResult;
  code: string;
  url: string;
  doc: Document | null;
}

export interface Check {
  label: string;
  test: (c: CheckContext) => boolean;
}

export interface Scenario {
  id: string;
  app: LabAppId;
  title: string;
  level: "Fresher" | "Junior" | "Mid" | "Senior";
  minutes: number;
  free: boolean;
  /** The interviewer's brief, in plain language. */
  story: string;
  criteria: string[];
  hints: string[];
  starter: string;
  /** Minimum number of passing assertions the learner's own test must make. */
  minAssertions: number;
  checks: Check[];
  skills: string[];
}

const usesAny = (c: CheckContext, ...names: string[]) => c.result.assertions.matchers.some((m) => names.includes(m));
const codeHas = (c: CheckContext, re: RegExp) => re.test(c.code.replace(/\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, ""));

const header = `import { test, expect } from '@playwright/test';\n\n`;

export const SCENARIOS: Scenario[] = [
  // ---------------- SwagShop ----------------
  {
    id: "swagshop-login",
    app: "swagshop",
    title: "Log in and land on the products page",
    level: "Fresher",
    minutes: 5,
    free: true,
    story:
      "The interviewer shares the SwagShop login page and says: \"Automate the happy-path login for standard_user and prove the user really landed on the products page.\"",
    criteria: [
      "Open the app and log in as standard_user with password secret_sauce.",
      "Assert the URL contains /inventory.",
      "Assert the Products title is visible and exactly 6 products are listed.",
    ],
    hints: [
      "Inputs have placeholders, so page.getByPlaceholder('Username') works.",
      "The login button can be found with page.getByRole('button', { name: 'Login' }).",
      "Every product card has data-test=\"inventory-item\", so getByTestId('inventory-item') returns all six.",
    ],
    starter:
      header +
      `test('standard user can log in', async ({ page }) => {
  await page.goto('/');

  // TODO: fill the username and password, then click Login

  // TODO: assert the URL, the "Products" title and the product count
});
`,
    minAssertions: 2,
    skills: ["Locators", "fill / click", "toHaveURL", "toHaveCount"],
    checks: [
      { label: "standard_user is logged in", test: (c) => c.lab?.user === "standard_user" },
      { label: "Test ends on the products page", test: (c) => /#\/inventory/.test(c.url) },
      { label: "You asserted the URL or the page title", test: (c) => usesAny(c, "toHaveURL", "toBeVisible", "toHaveText", "toContainText") },
      { label: "You asserted the number of products", test: (c) => usesAny(c, "toHaveCount") || codeHas(c, /\.count\(\)/) },
    ],
  },
  {
    id: "swagshop-locked-user",
    app: "swagshop",
    title: "Verify the locked-out user error",
    level: "Fresher",
    minutes: 5,
    free: true,
    story:
      "\"Negative tests matter as much as happy paths. Show me a test that proves a locked-out user cannot log in and sees the right message.\"",
    criteria: [
      "Log in as locked_out_user with password secret_sauce.",
      "Assert the error message says the user has been locked out.",
      "Assert the user is still on the login page (the URL does not contain /inventory).",
    ],
    hints: [
      "The error banner has role=\"alert\" and data-test=\"error\".",
      "Use expect(locator).toContainText('locked out') rather than matching the whole sentence.",
      "For the negative URL check: await expect(page).not.toHaveURL(/inventory/).",
    ],
    starter:
      header +
      `test('locked out user sees an error', async ({ page }) => {
  await page.goto('/');

  // TODO: try to log in as locked_out_user

  // TODO: assert the error text and that we did not reach /inventory
});
`,
    minAssertions: 2,
    skills: ["Negative testing", "toContainText", ".not matchers"],
    checks: [
      { label: "The locked-out error is on screen", test: (c) => !!c.doc?.querySelector("[data-test=error]")?.textContent?.includes("locked out") },
      { label: "The user was not logged in", test: (c) => !c.lab?.user },
      { label: "You asserted the error message text", test: (c) => usesAny(c, "toContainText", "toHaveText") },
    ],
  },
  {
    id: "swagshop-sort-price",
    app: "swagshop",
    title: "Sort by price and verify the order",
    level: "Junior",
    minutes: 10,
    free: false,
    story:
      "\"Product says sorting by price is broken for some users. Write a test that sorts by Price (low to high) and verifies the whole list is really in ascending order, not just the first item.\"",
    criteria: [
      "Log in as standard_user.",
      "Choose \"Price (low to high)\" in the sort dropdown.",
      "Read every price on the page, convert them to numbers and assert they are sorted ascending.",
      "Bonus: run the same test as problem_user and watch it catch the bug.",
    ],
    hints: [
      "Use locator.selectOption('lohi') or selectOption({ label: 'Price (low to high)' }).",
      "page.getByTestId('inventory-item-price').allTextContents() returns all prices as strings like \"$9.99\".",
      "Copy the array, sort it with (a, b) => a - b, and compare with expect(actual).toEqual(sorted).",
    ],
    starter:
      header +
      `test('sort by price low to high', async ({ page }) => {
  await page.goto('/');
  await page.getByPlaceholder('Username').fill('standard_user');
  await page.getByPlaceholder('Password').fill('secret_sauce');
  await page.getByRole('button', { name: 'Login' }).click();

  // TODO: pick "Price (low to high)" in the sort dropdown

  // TODO: collect all prices as numbers and assert they are ascending
});
`,
    minAssertions: 1,
    skills: ["selectOption", "allTextContents", "Data assertions"],
    checks: [
      { label: "Sort dropdown is set to Price (low to high)", test: (c) => (c.doc?.querySelector("[data-test=product-sort-container]") as HTMLSelectElement | null)?.value === "lohi" },
      { label: "You read all the prices, not just one", test: (c) => codeHas(c, /allTextContents|allInnerTexts|\$\$eval|\.all\(\)|\.count\(\)/) },
      { label: "You compared the list with a sorted copy", test: (c) => usesAny(c, "toEqual", "toStrictEqual", "toBe", "toBeLessThanOrEqual", "toBeGreaterThanOrEqual", "toBeTruthy") },
    ],
  },
  {
    id: "swagshop-cart",
    app: "swagshop",
    title: "Add two items and verify the cart",
    level: "Junior",
    minutes: 10,
    free: false,
    story:
      "\"Add the Trail Runner Backpack and the Night Ride Bike Light to the cart. I want to see that the badge updates and that the cart page lists exactly those two items.\"",
    criteria: [
      "Log in as standard_user.",
      "Add Trail Runner Backpack and Night Ride Bike Light to the cart.",
      "Assert the cart badge shows 2.",
      "Open the cart and assert both item names are listed and there are exactly 2 rows.",
    ],
    hints: [
      "Scope the Add button to the product card: page.getByTestId('inventory-item').filter({ hasText: 'Trail Runner Backpack' }).getByRole('button', { name: 'Add to cart' }).",
      "The badge is data-test=\"shopping-cart-badge\".",
      "expect(locator).toHaveText(['A', 'B']) checks a list of elements in order.",
    ],
    starter:
      header +
      `test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.getByPlaceholder('Username').fill('standard_user');
  await page.getByPlaceholder('Password').fill('secret_sauce');
  await page.getByRole('button', { name: 'Login' }).click();
});

test('add two items to the cart', async ({ page }) => {
  // TODO: add the backpack and the bike light

  // TODO: assert the badge, open the cart, assert the two rows
});
`,
    minAssertions: 2,
    skills: ["filter({ hasText })", "Scoped locators", "beforeEach"],
    checks: [
      { label: "Cart holds exactly the backpack and the bike light", test: (c) => Array.isArray(c.lab?.cart) && c.lab.cart.length === 2 && c.lab.cart.includes(0) && c.lab.cart.includes(1) },
      { label: "Test ends on the cart page", test: (c) => /#\/cart/.test(c.url) },
      { label: "You asserted the cart badge", test: (c) => codeHas(c, /shopping-cart-badge|shopping_cart_badge/) },
      { label: "You asserted the rows in the cart", test: (c) => usesAny(c, "toHaveCount", "toHaveText", "toContainText") },
    ],
  },
  {
    id: "swagshop-checkout-validation",
    app: "swagshop",
    title: "Checkout form validation",
    level: "Junior",
    minutes: 10,
    free: false,
    story:
      "\"The checkout form must not let anyone through without a postal code. Write a test that proves the validation works, then fixes the input and continues to the overview page.\"",
    criteria: [
      "Log in, add any item, go to the cart and click Checkout.",
      "Fill first and last name but leave Zip/Postal Code empty, click Continue.",
      "Assert the error \"Error: Postal Code is required\".",
      "Fill the postal code, click Continue and assert you reach \"Checkout: Overview\".",
    ],
    hints: [
      "The form fields have placeholders First Name, Last Name and Zip/Postal Code.",
      "toHaveText needs the exact text; toContainText is more forgiving.",
      "The page heading has data-test=\"title\".",
    ],
    starter:
      header +
      `test('postal code is required at checkout', async ({ page }) => {
  await page.goto('/');
  await page.getByPlaceholder('Username').fill('standard_user');
  await page.getByPlaceholder('Password').fill('secret_sauce');
  await page.getByRole('button', { name: 'Login' }).click();

  // TODO: add an item, open the cart, click Checkout

  // TODO: submit without postal code and assert the error

  // TODO: fix it, continue, and assert the overview page
});
`,
    minAssertions: 2,
    skills: ["Form validation", "toHaveText", "End-to-end flow"],
    checks: [
      { label: "You asserted the postal code error", test: (c) => codeHas(c, /Postal Code is required/) && usesAny(c, "toHaveText", "toContainText", "toBeVisible") },
      { label: "Test ends on Checkout: Overview", test: (c) => /#\/checkout-step-two/.test(c.url) },
      { label: "You asserted the overview page", test: (c) => usesAny(c, "toHaveURL", "toHaveText", "toContainText", "toBeVisible") && c.result.assertions.passed >= 2 },
    ],
  },
  {
    id: "swagshop-checkout-e2e",
    app: "swagshop",
    title: "End-to-end order with price maths",
    level: "Senior",
    minutes: 20,
    free: false,
    story:
      "\"Senior round. Buy the Fleece Zip Jacket and the Classic Cotton Tee. On the overview page, don't trust the UI: compute the item total from the prices you saw, check tax is 8%, check the grand total, then finish the order.\"",
    criteria: [
      "Add Fleece Zip Jacket and Classic Cotton Tee, check out with any name and postal code.",
      "On the overview page, read each item price and assert Item total equals their sum.",
      "Assert Tax equals 8% of the item total (rounded to 2 decimals) and Total equals item total plus tax.",
      "Click Finish and assert \"Thank you for your order!\".",
    ],
    hints: [
      "Parse money with Number(text.replace(/[^0-9.]/g, '')).",
      "Use toBeCloseTo for floating-point totals, e.g. expect(total).toBeCloseTo(sub + tax, 2).",
      "Split the flow with test.step('checkout', async () => { ... }) to make the report readable.",
    ],
    starter:
      header +
      `const money = (s: string | null) => Number((s ?? '').replace(/[^0-9.]/g, ''));

test('order total is calculated correctly', async ({ page }) => {
  await page.goto('/');
  await page.getByPlaceholder('Username').fill('standard_user');
  await page.getByPlaceholder('Password').fill('secret_sauce');
  await page.getByRole('button', { name: 'Login' }).click();

  // TODO: add the jacket and the tee, then check out

  // TODO: verify item total, tax (8%) and total on the overview page

  // TODO: finish and assert the confirmation
});
`,
    minAssertions: 4,
    skills: ["Business-rule assertions", "toBeCloseTo", "test.step"],
    checks: [
      { label: "The order was placed with the jacket and the tee", test: (c) => { const o = c.lab?.lastOrder; return !!o && o.items.length === 2 && o.items.includes("Fleece Zip Jacket") && o.items.includes("Classic Cotton Tee"); } },
      { label: "Confirmation page is showing", test: (c) => /#\/checkout-complete/.test(c.url) },
      { label: "You checked the maths, not just the text", test: (c) => usesAny(c, "toBeCloseTo", "toBe", "toEqual") },
      { label: "You asserted the thank-you message", test: (c) => codeHas(c, /Thank you for your order/i) },
    ],
  },

  // ---------------- PeopleDesk ----------------
  {
    id: "peopledesk-login",
    app: "peopledesk",
    title: "Admin login and dashboard check",
    level: "Fresher",
    minutes: 5,
    free: true,
    story: "\"This is our HR portal. Log in as the admin and verify the dashboard loaded properly.\"",
    criteria: [
      "Log in with Admin / admin123.",
      "Assert the URL contains /dashboard.",
      "Assert the Dashboard heading is visible and the sidebar shows PIM and Leave.",
    ],
    hints: [
      "Inputs have proper labels, so page.getByLabel('Username') works here.",
      "The heading is an <h1>: page.getByRole('heading', { name: 'Dashboard' }).",
      "Sidebar links live in the navigation named Sidebar: page.getByRole('navigation', { name: 'Sidebar' }).",
    ],
    starter:
      header +
      `test('admin can log in', async ({ page }) => {
  await page.goto('/');

  // TODO: log in as Admin / admin123

  // TODO: assert the dashboard
});
`,
    minAssertions: 2,
    skills: ["getByLabel", "getByRole heading", "Smoke test"],
    checks: [
      { label: "Admin is logged in", test: (c) => c.lab?.loggedIn === true },
      { label: "Test ends on the dashboard", test: (c) => /#\/dashboard/.test(c.url) },
      { label: "You asserted the dashboard", test: (c) => usesAny(c, "toHaveURL", "toBeVisible", "toHaveText", "toContainText") },
    ],
  },
  {
    id: "peopledesk-invalid-login",
    app: "peopledesk",
    title: "Invalid credentials and required fields",
    level: "Fresher",
    minutes: 8,
    free: false,
    story:
      "\"Cover the two classic negative cases on login: empty fields and a wrong password. One test each.\"",
    criteria: [
      "Test 1: click Login with both fields empty and assert two \"Required\" messages.",
      "Test 2: log in as Admin with a wrong password and assert \"Invalid credentials\".",
      "Both tests should stay on the login page.",
    ],
    hints: [
      "page.getByText('Required') matches both messages, so assert toHaveCount(2).",
      "The error alert has role=\"alert\".",
      "Write two separate test() blocks. The lab resets the app before each one.",
    ],
    starter:
      header +
      `test('username and password are required', async ({ page }) => {
  await page.goto('/');
  // TODO
});

test('wrong password shows Invalid credentials', async ({ page }) => {
  await page.goto('/');
  // TODO
});
`,
    minAssertions: 2,
    skills: ["Negative tests", "Multiple tests", "toHaveCount"],
    checks: [
      { label: "You wrote at least two tests", test: (c) => c.result.tests.length >= 2 },
      { label: "No one got logged in", test: (c) => !c.lab?.loggedIn },
      { label: "You asserted Required messages", test: (c) => codeHas(c, /Required/) },
      { label: "You asserted Invalid credentials", test: (c) => codeHas(c, /Invalid credentials/) },
    ],
  },
  {
    id: "peopledesk-add-employee",
    app: "peopledesk",
    title: "Add an employee and find them in search",
    level: "Mid",
    minutes: 15,
    free: false,
    story:
      "\"Create a new employee through PIM, then prove the record really exists by searching for it in the employee list. Use a unique name so the test can run again.\"",
    criteria: [
      "Log in, open PIM and click Add.",
      "Create an employee with a unique first name (for example with Date.now()) and a last name.",
      "Assert the \"Successfully Saved\" toast.",
      "Go back to the employee list, search by the name and assert exactly 1 record is found with that name.",
    ],
    hints: [
      "const first = `Auto${Date.now()}` gives you a unique name.",
      "The toast has role=\"status\".",
      "Scope to the table: page.getByRole('table', { name: 'Employee list' }).getByRole('row') includes the header row.",
    ],
    starter:
      header +
      `test('new employee is searchable', async ({ page }) => {
  const first = \`Auto\${Date.now()}\`;
  const last = 'Tester';

  await page.goto('/');
  await page.getByLabel('Username').fill('Admin');
  await page.getByLabel('Password').fill('admin123');
  await page.getByRole('button', { name: 'Login' }).click();

  // TODO: PIM → Add → fill and save, assert the toast

  // TODO: back to the list, search, assert exactly one matching row
});
`,
    minAssertions: 2,
    skills: ["Test data", "Toasts", "Table assertions"],
    checks: [
      { label: "A new employee was created", test: (c) => Array.isArray(c.lab?.employees) && c.lab.employees.length === 7 },
      { label: "The list is filtered to exactly one record", test: (c) => /\(1\) Record Found/.test(c.doc?.querySelector("[data-test=records-found]")?.textContent || "") },
      { label: "You asserted the success toast", test: (c) => codeHas(c, /Successfully Saved/) },
      { label: "You asserted the search result", test: (c) => usesAny(c, "toHaveCount", "toContainText", "toHaveText", "toBeVisible") && c.result.assertions.passed >= 2 },
    ],
  },
  {
    id: "peopledesk-leave",
    app: "peopledesk",
    title: "Apply leave with date validation",
    level: "Mid",
    minutes: 15,
    free: false,
    story:
      "\"Leave requests have a rule: the end date can't be before the start date. Test the rule, then submit a valid request and verify it is Pending Approval.\"",
    criteria: [
      "Log in and open Leave.",
      "Pick Casual Leave, from date 2026-12-10 and to date 2026-12-08, click Apply and assert \"To date should be after from date\".",
      "Correct the to date to 2026-12-12, apply, and assert \"Successfully Submitted\".",
      "Assert the leave list shows one row with status Pending Approval and 3 days.",
    ],
    hints: [
      "Date inputs accept fill('2026-12-10') in yyyy-mm-dd format.",
      "page.getByLabel('Leave Type').selectOption('Casual Leave').",
      "Scope row checks: page.getByTestId('leave-row').first().",
    ],
    starter:
      header +
      `test('leave dates are validated', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Username').fill('Admin');
  await page.getByLabel('Password').fill('admin123');
  await page.getByRole('button', { name: 'Login' }).click();

  // TODO: open Leave, test the invalid range, then submit a valid one
});
`,
    minAssertions: 3,
    skills: ["Date inputs", "selectOption", "Boundary rules"],
    checks: [
      { label: "You hit the date validation first", test: (c) => codeHas(c, /To date should be after from date/) },
      { label: "One leave request is Pending Approval", test: (c) => Array.isArray(c.lab?.leaves) && c.lab.leaves.length === 1 && c.lab.leaves[0].status === "Pending Approval" },
      { label: "The request spans 3 days (Dec 10 to 12)", test: (c) => c.lab?.leaves?.[0]?.days === 3 && c.lab.leaves[0].from === "2026-12-10" },
      { label: "You asserted the status in the list", test: (c) => codeHas(c, /Pending Approval/) },
    ],
  },
  {
    id: "peopledesk-delete",
    app: "peopledesk",
    title: "Delete an employee through a confirm dialog",
    level: "Senior",
    minutes: 15,
    free: false,
    story:
      "\"Destructive actions need two checks: Cancel must do nothing, and Yes must really delete. Do both for Vikram Singh, and make sure nobody else got deleted.\"",
    criteria: [
      "Log in and open PIM.",
      "Click Delete for Vikram Singh, then \"No, Cancel\" and assert he is still listed.",
      "Click Delete again, confirm with \"Yes, Delete\" and assert the \"Successfully Deleted\" toast.",
      "Assert Vikram Singh is gone and the list now shows 5 records.",
    ],
    hints: [
      "Each Delete button has an accessible name like \"Delete Vikram Singh\".",
      "The confirm box has role=\"dialog\": page.getByRole('dialog').",
      "Use expect(row).toHaveCount(0) to assert something disappeared.",
    ],
    starter:
      header +
      `test('delete employee with confirmation', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Username').fill('Admin');
  await page.getByLabel('Password').fill('admin123');
  await page.getByRole('button', { name: 'Login' }).click();
  await page.getByRole('link', { name: 'PIM' }).click();

  // TODO: cancel path, then confirm path
});
`,
    minAssertions: 3,
    skills: ["Dialogs", "Both branches", "Disappearance assertions"],
    checks: [
      { label: "Vikram Singh was deleted", test: (c) => Array.isArray(c.lab?.employees) && !c.lab.employees.some((e: { first: string }) => e.first === "Vikram") },
      { label: "Nobody else was deleted", test: (c) => c.lab?.employees?.length === 5 },
      { label: "You tested the Cancel path", test: (c) => codeHas(c, /No, Cancel|Cancel/) },
      { label: "You asserted the record is gone", test: (c) => usesAny(c, "toHaveCount", "toBeHidden") || codeHas(c, /not\.toBeVisible|not\.toContainText/) },
    ],
  },

  // ---------------- TrendKart ----------------
  {
    id: "trendkart-search",
    app: "trendkart",
    title: "Search with a loading state",
    level: "Junior",
    minutes: 8,
    free: true,
    story:
      "\"Our search shows a spinner before results arrive, and junior engineers love to add sleeps here. Search for shirt and assert the results without any waitForTimeout.\"",
    criteria: [
      "Search for \"shirt\" from the header search box and press Enter.",
      "Assert the results count says 5 items.",
      "Assert every product card name contains \"Shirt\".",
      "Do not use page.waitForTimeout.",
    ],
    hints: [
      "page.getByPlaceholder('Search for products, brands and more').fill('shirt') then .press('Enter').",
      "Web-first assertions like toHaveText retry until the spinner is gone.",
      "page.getByTestId('product-card') then allInnerTexts() or a loop over .all().",
    ],
    starter:
      header +
      `test('search returns only shirts', async ({ page }) => {
  await page.goto('/');

  // TODO: search for "shirt"

  // TODO: assert the count and that every card is a shirt (no sleeps!)
});
`,
    minAssertions: 2,
    skills: ["Auto-waiting", "press('Enter')", "Loops over locators"],
    checks: [
      { label: "Results for shirt are showing", test: (c) => /#\/products\?q=shirt/i.test(c.url) },
      { label: "You did not use waitForTimeout", test: (c) => !codeHas(c, /waitForTimeout/) },
      { label: "You asserted the result count", test: (c) => codeHas(c, /5 items|toHaveCount\(\s*5\s*\)/) },
      { label: "You checked every card, not just the first", test: (c) => codeHas(c, /allInnerTexts|allTextContents|\.all\(\)|for\s*\(|\.every\(|\.forEach\(/) },
    ],
  },
  {
    id: "trendkart-filters",
    app: "trendkart",
    title: "Filters plus sort, verified on every card",
    level: "Senior",
    minutes: 20,
    free: false,
    story:
      "\"Search shirt, filter to brands Roadway and Urbanline, price ₹0 to ₹999, then sort by Price: High to Low. Prove every card matches the filters and the order is right.\"",
    criteria: [
      "Search for shirt.",
      "Check the Roadway and Urbanline brand filters and choose the ₹0 to ₹999 price band.",
      "Sort by Price: High to Low.",
      "Assert every visible price is at most 999, every brand is Roadway or Urbanline, and prices are in descending order.",
    ],
    hints: [
      "Checkboxes have labels like \"Roadway (2)\", so getByLabel('Roadway') works.",
      "After each filter the list reloads. Wait for the count text to change before reading cards.",
      "page.getByTestId('product-card').locator('.product-brand').allTextContents().",
    ],
    starter:
      header +
      `const price = (s: string) => Number(s.replace(/[^0-9]/g, ''));

test('filters and sort apply together', async ({ page }) => {
  await page.goto('/');
  await page.getByPlaceholder('Search for products, brands and more').fill('shirt');
  await page.keyboard.press('Enter');

  // TODO: brand + price filters, sort, then verify every card
});
`,
    minAssertions: 3,
    skills: ["Checkboxes and radios", "Combined state", "Data-driven assertions"],
    checks: [
      { label: "Brand filters are Roadway and Urbanline", test: (c) => { const m = decodeURIComponent(c.url).match(/brand=([^&]+)/); return !!m && m[1].split(",").sort().join(",") === "Roadway,Urbanline"; } },
      { label: "Price band ₹0 to ₹999 is applied", test: (c) => /price=0-999/.test(c.url) },
      { label: "Sorted by Price: High to Low", test: (c) => /sort=price_desc/.test(c.url) },
      { label: "You verified prices and brands on the cards", test: (c) => codeHas(c, /allTextContents|allInnerTexts|\.all\(\)|\$\$eval/) && c.result.assertions.passed >= 3 },
    ],
  },
  {
    id: "trendkart-size-bag",
    app: "trendkart",
    title: "Size is required before adding to bag",
    level: "Mid",
    minutes: 12,
    free: false,
    story:
      "\"On the product page, Add to Bag without a size should show an error. Cover that, then pick an in-stock size, add to bag, and check the bag shows the right item and size. Also assert that the out-of-stock size can't be selected.\"",
    criteria: [
      "Open the Roadway Men Slim Fit Casual Shirt (search shirt, click the card).",
      "Click ADD TO BAG without a size and assert \"Please select a size\".",
      "Assert size XL is disabled (out of stock).",
      "Select size M, add to bag, assert the bag count is 1, open the bag and assert size M.",
    ],
    hints: [
      "Size buttons are buttons named S, M, L, XL inside the group \"Select size\".",
      "expect(locator).toBeDisabled() for the out-of-stock size.",
      "The header bag button is named \"Bag\". The bag item has data-testid=\"bag-item-size\".",
    ],
    starter:
      header +
      `test('size must be chosen before adding to bag', async ({ page }) => {
  await page.goto('/');
  await page.getByPlaceholder('Search for products, brands and more').fill('shirt');
  await page.keyboard.press('Enter');

  // TODO: open the Roadway casual shirt, test the size rules, add to bag, verify the bag
});
`,
    minAssertions: 3,
    skills: ["Disabled states", "Error messages", "Cross-page checks"],
    checks: [
      { label: "Bag has the Roadway casual shirt in size M", test: (c) => Array.isArray(c.lab?.bag) && c.lab.bag.length === 1 && c.lab.bag[0].id === 101 && c.lab.bag[0].size === "M" },
      { label: "You asserted the size error", test: (c) => codeHas(c, /Please select a size/) },
      { label: "You asserted the out-of-stock size is disabled", test: (c) => usesAny(c, "toBeDisabled") || codeHas(c, /isDisabled|not\.toBeEnabled/) },
      { label: "Test ends on the bag page", test: (c) => /#\/bag/.test(c.url) },
    ],
  },
  {
    id: "trendkart-coupon",
    app: "trendkart",
    title: "Coupon and delivery fee maths",
    level: "Senior",
    minutes: 20,
    free: false,
    story:
      "\"The bag has three pricing rules: coupon TRENDY10 gives 10% off the selling price (rounded), orders under ₹999 after the coupon pay ₹99 delivery, and an invalid code shows an error. Write the test a senior SDET would write.\"",
    criteria: [
      "Add the Roadway Men Printed Round Neck T-shirt (₹399) in size M to the bag and open the bag.",
      "Apply coupon WRONG and assert \"Invalid coupon code\".",
      "Apply TRENDY10 and assert the coupon discount is ₹40 and the delivery fee is ₹99.",
      "Change quantity to 3 and assert the delivery becomes FREE and Total Amount is ₹1,077.",
    ],
    hints: [
      "The T-shirt is product 104: page.goto('/p/104') is allowed. Deep links save time in real suites too.",
      "Price rows have test ids: coupon-discount, delivery-fee, total-amount.",
      "Quantity is a select named \"Quantity for ...\": use getByLabel(/Quantity/).selectOption('3').",
    ],
    starter:
      header +
      `test('coupon and delivery rules', async ({ page }) => {
  await page.goto('/p/104');

  // TODO: pick size M, add to bag, open the bag

  // TODO: invalid coupon, valid coupon, quantity change, and the totals
});
`,
    minAssertions: 4,
    skills: ["Business rules", "Recalculation", "Deep links"],
    checks: [
      { label: "TRENDY10 is applied", test: (c) => c.lab?.coupon === "TRENDY10" },
      { label: "Bag has 3 T-shirts", test: (c) => c.lab?.bag?.[0]?.id === 104 && c.lab.bag[0].qty === 3 },
      { label: "You tested the invalid coupon", test: (c) => codeHas(c, /Invalid coupon code/) },
      { label: "You asserted the delivery fee before and after", test: (c) => codeHas(c, /FREE/) && codeHas(c, /99/) },
      { label: "You asserted the final total", test: (c) => codeHas(c, /1,077|1077/) },
    ],
  },
];

export const getScenario = (id: string) => SCENARIOS.find((s) => s.id === id);
export const scenariosFor = (app: LabAppId) => SCENARIOS.filter((s) => s.app === app);
