# Module: Selenium in depth

## How do you write dynamic XPath? Explain XPath axes and functions.
@topic selenium

### 60s
Dynamic XPath uses functions and relationships instead of fixed positions, so it survives UI changes. Useful functions are contains, starts-with, text and normalize-space, for example a button whose id starts with "submit", or a link containing the text "Logout". Axes let me navigate from a stable element to the one I need: parent, child, ancestor, descendant, following-sibling and preceding-sibling. For example, find the row containing "Order 1024" and then the "Cancel" button in that same row. I always prefer relative XPath starting with double slash.

### Explain
Functions:
- `//input[contains(@id,'email')]`
- `//button[starts-with(@id,'btn-save')]`
- `//a[text()='Logout']` and `//span[normalize-space()='Total']`
- `//input[@type='text' and @name='city']`

Axes:
- `//label[text()='Email']/following-sibling::input`
- `//td[text()='Order 1024']/parent::tr//button[text()='Cancel']`
- `//input[@id='qty']/ancestor::form`
- `(//div[@class='card'])[last()]`

### Example
A table of orders has auto-generated IDs. Anchor on the visible order number and walk to the button in that row instead of using the generated ID.

### Code java | Dynamic XPath patterns
```java
By cancelForOrder(String orderNo) {
    return By.xpath("//td[normalize-space()='" + orderNo + "']"
                  + "/ancestor::tr//button[text()='Cancel']");
}

driver.findElement(By.xpath("//label[text()='Email']/following-sibling::input"))
      .sendKeys("qa@x.com");
driver.findElement(cancelForOrder("1024")).click();
```

## CSS selector vs XPath: which is better and why?
@topic selenium

### 60s
Both work in all modern browsers. CSS selectors are usually shorter, more readable and slightly faster, and they're what front-end developers use, so they're easy to share. XPath is more powerful: it can match by visible text and navigate upwards to parents and ancestors, which CSS can't do. My rule is to use id or a data-testid first, then CSS for most locators, and XPath only when I need text matching or to move up the DOM. Speed differences are negligible in practice; stability matters more.

### Explain
| Need | CSS | XPath |
|---|---|---|
| By id | `#email` | `//*[@id='email']` |
| By class | `.btn.primary` | `//*[contains(@class,'primary')]` |
| Attribute | `[data-testid='save']` | `//*[@data-testid='save']` |
| Starts / contains | `[id^='btn']`, `[id*='btn']` | `starts-with()`, `contains()` |
| Child | `form > input` | `//form/input` |
| Nth | `li:nth-child(3)` | `(//li)[3]` |
| Text | Not supported | `//button[text()='Save']` |
| Parent / ancestor | Not supported (`:has()` in modern browsers only) | `parent::`, `ancestor::` |

### Example
"Click the Save button" → `button[data-testid='save']` (CSS). "Click Edit next to the user named Priya" → XPath with text and ancestor.

### Code java | Same element, two ways
```java
By cssSave   = By.cssSelector("form#profile button[type='submit']");
By xpathSave = By.xpath("//form[@id='profile']//button[@type='submit']");

// XPath only: by visible text, then up to the row
By editPriya = By.xpath("//td[text()='Priya']/parent::tr//a[text()='Edit']");
```

## How do you handle alerts, popups and frames in Selenium?
@topic selenium

### 60s
For JavaScript alerts, confirms and prompts, I switch to the alert with driver.switchTo().alert(), then use accept, dismiss, getText or sendKeys, ideally after an explicit wait for alertIsPresent. For iframes, I must switch into the frame before interacting with its elements, using switchTo().frame by index, name or id, or WebElement, and then switch back with defaultContent or parentFrame. HTML modal popups aren't alerts; they're normal page elements, so I just locate and click them.

### Explain
- Alert methods: `accept()`, `dismiss()`, `getText()`, `sendKeys()` (prompt only).
- `NoAlertPresentException` if no alert; `UnhandledAlertException` if an alert blocks other actions.
- Frames: `frame(int)`, `frame(String nameOrId)`, `frame(WebElement)`; `parentFrame()` goes up one level; `defaultContent()` goes to the top.
- Use `ExpectedConditions.frameToBeAvailableAndSwitchToIt(...)`.
- Browser permission popups (location, notifications) are handled with browser options, not Selenium alerts.

### Example
A payment form is inside an iframe from the payment gateway. Switch into it, type the card number, switch back to click "Place order".

### Code java | Alert and frame
```java
WebDriverWait wait = new WebDriverWait(driver, Duration.ofSeconds(10));

// JS confirm
driver.findElement(By.id("delete")).click();
Alert alert = wait.until(ExpectedConditions.alertIsPresent());
Assert.assertEquals(alert.getText(), "Are you sure?");
alert.accept();

// iframe
wait.until(ExpectedConditions.frameToBeAvailableAndSwitchToIt(By.cssSelector("iframe#card")));
driver.findElement(By.name("cardnumber")).sendKeys("4111111111111111");
driver.switchTo().defaultContent();
driver.findElement(By.id("place-order")).click();
```

## How do you handle multiple windows and tabs?
@topic selenium

### 60s
Each window or tab has a unique handle. I store the current handle with getWindowHandle, perform the action that opens the new window, then loop through getWindowHandles and switch to the one that isn't the original. After working in it, I close it and switch back to the original handle. In Selenium 4, I can also open a new tab or window directly with driver.switchTo().newWindow(WindowType.TAB). I wait for the number of windows to become two before switching.

### Explain
- `getWindowHandle()` → current; `getWindowHandles()` → `Set<String>` of all.
- `switchTo().window(handle)` to move.
- `close()` closes the current one; you must switch back afterwards or the next command fails with `NoSuchWindowException`.
- `ExpectedConditions.numberOfWindowsToBe(2)` avoids timing issues.

### Example
Clicking "Terms" opens a new tab. Verify its title, close it, and continue checkout in the original tab.

### Code java | Switching windows
```java
String main = driver.getWindowHandle();
driver.findElement(By.linkText("Terms")).click();
new WebDriverWait(driver, Duration.ofSeconds(5))
    .until(ExpectedConditions.numberOfWindowsToBe(2));

for (String h : driver.getWindowHandles()) {
    if (!h.equals(main)) { driver.switchTo().window(h); break; }
}
Assert.assertTrue(driver.getTitle().contains("Terms"));
driver.close();
driver.switchTo().window(main);

// Selenium 4: open a new tab yourself
driver.switchTo().newWindow(WindowType.TAB);
```

## What is the Actions class? Give examples.
@topic selenium

### 60s
The Actions class handles advanced user interactions that a simple click or sendKeys can't, such as mouse hover, right-click, double-click, drag and drop, click-and-hold, and keyboard combinations like Ctrl+A or Shift+typing. I create new Actions with the driver, chain the steps, and call perform at the end. A common use is hovering over a menu to reveal a submenu and then clicking an item, or dragging a card from one column to another on a board.

### Explain
Methods: `moveToElement`, `contextClick`, `doubleClick`, `dragAndDrop`, `dragAndDropBy`, `clickAndHold`, `release`, `keyDown`, `keyUp`, `sendKeys`, `scrollToElement` (Selenium 4), `pause`.

Always end with `.perform()`; without it, nothing happens. `build()` is optional in Selenium 4.

If HTML5 drag and drop doesn't work with Actions (a known limitation in some apps), use JavaScript or the app's API.

### Example
Hover on "Electronics" in the nav bar, then click "Laptops" in the submenu.

### Code java | Common actions
```java
Actions actions = new Actions(driver);

actions.moveToElement(driver.findElement(By.linkText("Electronics")))
       .click(driver.findElement(By.linkText("Laptops")))
       .perform();

actions.contextClick(driver.findElement(By.id("file"))).perform();   // right-click
actions.doubleClick(driver.findElement(By.id("name"))).perform();
actions.dragAndDrop(driver.findElement(By.id("card-1")),
                    driver.findElement(By.id("done-column"))).perform();
actions.keyDown(Keys.CONTROL).sendKeys("a").keyUp(Keys.CONTROL).perform();
```

## When and how do you use JavascriptExecutor?
@topic selenium

### 60s
JavascriptExecutor lets Selenium run JavaScript directly in the browser. I use it when normal WebDriver commands can't do the job: scrolling to an element or to the bottom of a page, clicking an element hidden behind an overlay as a last resort, reading values not exposed in the DOM, setting a value on a read-only date field, or highlighting elements for debugging. I cast the driver to JavascriptExecutor and call executeScript. But I use it sparingly, because a JS click bypasses real user behaviour and can hide real bugs.

### Explain
- `executeScript(script, args...)` → arguments available as `arguments[0]` etc.
- `executeAsyncScript` for async code.
- Return values come back as Java objects (`Long`, `String`, `Boolean`, `WebElement`, `List`).

Use cases: `scrollIntoView`, `window.scrollTo`, `document.readyState`, `element.click()`, removing a sticky banner in test environments.

Warning: if a real user can't click the button because an overlay covers it, a JS click makes the test pass while the bug stays.

### Example
An infinite-scroll product list: scroll to the bottom repeatedly until no new items load, then count products.

### Code java | Common scripts
```java
JavascriptExecutor js = (JavascriptExecutor) driver;

WebElement footer = driver.findElement(By.id("footer"));
js.executeScript("arguments[0].scrollIntoView({block:'center'});", footer);
js.executeScript("window.scrollTo(0, document.body.scrollHeight);");

String state = (String) js.executeScript("return document.readyState;");
js.executeScript("arguments[0].value='2026-12-25';", driver.findElement(By.id("date")));
```

## How do you take a screenshot in Selenium?
@topic selenium

### 60s
I cast the driver to the TakesScreenshot interface and call getScreenshotAs, with OutputType FILE, BYTES or BASE64, then save the file with a meaningful name like the test name and a timestamp. Selenium 4 can also take a screenshot of a single element using element.getScreenshotAs. In a framework I don't call this in every test; I put it in a TestNG listener's onTestFailure method or an AfterMethod that checks the result, and attach it to the report like Extent or Allure.

### Explain
- `OutputType.FILE` → save to disk (use `Files.copy` or Apache Commons `FileUtils`).
- `OutputType.BASE64` → embed directly in HTML reports.
- `OutputType.BYTES` → attach to Allure.
- Full-page screenshots: Firefox supports `getFullPageScreenshotAs`; for Chrome use CDP or a library.

### Example
On failure, a listener saves `screenshots/checkoutTest_2026-11-06_10-15-02.png` and embeds it into the Extent report.

### Code java | Page, element, and on failure
```java
File src = ((TakesScreenshot) driver).getScreenshotAs(OutputType.FILE);
Files.copy(src.toPath(), Paths.get("screenshots", testName + ".png"),
           StandardCopyOption.REPLACE_EXISTING);

// Element screenshot (Selenium 4)
File logo = driver.findElement(By.id("logo")).getScreenshotAs(OutputType.FILE);

// In a listener
@Override
public void onTestFailure(ITestResult result) {
    String b64 = ((TakesScreenshot) driver).getScreenshotAs(OutputType.BASE64);
    ExtentManager.getTest().fail("Failed").addScreenCaptureFromBase64String(b64);
}
```

## What is StaleElementReferenceException and how do you fix it?
@topic selenium

