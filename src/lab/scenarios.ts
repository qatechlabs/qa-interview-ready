import type { RunResult } from "@/lib/lab/runtime";

export type LabAppId = "swagshop" | "peopledesk" | "trendkart" | "saucedemo" | "orangehrm" | "automationexercise";

export interface LabApp {
  id: LabAppId;
  name: string;
  styledAfter: string;
  icon: string;
  base: string;
  blurb: string;
  credentials: string;
  /** A real public site: labs run in GitHub Actions in the learner's repo instead of the in-browser runner. `base` is the absolute URL. */
  remote?: boolean;
  /** Base of the practice app's REST API; `GET <api>` lists the endpoints. Tests reach it as /api/... through the request fixture. */
  api?: string;
}

export const LAB_APPS: LabApp[] = [
  {
    id: "swagshop",
    name: "SwagShop",
    styledAfter: "e-commerce demo store (Saucedemo-style)",
    icon: "🛒",
    base: "/sandbox/swagshop",
    blurb: "A full store on a REST API: test users, search, categories, sorting, quantities, coupons, a three-step checkout with tax, order history and cancellation.",
    credentials: "standard_user, locked_out_user, problem_user, performance_glitch_user / secret_sauce",
    api: "/api/sandbox/swagshop",
  },
  {
    id: "peopledesk",
    name: "PeopleDesk HR",
    styledAfter: "HR management portal (OrangeHRM-style)",
    icon: "🧑‍💼",
    base: "/sandbox/peopledesk",
    blurb: "An HR portal on a REST API: admin and employee roles, employee search, add, edit and delete, leave balances, approvals and attendance.",
    credentials: "Admin / admin123, or any employee as first.last / Welcome@1 (for example vikram.singh)",
    api: "/api/sandbox/peopledesk",
  },
  {
    id: "trendkart",
    name: "TrendKart",
    styledAfter: "fashion marketplace (Myntra-style)",
    icon: "👗",
    base: "/sandbox/trendkart",
    blurb: "A fashion marketplace on a REST API: search with a loading state, filters, sorting, sizes, bag, wishlist, coupons, addresses, checkout and orders.",
    credentials: "Guest checkout works; members: arya@trendkart.test / Trendy@123 or register",
    api: "/api/sandbox/trendkart",
  },
  {
    id: "saucedemo",
    name: "Sauce Demo",
    styledAfter: "the real saucedemo.com, the public Sauce Labs demo store",
    icon: "🧪",
    base: "https://www.saucedemo.com",
    blurb: "The screening site every automation interviewer knows: login users, product sorting, cart and checkout.",
    credentials: "standard_user, locked_out_user, problem_user, performance_glitch_user / secret_sauce",
    remote: true,
  },
  {
    id: "orangehrm",
    name: "OrangeHRM demo",
    styledAfter: "the real OrangeHRM open-source demo at opensource-demo.orangehrmlive.com",
    icon: "🏢",
    base: "https://opensource-demo.orangehrmlive.com",
    blurb: "A full HR system: login, dashboard, PIM employee records, leave, recruitment. Shared and slow, like a real client environment.",
    credentials: "Admin / admin123",
    remote: true,
  },
  {
    id: "automationexercise",
    name: "AutomationExercise",
    styledAfter: "the real automationexercise.com practice site",
    icon: "🛍️",
    base: "https://automationexercise.com",
    blurb: "Registration, products, search, cart, checkout and a public JSON API. Ads and modals included, as in production.",
    credentials: "Create your own user in the test",
    remote: true,
  },
];

export const labApp = (id: LabAppId) => LAB_APPS.find((a) => a.id === id)!;
export const isRemote = (s: { app: LabAppId }) => !!labApp(s.app).remote;