### 60s
StaleElementReferenceException means the WebElement I'm holding no longer refers to an element in the current DOM, usually because the page refreshed, the element was re-rendered by JavaScript, or I navigated away and back. The reference is old, even if an identical element is now visible. The fix is to find the element again right before using it instead of storing it for a long time, wait for the refresh to finish with an explicit wait, or use a small retry for known re-rendering components.

### Explain
Common causes:
- AJAX updates a list or table and rebuilds the rows.
- React/Angular re-renders a component after state change.
- Page navigation or refresh.

Fixes:
1. Store `By` locators, not `WebElement`s, and locate just before acting.
2. Wait for staleness of the old element: `ExpectedConditions.stalenessOf(oldElement)`, then re-find.
3. Use `ExpectedConditions.refreshed(...)`.
4. Retry once or twice for genuinely dynamic widgets (not a cover for bad design).

PageFactory proxies re-find on each call, but cached `@CacheLookup` elements can go stale.

### Example
After applying a filter, the product grid reloads. Code that saved `List<WebElement> products` before filtering throws stale exceptions when reading their text.

### Code java | Re-locate after refresh
```java
WebElement firstRow = driver.findElement(By.cssSelector("table tr"));
driver.findElement(By.id("apply-filter")).click();

WebDriverWait wait = new WebDriverWait(driver, Duration.ofSeconds(10));
wait.until(ExpectedConditions.stalenessOf(firstRow));          // old DOM gone

List<WebElement> rows = driver.findElements(By.cssSelector("table tr")); // fresh
```

## How do you handle dynamic web tables?
@topic selenium

### 60s
For a dynamic table, where rows and columns change, I don't hard-code row numbers. I locate all rows with findElements, loop through them, read the cell I care about, and act on the matching row. Or I write an XPath that finds a row by a known cell value and then the target cell or button in that same row. To read a whole table, I can build a list of maps from header name to cell value, which makes assertions readable. For paginated tables, I loop through pages until I find the record.

### Explain
- Row count: `findElements(By.cssSelector("#orders tbody tr")).size()`
- Cell: `tr[i]/td[j]`, but find the column index from the header text, not a fixed number.
- Row by value: `//tr[td[normalize-space()='ORD-1024']]`
- Sorting check: read a column into a list, copy and sort it, and compare.

### Example
Verify the "Status" of order ORD-1024 is "Shipped", regardless of where it appears in the table.

### Code java | Table as a list of maps
```java
List<String> headers = driver.findElements(By.cssSelector("#orders thead th"))
    .stream().map(WebElement::getText).toList();

List<Map<String, String>> rows = new ArrayList<>();
for (WebElement tr : driver.findElements(By.cssSelector("#orders tbody tr"))) {
    List<WebElement> tds = tr.findElements(By.tagName("td"));
    Map<String, String> row = new HashMap<>();
    for (int i = 0; i < headers.size(); i++) row.put(headers.get(i), tds.get(i).getText());
    rows.add(row);
}

String status = rows.stream().filter(r -> r.get("Order").equals("ORD-1024"))
    .findFirst().orElseThrow().get("Status");
Assert.assertEquals(status, "Shipped");
```

## How do you upload and download files in Selenium?
@topic selenium

### 60s
For upload, if the page has an input of type file, I don't click the button or open the OS dialog, because Selenium can't control native dialogs. I just call sendKeys on the file input with the absolute file path. For download, I configure the browser options to save files automatically to a known folder without a prompt, trigger the download, then wait until the file appears and verify its name or content in Java. For remote runs on a Grid, I use a LocalFileDetector for uploads.

### Explain
- Upload: `input[type='file']` may be hidden; sendKeys still works on most sites. If it's fully hidden, make it visible with JS.
- Native OS dialogs need tools like AutoIt or Robot class, but avoid them; they're fragile and don't work headless.
- Download: Chrome prefs `download.default_directory`, `download.prompt_for_download=false`. Wait for the file, and ignore `.crdownload` temp files.
- On Grid: `((RemoteWebDriver) driver).setFileDetector(new LocalFileDetector())`.

### Example
Upload a profile photo, verify the preview appears; download an invoice PDF and assert the file exists and is non-empty.

### Code java | Upload and download
```java
// Upload
driver.findElement(By.cssSelector("input[type='file']"))
      .sendKeys(Paths.get("src/test/resources/photo.png").toAbsolutePath().toString());

// Download setup
String dir = Paths.get("target/downloads").toAbsolutePath().toString();
ChromeOptions options = new ChromeOptions();
options.setExperimentalOption("prefs", Map.of(
    "download.default_directory", dir,
    "download.prompt_for_download", false));
WebDriver driver = new ChromeDriver(options);

// After clicking download
File pdf = new File(dir, "invoice-1024.pdf");
new FluentWait<>(pdf).withTimeout(Duration.ofSeconds(20))
    .pollingEvery(Duration.ofMillis(500)).until(File::exists);
```

## What is the difference between getText() and getAttribute()?
@topic selenium

### 60s
getText returns the visible inner text of an element, the text a user sees on the screen, and returns empty for hidden elements. getAttribute returns the value of an HTML attribute or DOM property, like href, class, placeholder or value. A key point is input fields: the text typed into a textbox is not its inner text, so getText returns empty; I need getAttribute("value"), or in Selenium 4 getDomProperty("value"). For CSS styles like colour, I use getCssValue.

### Explain
- `getText()` → visible text, trimmed, includes child text.
- `getAttribute("x")` → in Selenium 4, returns the property if it exists, else the attribute.
- `getDomAttribute("x")` → the attribute as written in HTML.
- `getDomProperty("x")` → the live DOM property (e.g., current `value`, `checked`).
- `getCssValue("color")` → computed style, e.g., `rgba(220, 38, 38, 1)`.

### Example
Verify the email field keeps the typed value after a validation error: `getAttribute("value")` should equal "qa@x.com", while `getText()` returns "".

### Code java | Reading values
```java
WebElement email = driver.findElement(By.id("email"));
email.sendKeys("qa@x.com");

email.getText();                    // ""  (inputs have no inner text)
email.getAttribute("value");        // "qa@x.com"
email.getDomProperty("value");      // "qa@x.com"
email.getAttribute("placeholder");  // "Enter your email"

driver.findElement(By.cssSelector(".error")).getCssValue("color"); // "rgba(220, 38, 38, 1)"
```

## How do you run Selenium tests in headless mode and set browser options?
@topic selenium

### 60s
Headless mode runs the browser without a visible window, which is faster and needed on CI servers without a display. In Chrome I create ChromeOptions and add the argument "--headless=new", which is the modern headless mode that behaves like real Chrome. I also set a window size, like 1920 by 1080, because headless defaults to a small viewport that can change layouts. Other useful options are incognito, disabling notifications, setting download preferences, accepting insecure certificates and setting the page load strategy.

### Explain
- `--headless=new` (Chrome 109+) is close to headed Chrome; the old `--headless` had differences.
- Always set `--window-size=1920,1080` for consistent responsive layouts.
- `options.setAcceptInsecureCerts(true)` for self-signed test environments.
- `options.setPageLoadStrategy(PageLoadStrategy.EAGER)` to not wait for all images.
- Debug headless failures with screenshots and browser logs.

### Example
On GitHub Actions, tests run headless with `-Dheadless=true`; locally they run headed for debugging.

### Code java | Options driven by a system property
```java
ChromeOptions options = new ChromeOptions();
if (Boolean.parseBoolean(System.getProperty("headless", "false"))) {
    options.addArguments("--headless=new");
}
options.addArguments("--window-size=1920,1080", "--disable-notifications");
options.setAcceptInsecureCerts(true);
WebDriver driver = new ChromeDriver(options);
```

## What is the difference between driver.get() and driver.navigate().to()? What about close() and quit()?
@topic selenium

### 60s
driver.get opens a URL and waits for the page to load. driver.navigate().to does the same thing; it's essentially an alias, but the navigate interface also gives back, forward and refresh, which keep browser history. So functionally they're equivalent for opening a page. For closing, driver.close closes only the current window or tab, while driver.quit closes all windows and ends the WebDriver session, freeing the driver process. I always use quit in teardown to avoid leftover browser processes.

### Explain
- `get(url)` and `navigate().to(url)` both wait for `document.readyState` according to the page load strategy.
- `navigate().back()`, `.forward()`, `.refresh()`.
- After `close()` on the last window, the session may end; after `close()` on one of several windows, you must switch to another handle.
- Not calling `quit()` leaves zombie chromedriver processes on CI agents.

### Example
Test the browser back button after logout: log out, `navigate().back()`, and verify the dashboard isn't shown.

### Code java | Navigation
```java
driver.get("https://shop.example.com/login");
loginPage.login("qa@x.com", "Valid@123");
header.logout();

driver.navigate().back();
Assert.assertTrue(driver.getCurrentUrl().contains("/login"),
    "Back after logout should not show the dashboard");

driver.quit();
```

## How do you handle cookies and why would a tester use them?
@topic selenium

### 60s
Selenium can read, add and delete cookies through driver.manage(): getCookies, getCookieNamed, addCookie, deleteCookieNamed and deleteAllCookies. Testers use this to skip slow UI login by injecting a session cookie obtained from an API, to test behaviour when a cookie is missing or expired, to verify cookie attributes like Secure and HttpOnly, and to clear state between tests. To add a cookie, I first have to open a page on that domain, then add the cookie and refresh.

### Explain
- Cookie object: name, value, domain, path, expiry, secure, httpOnly, sameSite.
- Login via API → take the session token → `addCookie` → `refresh()`. This saves seconds per test.
- Security checks: session cookie should be `Secure`, `HttpOnly`, and have a sensible expiry.
- Consent banners: set the consent cookie up front so the banner doesn't block clicks.

### Example
A suite of 200 tests each logged in through the UI, costing 6 seconds per test. Injecting a session cookie from an API login cut 20 minutes from the run.

### Code java | Login with a cookie
```java
String token = AuthApi.loginAndGetSessionToken("qa@x.com", "Valid@123");

driver.get("https://shop.example.com");          // must be on the domain first
driver.manage().addCookie(new Cookie("SESSION", token));
driver.navigate().refresh();

Cookie c = driver.manage().getCookieNamed("SESSION");
Assert.assertTrue(c.isHttpOnly() && c.isSecure());
```

## What are isDisplayed(), isEnabled() and isSelected()?
@topic selenium

### 60s
They're boolean checks on a WebElement. isDisplayed returns true if the element is visible on the page, not hidden by CSS like display none. isEnabled returns true if the element can be interacted with, for example a button that isn't disabled. isSelected returns true if a checkbox, radio button or option is selected. Note that isDisplayed throws NoSuchElementException if the element isn't in the DOM at all, so to check that something is absent I use findElements and check the list is empty, or wait for invisibility.

### Explain
- Use with assertions: "Submit button is disabled until terms are accepted".
- `isDisplayed()` doesn't check if the element is scrolled into view or covered by another element.
- For absence: `wait.until(ExpectedConditions.invisibilityOfElementLocated(by))`.
- For checkboxes, click only if `!isSelected()` to make the step idempotent.

### Example
Sign-up form: the "Create account" button is disabled until the terms checkbox is ticked.

### Code java | State checks
```java
WebElement terms  = driver.findElement(By.id("terms"));
WebElement create = driver.findElement(By.id("create"));

Assert.assertFalse(create.isEnabled());
if (!terms.isSelected()) terms.click();
Assert.assertTrue(terms.isSelected());
Assert.assertTrue(create.isEnabled());

boolean errorGone = driver.findElements(By.cssSelector(".error")).isEmpty();
```

## What is FluentWait and how is it different from WebDriverWait?
@topic selenium

### 60s
FluentWait is a flexible explicit wait where I configure the maximum timeout, the polling interval, the exceptions to ignore while polling, and a custom message. WebDriverWait is actually a subclass of FluentWait with sensible defaults for WebDriver: it polls every 500 milliseconds and ignores NoSuchElementException. I use FluentWait when I need a different polling frequency, need to ignore extra exceptions like StaleElementReference, or want to wait on something that isn't the driver, like a file or an API response.

### Explain
- `withTimeout(Duration)`, `pollingEvery(Duration)`, `ignoring(Exception.class)`, `withMessage(...)`.
- `until(Function)` accepts any lambda, so you can write custom conditions: "wait until the cart count text is 3".
- WebDriverWait also supports `pollingEvery` and `ignoring` because it inherits from FluentWait.

### Example
A report generation status changes from "Processing" to "Ready" after up to 60 seconds. Poll every 2 seconds, ignore stale exceptions while the status badge re-renders.

### Code java | Custom FluentWait
```java
Wait<WebDriver> wait = new FluentWait<>(driver)
    .withTimeout(Duration.ofSeconds(60))
    .pollingEvery(Duration.ofSeconds(2))
    .ignoring(NoSuchElementException.class)
    .ignoring(StaleElementReferenceException.class)
    .withMessage("Report never became Ready");

wait.until(d -> d.findElement(By.id("report-status")).getText().equals("Ready"));
```

## What is ElementClickInterceptedException and how do you handle it?
@topic selenium

### 60s
ElementClickInterceptedException means Selenium tried to click an element, but another element would receive the click instead, because something is covering it: a loading spinner, a cookie banner, a sticky header or a modal overlay. The fix is to deal with the cause: wait for the overlay or spinner to become invisible, close the banner, or scroll the element into the centre of the view so the sticky header doesn't cover it. A JavaScript click works around it, but only as a last resort, because a real user couldn't click either.

### Explain
Fixes in order of preference:
1. `wait.until(invisibilityOfElementLocated(spinner))` then click.
2. Dismiss cookie/consent banners at test start (or set the consent cookie).
3. `scrollIntoView({block:'center'})` to avoid sticky headers.
4. `elementToBeClickable` wait (checks visible + enabled, but not "not covered").
5. JS click only if the overlay is a test-environment artefact.

Related: `ElementNotInteractableException` (element hidden or zero size).

### Example
After "Add to cart", a toast notification slides over the "Checkout" button for 3 seconds. Waiting for the toast to disappear fixes the flaky failure.

### Code java | Wait for the overlay first
```java
WebDriverWait wait = new WebDriverWait(driver, Duration.ofSeconds(10));
wait.until(ExpectedConditions.invisibilityOfElementLocated(By.cssSelector(".loading-overlay")));

WebElement checkout = driver.findElement(By.id("checkout"));
((JavascriptExecutor) driver).executeScript("arguments[0].scrollIntoView({block:'center'})", checkout);
wait.until(ExpectedConditions.elementToBeClickable(checkout)).click();
```

# Module: TestNG and JUnit

## What is TestNG? Explain its annotations and their execution order.
@topic framework

### 60s
TestNG is a Java testing framework, inspired by JUnit, widely used with Selenium. It gives annotations to structure tests, assertions, grouping, priorities, dependencies, data providers, parallel execution, listeners and HTML reports, all configurable through testng.xml. The annotation order is: BeforeSuite, BeforeTest, BeforeClass, BeforeMethod, then the Test, then AfterMethod, AfterClass, AfterTest and AfterSuite. BeforeMethod and AfterMethod run around every test method, which is where I usually start and quit the browser.

### Explain
| Annotation | Runs |
|---|---|
| @BeforeSuite / @AfterSuite | Once per suite (reports, DB connections) |
| @BeforeTest / @AfterTest | Once per `<test>` tag in testng.xml |
| @BeforeClass / @AfterClass | Once per class |
| @BeforeMethod / @AfterMethod | Before/after every @Test |
| @Test | The test |
| @DataProvider, @Parameters, @Listeners, @Factory | Supporting |

Note: `<test>` in testng.xml is a group of classes, not a single test method. That confuses many candidates.

### Example
BeforeSuite: start the Extent report. BeforeMethod: launch the browser and open the URL. AfterMethod: screenshot on failure, quit. AfterSuite: flush the report.

### Code java | Order demo
```java
public class OrderDemo {
    @BeforeSuite  void bs() { System.out.println("1 BeforeSuite"); }
    @BeforeTest   void bt() { System.out.println("2 BeforeTest"); }
    @BeforeClass  void bc() { System.out.println("3 BeforeClass"); }
    @BeforeMethod void bm() { System.out.println("4 BeforeMethod"); }
    @Test         void t1() { System.out.println("5 Test"); }
    @AfterMethod  void am() { System.out.println("6 AfterMethod"); }
    @AfterClass   void ac() { System.out.println("7 AfterClass"); }
    @AfterTest    void at() { System.out.println("8 AfterTest"); }
    @AfterSuite   void as() { System.out.println("9 AfterSuite"); }
}
```

## How do priority, dependsOnMethods, enabled and invocationCount work in TestNG?
@topic framework

### 60s
By default TestNG runs test methods in alphabetical order. The priority attribute changes that: lower numbers run first, and the default is zero. dependsOnMethods makes a test run only after another passes; if the dependency fails, the dependent test is skipped, not failed. enabled equals false skips a test without deleting it. invocationCount runs the same test multiple times, and timeOut fails a test that runs too long. I use dependencies sparingly, because independent tests are easier to run in parallel and debug.

### Explain
- `@Test(priority = 1)`; negative priorities are allowed.
- `@Test(dependsOnMethods = "login")`, `alwaysRun = true` to run even if the dependency fails.
- `dependsOnGroups` for group-level dependencies.
- `@Test(invocationCount = 5, threadPoolSize = 5)` for a quick concurrency check.
- `@Test(timeOut = 5000)` in ms.
- `expectedExceptions = ArithmeticException.class` for negative unit tests.

### Example
`createOrder` depends on `login`. If login breaks, 30 order tests show as skipped with the reason, instead of 30 confusing failures.

### Code java | Attributes
```java
@Test(priority = 1)
public void login() { /* ... */ }

@Test(priority = 2, dependsOnMethods = "login")
public void createOrder() { /* ... */ }

@Test(enabled = false, description = "Blocked by BUG-221")
public void refundFlow() { }

@Test(invocationCount = 3, timeOut = 10000)
public void searchIsStable() { }
```

## How do you use DataProvider for data-driven testing in TestNG?
@topic framework

### 60s
A DataProvider is a method annotated with at-DataProvider that returns test data, usually as a two-dimensional Object array or an Iterator of Object arrays. The test method references it by name with dataProvider equals "name", and TestNG runs the test once per row, passing the values as parameters. The data can be hard-coded or read from Excel, CSV, JSON or a database. Setting parallel equals true on the DataProvider runs rows in parallel. It's the standard way to test many input combinations with one test method.

### Explain
- Return type: `Object[][]` or `Iterator<Object[]>` (lazy, good for big files).
- `@DataProvider(name = "logins", parallel = true)`.
- Put providers in a separate class and use `dataProviderClass = LoginData.class`.
- Each row appears as a separate result in the report; include an identifying value so failures are clear.

### Example
Test login with five credential combinations from `logins.json`, each expecting a different message.

### Code java | DataProvider
```java
public class LoginData {
    @DataProvider(name = "logins")
    public static Object[][] logins() {
        return new Object[][] {
            {"valid@x.com",   "Valid@123", "Welcome"},
            {"valid@x.com",   "wrong",     "Invalid email or password"},
            {"",              "Valid@123", "Email is required"},
            {"not-an-email",  "Valid@123", "Enter a valid email"},
        };
    }
}

@Test(dataProvider = "logins", dataProviderClass = LoginData.class)
public void login(String email, String pwd, String expectedMessage) {
    loginPage.login(email, pwd);
    Assert.assertEquals(loginPage.message(), expectedMessage);
}
```

## What is testng.xml and how do you run tests in parallel?
@topic framework

### 60s
testng.xml is the configuration file that defines what to run and how: the suite, test blocks, classes, packages, methods, groups to include or exclude, parameters and listeners. For parallel execution I set the parallel attribute on the suite or test to methods, classes, tests or instances, and set thread-count. For parallel Selenium tests to be safe, each thread needs its own WebDriver, which is why frameworks store the driver in a ThreadLocal, and tests must not share data.

### Explain
- `parallel="methods"`: each @Test in its own thread (fastest, needs most isolation).
- `parallel="classes"`: each class in a thread; methods within a class run sequentially.
- `parallel="tests"`: each `<test>` block in a thread, handy for cross-browser (one block per browser).
- Run from Maven with the Surefire plugin pointing to the suite file.

### Example
Cross-browser suite: two `<test>` blocks, Chrome and Firefox, run in parallel with a `browser` parameter.

### Code xml | testng.xml
```xml
<!DOCTYPE suite SYSTEM "https://testng.org/testng-1.0.dtd">
<suite name="Regression" parallel="tests" thread-count="2">
  <listeners>
    <listener class-name="com.acme.listeners.TestListener"/>
  </listeners>
  <test name="Chrome">
    <parameter name="browser" value="chrome"/>
    <groups><run><include name="regression"/></run></groups>
    <packages><package name="com.acme.tests"/></packages>
  </test>
  <test name="Firefox">
    <parameter name="browser" value="firefox"/>
    <packages><package name="com.acme.tests"/></packages>
  </test>
</suite>
```

## What is the difference between hard assert and soft assert?
@topic framework

### 60s
A hard assert, like Assert.assertEquals in TestNG, stops the test immediately when it fails, and the remaining steps don't run. A soft assert, using the SoftAssert class, records failures and lets the test continue, then reports all failures together when I call assertAll at the end. I use hard asserts when the next steps depend on the check, like successful login. I use soft asserts to verify many independent fields on one page, like all the labels of a profile screen, so I see every mismatch in one run.

### Explain
- Forgetting `softAssert.assertAll()` means the test passes even with failures. This is the classic mistake.
- Create a new `SoftAssert` per test method; sharing one across tests mixes results.
- JUnit 5 equivalent: `assertAll(...)` with lambdas. AssertJ: `SoftAssertions`.

### Example
Order confirmation page: check order ID format, amount, address, delivery date and payment method. A soft assert reports "amount and delivery date wrong" in one go.

### Code java | Hard vs soft
```java
@Test
public void orderConfirmation() {
    Assert.assertTrue(confirmPage.isLoaded());          // hard: no point continuing

    SoftAssert soft = new SoftAssert();
    soft.assertEquals(confirmPage.amount(), "₹1,299");
    soft.assertEquals(confirmPage.paymentMethod(), "UPI");
    soft.assertTrue(confirmPage.orderId().matches("ORD-\\d{6}"));
    soft.assertAll();                                   // reports all failures
}
```

## What are TestNG listeners? How have you used them?
@topic framework