/** State exposed by each practice app on window.__lab. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type LabState = any;

export interface CheckContext {
  lab: LabState;
  result: RunResult;
  /** All project files concatenated, for text checks. */
  code: string;
  /** Project files by path. Single-file scenarios have one entry, tests/example.spec.ts. */
  files: Record<string, string>;
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
  /** Starter code for single-file scenarios. */
  starter: string;
  /** Starter project for multi-file (framework) scenarios; overrides `starter`. */
  files?: Record<string, string>;
  /** An open workspace: the learner builds a whole framework (config to tests) and is graded against a rubric. */
  workspace?: boolean;
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
      "Assert the Products title is visible and exactly 12 products are listed.",
    ],
    hints: [
      "Inputs have placeholders, so page.getByPlaceholder('Username') works.",
      "The login button can be found with page.getByRole('button', { name: 'Login' }).",
      "Every product card has data-test=\"inventory-item\", so getByTestId('inventory-item') returns all twelve.",
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
      { label: "A new employee was created", test: (c) => Array.isArray(c.lab?.employees) && c.lab.employees.length === 15 },
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
      "Assert Vikram Singh is gone and the list now shows 13 records.",
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
      { label: "Nobody else was deleted", test: (c) => c.lab?.employees?.length === 13 },
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

  // ---------------- Framework labs (multi-file) ----------------
  {
    id: "swagshop-pom-framework",
    app: "swagshop",
    title: "Build a Page Object framework from scratch",
    level: "Mid",
    minutes: 25,
    free: true,
    story:
      "\"Senior interviewers rarely ask for one test. They hand you an empty folder and say: set up a small framework. Page objects for login and inventory, a fixture that logs in, and tests that read like English. Build that for SwagShop.\"",
    criteria: [
      "pages/login.page.ts exports a LoginPage class with goto() and login(username, password).",
      "pages/inventory.page.ts exports an InventoryPage class with addToCart(productName), cartCount(), sortBy(value) and prices().",
      "fixtures.ts extends test with an inventory fixture that logs in as standard_user and hands the test an InventoryPage.",
      "tests/checkout.spec.ts has two tests that use only the fixture and page objects, no page.getBy... or page.locator in the spec: the badge shows 2 after adding two items, and prices ascend after sorting low to high.",
    ],
    hints: [
      "A page object wraps locators in methods: async login(u, p) { await this.page.getByPlaceholder('Username').fill(u); ... }",
      "In fixtures.ts: export const test = base.extend<{ inventory: InventoryPage }>({ inventory: async ({ page }, use) => { ...log in...; await use(new InventoryPage(page)); } });",
      "The spec imports test and expect from '../fixtures' instead of '@playwright/test'.",
      "Click the file names on the left to switch files. Add more with + New file.",
    ],
    starter: "",
    files: {
      "tests/checkout.spec.ts": `import { test, expect } from '../fixtures';

test('badge shows the number of items in the cart', async ({ inventory }) => {
  // TODO: add Trail Runner Backpack and Night Ride Bike Light, then assert cartCount() is 2
});

test('products sort by price low to high', async ({ inventory }) => {
  // TODO: sortBy('lohi'), read prices(), assert they are ascending
});
`,
      "fixtures.ts": `import { test as base } from '@playwright/test';
import { LoginPage } from './pages/login.page';
import { InventoryPage } from './pages/inventory.page';

// Fixtures are set up before each test and handed to it by name.
export const test = base.extend<{ inventory: InventoryPage }>({
  inventory: async ({ page }, use) => {
    // TODO: use LoginPage to log in as standard_user / secret_sauce
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
    // TODO
  }
}
`,
      "pages/inventory.page.ts": `import type { Page } from '@playwright/test';

export class InventoryPage {
  constructor(private readonly page: Page) {}

  async addToCart(productName: string) {
    // TODO: scope the "Add to cart" button to the product card
  }

  async cartCount(): Promise<number> {
    // TODO: read the badge (0 when there is no badge)
    return 0;
  }

  async sortBy(value: 'az' | 'za' | 'lohi' | 'hilo') {
    // TODO
  }

  async prices(): Promise<number[]> {
    // TODO: every price on the page as a number
    return [];
  }
}
`,
    },
    minAssertions: 2,
    skills: ["Page Objects", "Custom fixtures", "Multi-file project"],
    checks: [
      { label: "Project has page objects in pages/", test: (c) => Object.keys(c.files).filter((f) => f.startsWith("pages/")).length >= 2 && Object.entries(c.files).some(([f, src]) => f.startsWith("pages/") && /export\s+class\s+/.test(src)) },
      { label: "fixtures.ts extends test with an inventory fixture", test: (c) => /\.extend\s*(<[^>]*>)?\s*\(/.test(c.files["fixtures.ts"] || "") && /inventory\s*:/.test(c.files["fixtures.ts"] || "") },
      { label: "The spec imports test from the fixtures file", test: (c) => Object.entries(c.files).some(([f, src]) => f.startsWith("tests/") && /from\s+['"][^'"]*fixtures['"]/.test(src)) },
      { label: "No raw locators in the spec (page.getBy..., page.locator)", test: (c) => Object.entries(c.files).filter(([f]) => f.startsWith("tests/")).every(([, src]) => !/page\s*\.\s*(getBy\w+|locator|click|fill|\$\$?)\s*\(/.test(src)) },
      { label: "Both tests ran and passed", test: (c) => c.result.tests.length >= 2 && c.result.tests.every((t) => t.ok) },
      { label: "You asserted the badge count and the sorted prices", test: (c) => usesAny(c, "toBe", "toEqual") && c.result.assertions.passed >= 2 },
    ],
  },
  {
    id: "peopledesk-fixture-teardown",
    app: "peopledesk",
    title: "A fixture that creates test data and cleans up",
    level: "Senior",
    minutes: 25,
    free: false,
    story:
      "\"Every test that needs an employee should get a fresh one, and the suite must leave the system exactly as it found it. Design the fixtures for that, then write the search test on top of them.\"",
    criteria: [
      "fixtures.ts: an adminPage fixture that logs in as Admin and hands over the page, and an employee fixture that depends on it.",
      "The employee fixture creates an employee with a unique first name through PIM → Add, hands { first, last, id } to the test with use(), and after the test deletes that employee again (Delete → Yes, Delete).",
      "tests/employee-search.spec.ts: search by the employee's first name and assert (1) Record Found and that the row shows the name.",
      "After the run the employee list must be back to 6 records, which is how we know the teardown worked.",
    ],
    hints: [
      "Code after `await use(value)` in a fixture is the teardown. It runs even if the test fails.",
      "Fixtures can depend on fixtures: employee: async ({ adminPage }, use) => { ... }.",
      "The id is prefilled on the Add form: read it with inputValue() before saving.",
      "To find the delete button: page.getByRole('button', { name: `Delete ${first} ${last}` }).",
    ],
    starter: "",
    files: {
      "tests/employee-search.spec.ts": `import { test, expect } from '../fixtures';

test('a new employee can be found by name', async ({ adminPage, employee }) => {
  // TODO: go to PIM, search by employee.first, assert one record with the name
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
    // TODO: log in as Admin / admin123, then await use(page)
  },

  employee: async ({ adminPage }, use) => {
    const first = \`Auto\${Date.now()}\`;
    const last = 'Fixture';
    // TODO: create the employee, hand it over with use(), then delete it in the teardown
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
    // TODO: click + Add, fill the names, read the prefilled id, Save, return the id
    return '';
  }

  async search(name: string) {
    // TODO
  }

  async delete(first: string, last: string) {
    // TODO: Delete button for that person, then "Yes, Delete"
  }
}
`,
    },
    minAssertions: 2,
    skills: ["Fixture teardown", "Fixture dependencies", "Test data hygiene"],
    checks: [
      { label: "The employee fixture depends on adminPage", test: (c) => /employee\s*:\s*async\s*\(\s*\{[^}]*adminPage/.test(c.files["fixtures.ts"] || "") },
      { label: "The fixture has teardown code after use()", test: (c) => /await\s+use\([^)]*\)\s*;?[\s\S]*?(delete|Delete)/.test(c.files["fixtures.ts"] || "") },
      { label: "The test passed", test: (c) => c.result.tests.length >= 1 && c.result.tests.every((t) => t.ok) },
      { label: "You asserted the search result", test: (c) => usesAny(c, "toHaveText", "toContainText", "toHaveCount") },
      { label: "Teardown restored the list to 14 employees", test: (c) => Array.isArray(c.lab?.employees) && c.lab.employees.length === 14 },
    ],
  },
  {
    id: "trendkart-data-driven",
    app: "trendkart",
    title: "Data-driven suite with a helper module",
    level: "Senior",
    minutes: 25,
    free: false,
    story:
      "\"We have 40 search terms to cover and I don't want 40 copies of the same test. Show me a data-driven design: a data file, a helper for prices, a page object, and a spec that generates a test per row.\"",
    criteria: [
      "data/searches.ts exports SEARCHES: at least three rows of { query, expectedCount, mustContain } (shirt → 5 results all containing Shirt, jeans → 2, kurta → 3).",
      "helpers/money.ts exports parsePrice('₹1,199') that returns 1199.",
      "pages/search.page.ts: SearchPage with search(query), resultCount(), productNames() and prices().",
      "tests/search.spec.ts generates one test per row with a loop, asserting the count and that every name contains mustContain, plus one test that sorts by Price: Low to High and uses parsePrice to assert the prices ascend.",
    ],
    hints: [
      "A loop at file level registers tests: for (const row of SEARCHES) { test(`search ${row.query}`, async ({ page }) => { ... }); }",
      "The results count has data-testid=\"results-count\" and reads \"- 5 items\".",
      "Sorting: page.getByLabel('Sort by').selectOption('price_asc'). Results reload, so wait on an assertion before reading prices.",
      "No raw locators in the spec: put them all in SearchPage.",
    ],
    starter: "",
    files: {
      "tests/search.spec.ts": `import { test, expect } from '@playwright/test';
import { SEARCHES } from '../data/searches';
import { parsePrice } from '../helpers/money';
import { SearchPage } from '../pages/search.page';

// TODO: one test per row in SEARCHES

test('results sort by price low to high', async ({ page }) => {
  // TODO
});
`,
      "data/searches.ts": `export interface SearchCase {
  query: string;
  expectedCount: number;
  mustContain: string;
}

export const SEARCHES: SearchCase[] = [
  // TODO: shirt, jeans, kurta
];
`,
      "helpers/money.ts": `/** "₹1,199" → 1199 */
export function parsePrice(text: string): number {
  // TODO
  return 0;
}
`,
      "pages/search.page.ts": `import type { Page } from '@playwright/test';

export class SearchPage {
  constructor(private readonly page: Page) {}

  async search(query: string) {
    // TODO: fill the search box and press Enter
  }

  async resultCount(): Promise<number> {
    // TODO: parse "- 5 items"
    return 0;
  }

  async productNames(): Promise<string[]> {
    return [];
  }

  async prices(): Promise<string[]> {
    return [];
  }

  async sortBy(value: 'price_asc' | 'price_desc' | 'rating' | 'discount') {
    // TODO
  }
}
`,
    },
    minAssertions: 4,
    skills: ["Data-driven tests", "Helper modules", "Generated tests"],
    checks: [
      { label: "At least four tests ran and passed", test: (c) => c.result.tests.length >= 4 && c.result.tests.every((t) => t.ok) },
      { label: "The spec generates tests from SEARCHES in a loop", test: (c) => Object.entries(c.files).some(([f, src]) => f.startsWith("tests/") && /SEARCHES/.test(src) && /(for\s*\(|\.forEach\s*\(|\.map\s*\()/.test(src)) },
      { label: "The data file has at least three rows", test: (c) => ((c.files["data/searches.ts"] || "").match(/query\s*:/g) || []).length >= 3 },
      { label: "parsePrice is implemented and used", test: (c) => /return\s+(?!0;)/.test(c.files["helpers/money.ts"] || "") && Object.entries(c.files).some(([f, src]) => f.startsWith("tests/") && /parsePrice\b/.test(src)) },
      { label: "No raw locators in the spec", test: (c) => Object.entries(c.files).filter(([f]) => f.startsWith("tests/")).every(([, src]) => !/page\s*\.\s*(getBy\w+|locator|click|fill)\s*\(/.test(src)) },
    ],
  },
  // ---------------- Real sites (run on GitHub Actions) ----------------
  {
    id: "saucedemo-login",
    app: "saucedemo",
    title: "Log in to Sauce Demo and verify the products page",
    level: "Fresher",
    minutes: 10,
    free: true,
    story:
      "The interviewer opens saucedemo.com and says: \"This is the site we use for screening. Log in as standard_user, prove you landed on the products page, and show me the locked-out user gets the error message. Run it for real, not in a mock.\"",
    criteria: [
      "Log in as standard_user / secret_sauce and assert the URL contains /inventory.html.",
      "Assert the Products title is visible and 6 inventory items are listed.",
      "In a second test, log in as locked_out_user and assert the error contains \"locked out\".",
    ],
    hints: [
      "The inputs have placeholders: page.getByPlaceholder('Username') and page.getByPlaceholder('Password').",
      "The login button is an input type=submit, so getByRole('button', { name: 'Login' }) finds it.",
      "Every product card has data-test=\"inventory-item\" and the error box has data-test=\"error\".",
      "The run happens on GitHub Actions in your repo: sign in with GitHub, press Run on GitHub and watch the log.",
    ],
    starter:
      header +
      `test('standard user lands on the products page', async ({ page }) => {
  await page.goto('/');

  // TODO: fill the username and password, click Login

  // TODO: assert the URL, the "Products" title and 12 items
});

test('locked out user sees an error', async ({ page }) => {
  await page.goto('/');

  // TODO: log in as locked_out_user and assert the error message
});
`,
    minAssertions: 3,
    skills: ["Real site", "Locators", "toHaveURL", "toHaveCount"],
    checks: [
      { label: "Both tests passed on GitHub Actions", test: (c) => c.result.tests.length >= 2 && c.result.tests.every((t) => t.ok) },
      { label: "You asserted the URL or the page title", test: (c) => usesAny(c, "toHaveURL", "toBeVisible", "toHaveText", "toContainText") },
      { label: "You asserted the number of products", test: (c) => usesAny(c, "toHaveCount") || codeHas(c, /\.count\(\)/) },
      { label: "The locked-out test checks the error text", test: (c) => codeHas(c, /locked_out_user/) && codeHas(c, /locked out/i) },
    ],
  },
  {
    id: "saucedemo-pom-framework",
    app: "saucedemo",
    title: "Page Object framework for Sauce Demo, run on CI",
    level: "Mid",
    minutes: 30,
    free: false,
    story:
      "\"Set up a small framework against saucedemo.com the way you would on day one of a project: page objects for login, inventory and cart, a fixture that logs in, and tests that read like English. Then run it on CI and show me green.\"",
    criteria: [
      "pages/login.page.ts exports LoginPage with goto() and login(username, password).",
      "pages/inventory.page.ts exports InventoryPage with addToCart(name), cartCount(), sortBy(value) and prices().",
      "pages/cart.page.ts exports CartPage with itemNames().",
      "fixtures.ts extends test with an inventory fixture that logs in as standard_user.",
      "tests/shop.spec.ts has at least two tests that use only fixtures and page objects: the badge shows 2 after adding two items and they appear in the cart; prices ascend after sorting low to high.",
    ],
    hints: [
      "Each product card is .inventory_item; its name is .inventory_item_name and price .inventory_item_price (\"$29.99\").",
      "Add-to-cart buttons live inside the card: card.getByRole('button', { name: 'Add to cart' }).",
      "The sort dropdown is select[data-test=\"product-sort-container\"] with values az, za, lohi, hilo.",
      "The cart badge is .shopping_cart_badge; the cart link is .shopping_cart_link and cart rows are .cart_item.",
    ],
    starter: "",
    files: {
      "tests/shop.spec.ts": `import { test, expect } from '../fixtures';

test('two items added show in the badge and the cart', async ({ inventory }) => {
  // TODO
});

test('sorting low to high orders prices ascending', async ({ inventory }) => {
  // TODO
});
`,
      "fixtures.ts": `import { test as base } from '@playwright/test';
import { LoginPage } from './pages/login.page';
import { InventoryPage } from './pages/inventory.page';

export const test = base.extend<{ inventory: InventoryPage }>({
  inventory: async ({ page }, use) => {
    // TODO: log in with LoginPage, then hand the test an InventoryPage
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
    // TODO
  }
}
`,
      "pages/inventory.page.ts": `import type { Page } from '@playwright/test';

export class InventoryPage {
  constructor(private readonly page: Page) {}

  async addToCart(productName: string) {
    // TODO
  }

  async cartCount(): Promise<number> {
    return 0;
  }

  async sortBy(value: 'az' | 'za' | 'lohi' | 'hilo') {
    // TODO
  }

  async prices(): Promise<number[]> {
    return [];
  }

  async openCart() {
    // TODO
  }
}
`,
      "pages/cart.page.ts": `import type { Page } from '@playwright/test';

export class CartPage {
  constructor(private readonly page: Page) {}

  async itemNames(): Promise<string[]> {
    return [];
  }
}
`,
    },
    minAssertions: 3,
    skills: ["Real site", "Page Objects", "Custom fixtures", "CI run"],
    checks: [
      { label: "All tests passed on GitHub Actions", test: (c) => c.result.tests.length >= 2 && c.result.tests.every((t) => t.ok) },
      { label: "Three page objects in pages/", test: (c) => ["login", "inventory", "cart"].every((n) => /export\s+class/.test(c.files[`pages/${n}.page.ts`] || "")) },
      { label: "fixtures.ts extends test with an inventory fixture", test: (c) => /\.extend\s*</.test(c.files["fixtures.ts"] || "") && /inventory\s*:/.test(c.files["fixtures.ts"] || "") },
      { label: "No raw locators in the spec", test: (c) => Object.entries(c.files).filter(([f]) => f.startsWith("tests/")).every(([, src]) => !/page\s*\.\s*(getBy\w+|locator|click|fill)\s*\(/.test(src)) },
      { label: "Sorting is verified against a sorted copy", test: (c) => codeHas(c, /\.sort\s*\(/) },
    ],
  },
  {
    id: "orangehrm-login",
    app: "orangehrm",
    title: "OrangeHRM login: happy path and invalid credentials",
    level: "Junior",
    minutes: 10,
    free: true,
    story:
      "\"Our client runs OrangeHRM. Automate the login against the public demo: Admin can log in and lands on the dashboard, and a wrong password shows 'Invalid credentials'. The demo is slow, so handle waiting properly, no sleeps.\"",
    criteria: [
      "Log in as Admin / admin123 and assert the URL contains /dashboard.",
      "Assert the Dashboard heading is visible.",
      "In a second test, log in with a wrong password and assert the text \"Invalid credentials\" is shown.",
    ],
    hints: [
      "The demo is at /web/index.php/auth/login; page.goto('/') redirects there.",
      "Inputs have placeholders Username and Password; the button is getByRole('button', { name: 'Login' }).",
      "The heading is an h6 with the text Dashboard: page.getByRole('heading', { name: 'Dashboard' }).",
      "Web-first assertions (await expect(locator).toBeVisible()) wait up to the timeout, so you never need waitForTimeout.",
    ],
    starter:
      header +
      `test('Admin can log in and sees the dashboard', async ({ page }) => {
  await page.goto('/web/index.php/auth/login');

  // TODO
});

test('wrong password shows Invalid credentials', async ({ page }) => {
  await page.goto('/web/index.php/auth/login');

  // TODO
});
`,
    minAssertions: 2,
    skills: ["Real site", "Auto-waiting", "Negative test"],
    checks: [
      { label: "Both tests passed on GitHub Actions", test: (c) => c.result.tests.length >= 2 && c.result.tests.every((t) => t.ok) },
      { label: "You asserted the dashboard URL or heading", test: (c) => usesAny(c, "toHaveURL", "toBeVisible", "toHaveText", "toContainText") },
      { label: "The negative test checks for Invalid credentials", test: (c) => codeHas(c, /Invalid credentials/) },
      { label: "No hard waits (waitForTimeout)", test: (c) => !codeHas(c, /waitForTimeout/) },
    ],
  },
  {
    id: "orangehrm-pim-framework",
    app: "orangehrm",
    title: "Add an employee through a PIM page object, with unique test data",
    level: "Senior",
    minutes: 35,
    free: false,
    story:
      "\"The PIM module is where most of our regression lives. Build a LoginPage and a PimPage, a fixture that logs in as Admin, and a test that adds a new employee with a unique name and proves the personal details page shows it. The demo database is shared with the whole internet, so your data must not collide.\"",
    criteria: [
      "pages/login.page.ts exports LoginPage with goto() and login(username, password).",
      "pages/pim.page.ts exports PimPage with addEmployee(firstName, lastName) and employeeName() (the heading on the personal details page).",
      "fixtures.ts extends test with a pim fixture that logs in and opens the Add Employee page.",
      "tests/employee.spec.ts adds an employee whose last name contains a unique suffix (for example Date.now()) and asserts the heading shows the full name.",
    ],
    hints: [
      "Add Employee lives at /web/index.php/pim/addEmployee with input[name=\"firstName\"] and input[name=\"lastName\"].",
      "Save is getByRole('button', { name: 'Save' }). After saving, the URL contains /pim/viewPersonalDetails.",
      "The name heading is .orangehrm-edit-employee-name h6; wait for it with expect(...).toHaveText(...).",
      "Keep the name short: OrangeHRM limits first and last names to 30 characters.",
    ],
    starter: "",
    files: {
      "tests/employee.spec.ts": `import { test, expect } from '../fixtures';

test('a new employee appears on the personal details page', async ({ pim }) => {
  // TODO: unique last name, addEmployee, assert employeeName()
});
`,
      "fixtures.ts": `import { test as base } from '@playwright/test';
import { LoginPage } from './pages/login.page';
import { PimPage } from './pages/pim.page';

export const test = base.extend<{ pim: PimPage }>({
  pim: async ({ page }, use) => {
    // TODO: log in as Admin / admin123, open Add Employee, hand over a PimPage
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
    // TODO
  }
}
`,
      "pages/pim.page.ts": `import type { Page } from '@playwright/test';

export class PimPage {
  constructor(private readonly page: Page) {}

  async gotoAddEmployee() {
    await this.page.goto('/web/index.php/pim/addEmployee');
  }

  async addEmployee(firstName: string, lastName: string) {
    // TODO
  }

  async employeeName(): Promise<string> {
    return '';
  }
}
`,
    },
    minAssertions: 1,
    skills: ["Real site", "Page Objects", "Unique test data", "CI run"],
    checks: [
      { label: "The test passed on GitHub Actions", test: (c) => c.result.tests.length >= 1 && c.result.tests.every((t) => t.ok) },
      { label: "PimPage and LoginPage exist in pages/", test: (c) => /export\s+class\s+PimPage/.test(c.files["pages/pim.page.ts"] || "") && /export\s+class\s+LoginPage/.test(c.files["pages/login.page.ts"] || "") },
      { label: "fixtures.ts provides a pim fixture", test: (c) => /pim\s*:\s*async/.test(c.files["fixtures.ts"] || "") && /await\s+use\s*\(/.test(c.files["fixtures.ts"] || "") },
      { label: "The employee name is unique per run", test: (c) => Object.entries(c.files).some(([f, src]) => f.startsWith("tests/") && /(Date\.now\(\)|Math\.random\(\)|randomUUID|crypto\.)/.test(src)) },
      { label: "No raw locators in the spec", test: (c) => Object.entries(c.files).filter(([f]) => f.startsWith("tests/")).every(([, src]) => !/page\s*\.\s*(getBy\w+|locator|click|fill)\s*\(/.test(src)) },
    ],
  },
  {
    id: "automationexercise-signup",
    app: "automationexercise",
    title: "Register a user end to end, then delete the account",
    level: "Mid",
    minutes: 25,
    free: false,
    story:
      "\"Test case 1 from the AutomationExercise list, the one every candidate claims to have done: sign up with a fresh email, fill the account form, verify 'Account Created', log in state, then delete the account so the test is repeatable. Make it pass on CI, not just on your laptop.\"",
    criteria: [
      "Open the site, go to Signup / Login and sign up with a name and a unique email.",
      "Fill the account information form (password, date of birth, first and last name, address, country, state, city, zipcode, mobile number) and create the account.",
      "Assert \"Account Created!\" is visible, continue, and assert \"Logged in as <name>\" is shown.",
      "Delete the account and assert \"Account Deleted!\" is visible.",
    ],
    hints: [
      "Form fields carry data-qa attributes: input[data-qa=\"signup-name\"], input[data-qa=\"signup-email\"], button[data-qa=\"signup-button\"], then data-qa=\"password\", \"first_name\", \"last_name\", \"address\", \"state\", \"city\", \"zipcode\", \"mobile_number\", \"create-account\".",
      "The selects: select[data-qa=\"days\"], months, years and country; use selectOption('10'), selectOption('May'), selectOption('1990'), selectOption('India').",
      "Success messages: h2[data-qa=\"account-created\"], a[data-qa=\"continue-button\"], a[href=\"/delete_account\"], h2[data-qa=\"account-deleted\"].",
      "Build the email from Date.now() so a rerun never hits \"Email Address already exist!\".",
    ],
    starter:
      header +
      `const email = \`qir-\${Date.now()}@example.com\`;

test('register a new user and delete the account', async ({ page }) => {
  await page.goto('/');
  await page.locator('a[href="/login"]').click();

  // TODO: sign up (name + email), fill the account form, create the account

  // TODO: assert Account Created!, continue, assert Logged in as

  // TODO: delete the account and assert Account Deleted!
});
`,
    minAssertions: 3,
    skills: ["Real site", "Forms and selects", "Unique test data", "Cleanup"],
    checks: [
      { label: "The test passed on GitHub Actions", test: (c) => c.result.tests.length >= 1 && c.result.tests.every((t) => t.ok) },
      { label: "The email is unique per run", test: (c) => codeHas(c, /(Date\.now\(\)|Math\.random\(\)|randomUUID)/) },
      { label: "You asserted Account Created and Account Deleted", test: (c) => codeHas(c, /account-created|Account Created/) && codeHas(c, /account-deleted|Account Deleted/) },
      { label: "The account is deleted at the end", test: (c) => codeHas(c, /delete_account/) },
    ],
  },
  {
    id: "automationexercise-products-framework",
    app: "automationexercise",
    title: "Products page object: search results and the cart",
    level: "Mid",
    minutes: 30,
    free: false,
    story:
      "\"Build a ProductsPage and a CartPage for automationexercise.com. Searching for 'dress' must show only matching products, and adding the first two products must put two rows in the cart. The site is full of ads and a modal after every add to cart, so your page objects need to cope with that.\"",
    criteria: [
      "pages/products.page.ts exports ProductsPage with goto(), search(term), productNames() and addToCart(index) that closes the \"Added!\" modal.",
      "pages/cart.page.ts exports CartPage with goto() and rowCount().",
      "tests/products.spec.ts has two tests: every search result name contains the term; the cart has 2 rows after adding two products.",
      "The spec uses only page objects: no page.locator or getBy in the spec.",
    ],
    hints: [
      "Products are at /products; search uses #search_product and #submit_search; names are .productinfo p.",
      "Add to cart: .productinfo a.add-to-cart (nth(index)), then the modal #cartModal appears; close it with getByRole('button', { name: 'Continue Shopping' }).",
      "The cart page is /view_cart and rows are #cart_info_table tbody tr.",
      "Case-insensitive contains: name.toLowerCase().includes(term.toLowerCase()).",
    ],
    starter: "",
    files: {
      "tests/products.spec.ts": `import { test, expect } from '@playwright/test';
import { ProductsPage } from '../pages/products.page';
import { CartPage } from '../pages/cart.page';

test('search results all match the term', async ({ page }) => {
  // TODO
});

test('adding two products puts two rows in the cart', async ({ page }) => {
  // TODO
});
`,
      "pages/products.page.ts": `import type { Page } from '@playwright/test';

export class ProductsPage {
  constructor(private readonly page: Page) {}

  async goto() {
    await this.page.goto('/products');
  }

  async search(term: string) {
    // TODO
  }

  async productNames(): Promise<string[]> {
    return [];
  }

  async addToCart(index: number) {
    // TODO: click add to cart on the nth product, then close the modal
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
    return 0;
  }
}
`,
    },
    minAssertions: 2,
    skills: ["Real site", "Page Objects", "Modals", "CI run"],
    checks: [
      { label: "Both tests passed on GitHub Actions", test: (c) => c.result.tests.length >= 2 && c.result.tests.every((t) => t.ok) },
      { label: "ProductsPage and CartPage exist", test: (c) => /export\s+class\s+ProductsPage/.test(c.files["pages/products.page.ts"] || "") && /export\s+class\s+CartPage/.test(c.files["pages/cart.page.ts"] || "") },
      { label: "No raw locators in the spec", test: (c) => Object.entries(c.files).filter(([f]) => f.startsWith("tests/")).every(([, src]) => !/page\s*\.\s*(getBy\w+|locator|click|fill)\s*\(/.test(src)) },
      { label: "Every search result is checked, not just the first", test: (c) => Object.entries(c.files).some(([f, src]) => f.startsWith("tests/") && /(for\s*\(|\.every\s*\(|\.forEach\s*\(|\.map\s*\()/.test(src)) },
    ],
  },
  {
    id: "automationexercise-api",
    app: "automationexercise",
    title: "API tests with the request fixture",
    level: "Senior",
    minutes: 20,
    free: false,
    story:
      "\"Same product, other layer: write API tests for automationexercise.com with Playwright's request fixture. Product list, search, and a negative case. Bear in mind the API answers with text/html, so you parse the body yourself.\"",
    criteria: [
      "GET /api/productsList returns responseCode 200 and a non-empty products array.",
      "POST /api/searchProduct with form field search_product=tshirt returns products whose names all contain \"shirt\" (case-insensitive).",
      "POST /api/verifyLogin without an email returns responseCode 400 and a message mentioning the missing parameter.",
    ],
    hints: [
      "Use the request fixture: test('...', async ({ request }) => { const res = await request.get('/api/productsList'); ... }).",
      "The content type is text/html, so do const body = JSON.parse(await res.text()).",
      "Form posts: request.post('/api/searchProduct', { form: { search_product: 'tshirt' } }).",
      "The HTTP status is 200 even for errors; the real status is body.responseCode.",
    ],
    starter:
      header +
      `test('GET productsList returns products', async ({ request }) => {
  // TODO
});

test('POST searchProduct filters by name', async ({ request }) => {
  // TODO
});

test('POST verifyLogin without email is a 400', async ({ request }) => {
  // TODO
});
`,
    minAssertions: 4,
    skills: ["API testing", "request fixture", "Negative test"],
    checks: [
      { label: "All three tests passed on GitHub Actions", test: (c) => c.result.tests.length >= 3 && c.result.tests.every((t) => t.ok) },
      { label: "Tests use the request fixture", test: (c) => codeHas(c, /\{\s*request\s*\}/) },
      { label: "The body is parsed from text", test: (c) => codeHas(c, /JSON\.parse\s*\(/) },
      { label: "The negative case checks responseCode 400", test: (c) => codeHas(c, /400/) },
    ],
  },
  // ---------------- API and UI+API labs (practice apps expose a REST API under /api) ----------------
  {
    id: "swagshop-api-login",
    app: "swagshop",
    title: "API: login happy path and negative cases",
    level: "Junior",
    minutes: 10,
    free: true,
    story:
      "\"Before the UI suite we want API coverage of authentication. Hit POST /api/auth/login with the request fixture: a valid login must return a token and the user, a wrong password must be a 401, the locked-out user must be a 423, and GET /api/me without logging in must be a 401.\"",
    criteria: [
      "POST /api/auth/login with standard_user / secret_sauce: assert the response is OK, the body has a token and user.username is standard_user.",
      "A wrong password returns 401 with error.code invalid_credentials.",
      "locked_out_user returns 423 with error.code locked.",
      "GET /api/me before logging in returns 401.",
    ],
    hints: [
      "Playwright gives you an API client: test('...', async ({ request }) => { const res = await request.post('/api/auth/login', { data: { username, password } }); }).",
      "expect(res).toBeOK() checks for a 2xx; res.status() gives the exact code; await res.json() parses the body.",
      "GET /api (the API root) lists every endpoint of this practice app with its parameters.",
      "Each test gets a fresh API session, so GET /api/me in a new test is anonymous.",
    ],
    starter:
      header +
      `test('valid login returns a token', async ({ request }) => {
  const res = await request.post('/api/auth/login', { data: { username: 'standard_user', password: 'secret_sauce' } });
  // TODO: assert the status, the token and user.username
});

test('wrong password is a 401', async ({ request }) => {
  // TODO
});

test('locked out user is a 423', async ({ request }) => {
  // TODO
});

test('GET /api/me without a session is a 401', async ({ request }) => {
  // TODO
});
`,
    minAssertions: 4,
    skills: ["API testing", "request fixture", "Status codes", "Negative tests"],
    checks: [
      { label: "Tests use the request fixture", test: (c) => codeHas(c, /\{\s*request\s*\}/) },
      { label: "A valid login was asserted (token or username)", test: (c) => codeHas(c, /token|username/) && c.result.assertions.passed >= 1 },
      { label: "You asserted the 401 for a wrong password", test: (c) => codeHas(c, /401/) },
      { label: "You asserted the 423 for the locked-out user", test: (c) => codeHas(c, /423/) },
      { label: "At least three tests ran and passed", test: (c) => c.result.tests.filter((t) => t.ok).length >= 3 },
    ],
  },
  {
    id: "swagshop-api-cart",
    app: "swagshop",
    title: "API: cart maths, coupons and stock rules",
    level: "Mid",
    minutes: 15,
    free: false,
    story:
      "\"The cart service owns the money maths, so test it at the API: add two products with quantities, check the subtotal and 8% tax, apply SAVE10 and check the discount, prove an out-of-stock product is refused, then change a quantity and remove a line.\"",
    criteria: [
      "Log in through the API, then POST /api/cart/items for productId 4 with qty 2 and productId 0 (qty 1). Assert count 3 and subtotal 45.97.",
      "Apply coupon SAVE10 (POST /api/cart/coupon) and assert discount 4.6 and total 44.68 (tax is 8% after the discount).",
      "Adding productId 10 (out of stock) returns 409.",
      "PATCH /api/cart/items/4 with qty 1 and DELETE /api/cart/items/0, then assert the cart count is 1.",
    ],
    hints: [
      "The request fixture keeps cookies between calls, so one login at the top of the test is enough for the whole flow.",
      "Every cart endpoint returns the updated cart: items[], count, subtotal, coupon, discount, tax, total.",
      "Error bodies look like { error: { code, message } }; assert the status code and the code.",
      "Use toBeCloseTo for money, or compare the exact numbers the API returns (it rounds to 2 decimals).",
    ],
    starter:
      header +
      `test.beforeEach(async ({ request }) => {
  await request.post('/api/auth/login', { data: { username: 'standard_user', password: 'secret_sauce' } });
});

test('cart totals, coupon, stock rule and line edits', async ({ request }) => {
  // TODO: add productId 4 (qty 2) and productId 0, assert count and subtotal

  // TODO: apply SAVE10 and assert discount and total

  // TODO: productId 10 is out of stock: expect 409

  // TODO: PATCH qty of product 4 to 1, DELETE product 0, assert count 1
});
`,
    minAssertions: 5,
    skills: ["API testing", "Session cookies", "Money assertions", "Error handling"],
    checks: [
      { label: "Tests use the request fixture", test: (c) => codeHas(c, /\{\s*request\s*\}/) },
      { label: "Items were added through POST /api/cart/items", test: (c) => codeHas(c, /cart\/items/) },
      { label: "SAVE10 was applied and its effect asserted", test: (c) => codeHas(c, /SAVE10/) && codeHas(c, /44\.68|4\.6\b/) },
      { label: "The out-of-stock 409 was asserted", test: (c) => codeHas(c, /409/) },
      { label: "A line was changed with PATCH and removed with DELETE", test: (c) => codeHas(c, /\.patch\(/) && codeHas(c, /\.delete\(/) },
      { label: "Every test passed", test: (c) => c.result.ok && c.result.tests.length >= 1 },
    ],
  },
  {
    id: "swagshop-ui-api-checkout",
    app: "swagshop",
    title: "UI + API: seed the cart by API, finish checkout in the UI",
    level: "Senior",
    minutes: 20,
    free: false,
    story:
      "\"Our checkout UI tests spend most of their time clicking products into the cart. Seed the state through the API instead: log in, add items and save the shipping info with page.request, then open the overview page, verify what the customer sees, finish the order, and confirm it through GET /api/orders.\"",
    criteria: [
      "Use page.request (it shares the browser's cookies) to log in as standard_user, add productId 0 and productId 4 with qty 2, and PUT /api/checkout/info.",
      "page.goto('/checkout-step-two') and assert the title Checkout: Overview, two item rows and the total label Total: $49.65.",
      "Click Finish and assert the Thank you for your order! header.",
      "GET /api/orders with page.request: one order, status placed, total 49.65.",
    ],
    hints: [
      "page.request is an API client bound to the page's cookies, so what you set up there is what the page sees. The plain request fixture has its own cookie jar in real Playwright.",
      "Item rows on the overview have data-test=\"inventory-item\"; the total is data-test=\"total-label\".",
      "The app reads the session when it loads, so navigate only after the API calls have finished.",
      "Keep the API seeding in a helper or a beforeEach so the test body reads like the user journey.",
    ],
    starter:
      header +
      `test.beforeEach(async ({ page }) => {
  const api = page.request;
  // TODO: login, add productId 0 and productId 4 (qty 2), PUT /api/checkout/info { firstName, lastName, postalCode }
});

test('seeded cart checks out in the UI', async ({ page }) => {
  await page.goto('/checkout-step-two');
  // TODO: assert the overview, click Finish, assert the confirmation

  // TODO: GET /api/orders via page.request and assert the order
});
`,
    minAssertions: 4,
    skills: ["Hybrid UI + API", "page.request", "Test data seeding", "End-to-end verification"],
    checks: [
      { label: "State was seeded with page.request", test: (c) => codeHas(c, /page\.request/) && codeHas(c, /cart\/items/) },
      { label: "The overview page was verified in the UI", test: (c) => codeHas(c, /checkout-step-two/) && usesAny(c, "toHaveText", "toContainText", "toHaveCount", "toBeVisible") },
      { label: "An order for $49.65 was placed", test: (c) => Math.abs((c.lab?.lastOrder?.total ?? 0) - 49.65) < 0.01 },
      { label: "The order was confirmed through GET /api/orders", test: (c) => codeHas(c, /\/api\/orders/) && c.result.assertions.passed >= 4 },
    ],
  },
  {
    id: "peopledesk-api-employee-crud",
    app: "peopledesk",
    title: "API: employee CRUD with validation",
    level: "Mid",
    minutes: 20,
    free: true,
    story:
      "\"Cover the employee record end to end at the API: create one, read it back through search, update it, delete it, and prove it is gone. Include the validation failure for a missing last name, and check the field-level details the API returns.\"",
    criteria: [
      "Log in as Admin / admin123 through POST /api/auth/login.",
      "POST /api/employees without lastName returns 400 with error.details.lastName.",
      "Create an employee (firstName, lastName, jobTitle SDET, department Quality Engineering): status 201 and an employee.id.",
      "GET /api/employees?name=<the name> returns total 1; PATCH the job title to Test Lead and assert it; DELETE the record; GET /api/employees/:id is then 404.",
    ],
    hints: [
      "Job titles and departments are validated against GET /api/meta; Quality Engineering and SDET are valid values.",
      "Use a unique name per run (for example 'Api' + Date.now()) so the search returns exactly your record.",
      "The create response is { employee: {...} } with status 201; errors are { error: { code, message, details } }.",
      "Put the login in test.beforeEach so each test starts authenticated.",
    ],
    starter:
      header +
      `test.beforeEach(async ({ request }) => {
  await request.post('/api/auth/login', { data: { username: 'Admin', password: 'admin123' } });
});

test('missing last name is rejected with field details', async ({ request }) => {
  // TODO
});

test('create, search, update and delete an employee', async ({ request }) => {
  const lastName = 'Api' + Date.now();
  // TODO
});
`,
    minAssertions: 6,
    skills: ["API testing", "CRUD", "Validation details", "Unique test data"],
    checks: [
      { label: "Tests use the request fixture", test: (c) => codeHas(c, /\{\s*request\s*\}/) },
      { label: "The 400 and its field details were asserted", test: (c) => codeHas(c, /400/) && codeHas(c, /details/) },
      { label: "An employee was created (201) and found by search", test: (c) => codeHas(c, /201/) && codeHas(c, /employees\?name=|params/) },
      { label: "The record was updated with PATCH and removed with DELETE", test: (c) => codeHas(c, /\.patch\(/) && codeHas(c, /\.delete\(/) },
      { label: "The deleted record returns 404", test: (c) => codeHas(c, /404/) },
      { label: "Every test passed", test: (c) => c.result.ok && c.result.tests.length >= 2 },
    ],
  },
  {
    id: "peopledesk-api-leave-workflow",
    app: "peopledesk",
    title: "API: leave request workflow across two roles",
    level: "Senior",
    minutes: 25,
    free: false,
    story:
      "\"Leave is a two-actor workflow: an employee applies, an admin approves, and the balance moves. Automate it at the API with role switching: Vikram applies for three days of casual leave, cannot approve his own request, the admin approves it, and his available balance drops from 12 to 9.\"",
    criteria: [
      "Log in as the employee vikram.singh / Welcome@1 and assert GET /api/leave/balance shows Casual Leave available 12.",
      "POST /api/leave with toDate before fromDate returns 400 with error.details.toDate; a valid request for 2026-12-10 to 2026-12-12 is created with status Pending Approval and days 3.",
      "POST /api/leave/:id/approve as the employee returns 403.",
      "Log out, log in as Admin / admin123, find the request in GET /api/leave?status=Pending Approval, approve it, and assert status Scheduled and the employee's Casual Leave balance: used 3, available 9 (GET /api/leave/balance?employeeId=0004).",
    ],
    hints: [
      "One request context keeps the session: POST /api/auth/logout then POST /api/auth/login switches the user without losing the data created so far.",
      "Leave rows look like { id, employeeId, employee, type, from, to, days, status }. Balances are { employeeId, balances: [{ type, entitlement, used, pending, available }] }.",
      "Query parameters can be passed as params: request.get('/api/leave', { params: { status: 'Pending Approval' } }).",
      "Keep the status strings exact: 'Pending Approval' and 'Scheduled'.",
    ],
    starter:
      header +
      `const login = (request, username, password) => request.post('/api/auth/login', { data: { username, password } });

test('employee applies, admin approves, balance moves', async ({ request }) => {
  await login(request, 'vikram.singh', 'Welcome@1');
  // TODO: balance 12, invalid dates 400, valid request Pending Approval with 3 days, self-approve 403

  await request.post('/api/auth/logout');
  await login(request, 'Admin', 'admin123');
  // TODO: find it under Pending Approval, approve, assert Scheduled and balance used 3 / available 9
});
`,
    minAssertions: 6,
    skills: ["API workflows", "Role switching", "Authorization (403)", "State assertions"],
    checks: [
      { label: "Tests use the request fixture", test: (c) => codeHas(c, /\{\s*request\s*\}/) },
      { label: "Both roles logged in (employee and Admin)", test: (c) => codeHas(c, /vikram\.singh/) && codeHas(c, /Admin/) },
      { label: "The employee's self-approval 403 was asserted", test: (c) => codeHas(c, /403/) },
      { label: "The admin approved the request and asserted Scheduled", test: (c) => codeHas(c, /approve/) && codeHas(c, /Scheduled/) },
      { label: "The balance was asserted after approval", test: (c) => codeHas(c, /balance/) && codeHas(c, /\b9\b/) },
      { label: "Every test passed", test: (c) => c.result.ok && c.result.assertions.passed >= 6 },
    ],
  },
  {
    id: "peopledesk-ui-api-seeded-search",
    app: "peopledesk",
    title: "UI + API: seed a record by API, verify in the UI, clean up",
    level: "Senior",
    minutes: 20,
    free: false,
    story:
      "\"Our PIM search tests create employees through the form, which is slow and leaves junk behind. Create the employee with the API in beforeEach, verify the search in the UI, and delete it with the API in afterEach, asserting the clean-up worked.\"",
    criteria: [
      "beforeEach: with page.request, log in as Admin and POST /api/employees for a unique last name; keep the returned employee.id.",
      "Test: log in through the UI, open PIM, search by the name and assert (1) Record Found and that the row shows the last name.",
      "afterEach: DELETE /api/employees/:id with page.request and assert GET /api/employees/:id returns 404.",
      "The test must not create any record through the UI form.",
    ],
    hints: [
      "Share the id between hooks with a variable declared at file level (let id: string) or a custom fixture.",
      "page.request shares the browser cookies, so after the API login the UI is already authenticated; logging in again through the form is fine too.",
      "The search box is getByLabel('Employee Name'); the result count has data-test=\"records-found\".",
      "afterEach runs even when the test fails, which is exactly why clean-up belongs there.",
    ],
    starter:
      header +
      `let employeeId = '';
const lastName = 'Seed' + Date.now();

test.beforeEach(async ({ page }) => {
  // TODO: login and create the employee with page.request
});

test.afterEach(async ({ page }) => {
  // TODO: delete the employee with page.request and assert it is gone
});

test('seeded employee is found by name', async ({ page }) => {
  // TODO
});
`,
    minAssertions: 3,
    skills: ["Hybrid UI + API", "beforeEach / afterEach", "Test data clean-up", "page.request"],
    checks: [
      { label: "The employee was created with page.request in beforeEach", test: (c) => codeHas(c, /beforeEach/) && codeHas(c, /page\.request/) && codeHas(c, /\.post\([^)]*employees/) },
      { label: "The search result was asserted in the UI", test: (c) => codeHas(c, /Record Found|records-found/) && usesAny(c, "toHaveText", "toContainText", "toHaveCount") },
      { label: "Clean-up ran in afterEach with DELETE", test: (c) => codeHas(c, /afterEach/) && codeHas(c, /\.delete\(/) },
      { label: "The search was narrowed to the seeded record", test: (c) => Array.isArray(c.lab?.results) && c.lab.results.length === 1 },
      { label: "The 404 after clean-up was asserted", test: (c) => codeHas(c, /404/) && c.result.ok },
    ],
  },
  {
    id: "trendkart-api-search",
    app: "trendkart",
    title: "API: product search, sorting and a 404",
    level: "Junior",
    minutes: 10,
    free: true,
    story:
      "\"The search API backs the whole listing page. Test GET /api/products: 'shirt' returns 5 products whose names all contain Shirt, sort=price_asc comes back ascending, a product can be fetched by id, and an unknown id is a 404.\"",
    criteria: [
      "GET /api/products?q=shirt: total 5 and every item name contains 'shirt' (case-insensitive).",
      "GET /api/products?q=shirt&sort=price_asc: prices ascend.",
      "GET /api/products/104: name Men Printed Round Neck T-shirt, price 399, sizes include M.",
      "GET /api/products/999: status 404, error.code not_found.",
    ],
    hints: [
      "Query strings can be passed with params: request.get('/api/products', { params: { q: 'shirt', sort: 'price_asc' } }).",
      "The list response is { items, total, page, pages, facets }; a product is { id, brand, name, price, mrp, sizes, oos, ... }.",
      "Compare arrays with toEqual: expect(prices).toEqual([...prices].sort((a, b) => a - b)).",
      "Every endpoint, with its parameters, is listed at GET /api.",
    ],
    starter:
      header +
      `test('search returns matching products', async ({ request }) => {
  const res = await request.get('/api/products', { params: { q: 'shirt' } });
  // TODO
});

test('price_asc sorts ascending', async ({ request }) => {
  // TODO
});

test('product by id and unknown id', async ({ request }) => {
  // TODO
});
`,
    minAssertions: 4,
    skills: ["API testing", "Query params", "Array assertions", "404 handling"],
    checks: [
      { label: "Tests use the request fixture", test: (c) => codeHas(c, /\{\s*request\s*\}/) },
      { label: "The shirt search total was asserted", test: (c) => codeHas(c, /shirt/) && codeHas(c, /\b5\b/) },
      { label: "Ascending prices were asserted", test: (c) => codeHas(c, /price_asc/) && codeHas(c, /sort\(/) },
      { label: "The 404 was asserted", test: (c) => codeHas(c, /404/) },
      { label: "At least three tests ran and passed", test: (c) => c.result.tests.filter((t) => t.ok).length >= 3 },
    ],
  },
  {
    id: "trendkart-api-checkout",
    app: "trendkart",
    title: "API: register, bag rules, coupon, order and cancel",
    level: "Senior",
    minutes: 25,
    free: false,
    story:
      "\"Write the API journey a new customer takes: register, try to add a product without a size and an out-of-stock size, add three tees, apply TRENDY10, save an address, place a UPI order, see it in the order history and cancel it. Assert the money at every step.\"",
    criteria: [
      "POST /api/auth/register with a unique email: status 201 and a token.",
      "POST /api/bag/items for productId 104 without size is 400 (Please select a size); productId 101 size XL is 409 (out of stock).",
      "productId 104 size M qty 3 gives totals.total 1197; coupon TRENDY10 gives totals.coupon 120 and total 1077.",
      "POST /api/addresses, then POST /api/orders { addressId, payment: 'upi' }: status 201, order.status confirmed, totals.total 1077. GET /api/orders has 1 item; POST /api/orders/:id/cancel sets status cancelled.",
    ],
    hints: [
      "Register with 'buyer' + Date.now() + '@example.com' so the run never collides with an existing account.",
      "Bag responses are { items, coupon, couponLabel, totals: { mrp, discount, coupon, delivery, total, count } }; the delivery fee is waived at ₹999 and above.",
      "Address fields: name, phone (10 digits), line1, city, state, pincode (6 digits). The create response is { address: { id, ... } }.",
      "An order is { order: { id, status, totals, items, address, payment } }; GET /api/orders returns { items }.",
    ],
    starter:
      header +
      `test('new customer journey through the API', async ({ request }) => {
  const email = 'buyer' + Date.now() + '@example.com';
  // TODO: register

  // TODO: size rules (400, 409), add 3 x productId 104 size M, totals 1197

  // TODO: TRENDY10 -> coupon 120, total 1077

  // TODO: address, order (upi), orders list, cancel
});
`,
    minAssertions: 8,
    skills: ["API journeys", "Business rules", "Money assertions", "Order lifecycle"],
    checks: [
      { label: "Tests use the request fixture", test: (c) => codeHas(c, /\{\s*request\s*\}/) },
      { label: "A new account was registered", test: (c) => codeHas(c, /auth\/register/) },
      { label: "The size rules were asserted (400 and 409)", test: (c) => codeHas(c, /400/) && codeHas(c, /409/) },
      { label: "TRENDY10 and the ₹1,077 total were asserted", test: (c) => codeHas(c, /TRENDY10/) && codeHas(c, /1077/) },
      { label: "An order was placed and cancelled", test: (c) => codeHas(c, /\/api\/orders/) && codeHas(c, /cancel/) },
      { label: "Every test passed", test: (c) => c.result.ok && c.result.assertions.passed >= 8 },
    ],
  },
  {
    id: "trendkart-ui-api-bag",
    app: "trendkart",
    title: "UI + API: build the bag by API, check out in the UI",
    level: "Senior",
    minutes: 20,
    free: false,
    story:
      "\"Checkout is the page that matters, so get there fast: put three tees in the bag and apply TRENDY10 with page.request, then open the bag, verify the price breakdown the customer sees, enter a delivery address, confirm the order, and check the order through the API.\"",
    criteria: [
      "With page.request: POST /api/bag/items { productId: 104, size: 'M', qty: 3 } and POST /api/bag/coupon { code: 'TRENDY10' }.",
      "page.goto('/bag'): one bag item, coupon discount -₹120 and total amount ₹1,077.",
      "Click PLACE ORDER, fill the delivery address, click CONFIRM ORDER and assert the order confirmation is visible.",
      "GET /api/orders with page.request: one order with totals.total 1077 and status confirmed.",
    ],
    hints: [
      "Bag rows are getByTestId('bag-item'); the breakdown uses data-testid coupon-discount and total-amount.",
      "On the checkout page the address inputs have labels (Full name, Mobile number, Address line, City, State, Pincode) and the button is CONFIRM ORDER.",
      "The confirmation page has data-testid=\"order-confirmed\" and shows the order id.",
      "Guests can order; no login is needed for this flow.",
    ],
    starter:
      header +
      `test.beforeEach(async ({ page }) => {
  // TODO: seed the bag and coupon with page.request
});

test('seeded bag checks out in the UI', async ({ page }) => {
  await page.goto('/bag');
  // TODO: assert the breakdown, place the order, confirm it via the API
});
`,
    minAssertions: 4,
    skills: ["Hybrid UI + API", "page.request", "Checkout flow", "Price assertions"],
    checks: [
      { label: "The bag was seeded with page.request", test: (c) => codeHas(c, /page\.request/) && codeHas(c, /bag\/items/) && codeHas(c, /TRENDY10/) },
      { label: "The price breakdown was asserted in the UI", test: (c) => codeHas(c, /1,077|1077/) && usesAny(c, "toHaveText", "toContainText") },
      { label: "An order for ₹1,077 was confirmed", test: (c) => c.lab?.lastOrder?.totals?.total === 1077 },
      { label: "The order was verified through GET /api/orders", test: (c) => codeHas(c, /\/api\/orders/) && c.result.ok },
    ],
  },
  // ---------------- Production-grade end-to-end journeys (UI + API) ----------------
  {
    id: "swagshop-e2e-purchase-journey",
    app: "swagshop",
    title: "End-to-end: purchase journey verified through UI and API",
    level: "Senior",
    minutes: 30,
    free: true,
    story:
      "\"This is the release test for the store. Prove the catalogue through the API, buy through the UI exactly like a customer (quantities, a coupon, checkout), check every number against the API's own prices, then cancel the order through the API and confirm the UI shows it. One test, clear steps, no hard-coded totals.\"",
    criteria: [
      "API: GET /api/products returns 12 products; read the prices of Fleece Zip Jacket and Classic Cotton Tee from it (no hard-coded prices).",
      "UI: log in as standard_user, add both products, set the tee quantity to 2 in the cart, apply SAVE10 and assert the coupon message.",
      "UI: fill the checkout info and on the overview assert item total, discount (10%), tax (8% after discount) and total computed from the API prices (round to 2 decimals).",
      "UI: Finish and assert the confirmation. API: GET /api/orders shows one order with that total and coupon SAVE10; POST /api/orders/:id/cancel. UI: /orders/:id shows status cancelled.",
    ],
    hints: [
      "Use test.step for each phase (catalogue, shopping, checkout, order) so the report reads like a test case.",
      "page.request shares the browser session, so the order you placed in the UI is what GET /api/orders returns.",
      "The quantity control in the cart is getByLabel('Quantity for Classic Cotton Tee'); the coupon box is getByLabel('Coupon code') plus the Apply button; the message has data-test=\"coupon-message\".",
      "Money helper: const money = (t) => Number(t.match(/\\$([0-9.]+)/)?.[1]); labels such as 'Coupon SAVE10: -$8.20' contain other digits, so take the $ amount. Compare with toBeCloseTo(expected, 2).",
      "After clicking Continue, wait for the overview (expect(page).toHaveURL(/checkout-step-two/)) before reading prices: the app saves through the API.",
    ],
    starter:
      header +
      `const money = (t: string | null) => Number((t || '').match(/\\$([0-9.]+)/)?.[1] || 0); // the $ amount in the label
const r2 = (n: number) => Math.round(n * 100) / 100;

test('purchase journey: catalogue, cart, checkout, order', async ({ page }) => {
  const api = page.request;

  await test.step('catalogue is healthy (API)', async () => {
    // TODO: GET /api/products, assert 12, read the two prices
  });

  await test.step('shop as a customer (UI)', async () => {
    // TODO: login, add both products, tee qty 2, apply SAVE10
  });

  await test.step('checkout maths (UI vs API prices)', async () => {
    // TODO
  });

  await test.step('order placed, then cancelled (API + UI)', async () => {
    // TODO
  });
});
`,
    minAssertions: 8,
    skills: ["End-to-end", "UI + API", "test.step", "Computed assertions", "Order lifecycle"],
    checks: [
      { label: "Prices were read from the API, not hard-coded", test: (c) => codeHas(c, /\/api\/products/) && !codeHas(c, /49\.99|15\.99/) },
      { label: "The journey is structured with test.step", test: (c) => codeHas(c, /test\.step\(/) && c.result.ok },
      { label: "The tee quantity was changed and SAVE10 applied in the UI", test: (c) => codeHas(c, /Quantity for|item-quantity-select/) && codeHas(c, /SAVE10/) },
      { label: "The checkout maths were asserted (discount, tax and total)", test: (c) => usesAny(c, "toBeCloseTo", "toBe", "toEqual") && c.result.assertions.passed >= 8 },
      { label: "An order with SAVE10 was placed and then cancelled", test: (c) => c.lab?.order?.coupon === "SAVE10" && c.lab.order.status === "cancelled" && codeHas(c, /\/api\/orders/) },
      { label: "The cancelled status was verified in the UI", test: (c) => codeHas(c, /order-status/) && codeHas(c, /cancelled/) },
    ],
  },
  {
    id: "peopledesk-e2e-hire-to-leave",
    app: "peopledesk",
    title: "End-to-end: hire to leave approval across roles and layers",
    level: "Senior",
    minutes: 35,
    free: false,
    story:
      "\"HR's critical path: a new hire is created, logs in, applies for leave, punches in, and a manager approves. Automate it across both roles and both layers: seed the hire through the API, drive the employee through the UI, verify with the API, approve as Admin in the UI, verify the balance through the API, and leave no data behind.\"",
    criteria: [
      "API (page.request, Admin): create an employee with a unique last name, jobTitle QA Engineer, department Quality Engineering. Keep the id.",
      "UI: log in as that employee (first.last / Welcome@1); My Info shows the name and id. Apply for Sick Leave 2026-12-01 to 2026-12-02 and assert Pending Approval; punch in on the Time page and assert the status.",
      "API (same session): GET /api/leave has 1 request with days 2 and status Pending Approval; GET /api/attendance has an open punch.",
      "UI: log out, log in as Admin, approve the request from the Leave list and assert Scheduled. API: GET /api/leave/balance?employeeId=<id> shows Sick Leave used 2, available 8. Clean-up in afterEach: DELETE the employee and assert 404.",
    ],
    hints: [
      "page.request shares the browser cookies: after the UI login as the employee, API calls run as the employee; after the Admin UI login they run as Admin. That is what makes one session carry the whole story.",
      "The employee's username is firstName.lastName in lower case; the password for every employee is Welcome@1.",
      "Admin sees Approve / Reject buttons on Pending Approval rows: page.getByTestId('leave-row').filter({ hasText: lastName }).getByRole('button', { name: 'Approve' }).",
      "Log out through the user menu: getByTestId('user-menu') then the Logout menu item.",
      "Keep the created id in a file-level variable so afterEach can delete it even when a step fails.",
    ],
    starter:
      header +
      `const lastName = 'Hire' + Date.now();
let employeeId = '';

test.beforeEach(async ({ page }) => {
  // TODO: Admin login + POST /api/employees with page.request; keep employeeId
});

test.afterEach(async ({ page }) => {
  // TODO: DELETE /api/employees/:id (log in as Admin first if needed) and assert 404
});

test('hire to leave approval', async ({ page }) => {
  await test.step('employee logs in and applies (UI)', async () => {
    // TODO
  });

  await test.step('request and punch exist (API)', async () => {
    // TODO
  });

  await test.step('admin approves (UI) and the balance moves (API)', async () => {
    // TODO
  });
});
`,
    minAssertions: 8,
    skills: ["End-to-end", "UI + API", "Role switching", "Data seeding and clean-up", "Workflow"],
    checks: [
      { label: "The hire was seeded through the API and cleaned up in afterEach", test: (c) => codeHas(c, /\.post\([^)]*employees/) && codeHas(c, /afterEach/) && codeHas(c, /\.delete\(/) },
      { label: "The employee used the UI (login, leave, punch)", test: (c) => codeHas(c, /Welcome@1/) && codeHas(c, /Punch In/) && codeHas(c, /Sick Leave/) },
      { label: "The request and the punch were verified through the API", test: (c) => codeHas(c, /\/api\/leave/) && codeHas(c, /\/api\/attendance/) },
      { label: "Admin approved in the UI and the balance was checked through the API", test: (c) => codeHas(c, /Approve/) && codeHas(c, /balance/) && codeHas(c, /\b8\b/) },
      { label: "Every step passed", test: (c) => c.result.ok && c.result.assertions.passed >= 8 },
      { label: "The 404 after clean-up was asserted", test: (c) => codeHas(c, /404/) },
    ],
  },
  {
    id: "trendkart-e2e-member-journey",
    app: "trendkart",
    title: "End-to-end: new member journey from sign-up to cancellation",
    level: "Senior",
    minutes: 35,
    free: false,
    story:
      "\"Our highest-value flow is a new member who signs up, saves things, buys with a member coupon and later cancels. Automate it end to end: sign up in the UI, seed the wishlist through the API, move an item to the bag and add another in the UI, apply NEWUSER, pay to a saved address created through the API, then verify the order through the API and cancel it in the UI.\"",
    criteria: [
      "UI: create an account with a unique email (Create an account link, then Name, Mobile, Email, Password). API: GET /api/me returns that email.",
      "API: POST /api/wishlist for productId 106. UI: on the wishlist choose size S and Move to bag; open product 104, pick size M, add to bag; in the bag set its quantity to 2 and apply NEWUSER, asserting the coupon message.",
      "API: GET /api/bag totals must equal what the bag page shows (count 3, Total Amount). POST /api/addresses for a saved address.",
      "UI: PLACE ORDER, choose the saved address and Cash on delivery, CONFIRM ORDER and assert the confirmation. API: GET /api/orders has that order with status confirmed and the same total. UI: open the order from My Orders, Cancel order, and assert the status is cancelled; API agrees.",
    ],
    hints: [
      "Registration lives at /register (or the Create an account link on /login); after it the app sends members to their account page.",
      "Wishlist rows have a size select: getByLabel('Size for Women Floral Print Kurta') then getByTestId('move-to-bag').",
      "Bag quantity: getByLabel('Quantity for Men Printed Round Neck T-shirt').selectOption('2'); coupon: getByLabel('Coupon code') + Apply, message in getByTestId('coupon-message').",
      "Compare money as numbers: const inr = (t) => Number(t.replace(/[^0-9]/g, '')); the API totals are plain integers in rupees.",
      "On checkout the saved address is a radio inside getByTestId('saved-address'); payment radios are labelled UPI, Credit / Debit card, Cash on delivery.",
    ],
    starter:
      header +
      `const inr = (t: string | null) => Number((t || '').replace(/[^0-9]/g, ''));
const email = 'member' + Date.now() + '@example.com';

test('new member: sign up, wishlist, bag, coupon, order, cancel', async ({ page }) => {
  const api = page.request;

  await test.step('sign up (UI) and verify the session (API)', async () => {
    // TODO
  });

  await test.step('wishlist (API) to bag (UI) with a member coupon', async () => {
    // TODO
  });

  await test.step('bag totals agree between UI and API', async () => {
    // TODO
  });

  await test.step('order to a saved address, verify, cancel', async () => {
    // TODO
  });
});
`,
    minAssertions: 8,
    skills: ["End-to-end", "UI + API", "Member features", "Price reconciliation", "Order lifecycle"],
    checks: [
      { label: "An account was created in the UI and verified through GET /api/me", test: (c) => codeHas(c, /Create an account|\/register/) && codeHas(c, /\/api\/me/) },
      { label: "The wishlist was seeded through the API and moved to the bag in the UI", test: (c) => codeHas(c, /\/api\/wishlist/) && codeHas(c, /Move to bag|move-to-bag/) },
      { label: "NEWUSER was applied and the totals reconciled with the API", test: (c) => codeHas(c, /NEWUSER/) && codeHas(c, /\/api\/bag/) && usesAny(c, "toBe", "toEqual", "toBeCloseTo") },
      { label: "The order was placed to a saved address and confirmed via the API", test: (c) => codeHas(c, /\/api\/addresses/) && codeHas(c, /saved-address/) && codeHas(c, /\/api\/orders/) },
      { label: "The order was cancelled in the UI and the status verified", test: (c) => codeHas(c, /Cancel order|cancel-order/) && codeHas(c, /cancelled/) && c.lab?.order?.status === "cancelled" },
      { label: "Every step passed", test: (c) => c.result.ok && c.result.assertions.passed >= 8 },
    ],
  },
];

// ---------------- Framework workspaces: build everything from scratch ----------------
const specFiles = (c: CheckContext) => Object.entries(c.files).filter(([f]) => f.startsWith("tests/") && /\.(spec|test)\.[jt]s$/.test(f));
const stripComments = (src: string) => src.replace(/\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "");
const cfg = (c: CheckContext) => stripComments(c.files["playwright.config.ts"] || "");
const fixturesSrc = (c: CheckContext) => Object.entries(c.files).filter(([f]) => /(^|\/)fixtures?(\.ts|\/[^/]+\.ts)$/.test(f)).map(([, s]) => stripComments(s)).join("\n");

/** The interviewer's framework review, the same for every application. */
const FRAMEWORK_RUBRIC: Check[] = [
  { label: "All tests passed (at least two spec files, two tests each)", test: (c) => c.result.ok && specFiles(c).length >= 2 && c.result.tests.length >= 4 && c.result.tests.every((t) => t.ok) },
  { label: "playwright.config.ts uses defineConfig with testDir and baseURL", test: (c) => /defineConfig\s*\(/.test(cfg(c)) && /testDir\s*:/.test(cfg(c)) && /baseURL\s*:/.test(cfg(c)) },
  { label: "The base URL comes from the environment (process.env.BASE_URL) with a default", test: (c) => /process\.env\.\w*BASE_URL\w*\s*(\|\||\?\?)/.test(cfg(c)) },
  { label: "Config is CI-ready: retries, a reporter and trace or screenshot on failure", test: (c) => /retries\s*:/.test(cfg(c)) && /reporter\s*:/.test(cfg(c)) && /(trace|screenshot|video)\s*:/.test(cfg(c)) },
  { label: "At least two page objects under pages/", test: (c) => Object.entries(c.files).filter(([f, s]) => f.startsWith("pages/") && /export\s+(default\s+)?class/.test(s)).length >= 2 },
  { label: "A fixtures file extends test and the specs import test from it", test: (c) => /\.extend\s*[<(]/.test(fixturesSrc(c)) && specFiles(c).length > 0 && specFiles(c).every(([, s]) => /from\s+['"][^'"]*fixtures/.test(s)) },
  { label: "Test data or helpers live in their own module (data/, utils/ or helpers/)", test: (c) => Object.keys(c.files).some((f) => /^(data|utils|helpers|config)\//.test(f)) },
  { label: "Specs contain no raw locators (page.locator / getBy / click / fill)", test: (c) => specFiles(c).every(([, s]) => !/page\s*\.\s*(getBy\w+|locator|click|fill|goto)\s*\(/.test(stripComments(s))) },
  { label: "Tests are grouped or tagged (test.describe or @smoke / @regression tags)", test: (c) => specFiles(c).some(([, s]) => /test\.describe\s*\(/.test(s) || /@(smoke|regression|sanity|critical)\b/.test(s)) },
  { label: "No hard waits (waitForTimeout) anywhere", test: (c) => !/waitForTimeout\s*\(/.test(stripComments(c.code)) },
  { label: "README explains how to install and run the suite", test: (c) => /playwright\s+(test|install)|npm\s+(test|run)/i.test(c.files["README.md"] || "") },
];

/** True when a test in `src` destructures a fixture other than `request` (a page or a page object), so it drives the UI. */
const usesUiFixtures = (src: string) => Array.from(src.matchAll(/\(\s*\{([^}]*)\}\s*\)\s*=>/g)).some((m: RegExpMatchArray) => m[1].split(",").map((x: string) => x.trim().split(":")[0].trim()).some((name: string) => name !== "" && name !== "request"));

/** Extra rows for applications that expose a REST API: the framework must cover both layers. */
const API_RUBRIC: Check[] = [
  { label: "An API client module wraps the REST calls (api/, clients/, services/ or utils/api)", test: (c) => Object.keys(c.files).some((f) => /^(api|clients|services)\/|^utils\/api/.test(f)) },
  { label: "At least one spec covers the API (request fixture or page.request) and at least one test drives the UI", test: (c) => specFiles(c).some(([, s]) => /\brequest\b/.test(stripComments(s))) && specFiles(c).some(([, s]) => usesUiFixtures(stripComments(s))) },
  { label: "A spec combines both layers: API set-up or verification inside a UI test", test: (c) => specFiles(c).some(([, s]) => /page\.request|\brequest\b/.test(stripComments(s)) && /\b(page|app|loggedIn|inventory|cart|pim|leave|bag|search)\b/.test(stripComments(s)) && /expect\(/.test(s)) },
];
const APPS_WITH_API: LabAppId[] = ["swagshop", "peopledesk", "trendkart", "automationexercise"];
const frameworkRubric = (app: LabAppId) => (APPS_WITH_API.includes(app) ? [...FRAMEWORK_RUBRIC, ...API_RUBRIC] : FRAMEWORK_RUBRIC);

const workspaceBrief = (appName: string, extra: string) =>
  `"Here is an empty folder and ${appName}. Set up the automation framework you would put in front of a client: Playwright config, page objects, an API client where the app has an API, fixtures, test data, production-grade UI and API tests, and a README. Treat it like a real repo, not an exercise. ${extra}"`;

const WORKSPACE_CRITERIA = [
  "playwright.config.ts you write yourself: testDir, baseURL from an environment variable with a default, retries, reporter, trace/screenshot on failure.",
  "pages/ with at least two page objects; fixtures.ts that extends test (for example a logged-in page or a ready page object).",
  "tests/ with at least two spec files and four tests in total, using only fixtures and page objects, grouped with test.describe or tagged @smoke/@regression.",
  "data/ or utils/ for test data and helpers; a README that says how to install and run.",
  "Where the application has a REST API (the practice apps, AutomationExercise): an API client module, at least one API spec, and a spec that uses the API to set up or verify a UI journey. UI-only frameworks do not pass.",
  "Everything green: in the browser for the practice apps, and on GitHub Actions with your own config for every app.",
];

const WORKSPACE_HINTS = [
  "Start with playwright.config.ts: import { defineConfig } from '@playwright/test'; export default defineConfig({ testDir: './tests', use: { baseURL: process.env.BASE_URL || '…' } }). On GitHub the runner sets BASE_URL for you.",
  "Create files with + New: pages/login.page.ts, fixtures.ts, data/users.ts, tests/login.spec.ts, tests/…spec.ts, README.md.",
  "fixtures.ts: export const test = base.extend<{ app: AppPages }>({ app: async ({ page }, use) => { … await use(…) } }); export { expect } from '@playwright/test'. Specs import { test, expect } from '../fixtures'.",
  "A spec should read like a test case: await app.login.loginAs(users.standard); await expect(app.inventory.title).toHaveText('Products'). Keep every locator inside a page object.",
  "Run on GitHub uses your config: the workflow runs npx playwright test --config <your folder>/playwright.config.ts. The in-browser runner ignores the config file but checks it.",
  "API layer: api/<app>.api.ts wraps request (login, products, cart...) and a fixture exposes it: api: async ({ request }, use) => use(new ShopApi(request)). Use page.request inside UI tests when the API must share the browser session.",
];

const workspace = (app: LabAppId, id: string, name: string, extra: string, readme: string, free = false): Scenario => ({
  id,
  app,
  title: `Build the ${name} framework from scratch`,
  level: "Senior",
  minutes: 90,
  free,
  workspace: true,
  story: workspaceBrief(name, extra),
  criteria: WORKSPACE_CRITERIA,
  hints: WORKSPACE_HINTS,
  starter: "",
  files: {
    "README.md": readme,
  },
  minAssertions: 4,
  skills: ["Framework design", "Config", "Page Objects", "Fixtures", "Test data", "CI"],
  checks: frameworkRubric(app),
});

const readmeFor = (name: string, site: string, notes: string) => `# ${name} automation framework

Your framework for ${site}. Build it the way you would for a client:

- \`playwright.config.ts\`: testDir, baseURL from \`process.env.BASE_URL\`, retries, reporter, trace on failure
- \`pages/\`: one class per page or component
- \`fixtures.ts\`: \`test.extend\` with the objects your tests need
- \`data/\` or \`utils/\`: users, products, helpers
- \`tests/\`: specs that read like test cases, grouped with \`test.describe\` or tagged \`@smoke\`

${notes}

<!-- Replace this README with real install/run instructions. The rubric checks that it mentions how to run the suite. -->
`;

export const WORKSPACES: Scenario[] = [
  workspace("swagshop", "workspace-swagshop", "SwagShop", "Start with login and the cart; the checkout maths is where the bugs live.", readmeFor("SwagShop", "the SwagShop practice store (Saucedemo-style)", "Users: standard_user, locked_out_user, problem_user, performance_glitch_user / secret_sauce. Runs in the browser and on GitHub Actions."), true),
  workspace("peopledesk", "workspace-peopledesk", "PeopleDesk HR", "Admin login, employee CRUD with cleanup, leave validation. Show me how you keep test data isolated.", readmeFor("PeopleDesk HR", "the PeopleDesk practice portal (OrangeHRM-style)", "Login: Admin / admin123. Employee data resets when the page reloads, so each test should create what it needs.")),
  workspace("trendkart", "workspace-trendkart", "TrendKart", "Search, filters, sorting and the bag; make the suite data-driven.", readmeFor("TrendKart", "the TrendKart practice marketplace (Myntra-style)", "No login. Prices are rupees with commas, so you will want a parsePrice helper.")),
  workspace("saucedemo", "workspace-saucedemo", "Sauce Demo", "This is the real saucedemo.com. Your config must work on CI, not only on your laptop.", readmeFor("Sauce Demo", "https://www.saucedemo.com", "Users: standard_user, locked_out_user, problem_user, performance_glitch_user / secret_sauce. data-test attributes are the stable hooks."), true),
  workspace("orangehrm", "workspace-orangehrm", "OrangeHRM", "This is the real OrangeHRM demo. It is slow and shared with the whole internet, so your design must cope with that.", readmeFor("OrangeHRM", "https://opensource-demo.orangehrmlive.com", "Login: Admin / admin123. The demo resets regularly; use unique names (Date.now()) for anything you create. Login lives at /web/index.php/auth/login.")),
  workspace("automationexercise", "workspace-automationexercise", "AutomationExercise", "This is the real automationexercise.com: ads, modals, a UI and a JSON API. I want UI and API tests in the same framework.", readmeFor("AutomationExercise", "https://automationexercise.com", "Register your own users with unique emails and delete them afterwards. The API answers with text/html, so parse JSON from the body text.")),
];

export const MAIN_FILE = "tests/example.spec.ts";
export const starterFiles = (s: Scenario): Record<string, string> => (s.files ? { ...s.files } : { [MAIN_FILE]: s.starter });
export const isFramework = (s: Scenario) => !!s.files;
export const isWorkspace = (s: Scenario) => !!s.workspace;

/** Task scenarios plus the open workspaces. */
export const ALL_SCENARIOS: Scenario[] = [...SCENARIOS, ...WORKSPACES];
export const getScenario = (id: string) => ALL_SCENARIOS.find((s) => s.id === id);
/** Task scenarios of one app (workspaces are listed separately). */
export const scenariosFor = (app: LabAppId) => SCENARIOS.filter((s) => s.app === app);
export const workspaceFor = (app: LabAppId) => WORKSPACES.find((s) => s.app === app);