### 60s
Listeners are interfaces that let me hook into TestNG events and run code automatically, without putting it in every test. The most common is ITestListener, with methods like onTestStart, onTestSuccess, onTestFailure and onTestSkipped. I've used it to take a screenshot and attach it to the Extent or Allure report when a test fails, and to log start and end of each test. Other listeners include ISuiteListener, IRetryAnalyzer for retrying failed tests and IAnnotationTransformer to change annotations at runtime. They're registered in testng.xml or with the Listeners annotation.

### Explain
- `ITestListener`: test-level events.
- `ISuiteListener`: before/after suite (start/flush reports).
- `IReporter`: custom reports after the run.
- `IAnnotationTransformer`: e.g., attach a retry analyzer to every test globally.
- `IInvokedMethodListener`: before/after every invoked method (including config methods).

Register globally in testng.xml so new tests get the behaviour automatically.

### Example
Our `TestListener` creates an Extent test node on start, logs pass/fail, attaches a Base64 screenshot and browser console logs on failure.

### Code java | Listener
```java
public class TestListener implements ITestListener {
    @Override public void onTestStart(ITestResult r) {
        ExtentManager.start(r.getMethod().getMethodName());
    }
    @Override public void onTestFailure(ITestResult r) {
        String shot = ((TakesScreenshot) DriverManager.get()).getScreenshotAs(OutputType.BASE64);
        ExtentManager.get().fail(r.getThrowable()).addScreenCaptureFromBase64String(shot);
    }
    @Override public void onTestSuccess(ITestResult r) { ExtentManager.get().pass("Passed"); }
}
```

## How do you retry failed tests in TestNG? Is it a good idea?
@topic framework

### 60s
I implement the IRetryAnalyzer interface, whose retry method returns true while the retry count is below a limit, usually one or two. I attach it per test with retryAnalyzer equals MyRetry.class, or globally with an IAnnotationTransformer listener. Retries help reduce noise from genuine environment blips in CI. But they're risky: they can hide real flaky bugs, like race conditions in the app. So I log every retry, track which tests needed one, and fix the root cause instead of letting retries become permanent.

### Explain
Good practice:
- Max 1–2 retries.
- Report retried tests separately ("passed on retry") and review them weekly.
- Never retry to pass assertions on business logic.
- Fix flaky causes: bad waits, test data collisions, shared state, environment instability.

### Example
A nightly suite had 15 random failures due to a slow staging environment. A single retry reduced noise to 2, and a weekly report of retried tests revealed one real race condition in the cart service.

### Code java | Retry analyzer applied globally
```java
public class Retry implements IRetryAnalyzer {
    private int count = 0;
    private static final int MAX = 1;
    @Override public boolean retry(ITestResult result) {
        if (count < MAX) { count++; return true; }
        return false;
    }
}

public class RetryTransformer implements IAnnotationTransformer {
    @Override
    public void transform(ITestAnnotation a, Class c, Constructor k, Method m) {
        a.setRetryAnalyzer(Retry.class);
    }
}
```

## What is the difference between TestNG and JUnit 5?
@topic framework

### 60s
Both are Java test frameworks with similar core features today. TestNG was built for broader testing, so it has groups, priorities, method dependencies, data providers, suite-level XML configuration and built-in parallel execution, which made it popular with Selenium. JUnit 5 is modular, with the Jupiter API, and is the default in the Spring and unit-testing world. It has parameterised tests, tags, nested tests, extensions and parallel execution through configuration. Either works for automation; I'd follow what the team and stack already use.

### Explain
| Feature | TestNG | JUnit 5 |
|---|---|---|
| Setup | @BeforeMethod / @BeforeClass | @BeforeEach / @BeforeAll |
| Grouping | groups | @Tag |
| Data-driven | @DataProvider | @ParameterizedTest + @CsvSource / @MethodSource |
| Dependencies | dependsOnMethods | Not supported (by design) |
| Suite config | testng.xml | @Suite / build tool config |
| Extensions | Listeners | Extension model |
| Parallel | XML attribute | junit-platform.properties |

### Example
A backend team uses JUnit 5 for unit tests; the QA team's Selenium framework uses TestNG for XML-driven suites and groups. Both run in the same Maven build.

### Code java | Same test in JUnit 5
```java
@ParameterizedTest
@CsvSource({"valid@x.com,Valid@123,Welcome", "valid@x.com,wrong,Invalid email or password"})
void login(String email, String pwd, String expected) {
    loginPage.login(email, pwd);
    assertEquals(expected, loginPage.message());
}
```

# Module: Page Object Model and framework basics

## What is the Page Object Model (POM) and why use it?
@topic framework

### 60s
Page Object Model is a design pattern where each page or component of the application is represented by a class. The class holds the locators and exposes methods for the actions a user can take on that page, like login or searchProduct. Tests call these methods instead of using locators directly. The benefits are maintainability, because when a locator changes I update it in one place; reusability across many tests; and readability, because tests read like user steps. Assertions usually stay in the test, not the page class.

### Explain
Principles:
- One class per page or reusable component (header, cart drawer).
- Locators are private.
- Methods represent user intent and return the next page object when navigation happens.
- No assertions in page objects (keep them in tests), though small "isLoaded" checks are fine.
- Common helpers go in a `BasePage`.

### Example
The login button's ID changed from `loginBtn` to `sign-in`. With POM, one line changed in `LoginPage`; 80 tests kept working.

### Code java | Page object and test
```java
public class LoginPage extends BasePage {
    private final By email = By.id("email");
    private final By password = By.id("password");
    private final By submit = By.cssSelector("[data-testid='sign-in']");

    public LoginPage(WebDriver driver) { super(driver); }

    public HomePage loginAs(String user, String pwd) {
        type(email, user);
        type(password, pwd);
        click(submit);
        return new HomePage(driver);
    }
}

@Test
public void userCanLogin() {
    HomePage home = new LoginPage(driver).loginAs("qa@x.com", "Valid@123");
    Assert.assertEquals(home.greeting(), "Hi, QA");
}
```

## What is PageFactory and @FindBy? Is it still recommended?
@topic framework

### 60s
PageFactory is a Selenium helper that initialises page object fields annotated with at-FindBy. I declare WebElement fields with locators in annotations, call PageFactory.initElements with the driver and the page, and Selenium creates lazy proxies that find the element each time it's used. It reduces boilerplate. However, the Selenium team no longer recommends it, mainly because the proxies can hide timing issues and it doesn't play well with explicit waits. Many modern frameworks use By locators with helper methods instead. I can work with either.

### Explain
- `@FindBy(id="email")`, `@FindBy(css=...)`, `@FindBys` (AND), `@FindAll` (OR).
- `@CacheLookup` caches the element, which is faster but goes stale after re-renders.
- `AjaxElementLocatorFactory` adds an implicit-wait-like behaviour.
- With `By` fields, you can easily wait: `wait.until(visibilityOfElementLocated(by))`.

### Example
An older framework uses PageFactory heavily. New pages are written with `By` locators and a `BasePage.waitAndClick(By)` helper, which reduced flaky failures.

### Code java | PageFactory style
```java
public class SearchPage {
    @FindBy(name = "q")           private WebElement searchBox;
    @FindBy(css = ".result-title") private List<WebElement> results;

    public SearchPage(WebDriver driver) {
        PageFactory.initElements(driver, this);
    }

    public int search(String term) {
        searchBox.sendKeys(term, Keys.ENTER);
        return results.size();
    }
}
```

## How do you design BaseTest and BasePage classes?
@topic framework

### 60s
BaseTest holds the test lifecycle that every test class shares: reading configuration, creating the WebDriver for the chosen browser, opening the base URL in BeforeMethod, and quitting the driver in AfterMethod, often with a screenshot on failure. Test classes extend it. BasePage holds reusable, wait-aware helpers that every page object needs, like click, type, getText, waitForVisible and scroll, plus the driver and a WebDriverWait. Page classes extend it. This removes duplication and puts waits in one place, which reduces flakiness.

### Explain
BaseTest responsibilities:
- Load config (env, browser, URLs, timeouts).
- Create driver via a `DriverFactory`, store in `ThreadLocal`.
- Teardown always runs (`alwaysRun = true`).

BasePage responsibilities:
- Constructor takes the driver.
- Helpers with explicit waits built in.
- Common components (header, footer) can be separate classes used by pages.

Avoid putting test data or assertions in base classes.

### Example
Every click in the framework goes through `BasePage.click(By)`, which waits for clickability and scrolls into view. One change there fixed intermittent "element not clickable" failures across 120 tests.

### Code java | Base classes
```java
public abstract class BaseTest {
    @Parameters("browser")
    @BeforeMethod(alwaysRun = true)
    public void setUp(@Optional("chrome") String browser) {
        DriverManager.set(DriverFactory.create(browser));
        DriverManager.get().get(Config.get("baseUrl"));
    }
    @AfterMethod(alwaysRun = true)
    public void tearDown() { DriverManager.quit(); }
}

public abstract class BasePage {
    protected final WebDriver driver;
    protected final WebDriverWait wait;
    protected BasePage(WebDriver driver) {
        this.driver = driver;
        this.wait = new WebDriverWait(driver, Duration.ofSeconds(Config.timeout()));
    }
    protected void click(By by) { wait.until(ExpectedConditions.elementToBeClickable(by)).click(); }
    protected void type(By by, String text) {
        WebElement el = wait.until(ExpectedConditions.visibilityOfElementLocated(by));
        el.clear(); el.sendKeys(text);
    }
}
```

## What is Maven? Explain pom.xml and the Maven lifecycle.
@topic framework

### 60s
Maven is a build and dependency management tool for Java. pom.xml is its configuration file: it lists the project's coordinates, dependencies like Selenium, TestNG and REST Assured with versions, and plugins like Surefire to run tests. Maven downloads the dependencies from Maven Central automatically. The default lifecycle phases include validate, compile, test, package, verify, install and deploy, and running a phase runs all phases before it. So mvn test compiles and runs the tests, which is how CI runs our suite.

### Explain
- Coordinates: `groupId`, `artifactId`, `version`.
- `<dependencies>` with `<scope>test</scope>` for test-only libraries.
- `maven-surefire-plugin` runs tests; configure `suiteXmlFiles` for testng.xml.
- Pass parameters: `mvn test -Dbrowser=firefox -Denv=qa`.
- `mvn clean` deletes `target/`.
- Gradle is the main alternative.

### Example
CI runs `mvn clean test -DsuiteXmlFile=regression.xml -Dheadless=true` on every merge to main.

### Code xml | Key parts of pom.xml
```xml
<dependencies>
  <dependency>
    <groupId>org.seleniumhq.selenium</groupId>
    <artifactId>selenium-java</artifactId>
    <version>4.25.0</version>
  </dependency>
  <dependency>
    <groupId>org.testng</groupId>
    <artifactId>testng</artifactId>
    <version>7.10.2</version>
    <scope>test</scope>
  </dependency>
</dependencies>
<build>
  <plugins>
    <plugin>
      <groupId>org.apache.maven.plugins</groupId>
      <artifactId>maven-surefire-plugin</artifactId>
      <version>3.5.1</version>
      <configuration>
        <suiteXmlFiles><suiteXmlFile>${suiteXmlFile}</suiteXmlFile></suiteXmlFiles>
      </configuration>
    </plugin>
  </plugins>
</build>
```

## How do you manage configuration and environments in a framework?
@topic framework

### 60s
I keep configuration out of the code in properties, YAML or JSON files, one per environment, like qa, staging and prod, holding base URLs, API endpoints, timeouts and browser defaults. A config reader loads the right file based on a system property or environment variable, like -Denv=qa, and lets command-line values override file values. Secrets like passwords and API keys never go in the repo; they come from environment variables or a secrets manager in CI. This lets the same tests run anywhere without code changes.

### Explain
Priority order (highest first): command-line `-D` → environment variable → env file → default file.

Good practices:
- `config/qa.properties`, `config/staging.properties`.
- Singleton config class, loaded once.
- Secrets from CI secrets (GitHub Actions secrets, Jenkins credentials, Vault).
- Fail fast with a clear message if a required key is missing.

### Example
`mvn test -Denv=staging -Dbrowser=firefox` runs the same suite against staging in Firefox; the password comes from `TEST_USER_PASSWORD` set in the pipeline.

### Code java | Config reader
```java
public final class Config {
    private static final Properties props = new Properties();
    static {
        String env = System.getProperty("env", "qa");
        try (InputStream in = Config.class.getResourceAsStream("/config/" + env + ".properties")) {
            props.load(in);
        } catch (Exception e) {
            throw new IllegalStateException("Missing config for env " + env, e);
        }
    }
    public static String get(String key) {
        return System.getProperty(key,
               Optional.ofNullable(System.getenv(key.toUpperCase().replace('.', '_')))
                       .orElse(props.getProperty(key)));
    }
}
```

## How do you read test data from Excel or JSON?
@topic framework

### 60s
For Excel, I use Apache POI: open the workbook with XSSFWorkbook, get the sheet, loop through rows and cells, and convert the values to strings with DataFormatter so numbers and dates read correctly. I usually return the data as an Object array for a TestNG DataProvider, or as a list of maps keyed by the header row. For JSON, I use Jackson or Gson to map the file straight into Java objects, which is cleaner and version-control friendly. Many teams now prefer JSON or CSV over Excel for that reason.

### Explain
- Excel: business-friendly, but binary files make code review and merges hard.
- JSON/YAML: diff-friendly, maps to POJOs, good for nested data.
- CSV: simple tabular data, works with JUnit `@CsvFileSource`.
- Close workbooks (try-with-resources) to avoid file locks.
- Use `DataFormatter` to avoid "123.0" for numbers.

### Example
Login test data lives in `testdata/users.json` as a list of `{email, password, expectedMessage}` objects mapped to a `LoginCase` record.

### Code java | Excel and JSON readers
```java
// Excel -> Object[][]
public static Object[][] readSheet(String path, String sheetName) throws IOException {
    try (Workbook wb = new XSSFWorkbook(new FileInputStream(path))) {
        Sheet sheet = wb.getSheet(sheetName);
        DataFormatter f = new DataFormatter();
        int rows = sheet.getLastRowNum(), cols = sheet.getRow(0).getLastCellNum();
        Object[][] data = new Object[rows][cols];
        for (int r = 1; r <= rows; r++)
            for (int c = 0; c < cols; c++)
                data[r - 1][c] = f.formatCellValue(sheet.getRow(r).getCell(c));
        return data;
    }
}

// JSON -> objects (Jackson)
record LoginCase(String email, String password, String expectedMessage) {}
List<LoginCase> cases = new ObjectMapper()
    .readValue(new File("testdata/users.json"), new TypeReference<>() {});
```

# Module: API testing basics

## What is an API and what is REST?
@topic api

### 60s
An API, Application Programming Interface, is a contract that lets two software systems talk to each other. For example, a mobile app calls the backend's API to get products. REST is an architectural style for web APIs that uses HTTP: resources are identified by URLs, like /users/42, and we act on them with HTTP methods like GET, POST, PUT, PATCH and DELETE. REST APIs are stateless, so each request carries everything needed, and they usually exchange JSON. API testing checks this layer directly, without the UI.

### Explain
REST constraints: client-server, stateless, cacheable, uniform interface, layered system.

Why test at the API layer:
- Faster and more stable than UI tests.
- Finds business-logic bugs earlier, before the UI exists.
- Covers cases the UI prevents (invalid values, missing fields, unauthorised calls).

Other styles: SOAP (XML, WSDL, strict contract), GraphQL (single endpoint, client chooses fields), gRPC (binary, Protocol Buffers).

### Example
`GET https://api.shop.com/v1/products/101` returns `{"id":101,"name":"Blue Shirt","price":999}`. The web app and the mobile app both call this same API.

### Code bash | A REST call with curl
```bash
curl -s https://api.shop.com/v1/products/101 \
  -H "Accept: application/json" \
  -H "Authorization: Bearer $TOKEN"
# {"id":101,"name":"Blue Shirt","price":999,"inStock":true}
```

## Explain the HTTP methods. What is the difference between PUT, PATCH and POST?
@topic api

### 60s
GET reads a resource and shouldn't change anything. POST creates a new resource, or triggers an action, and calling it twice usually creates two records. PUT replaces a resource completely with the data I send, so missing fields may be cleared; it's idempotent, so calling it twice has the same result as once. PATCH partially updates only the fields I send. DELETE removes a resource. HEAD is like GET without the body, and OPTIONS shows allowed methods, used for CORS preflight.

### Explain
| Method | Purpose | Idempotent | Safe | Typical success |
|---|---|---|---|---|
| GET | Read | Yes | Yes | 200 |
| POST | Create / action | No | No | 201 |
| PUT | Replace | Yes | No | 200 / 204 |
| PATCH | Partial update | Not guaranteed | No | 200 |
| DELETE | Remove | Yes | No | 204 / 200 |

Idempotent means repeating the same request leaves the server in the same state. Test it: send PUT twice and verify one record; send DELETE twice and verify the second returns 404 or 204 without errors.

### Example
User `{name:"Asha", city:"Pune"}`. `PATCH {city:"Mumbai"}` → name stays Asha. `PUT {city:"Mumbai"}` → name may become null, because PUT replaces the whole object.

### Code bash | Same resource, different methods
```bash
curl -X POST   /users     -d '{"name":"Asha","city":"Pune"}'   # 201, id=42
curl -X GET    /users/42                                       # 200
curl -X PATCH  /users/42  -d '{"city":"Mumbai"}'               # 200, name kept
curl -X PUT    /users/42  -d '{"name":"Asha","city":"Delhi"}'  # 200, full replace
curl -X DELETE /users/42                                       # 204
```

## What are the common HTTP status codes?
@topic api

### 60s
Status codes are grouped by their first digit. 2xx means success: 200 OK, 201 Created, 204 No Content. 3xx is redirection, like 301 Moved Permanently and 304 Not Modified. 4xx means the client made a mistake: 400 Bad Request, 401 Unauthorized meaning not authenticated, 403 Forbidden meaning authenticated but not allowed, 404 Not Found, 409 Conflict, 422 Unprocessable Entity for validation errors, and 429 Too Many Requests. 5xx means a server error: 500 Internal Server Error, 502 Bad Gateway, 503 Service Unavailable and 504 Gateway Timeout.

### Explain
Testing tips:
- A 500 for invalid input is a bug; it should be a 4xx with a clear error message.
- 401 vs 403: missing/invalid token → 401; valid token, wrong role → 403.
- POST that creates should return 201 and often a `Location` header.
- Check the body too, not just the code. Some APIs wrongly return 200 with `{"error": ...}`.

### Example
Creating a user with an email that already exists should return 409 Conflict with a message like "Email already registered", not 500.

### Code java | Asserting status codes (REST Assured)
```java
given().contentType("application/json")
       .body("{\"email\":\"existing@x.com\",\"name\":\"Asha\"}")
.when().post("/users")
.then().statusCode(409)
       .body("message", equalTo("Email already registered"));

given().when().get("/admin/users")      // no token
.then().statusCode(401);
```

## What are the parts of an HTTP request and response? Path vs query parameters?
@topic api

### 60s
A request has a method, a URL, headers and an optional body. The URL can contain path parameters, which identify a specific resource, like the 42 in /users/42, and query parameters after the question mark, which filter, sort or paginate, like ?status=active&page=2. Headers carry metadata such as Content-Type, Accept and Authorization. The body carries data, usually JSON, for POST, PUT and PATCH. A response has a status code, headers like Content-Type and Set-Cookie, and a body with the data or error.

### Explain
- **Path param:** required, identifies the resource: `/orders/{orderId}`.
- **Query param:** optional, modifies the result: `/orders?status=shipped&sort=-date&limit=20`.
- **Headers:** `Content-Type: application/json`, `Accept`, `Authorization: Bearer ...`, `X-Request-Id`, caching headers.
- **Body formats:** JSON, XML, form-data (file uploads), x-www-form-urlencoded.
- **Response time** is also worth asserting.

### Example
`GET /users/42/orders?status=delivered&page=1` → user 42 (path), only delivered orders, first page (query).

### Code java | Path and query params in REST Assured
```java
given()
    .baseUri("https://api.shop.com")
    .header("Authorization", "Bearer " + token)
    .pathParam("userId", 42)
    .queryParam("status", "delivered")
    .queryParam("page", 1)
.when()
    .get("/users/{userId}/orders")
.then()
    .statusCode(200)
    .header("Content-Type", containsString("application/json"))
    .time(lessThan(2000L));
```

## How do you test APIs using Postman?
@topic api

### 60s
In Postman I organise requests into collections, use environments with variables like baseUrl and token so the same collection runs on QA or staging, and write tests in the Tests tab using JavaScript with pm.test and pm.expect to check status code, response time, body values and schema. I chain requests by saving values from one response into variables, like an auth token or a created ID, and using them in the next request. I run collections with the Collection Runner, or in CI with Newman, the command-line runner.

### Explain
Key features:
- **Collections and folders** for structure.
- **Environments and variables**: `{{baseUrl}}`, `{{token}}`; scopes: global, collection, environment, local.
- **Pre-request scripts**: generate data, timestamps, signatures.
- **Tests**: `pm.response.to.have.status(201)`, JSON value checks, schema validation.
- **Data files**: CSV/JSON for data-driven runs.
- **Newman** in CI with HTML reporters.

### Example
Collection "Orders": Login (save token) → Create order (save orderId) → Get order (assert status "PLACED") → Cancel order → Get order (assert "CANCELLED").

### Code javascript | Postman test script
```javascript
pm.test("Order created", () => {
  pm.response.to.have.status(201);
  const body = pm.response.json();
  pm.expect(body.status).to.eql("PLACED");
  pm.expect(body.total).to.be.above(0);
  pm.environment.set("orderId", body.id);   // chain to next request
});

pm.test("Responds within 1s", () => {
  pm.expect(pm.response.responseTime).to.be.below(1000);
});

// CI: newman run orders.postman_collection.json -e qa.postman_environment.json
```

## What should you test in an API?
@topic api

### 60s
I test functionality, meaning correct status codes and response data for valid requests; validation, meaning missing, invalid, extra or wrong-type fields return proper 4xx errors; the response schema and data types; business rules, like you can't cancel a shipped order; authentication and authorisation, so no token gives 401 and wrong role gives 403; boundary values; headers; idempotency; pagination, sorting and filtering; error message quality; response time; and data persistence, by calling GET after POST or checking the database.

### Explain
Checklist:
- **Positive:** happy path for each endpoint.
- **Negative:** missing required fields, wrong types, nulls, empty strings, too long, invalid enums, malformed JSON.
- **Security:** auth, role checks, IDOR (user A accessing user B's order by changing ID), injection, sensitive data not leaked in responses.
- **Contract:** schema, field names, types.
- **State:** CRUD flow consistency.
- **Non-functional:** response time, rate limiting (429).

### Example
For `POST /orders`: valid order → 201; quantity 0 → 400; product out of stock → 409; another user's cart ID → 403; then `GET /orders/{id}` returns the same data.

### Code java | A few of those checks
```java
// IDOR: user A must not read user B's order
given().auth().oauth2(tokenUserA)
.when().get("/orders/{id}", orderOfUserB)
.then().statusCode(anyOf(is(403), is(404)));

// Validation
given().auth().oauth2(tokenUserA).contentType(JSON)
       .body(Map.of("productId", 101, "quantity", 0))
.when().post("/orders")
.then().statusCode(400).body("errors[0].field", equalTo("quantity"));
```

## What are the common API authentication methods?
@topic api

### 60s
The common ones are: Basic authentication, where a base64-encoded username and password go in the Authorization header, which must only be used over HTTPS. API keys, a static key sent in a header or query parameter, common for server-to-server calls. Bearer tokens, usually JWTs, obtained after login and sent as Authorization: Bearer token. And OAuth 2.0, a framework where an authorisation server issues access tokens, with flows like client credentials for services and authorisation code with PKCE for user apps. As a tester I check valid, missing, expired and tampered credentials.

### Explain
- **Authentication** = who you are. **Authorisation** = what you're allowed to do.
- **JWT** has header.payload.signature; payload contains claims like `sub`, `role`, `exp`. Never trust a JWT without verifying its signature on the server.
- Test cases: no token (401), malformed token (401), expired token (401), valid token wrong role (403), token for a different tenant, refresh token flow, logout invalidates token.

### Example
Automation gets a token once per suite with the OAuth client-credentials flow, caches it, and refreshes it when it's about to expire.

### Code java | Auth styles in REST Assured
```java
given().auth().preemptive().basic("user", "pass");            // Basic
given().header("x-api-key", System.getenv("API_KEY"));        // API key
given().auth().oauth2(token);                                 // Bearer

// OAuth2 client credentials
String token = given()
    .formParam("grant_type", "client_credentials")
    .formParam("client_id", System.getenv("CLIENT_ID"))
    .formParam("client_secret", System.getenv("CLIENT_SECRET"))
.when().post("https://auth.example.com/oauth/token")
.then().statusCode(200).extract().path("access_token");
```

## What is JSON? How is it different from XML?
@topic api

### 60s
JSON, JavaScript Object Notation, is a lightweight text format for data, made of key-value objects in curly braces and arrays in square brackets, with types for strings, numbers, booleans and null. XML is a markup format with opening and closing tags, attributes and namespaces, and it's more verbose. JSON is the standard for REST APIs because it's smaller and maps easily to code objects. XML is still common in SOAP services and older enterprise systems, and it has strong schema validation through XSD.

### Explain
| | JSON | XML |
|---|---|---|
| Syntax | `{"name":"Asha"}` | `<name>Asha</name>` |
| Size | Smaller | Larger |
| Types | string, number, boolean, null, array, object | All text (types via schema) |
| Arrays | Native | Repeated elements |
| Schema | JSON Schema | XSD |
| Query | JSONPath | XPath |

Testers must read nested JSON fluently: `data.items[0].price`.

### Example
The same order in both formats; the JSON is about 40% smaller.

### Code json | JSON vs XML
```json
{
  "orderId": "ORD-1024",
  "paid": true,
  "items": [
    { "sku": "TSHIRT-M", "qty": 2, "price": 499.0 }
  ]
}
```

## What is the difference between SOAP and REST?
@topic api

### 60s
SOAP is a protocol with strict rules: messages are always XML wrapped in an envelope, the contract is defined in a WSDL file, and it has built-in standards for security and transactions, like WS-Security. It usually uses POST to a single endpoint. REST is an architectural style, not a protocol: it uses standard HTTP methods on resource URLs, supports JSON and other formats, is lighter and easier to cache. SOAP is still used in banking and legacy enterprise systems; REST dominates modern web and mobile APIs.

### Explain
| | SOAP | REST |
|---|---|---|
| Type | Protocol | Architectural style |
| Format | XML only | JSON, XML, others |
| Contract | WSDL (strict) | OpenAPI (optional) |
| Transport | HTTP, SMTP, etc. | HTTP |
| Errors | SOAP Fault | HTTP status codes |
| Tools | SoapUI, ReadyAPI | Postman, REST Assured |

### Example
A bank's core system exposes `GetAccountBalance` via SOAP; its mobile app talks to a REST gateway that calls the SOAP service internally.

### Code xml | SOAP request
```xml
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
                  xmlns:acc="http://bank.example.com/account">
  <soapenv:Header/>
  <soapenv:Body>
    <acc:GetAccountBalance>
      <acc:accountNumber>1234567890</acc:accountNumber>
    </acc:GetAccountBalance>
  </soapenv:Body>
</soapenv:Envelope>
```

# Module: SQL for everyday QA

## What is the difference between UNION and UNION ALL?
@topic sql

### 60s
Both combine the result sets of two or more SELECT queries with the same number of columns and compatible types. UNION removes duplicate rows from the combined result, which needs an extra sort or hash step, so it's slower. UNION ALL keeps all rows, including duplicates, and is faster. I use UNION ALL by default when I know there are no duplicates or I want to count everything, and UNION when I need a distinct list. Column names come from the first query.

### Explain
- Number and order of columns must match.
- ORDER BY goes at the end and applies to the whole result.
- Difference from JOIN: UNION stacks rows vertically; JOIN combines columns horizontally.

Testing use: comparing two tables after a migration with `EXCEPT` / `MINUS` (rows in A not in B), or listing emails from both customers and leads.

### Example
Customers table has 1,000 emails, leads has 500; 100 are in both. UNION → 1,400 rows. UNION ALL → 1,500 rows.

### Code sql | UNION vs UNION ALL, plus a migration check
```sql
SELECT email FROM customers
UNION
SELECT email FROM leads;            -- distinct emails

SELECT email FROM customers
UNION ALL
SELECT email FROM leads;            -- everything

-- Rows in old table missing from new table (PostgreSQL)
SELECT id, email FROM users_old
EXCEPT
SELECT id, email FROM users_new;
```

## What is a subquery? When would you use it instead of a join?
@topic sql

### 60s
A subquery is a query nested inside another query, in the WHERE, FROM or SELECT clause. It can return a single value, a list or a table. A correlated subquery refers to the outer query and runs once per outer row. I use a subquery when I need a computed value to filter by, like employees earning above the average salary, or to check existence with EXISTS or NOT EXISTS. I use a join when I need columns from both tables in the output. Often both work, and the optimiser treats them similarly.

### Explain
Types:
- **Scalar:** `WHERE salary > (SELECT AVG(salary) FROM employee)`
- **Multi-row:** `WHERE dept_id IN (SELECT id FROM dept WHERE city = 'Pune')`
- **Derived table:** `FROM (SELECT ...) t`
- **Correlated:** references the outer row; can be slow on big tables.

`NOT IN` with a subquery that returns NULL gives no rows at all. Prefer `NOT EXISTS`.

### Example
Find customers who have never placed an order: `NOT EXISTS` subquery, or LEFT JOIN with `IS NULL`.

### Code sql | Subquery patterns
```sql
-- Above-average earners
SELECT name, salary FROM employee
WHERE salary > (SELECT AVG(salary) FROM employee);

-- Highest paid per department (correlated)
SELECT e.name, e.dept_id, e.salary FROM employee e
WHERE e.salary = (SELECT MAX(salary) FROM employee WHERE dept_id = e.dept_id);

-- Customers without orders
SELECT c.name FROM customers c
WHERE NOT EXISTS (SELECT 1 FROM orders o WHERE o.customer_id = c.id);
```

## What are window functions? Explain ROW_NUMBER, RANK and DENSE_RANK.
@topic sql

### 60s
Window functions compute a value across a set of rows related to the current row, without collapsing them like GROUP BY does. The OVER clause defines the window, with PARTITION BY to group and ORDER BY to sort. ROW_NUMBER gives a unique sequential number to every row. RANK gives the same rank to ties and then skips numbers, so 1, 1, 3. DENSE_RANK gives ties the same rank without gaps, so 1, 1, 2. They're great for top-N per group, finding duplicates and running totals.

### Explain
Other useful window functions: `SUM() OVER` (running totals), `LAG`/`LEAD` (compare with previous/next row), `NTILE`.

Window functions run after WHERE/GROUP BY, so filter on them in an outer query or CTE.

### Example
Salaries in Sales: 90k, 90k, 80k.
- ROW_NUMBER: 1, 2, 3
- RANK: 1, 1, 3
- DENSE_RANK: 1, 1, 2

### Code sql | Top 2 earners per department
```sql
WITH ranked AS (
  SELECT name, dept, salary,
         DENSE_RANK() OVER (PARTITION BY dept ORDER BY salary DESC) AS rnk
  FROM employee
)
SELECT dept, name, salary
FROM ranked
WHERE rnk <= 2
ORDER BY dept, rnk;
```

## What is an index? How does it affect testing?
@topic sql

### 60s
An index is a database structure, usually a B-tree, that speeds up finding rows by certain columns, like a book's index. Without an index, the database scans the whole table. Indexes make SELECTs with WHERE, JOIN and ORDER BY on those columns much faster, but they use storage and slow down inserts, updates and deletes slightly. A unique index also enforces uniqueness. For testers, missing indexes often show up as slow pages or API timeouts with production-sized data, so I test with realistic data volume and check query plans with EXPLAIN.

### Explain
- **Clustered index:** defines the physical order of rows (one per table, usually the primary key in MySQL InnoDB / SQL Server).
- **Non-clustered:** separate structure pointing to rows.
- **Composite index:** on multiple columns; column order matters.
- `EXPLAIN` shows whether a query uses an index or a full table scan.

### Example
Order history loads in 200 ms in QA with 1,000 orders but 12 seconds in production with 30 million. EXPLAIN shows a full scan on `orders.customer_id`; adding an index fixes it.

### Code sql | Create and check an index
```sql
CREATE INDEX idx_orders_customer ON orders(customer_id, created_at);

EXPLAIN
SELECT * FROM orders
WHERE customer_id = 42
ORDER BY created_at DESC
LIMIT 20;
-- Look for "Index Scan using idx_orders_customer" instead of "Seq Scan"
```

## What are ACID properties and transactions?
@topic sql

### 60s
A transaction is a group of database operations treated as one unit: either all succeed and are committed, or all are rolled back. ACID describes its guarantees. Atomicity: all or nothing. Consistency: the data moves from one valid state to another, respecting constraints. Isolation: concurrent transactions don't see each other's partial changes. Durability: once committed, the data survives a crash. For testers, the classic example is a money transfer: the debit and credit must both happen or neither.

### Explain
- `BEGIN` / `START TRANSACTION`, `COMMIT`, `ROLLBACK`, `SAVEPOINT`.
- Isolation levels: Read Uncommitted, Read Committed, Repeatable Read, Serializable. Lower levels allow dirty reads, non-repeatable reads, phantom reads.
- Test ideas: kill the service mid-operation and check no partial data; run two concurrent updates on the same record (lost update); check rollback on validation failure.

### Example
Transfer ₹500 from A to B. The credit to B fails due to a constraint. With a transaction, A's debit is rolled back, so no money disappears.

### Code sql | Transfer in a transaction
```sql
START TRANSACTION;
UPDATE accounts SET balance = balance - 500 WHERE id = 'A';
UPDATE accounts SET balance = balance + 500 WHERE id = 'B';
-- if any statement failed:
-- ROLLBACK;
COMMIT;
```

## How do you validate data between the UI and the database?
@topic sql

### 60s
I perform the action in the UI or API, capture the identifiers, like order ID or email, then query the database for that record and compare field by field: amounts, statuses, timestamps, foreign keys and calculated values. In automation I connect with JDBC, run a parameterised query, map the result and assert it against the expected values or the UI values. I also check side effects, like stock reduced or an audit row created, and negative cases, like nothing saved when validation fails.

### Explain
Tips:
- Use **prepared statements** with parameters, never string concatenation.
- Read-only DB user for tests where possible.
- Wait for async processing (queues) before querying.
- Compare formatted UI values carefully: "₹1,299.00" vs `1299.00`, time zones in timestamps.
- Keep DB credentials in environment variables.

### Example
After placing an order for 2 units, verify `orders.total = 998.00`, `orders.status = 'PLACED'`, and `inventory.stock` decreased by 2.

### Code java | JDBC check
```java
String sql = "SELECT status, total FROM orders WHERE order_id = ?";
try (Connection c = DriverManager.getConnection(
         System.getenv("DB_URL"), System.getenv("DB_USER"), System.getenv("DB_PASS"));
     PreparedStatement ps = c.prepareStatement(sql)) {
    ps.setString(1, orderIdFromUi);
    try (ResultSet rs = ps.executeQuery()) {
        Assert.assertTrue(rs.next(), "Order not found in DB");
        Assert.assertEquals(rs.getString("status"), "PLACED");
        Assert.assertEquals(rs.getBigDecimal("total"), new BigDecimal("998.00"));
    }
}
```

# Module: QA process in practice

## How do you estimate testing effort?
@topic test-design

### 60s
I break the work down into tasks, like understanding requirements, writing test cases, preparing data and environments, execution, retesting and regression, and reporting, and estimate each one. Common techniques are work breakdown structure, three-point estimation using optimistic, most likely and pessimistic values, and in Agile, story points with the whole team during planning. I base it on historical data from similar features, factor in complexity, risk, number of platforms and expected bug-fix cycles, and add a buffer for unknowns.

### Explain
- **Three-point (PERT):** E = (O + 4M + P) / 6. E.g., O=4h, M=8h, P=18h → 9h.
- **Test-case based:** number of cases × average time per case × number of cycles.
- **Agile:** QA effort is part of the story estimate, not separate.
- Include non-obvious work: environment issues, test data, cross-browser runs, automation.
- Revisit estimates when scope changes, and communicate early.

### Example
A new payment method: 30 test cases × 10 min × 2 cycles = 10h, plus 4h data/env setup, 4h automation, 2h reporting → about 20h, presented with the assumption that the sandbox gateway is available.

### Code python | Three-point estimate
```python
def pert(optimistic, likely, pessimistic):
    return (optimistic + 4 * likely + pessimistic) / 6

print(pert(4, 8, 18))  # 9.0 hours
```

## How do you test when there are no requirements or documentation?
@topic test-design

### 60s
I start by gathering information from other sources: talk to the product owner, developers and support team, look at similar features in the product or competitors, read the code changes or API docs, and explore the application myself. I write down my assumptions and get them confirmed. I use exploratory testing with charters, and checklists of common risks like validation, error handling and security. I write lightweight scenarios as I learn, share them for review, and flag the missing requirements as a risk in my report.

### Explain
Sources of truth when docs are missing:
- People: PO, BA, dev, support, sales.
- Existing behaviour: production app, older versions.
- Artefacts: Jira comments, designs (Figma), API specs (Swagger), code diff, logs.
- Standards: platform guidelines, accessibility, legal.
- Heuristics: consistency with the rest of the product, user expectations (FEW HICCUPPS oracle heuristic).

### Example
Asked to test a new "bulk upload" screen with no story, I explored it for an hour, listed 12 questions (file size limit? duplicate rows? partial failure?), got answers from the developer and PO in a 15-minute call, and turned them into test cases.

### Code text | Assumptions log
```text
#  Assumption                               Confirmed by   Status
1  Max file size is 5 MB                    Dev (Ravi)     Yes
2  Duplicate rows are skipped, not errored  PO (Meera)     No -> they should error
3  Partial success is allowed               PO             Yes, show summary
```

## What is risk-based testing?
@topic test-design

### 60s
Risk-based testing means prioritising test effort by risk, because we can't test everything. For each feature I estimate the likelihood of failure, based on complexity, change size, new technology and defect history, and the impact if it fails, such as money, security, legal or number of users. Risk equals likelihood times impact. High-risk areas get the most and earliest testing, deeper techniques and automation; low-risk areas get lighter checks. It helps make smart decisions when time is short, and to explain to stakeholders what remaining risk we're accepting.

### Explain
Steps:
1. List features/areas.
2. Score likelihood (1–5) and impact (1–5).
3. Risk score = L × I; sort.
4. Assign test depth: high = full functional + negative + automation; medium = main flows; low = smoke.
5. Revisit each release.

### Example
Release with only 2 days for testing: payment changes (L4 × I5 = 20) get full testing; a new "profile banner colour" option (L2 × I1 = 2) gets a quick check.

### Code text | Risk matrix
```text
Area                L  I  Score  Depth
Payment gateway     4  5  20     Full + automation
Coupon engine       4  4  16     Full
Search filters      3  3   9     Main flows
Profile theme       2  1   2     Smoke
```

## What is defect triage?
@topic fundamentals

### 60s
Defect triage is a regular meeting or process where the team reviews newly reported bugs and decides what to do with each one. Usually the QA lead, developers' lead and product owner attend. For every bug they confirm it's valid and not a duplicate, agree on severity and priority, assign an owner and a target release, or decide to defer or reject it. It keeps the backlog clean and makes sure the most important bugs get fixed first. Testers come prepared with clear reports and evidence.

### Explain
Outcomes per bug: accept and assign, needs more info, duplicate, not a bug / works as designed, deferred, won't fix.

Good triage habits:
- Time-boxed (e.g., 30 minutes, 2–3 times a week near release).
- Sorted by severity first.
- Decisions recorded in the tracker.
- Tester explains impact in business terms ("blocks 15% of users on Safari").

### Example
Before a release, triage reviews 18 open bugs: 3 critical are fixed now, 9 moved to the next sprint, 4 closed as duplicates, 2 rejected after the PO confirmed intended behaviour.

### Code text | Jira filter used in triage
```text
project = SHOP AND issuetype = Bug AND status = New
ORDER BY severity DESC, created ASC
```

## How do you decide what to regression test when time is short?
@topic test-design

### 60s
I do impact analysis: I look at what changed, from the release notes, stories and code diff, and talk to developers about which modules the change touches. Then I prioritise the regression set: critical business flows like login, search, checkout and payment always; areas directly or indirectly affected by the change; areas with a history of bugs; and high-usage features from analytics. Automated regression runs fully in CI, and manual time goes to impacted and high-risk areas. I communicate clearly what was not covered.

### Explain
Prioritisation inputs:
- Code changes (files/modules touched, shared components).
- Business criticality and revenue impact.
- Defect history (defect clustering).
- Usage analytics (most used paths).
- Customer-facing vs internal.

Have a tiered suite: P1 smoke (15 min), P2 core regression (2 h), P3 full regression (overnight).

### Example
A change to the tax calculation library: regress checkout, invoices, refunds, order history totals and reports. Skip profile settings and wishlist, which don't use the library.

### Code bash | Running tiers
```bash
mvn test -Dgroups=smoke                      # always
mvn test -Dgroups="checkout,invoice,refund"  # impacted areas
mvn test -Dgroups=regression                 # nightly full run
```

# Module: Git for automation engineers

## What is the difference between git merge and git rebase?
@topic git

### 60s
Both integrate changes from one branch into another. Merge creates a new merge commit that ties the two histories together, preserving exactly what happened, but the history can look busy. Rebase moves my branch's commits to start from the tip of the other branch, rewriting them as new commits, which gives a clean, linear history. The golden rule: don't rebase commits that others are already using on a shared branch, because it rewrites history. I rebase my own feature branch on main before opening a PR, and merge into main.

### Explain
- `git merge main` (on feature) → merge commit.
- `git rebase main` (on feature) → replays feature commits on top of main.
- Conflicts during rebase are resolved commit by commit: fix, `git add`, `git rebase --continue` (or `--abort`).
- After rebasing a pushed branch, you need `git push --force-with-lease` (safer than `--force`).
- "Squash and merge" on GitHub combines a PR into one commit.

### Example
My test branch is 10 commits behind main. `git fetch && git rebase origin/main` puts my 3 commits on top, so the PR shows only my changes and CI tests against the latest code.

### Code bash | Rebase workflow
```bash
git switch feature/cart-tests
git fetch origin
git rebase origin/main
# resolve conflicts if any:
git add . && git rebase --continue
git push --force-with-lease
```

## What is the difference between git reset and git revert?
@topic git

### 60s
git revert creates a new commit that undoes the changes of an earlier commit, without changing history, so it's safe on shared branches like main. git reset moves the branch pointer back to an earlier commit, effectively removing later commits from the branch history. With --soft the changes stay staged, with --mixed, the default, they stay in the working directory unstaged, and with --hard they're discarded completely. I use revert for anything already pushed and shared, and reset only for local, unpushed work.

### Explain
| | revert | reset |
|---|---|---|
| History | Adds a new commit | Rewrites (removes commits) |
| Shared branches | Safe | Dangerous |
| Use | Undo a pushed change | Clean up local commits |

`git reset --hard` loses uncommitted work. `git reflog` can often recover commits after a bad reset.

### Example
A commit that disabled 20 tests was merged to main by mistake. `git revert <sha>` restored them with a clear audit trail. Locally, I squashed my 4 messy commits with `git reset --soft HEAD~4` and recommitted once.

### Code bash | Both
```bash
git revert a1b2c3d                 # safe undo on main
git reset --soft HEAD~1            # undo last commit, keep changes staged
git reset --hard origin/main       # discard local work (careful!)
git reflog                         # find lost commits
```

## What is git cherry-pick and git stash?
@topic git

### 60s
git cherry-pick applies the changes from a specific commit on another branch onto my current branch as a new commit. It's useful for bringing a single fix to a release branch without merging everything else. git stash temporarily saves my uncommitted changes and gives me a clean working directory, so I can switch branches or pull, and later restore them with git stash pop or apply. I use stash when I'm interrupted mid-work, and cherry-pick for targeted hotfixes.

### Explain
- `git cherry-pick <sha>`; resolve conflicts, then `git cherry-pick --continue`.
- `git stash push -m "wip login tests"`, `git stash list`, `git stash pop` (apply + drop), `git stash apply` (keep in list), `git stash drop`.
- `git stash -u` includes untracked files.

### Example
A flaky-test fix was committed on `develop`, but the release branch needs it today: `git switch release/3.2 && git cherry-pick 9f8e7d6`.

### Code bash | Cherry-pick and stash
```bash
# Stash
git stash push -u -m "wip checkout tests"
git switch main && git pull
git switch -   && git stash pop

# Cherry-pick
git switch release/3.2
git cherry-pick 9f8e7d6
```

## What should go in .gitignore for a test automation project?
@topic git

### 60s
.gitignore lists files and folders Git should not track. For an automation project that means build output like the target or build folder and node_modules, test results and reports like test-output, allure-results and screenshots, downloaded files, IDE files like .idea and .vscode, OS files like .DS_Store, logs, and most importantly local secrets like .env files or local config with passwords. Keeping these out makes the repo small, avoids merge conflicts and prevents leaking credentials. If a file is already tracked, I need git rm --cached to stop tracking it.

### Explain
- Patterns: `target/`, `*.log`, `!keep.log` (exception), `**/screenshots/`.
- Ignoring a file doesn't remove it from history. If a secret was committed, rotate it immediately; deleting the file isn't enough.
- Commit a `config.example.properties` with placeholder values instead of real config.

### Example
A teammate committed `allure-results/` with 2,000 files, making every PR huge. Adding it to `.gitignore` and running `git rm -r --cached allure-results` fixed it.

### Code bash | Typical .gitignore
```bash
# Build
target/
build/
node_modules/
# Reports and artefacts
test-output/
allure-results/
allure-report/
playwright-report/
screenshots/
downloads/
*.log
# IDE / OS
.idea/
.vscode/
.DS_Store
# Secrets
.env
config/local.properties
```

# Module: Coding for automation interviews

## What are Java 8 streams and lambdas? How do you use them in automation?
@topic programming

### 60s
A lambda is a short anonymous function, like x arrow x times 2, that can be passed where a functional interface is expected. Streams let me process collections in a declarative pipeline: filter, map, sorted, collect, and so on, instead of writing loops. In automation I use them to turn a list of WebElements into a list of texts, filter elements by condition, check if a list is sorted, or find the first matching row. Code becomes shorter and reads like the intent. Streams don't modify the original collection.

### Explain
- Intermediate ops (lazy): `filter`, `map`, `sorted`, `distinct`, `limit`.
- Terminal ops: `collect`, `toList()` (Java 16+), `forEach`, `count`, `anyMatch`, `allMatch`, `findFirst`.
- Method references: `WebElement::getText`.
- `Optional` from `findFirst()` avoids nulls: `.orElseThrow()`.

### Example
Verify product prices on a listing page are sorted low to high after choosing "Price: Low to High".

### Code java | Streams with WebElements
```java
List<Double> prices = driver.findElements(By.cssSelector(".price"))
    .stream()
    .map(WebElement::getText)                 // "₹1,299"
    .map(t -> t.replaceAll("[^0-9.]", ""))    // "1299"
    .map(Double::parseDouble)
    .toList();

List<Double> sorted = prices.stream().sorted().toList();
Assert.assertEquals(prices, sorted, "Prices not sorted ascending");

boolean anyOutOfStock = driver.findElements(By.cssSelector(".badge"))
    .stream().anyMatch(b -> b.getText().equals("Out of stock"));
```

## How do you find duplicate elements in an array or list?
@topic programming

### 60s
The simplest efficient way is a HashSet: loop through the elements and try to add each one to the set. If add returns false, the element was already there, so it's a duplicate, and I add it to a second set of duplicates. That's O(n) time. Another way is a HashMap counting occurrences and picking entries with count greater than one. With streams I can group by identity and count. Sorting and comparing neighbours also works, in O(n log n), without extra memory.

### Explain
- HashSet approach: O(n) time, O(n) space.
- Nested loops: O(n²), mention it only as the naive approach.
- Sorting: O(n log n), modifies the array unless you copy it.
- For test automation: checking for duplicate dropdown options, duplicate rows in a table, duplicate IDs in an API response.

### Example
API returns a list of product IDs; verify there are no duplicates: `[101, 102, 103, 102]` → duplicate 102.

### Code java | Three ways
```java
List<Integer> ids = List.of(101, 102, 103, 102, 104, 101);

// 1. HashSet
Set<Integer> seen = new HashSet<>(), dups = new LinkedHashSet<>();
for (int id : ids) if (!seen.add(id)) dups.add(id);
System.out.println(dups);                    // [102, 101]

// 2. Streams
Set<Integer> dups2 = ids.stream()
    .collect(Collectors.groupingBy(i -> i, Collectors.counting()))
    .entrySet().stream().filter(e -> e.getValue() > 1)
    .map(Map.Entry::getKey).collect(Collectors.toSet());

// 3. Assert no duplicates
Assert.assertEquals(new HashSet<>(ids).size(), ids.size(), "Duplicate IDs: " + dups);
```

## Write a program to find the largest and second largest number in an array.
@topic programming

### 60s
I loop through the array once, keeping two variables, largest and second largest, both starting at the smallest possible integer. For each number, if it's greater than largest, the old largest becomes second and the number becomes largest. Else if it's greater than second and not equal to largest, it becomes the new second. That's O(n) time with one pass and O(1) space. Sorting also works but is O(n log n). I'd handle edge cases: arrays with fewer than two elements, or all equal values.

### Explain
- Initialise with `Integer.MIN_VALUE` or with the first element.
- The `!= largest` check handles duplicates of the maximum (e.g., [5, 5, 3] → second largest is 3).
- If no second largest exists, return a sentinel or throw, and say which.

### Example
[12, 35, 1, 10, 34, 1] → largest 35, second largest 34.

### Code java | Single pass
```java
public static int[] topTwo(int[] arr) {
    if (arr.length < 2) throw new IllegalArgumentException("Need at least 2 elements");
    int first = Integer.MIN_VALUE, second = Integer.MIN_VALUE;
    for (int n : arr) {
        if (n > first) { second = first; first = n; }
        else if (n > second && n != first) { second = n; }
    }
    return new int[] { first, second };
}
// topTwo(new int[]{12, 35, 1, 10, 34, 1}) -> [35, 34]
```

## What is the difference between HashMap, LinkedHashMap, TreeMap and Hashtable?
@topic programming

### 60s
All store key-value pairs. HashMap gives no ordering guarantee, allows one null key and many null values, isn't thread-safe, and has O(1) average get and put. LinkedHashMap keeps insertion order, which is useful when I need predictable output like a report. TreeMap keeps keys sorted, natural or by a comparator, with O(log n) operations, and doesn't allow null keys. Hashtable is a legacy thread-safe version that doesn't allow nulls; today I'd use ConcurrentHashMap for thread safety, for example sharing data in parallel tests.

### Explain
| | Order | Null key | Thread-safe | Speed |
|---|---|---|---|---|
| HashMap | None | 1 allowed | No | O(1) |
| LinkedHashMap | Insertion | 1 allowed | No | O(1) |
| TreeMap | Sorted keys | No | No | O(log n) |
| Hashtable | None | No | Yes (synchronized, slow) | O(1) |
| ConcurrentHashMap | None | No | Yes (fine-grained) | O(1) |

How HashMap works (common follow-up): key's `hashCode()` picks a bucket; collisions are stored in a linked list, converted to a balanced tree when a bucket gets big (Java 8+); `equals()` finds the exact key.

### Example
In a parallel test run, a shared `Map<String, String> createdOrders` caused lost entries. Switching to `ConcurrentHashMap` fixed it.

### Code java | Order differences
```java
Map<String,Integer> hm = new HashMap<>(), lhm = new LinkedHashMap<>(), tm = new TreeMap<>();
for (Map<String,Integer> m : List.of(hm, lhm, tm)) {
    m.put("banana", 2); m.put("apple", 5); m.put("cherry", 1);
}
System.out.println(lhm); // {banana=2, apple=5, cherry=1}   insertion order
System.out.println(tm);  // {apple=5, banana=2, cherry=1}   sorted
// hm order is not guaranteed

Map<String,String> shared = new ConcurrentHashMap<>();
```

## Write a Python script to validate an API response.
@topic programming

### 60s
I use the requests library to call the endpoint, then assert the status code, response time, content type, and values in the JSON body. With pytest, each check is a plain assert and failures show clear diffs. I keep the base URL and token in environment variables, use a session for shared headers, and parametrize tests for multiple inputs. For schema checks I add the jsonschema library. Python is popular for API and data checks because the code is short and readable.

### Explain
- `requests.get/post(..., timeout=10)` — always set a timeout.
- `response.status_code`, `response.json()`, `response.headers`, `response.elapsed.total_seconds()`.
- `pytest` fixtures for setup (session, token); `@pytest.mark.parametrize` for data-driven tests.
- `pytest -n 4` with pytest-xdist for parallel runs.

### Example
Validate `GET /users/2` returns 200, JSON, under 1 second, with the expected email and the user ID matching the request.

### Code python | pytest + requests
```python
import os, pytest, requests

BASE = os.getenv("BASE_URL", "https://api.example.com")

@pytest.fixture(scope="session")
def api():
    s = requests.Session()
    s.headers.update({"Authorization": f"Bearer {os.environ['API_TOKEN']}"})
    return s

@pytest.mark.parametrize("user_id", [1, 2, 3])
def test_get_user(api, user_id):
    r = api.get(f"{BASE}/users/{user_id}", timeout=10)
    assert r.status_code == 200
    assert r.headers["Content-Type"].startswith("application/json")
    assert r.elapsed.total_seconds() < 1
    body = r.json()
    assert body["id"] == user_id
    assert "@" in body["email"]
```

## How do you test a mobile application? What is Appium?
@topic selenium

### 60s
Mobile testing covers functionality plus things specific to devices: different screen sizes, OS versions, gestures, interruptions like calls and notifications, network changes from Wi-Fi to 4G to offline, battery and memory usage, permissions, background and foreground, orientation, and installs and upgrades. Appium is the open-source tool for automating native, hybrid and mobile web apps on Android and iOS using the WebDriver protocol, so it feels like Selenium. It uses drivers like UiAutomator2 for Android and XCUITest for iOS, and runs on real devices, emulators or cloud device farms.

### Explain
- **Native** (built with Kotlin/Swift), **hybrid** (web content inside a native shell), **mobile web** (browser).
- Appium 2: install drivers separately (`appium driver install uiautomator2`).
- Capabilities: `platformName`, `appium:automationName`, `appium:app`, `appium:deviceName`.
- Locators: accessibility id (best, works cross-platform), id, XPath (slow), UiAutomator / iOS predicate strings.
- Cloud device farms: BrowserStack, Sauce Labs, LambdaTest, AWS Device Farm.

### Example
Test the checkout flow on 6 Android and 4 iOS devices in BrowserStack, including dropping the network during payment and returning from background after 5 minutes.

### Code java | Appium Android session
```java
UiAutomator2Options options = new UiAutomator2Options()
    .setDeviceName("Pixel 7")
    .setApp(System.getProperty("user.dir") + "/apps/shop.apk")
    .setAutoGrantPermissions(true);

AndroidDriver driver = new AndroidDriver(new URL("http://127.0.0.1:4723"), options);
driver.findElement(AppiumBy.accessibilityId("Login")).click();
driver.findElement(AppiumBy.id("com.shop:id/email")).sendKeys("qa@x.com");
```
