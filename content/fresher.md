# Module: Testing basics

## What is software testing and why is it needed?
@topic fundamentals

### 60s
Software testing is the process of checking that a product works as expected and finding defects before users do. We compare the actual behaviour of the software with the expected behaviour from the requirements. It's needed because bugs found late are expensive, bugs in production hurt users and the business, and testing gives the team confidence to release. Testing can't prove there are no bugs, but it reduces the risk of failure to an acceptable level.

### Explain
Testing has two goals: **find defects** and **build confidence** that the product meets requirements and user needs.

It is needed because:
- Humans make mistakes in requirements, design and code.
- The cost of fixing a defect grows the later it's found. A requirement bug fixed in review costs minutes; the same bug in production can cost a hotfix, a rollback and lost customers.
- Some domains (banking, healthcare, aviation) have legal and safety requirements.
- Testing gives data for a release decision: what was tested, what failed, what risk remains.

A good one-line definition for interviews: testing is a risk-reduction activity that provides information about quality to stakeholders.

### Example
In 2012 a trading firm, Knight Capital, deployed untested code to production and lost about $440 million in 45 minutes. A smaller everyday example: an e-commerce site shows the wrong total when a coupon and a sale price both apply. Testing the checkout with combined discounts before release would have caught it.

### Code java | A tiny automated check
```java
// The idea of testing in code: compare actual vs expected.
int expected = 90;
int actual = cart.totalAfterDiscount(100, 10); // 10% off
if (actual != expected) {
    throw new AssertionError("Expected " + expected + " but got " + actual);
}
```

## What is the difference between verification and validation?
@topic fundamentals

### 60s
Verification asks "are we building the product right?" It checks that work products meet their specifications, usually without running the code, through reviews, walkthroughs and inspections. Validation asks "are we building the right product?" It checks that the software actually meets the user's needs, usually by executing it through functional, system and acceptance testing. Verification is static and happens throughout development. Validation is dynamic and happens on working software.

### Explain
| | Verification | Validation |
|---|---|---|
| Question | Built right? | Right thing built? |
| Type | Static (no execution) | Dynamic (execution) |
| Activities | Requirement reviews, design reviews, code reviews, walkthroughs | Functional, system, UAT testing |
| Done by | QA, developers, BA | QA, end users |

The two together make up the V-model idea: each development phase has a matching test phase.

In interviews, give one example of each. That shows you understand, rather than reciting.

### Example
Verification: reviewing the requirement "Password must be 8–16 characters" and noticing it doesn't say whether spaces are allowed.

Validation: running the sign-up screen and typing a 17-character password to confirm the app rejects it with the right message.

### Code text | Checklist
```text
Verification (review)                 Validation (execute)
[ ] Requirement is testable           [ ] Enter 7 chars  -> error shown
[ ] Acceptance criteria are clear     [ ] Enter 8 chars  -> accepted
[ ] Edge cases are mentioned          [ ] Enter 16 chars -> accepted
[ ] Error messages are specified      [ ] Enter 17 chars -> error shown
```

## What is the difference between QA, QC and testing?
@topic fundamentals

### 60s
Quality Assurance is process-oriented: it prevents defects by improving how we build software, such as defining standards, reviews and the test process. Quality Control is product-oriented: it finds defects in the actual product by inspecting and testing it. Testing is one activity inside quality control, where we execute the software to find bugs. So QA is about the process, QC is about the product, and testing is the hands-on execution part of QC.

### Explain
- **QA (prevention):** process definition, audits, coding standards, review checklists, training, choosing a test strategy. Responsibility of the whole team.
- **QC (detection):** reviewing deliverables and testing the product to find defects.
- **Testing:** designing and executing tests, logging defects. A subset of QC.

In industry, the job title "QA engineer" usually means someone who does both: improves the process and tests the product.

### Example
QA: the team agrees every user story must have acceptance criteria before development starts.

QC: a tester reviews a build against those acceptance criteria.

Testing: the tester runs the "forgot password" flow and finds the reset email is never sent.

### Code text | Mapping
```text
QA      -> "Every PR needs one reviewer and passing unit tests"   (process)
QC      -> "Inspect release 2.4 against its acceptance criteria"  (product)
Testing -> "Run test case TC_101: reset password email arrives"   (execution)
```

## What is the difference between an error, a defect, a bug and a failure?
@topic fundamentals

### 60s
An error, or mistake, is a human action that produces a wrong result, like a developer misreading a requirement. That mistake introduces a defect, a flaw in the code or document. Bug is the informal name for a defect. When the defective code is executed and the system doesn't do what it should, that's a failure, which is what the user sees. So the chain is: error leads to defect, defect leads to failure. Not every defect causes a failure, because the code path might never run.

### Explain
- **Error / mistake:** made by a person.
- **Defect / bug / fault:** the result of the mistake, sitting in the code or the requirements.
- **Failure:** the observable deviation from expected behaviour at run time.

Two useful points to add:
1. A defect may never cause a failure if the condition is never met (for example, a bug in leap-year logic only fails on 29 Feb).
2. Failures can also come from the environment, such as a full disk or a network outage, without a code defect.

### Example
A developer writes `if (age > 18)` instead of `if (age >= 18)` (error). The code now has a defect. When an 18-year-old tries to sign up and is rejected, that's the failure.

### Code java | The age bug
```java
// Requirement: users aged 18 or older can register.
boolean canRegister(int age) {
    return age > 18;   // DEFECT: should be age >= 18
}

// Failure only shows up for the boundary value:
canRegister(25); // true  (looks fine)
canRegister(18); // false (failure seen by the user)
```

## What are the seven principles of software testing?
@topic fundamentals

### 60s
The seven ISTQB principles are: one, testing shows the presence of defects, not their absence. Two, exhaustive testing is impossible, so we prioritise by risk. Three, early testing saves time and money. Four, defects cluster together, so a few modules contain most bugs. Five, the pesticide paradox: repeating the same tests stops finding new bugs, so tests must be updated. Six, testing is context-dependent, so a banking app is tested differently from a game. Seven, the absence-of-errors fallacy: a bug-free product that doesn't meet user needs is still a failure.

### Explain
Interviewers like it when you connect each principle to practice:
1. **Presence of defects:** we report "no defects found in the tested scope", not "no defects".
2. **Exhaustive testing impossible:** use techniques like equivalence partitioning and risk-based testing.
3. **Early testing (shift-left):** review requirements and test in each sprint.
4. **Defect clustering (Pareto 80/20):** focus regression on modules with history of bugs.
5. **Pesticide paradox:** refresh test data and add new cases regularly.
6. **Context-dependent:** safety-critical systems need formal, documented testing; a startup MVP may favour exploratory testing.
7. **Absence-of-errors fallacy:** validate with real user needs, not just specs.

### Example
On an e-commerce project, 70% of production bugs came from the payment and promotions modules. Applying defect clustering, the team doubled regression coverage there and cut escaped bugs by half.

### Code text | Memory hook
```text
P-E-E-D-P-C-A
Presence · Exhaustive · Early · Defect clustering · Pesticide · Context · Absence-of-errors
```

## What is the SDLC and what are its phases?
@topic fundamentals

### 60s
SDLC, the Software Development Life Cycle, is the structured process a team follows to build software. The typical phases are requirement gathering and analysis, design, development or coding, testing, deployment, and maintenance. Models like Waterfall run these phases one after another, while Agile repeats them in short iterations called sprints. As a tester, I'm involved from the requirement phase, reviewing requirements for clarity and testability, not just in the testing phase.

### Explain
1. **Requirements:** business analysts collect needs; output is an SRS or user stories.
2. **Design:** architecture and detailed design (HLD, LLD).
3. **Development:** code and unit tests.
4. **Testing:** integration, system and acceptance testing.
5. **Deployment:** release to production.
6. **Maintenance:** bug fixes, enhancements, monitoring.

Common models: Waterfall (sequential), V-model (test phase paired with each dev phase), Iterative, Spiral (risk-driven), and Agile (Scrum, Kanban). Most companies today use Agile.

### Example
In a Scrum team building a food-delivery app, each 2-week sprint covers all phases for a few user stories: refine the story, design the API, code it, test it, and release behind a feature flag.

### Code text | Waterfall vs Agile
```text
Waterfall: Requirements -> Design -> Code -> Test -> Deploy        (once)
Agile:     [Plan -> Build -> Test -> Review] x every 2 weeks      (repeat)
```

## What is the STLC and what are its phases?
@topic fundamentals

### 60s
STLC, the Software Testing Life Cycle, is the sequence of testing activities inside the SDLC. It has six phases: requirement analysis, where we study what to test; test planning, where we define scope, approach, resources and schedule; test case design, where we write test cases and prepare data; test environment setup; test execution, where we run tests and log defects; and test closure, where we report results and lessons learned. Each phase has entry and exit criteria.

### Explain
| Phase | Key output |
|---|---|
| Requirement analysis | Testable requirements list, RTM draft, questions to BA |
| Test planning | Test plan, effort estimate, tool choice |
| Test case design | Test cases, test data, automation scripts |
| Environment setup | Ready test environment, smoke test passed |
| Test execution | Execution results, defect reports |
| Test closure | Test summary report, metrics, lessons learned |

Entry criteria say when a phase can start (for example, a build is deployed and smoke-tested). Exit criteria say when it's done (for example, all critical tests pass and no open P1 defects).

### Example
For a new "Add to wishlist" feature: analyse the story, plan to cover web and mobile, write 15 test cases, wait for the QA environment, execute and log 3 bugs, then send a summary to the product owner.

### Code text | One-line summary per phase
```text
Analyse -> Plan -> Design -> Set up env -> Execute -> Close
```

## What are the levels of testing?
@topic fundamentals

### 60s
There are four main levels. Unit testing checks the smallest pieces of code, like a single function, usually by developers. Integration testing checks that modules work together, for example the UI calling an API that writes to a database. System testing checks the complete, integrated application against requirements, end to end. And acceptance testing, or UAT, is done by the business or users to confirm the system is ready for real use. Each level catches different kinds of defects.

### Explain
- **Unit:** fast, isolated, written by developers (JUnit, pytest).
- **Integration:** interfaces and data flow between components. Approaches: big-bang, top-down (stubs), bottom-up (drivers).
- **System:** functional and non-functional testing of the whole product in a production-like environment.
- **Acceptance (UAT):** business validation. Includes alpha (in-house) and beta (real users) testing.

This maps to the **test pyramid**: many unit tests, fewer integration tests, and even fewer end-to-end UI tests.

### Example
Banking app transfer feature:
- Unit: `calculateFee(amount)` returns 0 for amounts under 1000.
- Integration: transfer service correctly debits account A and credits account B in the DB.
- System: user logs in, transfers money, sees the updated balance and gets an SMS.
- UAT: a branch manager confirms the flow matches bank rules.

### Code java | Unit test (JUnit 5)
```java
import static org.junit.jupiter.api.Assertions.assertEquals;
import org.junit.jupiter.api.Test;

class FeeCalculatorTest {
    @Test
    void noFeeForSmallTransfers() {
        assertEquals(0, new FeeCalculator().calculateFee(999));
    }
}
```

## What is the difference between functional and non-functional testing?
@topic fundamentals

### 60s
Functional testing checks what the system does: each feature behaves according to the requirements, like login, search or payment. Non-functional testing checks how well the system does it: performance, security, usability, reliability, compatibility and accessibility. Functional testing answers "does the login work with a valid password?" Non-functional answers "does the login respond in under two seconds with a thousand users?" Both are needed, because a feature that works but is slow or insecure still fails users.

### Explain
**Functional types:** smoke, sanity, regression, integration, system, UAT.

**Non-functional types:**
- Performance: load, stress, spike, endurance.
- Security: authentication, authorisation, injection.
- Usability and accessibility (WCAG).
- Compatibility: browsers, devices, OS.
- Reliability and recovery.

Functional requirements usually come from user stories; non-functional ones are often hidden, so a good tester asks about them early ("What's the expected response time? Which browsers?").

### Example
Food delivery app:
- Functional: placing an order deducts the right amount and shows an order ID.
- Non-functional: the order page loads in under 3 seconds on a 4G network, works on Android 11+, and a screen reader can read the "Place order" button.

### Code java | Functional vs non-functional assertion
```java
// Functional: is the result correct?
assertEquals("Order placed", page.getConfirmationText());

// Non-functional: is it fast enough?
long start = System.currentTimeMillis();
page.placeOrder();
long ms = System.currentTimeMillis() - start;
assertTrue(ms < 3000, "Order took " + ms + " ms");
```

# Module: Types of testing

## What is the difference between smoke testing and sanity testing?
@topic fundamentals

### 60s
Smoke testing is a quick, broad check on a new build to confirm the critical functions work and the build is stable enough for further testing. If it fails, we reject the build. Sanity testing is a narrow, focused check after a small change or bug fix, to confirm that specific area works and nothing obvious broke around it. Smoke is wide and shallow across the app; sanity is narrow and deep on one area. Smoke is often automated; sanity is usually quick manual testing.

### Explain
| | Smoke | Sanity |
|---|---|---|
| When | Every new build | After a minor change or fix |
| Scope | Whole app, critical paths | One feature or module |
| Goal | Is the build testable? | Is this change reasonable? |
| Documented? | Usually scripted | Often unscripted |
| Subset of | Acceptance/build verification | Regression |

Smoke tests are often called Build Verification Tests (BVT) and run in CI right after deployment.

### Example
Smoke on a new e-commerce build: app opens, user can log in, search a product, add to cart and reach checkout.

Sanity after a fix to the coupon field: apply a valid coupon, an expired one and an invalid one, and confirm the cart total updates correctly.

### Code java | Tagging smoke tests in TestNG
```java
@Test(groups = {"smoke"})
public void userCanLogin() { /* ... */ }

@Test(groups = {"regression"})
public void couponWithSaleItem() { /* ... */ }

// Run only smoke tests:
// mvn test -Dgroups=smoke
```

## What is the difference between regression testing and retesting?
@topic fundamentals

### 60s
Retesting means running the specific failed test case again after a developer fixes a bug, to confirm the fix works. Regression testing means running a wider set of tests to make sure the change, whether a fix or a new feature, hasn't broken anything that used to work. Retesting is planned for known defects and must pass before closing the bug. Regression looks for unexpected side effects, and is a strong candidate for automation because we run it again and again.

### Explain
| | Retesting | Regression |
|---|---|---|
| Purpose | Confirm a fix | Find side effects |
| Test cases | The ones that failed | Ones that passed before |
| Defect | Known | Unknown |
| Automation | Usually manual | Ideal for automation |

Order matters: retest the fix first, then run regression around it. Regression can be full, partial (impacted areas) or risk-based.

### Example
Bug: "Discount not applied for orders above ₹5,000." After the fix, retest with a ₹6,000 order and confirm the discount. Then run regression on the cart, checkout, tax calculation and invoice, since they use the same total.

### Code bash | Running a regression suite
```bash
# Retest one case
mvn test -Dtest=CartTest#discountAbove5000

# Regression: everything tagged regression
mvn test -Dgroups=regression
```

## What is black-box, white-box and grey-box testing?
@topic fundamentals

### 60s
Black-box testing treats the system as a closed box. We test inputs and outputs against requirements without knowing the internal code, which is what most QA functional testing is. White-box testing uses knowledge of the code structure, like branches, loops and paths, and is usually done by developers through unit tests and code coverage. Grey-box testing mixes both: the tester knows some internals, such as the database schema or API contracts, and uses that to design better black-box tests.

### Explain
- **Black-box techniques:** equivalence partitioning, boundary value analysis, decision tables, state transition, use-case testing.
- **White-box techniques:** statement coverage, branch/decision coverage, path coverage, condition coverage.
- **Grey-box:** checking the DB after a UI action, testing an API directly, using logs to confirm behaviour.

Many QA engineers do grey-box daily without calling it that: submit a form in the UI, then query the DB to check the row was saved correctly.

### Example
Login feature:
- Black-box: valid and invalid username/password combinations.
- White-box: make sure both branches of `if (attempts >= 3) lockAccount()` are executed.
- Grey-box: after 3 wrong attempts in the UI, query `SELECT locked FROM users WHERE email = ...` to confirm the flag is set.

### Code sql | Grey-box check after a UI action
```sql
-- After 3 failed login attempts in the UI:
SELECT failed_attempts, is_locked
FROM users
WHERE email = 'test.user@example.com';
-- Expected: failed_attempts = 3, is_locked = 1
```

## What is the difference between static and dynamic testing?
@topic fundamentals

### 60s
Static testing examines work products without running the code: reviewing requirements, design documents, test cases or code, plus static analysis tools like SonarQube or a linter. Dynamic testing executes the software and checks its behaviour, which covers unit, integration, system and acceptance testing. Static testing finds defects early and cheaply, such as an ambiguous requirement. Dynamic testing finds failures that only appear at run time, such as a crash or a wrong calculation.

### Explain
**Static:** informal review, walkthrough, technical review, inspection (most formal), static code analysis.

**Dynamic:** black-box and white-box techniques applied to running software.

Static testing is a big part of shift-left: a tester reviewing a user story and asking "What happens if the cart is empty?" prevents a defect before any code is written.

### Example
Static: in a story review, the tester notices "show recent orders" doesn't define "recent" (7 days? 30 days?). Clarified before coding.

Dynamic: the tester runs the page and sees orders from 90 days ago, which fails the clarified rule.

### Code bash | Static analysis in a pipeline
```bash
# Static: analyse code without running the app
npx eslint src/
mvn sonar:sonar

# Dynamic: run the tests
mvn test
```

## What is the difference between alpha and beta testing?
@topic fundamentals

### 60s
Both are types of acceptance testing before a public release. Alpha testing is done in-house, at the developer's site, by internal testers or employees, in a controlled environment, and bugs are fixed quickly. Beta testing is done by real users in their own environment, after alpha, on a near-final version. Alpha finds functional bugs early; beta finds real-world issues like device variety, network conditions and usability, and gives feedback before the full launch.

### Explain
| | Alpha | Beta |
|---|---|---|
| Who | Internal team | Real external users |
| Where | Developer site / lab | User's environment |
| When | Before beta | Before general release |
| Focus | Functionality, crashes | Real-world usage, feedback |

Beta can be closed (invited users) or open (anyone can join). App stores support this with TestFlight and Google Play testing tracks.

### Example
A new banking app version: employees use it for two weeks (alpha), then 2,000 customers join through Google Play's beta track and report that OTP auto-read fails on certain phones (beta).

### Code text | Release stages
```text
Dev -> QA -> Alpha (internal) -> Beta (selected users) -> GA (everyone)
```

## What is exploratory testing and how is it different from ad-hoc testing?
@topic fundamentals

### 60s
Exploratory testing is simultaneous learning, test design and test execution. The tester explores the application with a clear goal, called a charter, within a time box, and adapts based on what they discover. Ad-hoc testing is informal, random testing with no planning or documentation. Both find bugs that scripted tests miss, but exploratory testing is structured: it has a mission, a time limit and session notes, so results can be reported and repeated.

### Explain
Session-based exploratory testing uses:
- **Charter:** "Explore checkout with different payment methods to find failures in error handling."
- **Time box:** 60–90 minutes.
- **Notes:** what was tested, bugs, questions, ideas.
- **Debrief** with the lead.

Heuristics help: boundaries, interruptions (lose network, rotate phone), CRUD operations, and tours (money tour, data tour).

Ad-hoc testing is best for quick checks; exploratory is best for new features, complex flows and when requirements are thin.

### Example
Charter: "Explore order cancellation on the mobile app for 60 minutes." While exploring, the tester cancels an order during the payment redirect and finds the customer is charged but the order shows "cancelled". No scripted test covered that path.

### Code text | Session note template
```text
CHARTER : Explore cancellation during payment, to find state bugs
TIME    : 60 min
AREAS   : UPI, card, wallet, network loss
BUGS    : BUG-231 charged but order cancelled
QUESTIONS: Should refund be automatic?
```

## What is positive and negative testing?
@topic test-design

### 60s
Positive testing checks the system with valid input and expected user behaviour, to confirm it does what it should. Negative testing checks invalid input and unexpected behaviour, to confirm the system handles it gracefully with a clear error and without crashing or corrupting data. For a mobile number field, positive is entering a valid 10-digit number. Negative is entering letters, 9 digits, special characters or leaving it blank. Good test coverage needs both, and negative cases often find more bugs.

### Explain
Negative ideas to always consider:
- Empty or whitespace-only input
- Too long / too short
- Wrong data type (letters in a number field)
- Special characters, emoji, SQL or script injection strings
- Invalid formats (email without @)
- Actions in the wrong order (pay before adding to cart)
- Expired sessions or tokens

The expected result for a negative case is not "nothing happens". It should be a specific, helpful error message and no side effects.

### Example
Age field (accepts 18–60):
- Positive: 18, 35, 60
- Negative: 17, 61, -5, "abc", blank, 25.5

### Code java | Data provider with both
```java
@DataProvider
public Object[][] ages() {
    return new Object[][] {
        {"18", true}, {"35", true}, {"60", true},          // positive
        {"17", false}, {"61", false}, {"abc", false}, {"", false} // negative
    };
}

@Test(dataProvider = "ages")
public void validateAge(String age, boolean valid) {
    form.enterAge(age);
    assertEquals(form.isAccepted(), valid);
}
```

## What is usability, compatibility and accessibility testing?
@topic fundamentals

### 60s
Usability testing checks how easy and intuitive the product is for real users: can they complete tasks quickly without confusion. Compatibility testing checks the product works across browsers, devices, operating systems, screen sizes and network conditions. Accessibility testing checks people with disabilities can use it, for example with screen readers, keyboard-only navigation and enough colour contrast, usually against WCAG guidelines. All three are non-functional and directly affect how many people can actually use the app.

### Explain
- **Usability:** task success rate, time on task, error rate, user feedback. Done with real users or heuristics (Nielsen's 10).
- **Compatibility:** browser matrix (Chrome, Firefox, Safari, Edge), devices (Android, iOS), resolutions, OS versions. Tools: BrowserStack, Sauce Labs, LambdaTest.
- **Accessibility:** WCAG 2.1 AA: alt text on images, labels on inputs, focus order, contrast 4.5:1, works with NVDA/VoiceOver. Tools: axe, Lighthouse, WAVE.

### Example
A sign-up form passes functional tests, but: users don't notice the small "Next" button (usability), the date picker breaks on Safari (compatibility), and a screen reader announces the password field as "edit text" with no label (accessibility).

### Code typescript | Automated accessibility check (Playwright + axe)
```typescript
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('sign-up page has no a11y violations', async ({ page }) => {
  await page.goto('/signup');
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});
```

# Module: Test case design

## What is the difference between a test scenario and a test case?
@topic test-design

### 60s
A test scenario is a high-level idea of what to test, usually one line, like "verify a user can log in". A test case is the detailed, step-by-step instruction for testing one condition of that scenario: preconditions, test data, steps and the expected result, like "log in with a valid email and wrong password and check the error message". One scenario usually produces many test cases. Scenarios help us check coverage quickly; test cases make execution repeatable by anyone.

### Explain
- **Test scenario:** what to test. Derived from requirements or user stories. Good for planning, reviews and fast-moving Agile teams.
- **Test case:** how to test it. Has an ID, title, preconditions, steps, test data, expected result, actual result and status.

Hierarchy: Requirement → Test scenario → Test cases → Test steps.

### Example
Scenario: Verify the "Forgot password" functionality.

Test cases:
1. Registered email receives reset link.
2. Unregistered email shows "No account found".
3. Reset link expires after 30 minutes.
4. Old password stops working after reset.

### Code text | Scenario to cases
```text
SCENARIO  TS_05  Verify forgot password
  TC_05_01  Registered email -> reset email received within 2 min
  TC_05_02  Unregistered email -> "No account found" message
  TC_05_03  Link older than 30 min -> "Link expired" page
  TC_05_04  After reset, old password -> login fails
```

## How do you write a good test case? What fields does it have?
@topic test-design

### 60s
A good test case is clear, atomic and repeatable, so anyone can run it and get the same result. It has a unique ID, a descriptive title, the linked requirement, preconditions, test data, numbered steps, the expected result, and fields for actual result and status. Each case should test one thing, use specific data instead of "enter valid data", and have an expected result that is measurable, like an exact error message, not "should work properly".

### Explain
Standard fields:
- Test case ID and title
- Requirement / story ID (for traceability)
- Priority
- Preconditions
- Test data
- Steps
- Expected result
- Actual result, status (Pass / Fail / Blocked), comments

Qualities: simple language, one objective per case, independent of other cases, covers positive and negative paths, reviewed by a peer.

### Example
Bad: "Check login works."

Good: "TC_LOGIN_03: Login fails with wrong password. Precondition: user test@x.com exists. Steps: open /login, enter test@x.com and Wrong@123, click Login. Expected: error 'Invalid email or password' shown, user stays on /login."

### Code text | Test case template
```text
ID          : TC_LOGIN_03
Title       : Login fails with a wrong password
Story       : US-112
Priority    : High
Precondition: User test@x.com / Valid@123 exists
Test data   : email=test@x.com, password=Wrong@123
Steps       : 1. Open /login
              2. Enter email and password
              3. Click "Login"
Expected    : "Invalid email or password" shown; URL stays /login
Actual      :
Status      :
```

## What is Boundary Value Analysis (BVA)?
@topic test-design

### 60s
Boundary Value Analysis is a black-box technique based on the fact that defects cluster at the edges of input ranges. Instead of testing every value, we test at and just around the boundaries: the minimum, just below the minimum, the maximum and just above the maximum, sometimes plus just inside each edge. For an age field that accepts 18 to 60, I'd test 17, 18, 60 and 61, and optionally 19 and 59. It finds off-by-one errors like using greater-than instead of greater-than-or-equal.

### Explain
Two common variations:
- **2-value BVA:** boundary and the value just outside it: 17, 18, 60, 61.
- **3-value BVA:** value below, on and above each boundary: 17, 18, 19, 59, 60, 61.

BVA applies to numbers, string lengths, dates, file sizes, quantities and anything with a range. It is usually combined with equivalence partitioning.

### Example
Password length must be 8–16 characters. Test lengths 7 (reject), 8 (accept), 16 (accept), 17 (reject).

### Code java | BVA in a data-driven test
```java
@DataProvider
public Object[][] passwordLengths() {
    return new Object[][] {
        {7, false}, {8, true}, {16, true}, {17, false}
    };
}

@Test(dataProvider = "passwordLengths")
public void passwordLengthBoundaries(int length, boolean accepted) {
    String pwd = "a".repeat(length - 1) + "1";
    assertEquals(signup.isPasswordAccepted(pwd), accepted);
}
```

## What is Equivalence Partitioning?
@topic test-design

### 60s
Equivalence Partitioning divides input data into groups, or partitions, where every value in a group is expected to behave the same way. We then test just one representative value from each partition instead of all values. For an age field accepting 18 to 60 we have three partitions: below 18 is invalid, 18 to 60 is valid, above 60 is invalid. So three tests, like 10, 35 and 70, give the same coverage as hundreds. It reduces test cases while keeping coverage, and pairs well with boundary value analysis.

### Explain
Partitions can be valid or invalid. Think beyond numbers:
- Type: numbers vs letters vs special characters
- Format: valid email vs missing @ vs missing domain
- Lists: each option in a dropdown, or groups of options that behave the same

Rule: one value per partition is enough, because if one value in a group fails, the others probably do too.

EP + BVA together: EP picks the groups, BVA tests their edges.

### Example
Shipping is free for orders ₹500 and above, ₹40 for ₹1–499, and invalid for ₹0 or less. Partitions: ≤0 (invalid), 1–499 (₹40), ≥500 (free). Representatives: 0, 250, 800. Add BVA: 1, 499, 500.

### Code python | Partitions as a table
```python
import pytest

@pytest.mark.parametrize("amount, expected_fee", [
    (-10, "invalid"),  # partition: <= 0
    (250, 40),         # partition: 1-499
    (800, 0),          # partition: >= 500
])
def test_shipping_fee(amount, expected_fee):
    assert shipping_fee(amount) == expected_fee
```

## What is decision table testing?
@topic test-design

### 60s
Decision table testing is a black-box technique for features where the output depends on a combination of conditions. We list all the conditions as rows, every combination of true and false as columns, and the expected action for each combination. Each column becomes a test case. With two conditions we get four rules, with three conditions eight. It makes sure we don't miss combinations, and it's great for business rules like discounts, loan approval or login with multiple checks.

### Explain
Steps:
1. Identify conditions (inputs) and actions (outputs).
2. Number of rules = 2^n for n yes/no conditions.
3. Fill in the expected action for each rule.
4. Collapse rules that give the same result regardless of one condition (marked "–").

It also exposes gaps in requirements: if nobody knows the expected result for a column, that's a question for the BA.

### Example
Login: conditions are valid email and valid password.

| Rule | 1 | 2 | 3 | 4 |
|---|---|---|---|---|
| Valid email | Y | Y | N | N |
| Valid password | Y | N | Y | N |
| Result | Home page | Error | Error | Error |

### Code java | Each rule becomes a test
```java
@DataProvider
public Object[][] loginRules() {
    return new Object[][] {
        {"user@x.com", "Valid@123", "HOME"},
        {"user@x.com", "wrong",     "ERROR"},
        {"bad@x.com",  "Valid@123", "ERROR"},
        {"bad@x.com",  "wrong",     "ERROR"},
    };
}
```

## What is state transition testing?
@topic test-design

### 60s
State transition testing is used when the system behaves differently depending on its current state and the events that happen. We draw the states, the events that move between them, and the expected output, then design tests to cover valid transitions and also invalid ones. A classic example is login lockout: after one wrong password you're in "one failed attempt", after three you move to "locked", and even the right password must not log you in from the locked state.

### Explain
Elements: **states**, **transitions**, **events** (inputs), **actions** (outputs).

Coverage levels:
- Every state visited at least once.
- Every valid transition covered.
- Invalid transitions tried (e.g., "ship" an order that's already cancelled).

Good fits: order status flows, ATM, workflows, subscriptions, ticket life cycles.

### Example
Order flow: Placed → Paid → Shipped → Delivered, and Placed/Paid → Cancelled. Tests: full happy path; cancel after payment (refund triggered); try to cancel after shipped (should be blocked); try to ship an unpaid order (should be blocked).

### Code text | State table
```text
State       Event        Next state   Valid?
Placed      pay          Paid         yes
Paid        ship         Shipped      yes
Shipped     deliver      Delivered    yes
Paid        cancel       Cancelled    yes (refund)
Shipped     cancel       Shipped      NO  -> show error
Placed      ship         Placed       NO  -> show error
```

## What is error guessing?
@topic test-design

### 60s
Error guessing is an experience-based technique where the tester uses knowledge of common mistakes and past defects to guess where the application is likely to break, and designs tests for those spots. There are no formal rules. Typical guesses are empty inputs, very long text, special characters, leading spaces, double-clicking submit, going back after payment, session timeout and dividing by zero. It complements formal techniques and works best for experienced testers who know the domain.

### Explain
Sources of good guesses:
- Past bugs in this product (defect clustering)
- Common developer mistakes (null handling, off-by-one, time zones, rounding)
- Integration points (network errors, slow APIs)
- User behaviour (refresh mid-transaction, multiple tabs, copy-paste)

Many teams keep an "error guessing checklist" to share this experience with newer testers.

### Example
On a payment page, the tester double-clicks "Pay" quickly and is charged twice. No requirement mentioned it, but double-submit is a well-known failure.

### Code text | Error guessing checklist
```text
[ ] Empty / spaces only        [ ] 1000+ characters
[ ] Emoji, ' " < > ; --        [ ] Leading / trailing spaces
[ ] Double-click submit        [ ] Browser back after submit
[ ] Refresh during payment     [ ] Session timeout mid-flow
[ ] Two tabs, same action      [ ] Time zone / DST dates
[ ] 0, negative, decimals      [ ] Copy-paste into OTP field
```

## Write test cases for a login page.
@topic test-design

### 60s
I'd group them. Functional positive: login with a valid email and password lands on the dashboard; "remember me" keeps me logged in. Negative: wrong password, unregistered email, blank fields, invalid email format, each showing a clear error. Security: password is masked, account locks after a set number of failed attempts, no SQL injection, session expires and logout works, and back button after logout doesn't show the dashboard. Non-functional: response time, keyboard navigation, screen reader labels and browser compatibility.

### Explain
Interviewers want structure, not a random list. Use categories:
1. **UI:** fields, labels, placeholder, tab order, password mask, show/hide icon.
2. **Functional positive:** valid login, case-insensitive email, remember me, forgot password link.
3. **Functional negative:** wrong password, unknown user, blank, spaces, invalid format, max length.
4. **Security:** lockout, generic error ("invalid email or password" not "wrong password"), HTTPS, injection, session handling.
5. **Non-functional:** performance, accessibility, cross-browser, mobile responsive.

Mention you'd prioritise and automate the most important ones.

### Example
High-priority picks for a smoke suite: valid login, wrong password error, lockout after 5 attempts, logout clears session.

### Code java | Two of them automated (Selenium)
```java
@Test
public void validLoginOpensDashboard() {
    loginPage.login("user@x.com", "Valid@123");
    assertTrue(driver.getCurrentUrl().contains("/dashboard"));
}

@Test
public void wrongPasswordShowsGenericError() {
    loginPage.login("user@x.com", "Wrong@123");
    assertEquals(loginPage.errorText(), "Invalid email or password");
}
```

## What is a test plan and what does it contain?
@topic test-design

### 60s
A test plan is a document that describes the scope, approach, resources and schedule of testing for a project or release. It answers what we will test, what we won't, how we'll test it, who will do it, when, with which tools and environments, what the entry and exit criteria are, and what the risks are. It's usually written by the test lead after requirement analysis and is agreed with stakeholders so everyone shares the same expectations.

### Explain
Typical sections (based on IEEE 829):
- Scope: in scope and out of scope
- Test approach / strategy: types of testing, manual vs automation
- Test environment and test data
- Entry and exit criteria, suspension and resumption criteria
- Roles and responsibilities
- Schedule and estimates
- Deliverables: test cases, reports
- Risks and mitigations
- Tools: Jira, TestRail, Selenium

In Agile, the test plan is often lighter: a one-page plan per release plus acceptance criteria per story.

### Example
Release 3.2 test plan: in scope are the new wallet feature and regression of checkout; out of scope is the admin portal. Exit criteria: 100% of P1 cases executed, 95% pass, no open critical bugs.

### Code text | One-page test plan outline
```text
1. Scope        : Wallet top-up, pay with wallet, checkout regression
   Out of scope : Admin portal, reports
2. Approach     : Manual for new features, automated regression nightly
3. Environments : QA (Chrome, Safari, Android 12+, iOS 16+)
4. Entry        : Build deployed, smoke passed
5. Exit         : 100% P1 executed, 0 open critical/blocker bugs
6. Risks        : Payment sandbox downtime -> use mock gateway
7. Schedule     : 10-14 Nov
```

## What is a Requirement Traceability Matrix (RTM)?
@topic test-design

### 60s
An RTM is a document, usually a table, that maps each requirement to the test cases that cover it, and often to the defects found and execution status. It helps ensure every requirement is tested, so nothing is missed. It also shows impact: if a requirement changes, we know exactly which tests to update. Forward traceability goes from requirements to tests; backward traceability goes from tests back to requirements, which also exposes tests that cover nothing.

### Explain
Columns: requirement ID, requirement description, test case IDs, execution status, defect IDs.

Types:
- **Forward:** requirement → tests (coverage)
- **Backward:** test → requirement (no unnecessary tests)
- **Bi-directional:** both

Tools like Jira with Xray/Zephyr or TestRail build it automatically by linking tests to stories.

### Example
| Req | Description | Test cases | Status | Defects |
|---|---|---|---|---|
| US-101 | Login with email | TC_01, TC_02, TC_03 | Pass | – |
| US-102 | Forgot password | TC_04, TC_05 | Fail | BUG-17 |
| US-103 | Social login | – | Not covered | – |

US-103 has no tests, which the RTM makes obvious.

### Code java | Linking tests to requirements in code
```java
// Many teams tag automated tests with the story ID,
// so reports can be grouped into a traceability view.
@Test(description = "US-101: login with valid email")
public void loginWithValidEmail() { /* ... */ }
```

## What are entry and exit criteria?
@topic test-design

### 60s
Entry criteria are the conditions that must be met before a testing phase can start, such as requirements signed off, the build deployed to the test environment, smoke tests passing and test data ready. Exit criteria are the conditions that tell us testing is complete enough to stop, such as all planned test cases executed, a target pass rate reached, no open critical or blocker defects, and the test summary report shared. They stop us from starting too early or finishing without evidence.

### Explain
Entry examples: approved requirements, test cases reviewed, environment and access ready, build smoke-tested.

Exit examples: 100% of high-priority tests executed, at least 95% pass rate, zero open blocker or critical bugs, known minor bugs accepted by the product owner, coverage of all requirements in the RTM.

Related terms: **suspension criteria** (when to pause, e.g., smoke fails or environment is down) and **resumption criteria**.

### Example
The team won't start system testing on build 5.1 because the payment service is down in QA (entry criterion not met). They release on Friday because all P1 tests passed and the two open bugs are low severity with product owner sign-off (exit criteria met).

### Code yaml | Exit criteria as a CI quality gate
```yaml
# Pseudo-config for a release gate
quality_gate:
  min_pass_rate: 95
  max_open_bugs:
    blocker: 0
    critical: 0
  required_suites: [smoke, regression]
```

## What is test data and how do you prepare it?
@topic test-design

### 60s
Test data is the input data we use to execute test cases: user accounts, products, orders, card numbers, files and so on. Good test data covers valid, invalid, boundary and special cases, and must be available in the right state before testing. We prepare it by creating it through the UI or APIs, inserting it into the database with SQL, copying and masking production data, or generating it with tools and libraries like Faker. Real customer data should never be used without masking.

### Explain
Types: valid, invalid, boundary, blank, large volume, and data for specific states (a cancelled order, a locked user).

Good practices:
- Keep test data separate from test logic (Excel, JSON, CSV).
- Make tests create their own data where possible, so they're independent.
- Clean up after tests.
- Use payment gateway sandbox cards, never real cards.
- Mask personal data (names, phone numbers) for privacy laws like GDPR and India's DPDP Act.

### Example
To test "reorder from order history", you need a user with at least one delivered order. Instead of clicking through checkout each time, create it with an API call or SQL insert before the test.

### Code java | Generating realistic data with Java Faker
```java
import com.github.javafaker.Faker;

Faker faker = new Faker();
String name  = faker.name().fullName();      // "Priya Sharma"
String email = faker.internet().emailAddress();
String phone = faker.number().digits(10);
```

# Module: Defects and bug reporting

## Explain the bug (defect) life cycle.
@topic fundamentals

### 60s
The bug life cycle is the set of states a defect goes through from discovery to closure. A tester logs it as New. The lead reviews it and moves it to Assigned for a developer, or marks it Rejected, Duplicate or Deferred. The developer works on it, Open or In Progress, then marks it Fixed. The tester retests: if it works, it's Closed; if not, it's Reopened and goes back to the developer. Exact names vary by tool and company, but the flow is the same.

### Explain
Common states:
- **New** → **Assigned** → **Open / In progress** → **Fixed** → **Ready for retest** → **Closed**
- **Reopened** if the retest fails
- **Rejected** (not a bug / works as designed), **Duplicate**, **Deferred** (fix in a later release), **Cannot reproduce**

Mention that in Jira the workflow is configurable, and that a good bug report reduces "cannot reproduce" rejections.

### Example
BUG-204 "Coupon applied twice": New (tester) → Assigned to Ravi → Fixed in build 1.8.3 → Retest fails on Safari → Reopened → Fixed in 1.8.4 → Retest passes → Closed.

### Code text | Flow
```text
New -> Assigned -> In progress -> Fixed -> Retest --pass--> Closed
                                             \--fail--> Reopened -> Assigned
New -> Rejected | Duplicate | Deferred | Cannot reproduce
```

## What is the difference between severity and priority? Give examples.
@topic fundamentals

### 60s
Severity is the impact of the bug on the system, how badly it breaks functionality, and it's usually set by the tester. Priority is how urgently it must be fixed, based on business needs, and it's usually set by the product owner or lead. They're independent. A spelling mistake in the company logo on the home page is low severity but high priority. A crash in a rarely used admin report from five years ago is high severity but low priority.

### Explain
Severity levels: Blocker, Critical, Major, Minor, Trivial.

Priority levels: P1 (fix now), P2 (this release), P3 (later), P4 (nice to have).

The four combinations, with examples:
| | High priority | Low priority |
|---|---|---|
| High severity | Payment fails for all users | App crashes on a deprecated Android 7 device |
| Low severity | Wrong company name on home page | Misaligned icon on settings page |

### Example
An e-commerce site shows ₹0 as the price for one product. Functionally minor (one product), but customers could buy it free during a sale, so high priority.

### Code text | In a bug report
```text
Title    : Checkout crashes when applying coupon SAVE10
Severity : Critical   (blocks purchase)
Priority : P1         (Diwali sale is live)
```

## What makes a good bug report?
@topic fundamentals

### 60s
A good bug report lets a developer reproduce the issue on the first try without asking questions. It has a clear, specific title, the environment and build, precise steps to reproduce, test data, the expected result, the actual result, and evidence like screenshots, a video or logs. It also has severity and priority, and reports one bug per ticket. Keep it factual and neutral: describe the behaviour, not the developer.

### Explain
Fields:
- **Title:** what + where + when. "Checkout: total ignores coupon when cart has a sale item".
- **Environment:** URL, build, browser/device, OS, user role.
- **Preconditions and test data.**
- **Steps to reproduce:** numbered, minimal.
- **Expected vs actual.**
- **Attachments:** screenshot, screen recording, console/network logs, API response.
- **Severity, priority, frequency** (always / intermittent).

Tips: retest before logging, check for duplicates, isolate the minimal steps, note if it's a regression.

### Example
Bad: "Coupon not working."

Good: "Checkout total ignores coupon SAVE10 when the cart contains a sale item (Chrome 129, build 2.4.1). Steps: 1. Add 'Blue Shirt' (sale) 2. Apply SAVE10 3. Go to checkout. Expected: ₹900. Actual: ₹1,000. Video attached. Happens every time."

### Code text | Bug template
```text
Title     : [Checkout] Total ignores coupon when cart has a sale item
Env       : QA, build 2.4.1, Chrome 129, Windows 11
Data      : user qa1@x.com, coupon SAVE10
Steps     : 1. Add "Blue Shirt" (sale item) to cart
            2. Apply coupon SAVE10
            3. Open checkout
Expected  : Total = 900 (10% off 1000)
Actual    : Total = 1000, coupon shows "applied"
Frequency : 5/5
Severity  : Major      Priority: P2
Evidence  : video.mp4, network.har
```

## What do you do if a developer says your bug is "not a bug"?
@topic fundamentals

### 60s
First I stay calm and make sure I'm right: I re-read the requirement or acceptance criteria and reproduce the issue again. Then I talk to the developer with evidence, the steps, screenshots and the exact requirement line, and listen to their reasoning, because maybe the requirement changed or I misunderstood. If we still disagree, I involve the product owner or business analyst, since they own the expected behaviour. If it's confirmed as intended, I close it and suggest updating the requirement so it's clear for everyone.

### Explain
What interviewers look for:
- **Collaboration, not conflict.** Quality is a team goal.
- **Evidence-based** communication.
- **Escalate to the right person** (the requirement owner), not to "win".
- **Learning:** if the requirement was ambiguous, raise that so it's fixed for the future.

If there's no written requirement, compare with similar features in the app, competitor behaviour, or common user expectations, and let the product owner decide.

### Example
I logged that the search is case-sensitive. The developer said "works as designed". The story didn't mention case. I asked the PO, who said users expect case-insensitive search, so it was accepted as a bug and the story template was updated to include case-sensitivity.

### Code text | A neutral message to the developer
```text
Hi Ravi, about BUG-311 (search is case-sensitive).
Story US-88 says "users can find products by name".
Searching "iphone" returns 0 results, "iPhone" returns 12 (video attached).
Is case-sensitive search intended? If unsure, shall we check with Meera (PO)?
```

## What is defect leakage and defect density?
@topic fundamentals

### 60s
Defect leakage measures how many defects escaped testing and were found later, usually in UAT or production. It's calculated as defects found after release divided by defects found in testing, times 100. Lower is better. Defect density is the number of defects per unit of size, usually per thousand lines of code or per module or feature. It helps identify which modules are most bug-prone, so we can focus testing there.

### Explain
- **Defect leakage % = (defects found in UAT/production ÷ defects found in QA) × 100.** Some teams use (post-release ÷ total) × 100. Say which formula your team used.
- **Defect density = defects ÷ size** (KLOC, function points, or number of stories).
- **Defect removal efficiency (DRE) = defects found before release ÷ total defects × 100.**

These metrics should drive improvement, not blame.

### Example
QA found 95 bugs in a release; customers found 5 more in production. Leakage = 5 ÷ 95 × 100 ≈ 5.3%. DRE = 95 ÷ 100 = 95%.

### Code python | Calculating the metrics
```python
qa_bugs, prod_bugs = 95, 5
leakage = prod_bugs / qa_bugs * 100          # 5.26 %
dre = qa_bugs / (qa_bugs + prod_bugs) * 100  # 95.0 %
density = 42 / 12.5                          # 42 bugs in 12.5 KLOC = 3.36 per KLOC
```

# Module: Agile basics for QA

## What is Agile and Scrum? What is the tester's role in Scrum?
@topic fundamentals

### 60s
Agile is a way of building software in small, frequent increments with continuous feedback, instead of one big release. Scrum is the most popular Agile framework: work happens in sprints of one to four weeks, with roles of product owner, scrum master and developers, and ceremonies like sprint planning, daily stand-up, sprint review and retrospective. In Scrum, testers are part of the development team. We review stories and acceptance criteria early, test within the same sprint, automate regression and help define "done".

### Explain
**Scrum roles:** Product Owner (backlog and priorities), Scrum Master (process and blockers), Developers (everyone who builds, including QA).

**Events:** sprint planning, daily scrum, sprint review (demo), retrospective, backlog refinement.

**Artifacts:** product backlog, sprint backlog, increment.

**QA in each event:**
- Refinement: ask questions, add acceptance criteria and edge cases.
- Planning: estimate testing effort.
- Stand-up: share testing status and blockers.
- Review: demo tested features.
- Retro: suggest quality improvements.

### Example
In a 2-week sprint, I test each story as soon as it's in a dev build instead of waiting for the end of the sprint, and automate its key checks so they join the regression suite.

### Code gherkin | Acceptance criteria a tester helps write
```gherkin
Feature: Apply coupon
  Scenario: Valid coupon reduces the total
    Given my cart total is 1000
    When I apply coupon "SAVE10"
    Then the total should be 900
```

## What is a user story and what are acceptance criteria?
@topic test-design

### 60s
A user story is a short description of a feature from the user's point of view, usually in the form "As a [role], I want [goal], so that [benefit]". Acceptance criteria are the specific, testable conditions the story must meet to be accepted by the product owner. They define the boundaries of the story and become the basis for test cases. A tester helps make them clear, testable and complete, including negative and edge cases, often written in Given-When-Then format.

### Explain
Good stories follow **INVEST**: Independent, Negotiable, Valuable, Estimable, Small, Testable.

Good acceptance criteria are:
- Specific and measurable ("within 2 seconds", not "fast")
- Cover positive, negative and edge cases
- Free of implementation detail

### Example
Story: "As a shopper, I want to save items to a wishlist so that I can buy them later."

Acceptance criteria:
1. Logged-in user can add an item from the product page.
2. Wishlist shows item name, price and stock status.
3. Adding the same item twice doesn't create duplicates.
4. Guest users are asked to log in.

### Code gherkin | Criteria in Given-When-Then
```gherkin
Scenario: Guest user tries to add to wishlist
  Given I am not logged in
  When I click "Add to wishlist" on a product
  Then I should see the login popup
  And the item should not be added
```

## What is the Definition of Done (DoD) and Definition of Ready (DoR)?
@topic fundamentals

### 60s
Definition of Ready is the checklist a story must meet before the team pulls it into a sprint: it's clear, estimated, has acceptance criteria, dependencies are known and designs are available. Definition of Done is the checklist a story must meet before it's considered complete: code reviewed, unit tests written, acceptance criteria tested and passing, no open critical bugs, automation added and documentation updated. DoR prevents starting unclear work; DoD prevents calling half-finished work done.

### Explain
DoD is shared by the whole team and applies to every story. QA should make sure it includes testing items, for example:
- Acceptance criteria verified by QA
- Regression passed
- Automated tests added for key paths
- No open blocker/critical defects
- Tested on agreed browsers/devices

### Example
A developer says "the story is done, just not tested yet". With a DoD that includes "QA verified", the story stays in progress, which keeps the sprint board honest.

### Code text | Sample DoD
```text
[ ] Code merged after peer review
[ ] Unit tests pass, coverage not reduced
[ ] All acceptance criteria tested by QA
[ ] Automated regression updated
[ ] No open Blocker/Critical bugs
[ ] Works on Chrome, Safari, Android, iOS
```

## What is the difference between Waterfall and Agile from a tester's view?
@topic fundamentals

### 60s
In Waterfall, testing is a separate phase that starts after development finishes, based on a detailed requirements document, so testers often find big problems late and under time pressure. In Agile, testing happens continuously within every sprint, alongside development, with shorter cycles, frequent releases and close collaboration with developers and the product owner. Agile testers need to work with changing requirements, automate regression heavily, and give fast feedback, rather than writing long documents up front.

### Explain
| | Waterfall | Agile |
|---|---|---|
| When testing starts | After development | From day one of each sprint |
| Requirements | Fixed, detailed SRS | Evolving user stories |
| Documentation | Heavy (test plan, cases) | Lighter, just enough |
| Feedback | Late | Continuous |
| Automation | Nice to have | Essential for regression |
| QA role | Separate team / gate | Part of the team |

Waterfall still suits projects with fixed, regulated requirements.

### Example
In a Waterfall bank project, testing started in month 6 and found a design flaw that took 2 months to fix. In an Agile team, the same flaw would show up in sprint 1's story review.

### Code text | Timeline
```text
Waterfall: [ Req ][ Design ][   Code   ][ Test ][ Release ]
Agile:     [Req|Code|Test|Release][Req|Code|Test|Release][...]
```

# Module: SQL basics for testers

## Why does a tester need SQL?
@topic sql

### 60s
Testers use SQL to verify that what the UI or API shows is actually saved correctly in the database, which is called back-end or database testing. We also use it to set up and clean test data, find data in specific states for a test, and investigate bugs, for example checking whether a wrong total comes from the UI calculation or from the stored data. Basic SELECT, WHERE, JOIN, GROUP BY, INSERT, UPDATE and DELETE cover most daily QA work.

### Explain
Common QA uses:
- **Data validation:** after placing an order in the UI, check the `orders` table has the right amount, status and user.
- **Test data setup:** insert a user or update an order's status to "shipped".
- **Finding data:** "give me a user with 3+ orders and an expired card".
- **Integrity checks:** no orphan records, no duplicates, constraints work.
- **Migration testing:** compare row counts and values between old and new tables.

Always use a test database and be careful with UPDATE/DELETE: write the WHERE first.

### Example
The UI shows an order as "Delivered", but the customer says they never got it. A query shows `status = 'SHIPPED'` and `delivered_at IS NULL`, so the bug is in the UI mapping, not the data.

### Code sql | Verifying an order after a UI action
```sql
SELECT o.order_id, o.status, o.total_amount, u.email
FROM orders o
JOIN users u ON u.user_id = o.user_id
WHERE u.email = 'qa1@example.com'
ORDER BY o.created_at DESC
LIMIT 1;
```

## What is the difference between a primary key, a foreign key and a unique key?
@topic sql

### 60s
A primary key uniquely identifies each row in a table. It can't be null and there's only one per table, like `user_id`. A unique key also prevents duplicate values, like an email column, but a table can have several and in most databases it allows a null. A foreign key is a column that refers to the primary key of another table, like `orders.user_id` pointing to `users.user_id`. It enforces referential integrity, so you can't create an order for a user who doesn't exist.

### Explain
| | Primary key | Unique key | Foreign key |
|---|---|---|---|
| Duplicates | No | No | Yes |
| Nulls | No | Usually one/many allowed | Allowed unless NOT NULL |
| Per table | One | Many | Many |
| Purpose | Row identity | Business uniqueness | Relationship |

Testing ideas: try to register two users with the same email (unique key), delete a user who has orders (foreign key should block or cascade).

### Example
`users(user_id PK, email UNIQUE)` and `orders(order_id PK, user_id FK → users.user_id)`.

### Code sql | Table definitions
```sql
CREATE TABLE users (
  user_id INT PRIMARY KEY,
  email   VARCHAR(100) UNIQUE NOT NULL
);

CREATE TABLE orders (
  order_id INT PRIMARY KEY,
  user_id  INT NOT NULL,
  total    DECIMAL(10,2),
  FOREIGN KEY (user_id) REFERENCES users(user_id)
);
```

## What is the difference between DELETE, TRUNCATE and DROP?
@topic sql

### 60s
DELETE removes rows from a table, either all rows or only those matching a WHERE clause. It's a DML command, can be rolled back inside a transaction, and fires triggers. TRUNCATE removes all rows at once, much faster, can't use a WHERE clause, usually resets identity counters, and in many databases can't be rolled back. DROP removes the whole table, structure and data, from the database. So DELETE is for selected rows, TRUNCATE empties the table, and DROP deletes the table itself.

### Explain
| | DELETE | TRUNCATE | DROP |
|---|---|---|---|
| Type | DML | DDL | DDL |
| WHERE | Yes | No | No |
| Removes | Rows | All rows | Table + data |
| Rollback | Yes (in transaction) | Depends on DB (not in MySQL/Oracle) | No |
| Speed | Slower (row by row) | Fast | Fast |
| Triggers | Fire | Don't fire | – |

### Example
Clean one test user's orders after a test: `DELETE FROM orders WHERE user_id = 501;`. Reset a staging log table: `TRUNCATE TABLE audit_log;`.

### Code sql | All three
```sql
DELETE FROM orders WHERE status = 'TEST';   -- selected rows
TRUNCATE TABLE temp_import;                 -- all rows, keep table
DROP TABLE old_backup_2023;                 -- table is gone
```

## How do you find the second highest salary from an Employee table?
@topic sql

### 60s
There are a few ways. The simplest is a subquery: select the max salary where salary is less than the overall max salary. Another way is to order distinct salaries descending and use LIMIT 1 OFFSET 1 in MySQL or PostgreSQL. The most flexible way is a window function: DENSE_RANK over salary descending, then pick rank 2, which also handles ties and works for the Nth highest. I'd mention DISTINCT or DENSE_RANK so duplicate salaries don't give the wrong answer.

### Explain
- **Subquery with MAX:** portable, only for 2nd highest.
- **LIMIT/OFFSET:** simple, use DISTINCT to handle duplicates.
- **DENSE_RANK:** best for Nth highest and ties. RANK would skip numbers after ties; DENSE_RANK doesn't.

If no second salary exists, the subquery returns NULL, which is usually the desired behaviour.

### Example
Salaries: 90k, 90k, 75k, 60k. Second highest = 75k. `ORDER BY salary DESC LIMIT 1 OFFSET 1` without DISTINCT would wrongly return 90k.

### Code sql | Three approaches
```sql
-- 1. Subquery
SELECT MAX(salary) FROM employee
WHERE salary < (SELECT MAX(salary) FROM employee);

-- 2. LIMIT / OFFSET (MySQL, PostgreSQL)
SELECT DISTINCT salary FROM employee
ORDER BY salary DESC LIMIT 1 OFFSET 1;

-- 3. Window function (Nth highest)
SELECT salary FROM (
  SELECT salary, DENSE_RANK() OVER (ORDER BY salary DESC) AS rnk
  FROM employee
) t WHERE rnk = 2;
```

## What is the difference between WHERE and HAVING? Explain GROUP BY.
@topic sql

### 60s
GROUP BY groups rows that share a value, like all orders per customer, so we can apply aggregate functions such as COUNT, SUM or AVG to each group. WHERE filters individual rows before grouping, and can't use aggregates. HAVING filters the groups after aggregation, so it can use aggregates. For example, to find customers who placed more than five orders in 2026, WHERE keeps only 2026 orders, GROUP BY groups by customer, and HAVING COUNT greater than five keeps the busy customers.

### Explain
Logical order of a query: FROM → WHERE → GROUP BY → HAVING → SELECT → ORDER BY → LIMIT.

That order explains the rule: WHERE runs before groups exist, so it can't see `COUNT(*)`.

Every column in SELECT must either be in GROUP BY or inside an aggregate.

### Example
Find cities with more than 100 active users. WHERE status = 'ACTIVE', GROUP BY city, HAVING COUNT(*) > 100.

### Code sql | WHERE vs HAVING
```sql
SELECT customer_id, COUNT(*) AS orders, SUM(total) AS spent
FROM orders
WHERE order_date >= '2026-01-01'      -- filter rows
GROUP BY customer_id
HAVING COUNT(*) > 5                   -- filter groups
ORDER BY spent DESC;
```

## What are the types of joins in SQL?
@topic sql

### 60s
Joins combine rows from two tables based on a related column. An INNER JOIN returns only rows that match in both tables. A LEFT JOIN returns all rows from the left table and matching rows from the right, with nulls where there's no match. RIGHT JOIN is the mirror image. A FULL OUTER JOIN returns all rows from both, matched where possible. A CROSS JOIN returns every combination, and a self join joins a table to itself, like employees to their managers.

### Explain
Testers use LEFT JOIN a lot to find missing data, for example users without orders or orders without payments, using `WHERE right.id IS NULL`.

Notes:
- MySQL doesn't support FULL OUTER JOIN directly; use LEFT JOIN UNION RIGHT JOIN.
- A filter on the right table in WHERE turns a LEFT JOIN into an INNER JOIN. Put it in the ON clause instead.

### Example
`users`: Asha, Ben, Chen. `orders`: Asha has 2 orders, Ben has 1. INNER JOIN gives 3 rows (Asha ×2, Ben). LEFT JOIN gives 4 rows, including Chen with NULL order.

### Code sql | Find users who never ordered
```sql
-- INNER: users with orders
SELECT u.name, o.order_id
FROM users u
INNER JOIN orders o ON o.user_id = u.user_id;

-- LEFT + IS NULL: users with no orders
SELECT u.name
FROM users u
LEFT JOIN orders o ON o.user_id = u.user_id
WHERE o.order_id IS NULL;
```

## How do you find duplicate records in a table?
@topic sql

### 60s
I group by the column or columns that should be unique and use HAVING COUNT greater than one. For example, to find duplicate emails in the users table: select email and count, group by email, having count greater than one. To see the full duplicate rows, I join that result back to the table or use ROW_NUMBER partitioned by email, where any row number above one is a duplicate. This is a common data-integrity check after imports or migrations.

### Explain
- **GROUP BY + HAVING:** shows which values are duplicated and how many times.
- **ROW_NUMBER() OVER (PARTITION BY ...):** labels each copy, which is useful to delete all but one.
- Duplicates in an "email" column also mean a missing unique constraint, which is worth a bug.

### Example
After a CSV import of 10,000 customers, the count looks right but 120 emails appear twice. The import didn't trim spaces, so "a@x.com" and "a@x.com " were treated as different.

### Code sql | Find and remove duplicates
```sql
-- Which emails are duplicated?
SELECT email, COUNT(*) AS copies
FROM users
GROUP BY email
HAVING COUNT(*) > 1;

-- Keep the first row, delete the rest (PostgreSQL / MySQL 8)
DELETE FROM users WHERE user_id IN (
  SELECT user_id FROM (
    SELECT user_id,
           ROW_NUMBER() OVER (PARTITION BY email ORDER BY user_id) AS rn
    FROM users
  ) t WHERE rn > 1
);
```

# Module: Git basics

## What is Git and what is the difference between Git and GitHub?
@topic git

### 60s
Git is a distributed version control system. It tracks changes to files over time, lets many people work on the same code in parallel using branches, and lets us go back to any earlier version. Every developer has the full history locally. GitHub is a cloud platform that hosts Git repositories and adds collaboration features like pull requests, code review, issues and GitHub Actions for CI. Git is the tool; GitHub, GitLab and Bitbucket are services built around it.

### Explain
Why testers need Git: automation code lives in Git, you create branches for new tests, raise pull requests for review, and CI pipelines run tests when code is pushed.

Key concepts: repository, commit, branch, merge, remote (origin), clone, pull request.

### Example
The automation framework is in a GitHub repo. I clone it, create a branch `feature/login-tests`, add tests, push, and open a pull request. A teammate reviews it, GitHub Actions runs the suite, and it's merged into `main`.

### Code bash | First steps
```bash
git clone https://github.com/acme/ui-tests.git
cd ui-tests
git checkout -b feature/login-tests
# ...add tests...
git add .
git commit -m "Add login negative tests"
git push -u origin feature/login-tests
```

## Explain the basic Git workflow and common commands.
@topic git

### 60s
Git has three areas: the working directory where I edit files, the staging area where I pick the changes for the next commit, and the repository where commits are stored. The daily flow is: git pull to get the latest code, create or switch to a branch, make changes, git status to see what changed, git add to stage, git commit with a clear message, and git push to send it to the remote. Then I open a pull request. git log and git diff help me review history and changes.

### Explain
| Command | Purpose |
|---|---|
| `git clone <url>` | Copy a remote repo |
| `git status` | See changed / staged files |
| `git add <file>` / `git add .` | Stage changes |
| `git commit -m "msg"` | Save a snapshot |
| `git push` | Upload commits |
| `git pull` | Fetch + merge remote changes |
| `git branch`, `git checkout -b`, `git switch` | Work with branches |
| `git log --oneline` | History |
| `git diff` | Show unstaged changes |
| `git stash` | Temporarily shelve changes |

### Example
I'm halfway through a test when an urgent fix is needed on another branch: `git stash`, switch branches, fix, commit, come back, `git stash pop`.

### Code bash | Daily loop
```bash
git switch main && git pull
git switch -c test/checkout-coupon
git status
git add src/test/java/CheckoutTest.java
git commit -m "Add coupon tests for checkout"
git push -u origin test/checkout-coupon
```

## What is a branch and why do we use branches?
@topic git

### 60s
A branch is an independent line of development, basically a movable pointer to a commit. We use branches so we can work on a feature, bug fix or new tests without affecting the main, stable code. When the work is ready and reviewed, the branch is merged back. Teams usually follow a strategy, for example a main branch that's always releasable, short-lived feature branches, and sometimes develop and release branches. Branches make parallel work safe and code review possible.

### Explain
Common strategies:
- **GitHub Flow:** main + short-lived feature branches + pull requests. Simple, used by most teams.
- **GitFlow:** main, develop, feature/*, release/*, hotfix/*. More process, for scheduled releases.
- **Trunk-based:** everyone merges small changes to main often, with feature flags.

Naming convention example: `feature/JIRA-123-login-tests`, `bugfix/flaky-cart-test`.

### Example
Two testers add tests at the same time, one for login and one for search, each on their own branch. Neither breaks the other's work, and both get reviewed separately.

### Code bash | Branch commands
```bash
git branch                     # list
git switch -c feature/search   # create + switch
git switch main                # go back
git merge feature/search       # merge into current branch
git branch -d feature/search   # delete after merge
```

## What is a merge conflict and how do you resolve it?
@topic git

### 60s
A merge conflict happens when Git can't automatically combine changes, usually because two branches changed the same lines of the same file, or one deleted a file the other changed. Git marks the conflicting section with arrows and equals signs. To resolve it, I open the file, understand both changes, often by talking to the other person, edit the file to keep the correct final version, remove the markers, then git add and commit, and run the tests to make sure nothing broke.

### Explain
Steps:
1. `git pull` or `git merge` reports CONFLICT.
2. `git status` lists the conflicted files.
3. Edit between `<<<<<<<`, `=======` and `>>>>>>>`.
4. `git add <file>` and `git commit` (or `git rebase --continue` during a rebase).
5. Run tests.

To reduce conflicts: pull often, keep branches short-lived, make small commits.

### Example
Two testers changed the base URL in `config.properties`. One used the staging URL, the other the QA URL. They agreed to keep QA and move the URL to an environment variable.

### Code text | Conflict markers
```text
<<<<<<< HEAD
baseUrl=https://qa.shop.com
=======
baseUrl=https://staging.shop.com
>>>>>>> feature/staging-tests
```

## What is the difference between git pull and git fetch?
@topic git

### 60s
git fetch downloads the latest commits and branches from the remote, but doesn't change my working files or my current branch. It just updates the remote-tracking branches like origin/main, so I can review what changed safely. git pull does a fetch and then immediately merges, or rebases if configured, those changes into my current branch. So fetch is "look first", and pull is "get and apply". I use fetch when I want to inspect changes before integrating them.

### Explain
- `git fetch origin` → updates `origin/main`, nothing else.
- `git diff main origin/main` → see what's new.
- `git pull` = `git fetch` + `git merge origin/<branch>`.
- `git pull --rebase` = fetch + rebase, which keeps a linear history.

### Example
Before a release I run `git fetch` and `git log main..origin/main` to see which new commits landed, so I know which areas to regression test.

### Code bash | Fetch, inspect, then merge
```bash
git fetch origin
git log --oneline main..origin/main   # what's new on remote
git merge origin/main                 # apply when ready
# or in one step:
git pull --rebase
```

# Module: Java basics for automation

## What are the four pillars of OOP? Explain with examples.
@topic programming

### 60s
The four pillars are encapsulation, inheritance, polymorphism and abstraction. Encapsulation means keeping data private and exposing it through methods, like page elements kept private in a page class. Inheritance lets a class reuse another class's code, like every test class extending a BaseTest that sets up the browser. Polymorphism means one interface, many forms, like method overloading or WebDriver driver equals new ChromeDriver. Abstraction hides implementation details, showing only what's needed, through interfaces and abstract classes.

### Explain
In a Selenium framework you use all four:
- **Encapsulation:** `private By username` in a page object, with a public `login()` method.
- **Inheritance:** `LoginTest extends BaseTest`.
- **Polymorphism:** `WebDriver driver = new FirefoxDriver();` (runtime) and overloaded `click(By)` / `click(WebElement)` (compile time).
- **Abstraction:** `WebDriver` is an interface; you don't need to know how ChromeDriver talks to the browser.

Interviewers love when you map OOP to your framework.

### Example
`BasePage` holds common methods (wait, click, type). `LoginPage extends BasePage` keeps its locators private and exposes `loginAs(user)`. Tests only call `loginAs`, not the locators.

### Code java | OOP in a framework
```java
public abstract class BasePage {                 // abstraction
    protected WebDriver driver;
    BasePage(WebDriver driver) { this.driver = driver; }
    protected void type(By by, String text) { driver.findElement(by).sendKeys(text); }
}

public class LoginPage extends BasePage {        // inheritance
    private final By email = By.id("email");     // encapsulation
    private final By pass  = By.id("password");
    LoginPage(WebDriver d) { super(d); }
    public void loginAs(String e, String p) { type(email, e); type(pass, p); }
}

WebDriver driver = new ChromeDriver();           // polymorphism
```

## What is the difference between method overloading and overriding?
@topic programming

### 60s
Overloading is having multiple methods with the same name in the same class but different parameters, different number or types. It's resolved at compile time, so it's compile-time polymorphism. Overriding is when a subclass provides its own implementation of a method that already exists in the parent class, with the same name, parameters and return type. It's resolved at runtime, so it's runtime polymorphism. Selenium examples: overloaded findElement-style helpers, and overriding TestNG listener methods like onTestFailure.

### Explain
| | Overloading | Overriding |
|---|---|---|
| Where | Same class | Parent and child |
| Signature | Different parameters | Same |
| Binding | Compile time | Runtime |
| Return type | Can differ | Same or covariant |
| static / private / final | Can be overloaded | Can't be overridden |

Use `@Override` so the compiler catches mistakes.

### Example
Overloading: `Actions.moveToElement(element)` and `moveToElement(element, x, y)`. Overriding: your listener class overrides `onTestFailure(ITestResult result)` to take a screenshot.

### Code java | Both
```java
// Overloading
void waitFor(By locator) { waitFor(locator, 10); }
void waitFor(By locator, int seconds) { /* explicit wait */ }

// Overriding
public class ScreenshotListener implements ITestListener {
    @Override
    public void onTestFailure(ITestResult result) {
        takeScreenshot(result.getName());
    }
}
```

## What is the difference between an interface and an abstract class?
@topic programming

### 60s
Both provide abstraction. An abstract class can have both abstract and concrete methods, instance variables, and constructors, and a class can extend only one. An interface defines a contract: methods are abstract by default, though since Java 8 they can have default and static methods, variables are public static final, and a class can implement many interfaces. Use an abstract class for shared base code, like BasePage. Use an interface for a capability, like WebDriver, which ChromeDriver and FirefoxDriver both implement.

### Explain
| | Abstract class | Interface |
|---|---|---|
| Methods | Abstract + concrete | Abstract, default, static, private (Java 9+) |
| Variables | Any | public static final only |
| Constructor | Yes | No |
| Inheritance | extends one | implements many |
| Use | Common base with shared code | Contract / capability |

Selenium: `WebDriver`, `WebElement`, `TakesScreenshot`, `JavascriptExecutor` are interfaces. `RemoteWebDriver` is a class implementing them.

### Example
`((TakesScreenshot) driver).getScreenshotAs(OutputType.FILE)` works because ChromeDriver implements the `TakesScreenshot` interface.

### Code java | Interface and abstract class
```java
public interface Reporter {           // contract
    void log(String message);
}

public abstract class BaseTest {      // shared code
    protected WebDriver driver;
    @BeforeMethod public void setUp() { driver = new ChromeDriver(); }
    @AfterMethod  public void tearDown() { driver.quit(); }
}
```

## Why is String immutable in Java? What is the difference between == and equals()?
@topic programming

### 60s
A String object can't be changed after it's created. Any "change", like concat or replace, creates a new String. It's immutable for security, because strings are used for URLs, passwords and class names, for thread safety, and so the JVM can reuse strings from the String pool. The double-equals operator compares references, whether two variables point to the same object. The equals method compares the actual content. For strings in tests, always use equals, like comparing an element's text with the expected text.

### Explain
- `String a = "QA"; String b = "QA";` → both point to the same pooled object, so `a == b` is true.
- `String c = new String("QA");` → new object, so `a == c` is false but `a.equals(c)` is true.
- Use `equalsIgnoreCase` for case-insensitive comparison.
- For lots of string building (like logs in a loop), use `StringBuilder` (mutable, faster).

### Example
A common beginner bug: `if (driver.getTitle() == "Home")` fails randomly. Use `"Home".equals(driver.getTitle())`, which also avoids a NullPointerException if the title is null.

### Code java | == vs equals
```java
String a = "QA";
String b = "QA";
String c = new String("QA");

System.out.println(a == b);       // true  (same pooled object)
System.out.println(a == c);       // false (different objects)
System.out.println(a.equals(c));  // true  (same content)

StringBuilder sb = new StringBuilder("Hello");
sb.append(" QA");                 // modified in place
```

## What is the difference between an Array and an ArrayList? When do you use a HashMap?
@topic programming

### 60s
An array has a fixed size set at creation, can hold primitives or objects, and uses length. An ArrayList is a resizable list from the Collections framework, holds objects only, using wrapper classes for primitives, and has handy methods like add, remove, contains and size. A HashMap stores key-value pairs with fast lookup by key, no duplicate keys, and no guaranteed order. In automation I use List for elements from findElements, and HashMap for test data or config like username to password.

### Explain
- **Array:** `String[] browsers = {"chrome","firefox"};` fixed size, fast.
- **ArrayList:** `List<String> names = new ArrayList<>();` dynamic, ordered, allows duplicates.
- **HashSet:** no duplicates, no order.
- **HashMap:** `Map<String,String> data = new HashMap<>();` key → value. `LinkedHashMap` keeps insertion order; `TreeMap` keeps keys sorted.

### Example
Verify a dropdown has no duplicate options: collect texts into a List, put them in a Set, and compare sizes.

### Code java | Collections in tests
```java
List<WebElement> options = driver.findElements(By.cssSelector("#city option"));
List<String> texts = new ArrayList<>();
for (WebElement o : options) texts.add(o.getText());

Set<String> unique = new HashSet<>(texts);
assertEquals(unique.size(), texts.size(), "Dropdown has duplicates");

Map<String, String> users = new HashMap<>();
users.put("admin", "Admin@123");
users.put("buyer", "Buyer@123");
String pwd = users.get("admin");
```

## Explain exception handling in Java. Checked vs unchecked exceptions?
@topic programming

### 60s
Exception handling lets a program deal with errors without crashing, using try, catch and finally, plus throw and throws. Checked exceptions are checked at compile time, so you must handle or declare them, like IOException when reading a file. Unchecked exceptions extend RuntimeException and happen at runtime, like NullPointerException or ArrayIndexOutOfBounds. In Selenium, most exceptions are unchecked, like NoSuchElementException, StaleElementReferenceException and TimeoutException. The finally block always runs, so it's good for cleanup like quitting the driver.

### Explain
- `try` → code that may fail; `catch` → handle; `finally` → always runs.
- `throw` → raise an exception; `throws` → declare that a method may throw.
- Try-with-resources closes resources automatically.

Common Selenium exceptions: `NoSuchElementException`, `ElementNotInteractableException`, `StaleElementReferenceException`, `TimeoutException`, `ElementClickInterceptedException`, `WebDriverException`.

Don't swallow exceptions in tests. A test that catches an error and passes hides bugs.

### Example
Reading test data from Excel throws `IOException` (checked), so the method declares `throws IOException`. Clicking an element that re-rendered throws `StaleElementReferenceException` (unchecked), which you fix by re-locating it.

### Code java | try / catch / finally
```java
try {
    driver.findElement(By.id("promo-close")).click();
} catch (NoSuchElementException e) {
    // Promo popup is optional: continue
} finally {
    log("Promo check done");
}

// Checked exception must be declared or handled
public Properties loadConfig() throws IOException {
    try (FileInputStream in = new FileInputStream("config.properties")) {
        Properties p = new Properties();
        p.load(in);
        return p;
    }
}
```

## Write a program to reverse a string and check if it is a palindrome.
@topic programming

### 60s
To reverse a string, the quickest way is new StringBuilder of the string, then reverse, then toString. Without built-ins, I loop from the last character to the first and append each one. A palindrome reads the same forwards and backwards, like "madam". I can compare the string to its reverse, or more efficiently use two pointers from both ends moving inward, returning false as soon as characters don't match. I'd normalise case and ignore spaces if the question allows.

### Explain
- `StringBuilder.reverse()` is O(n).
- Manual loop shows you understand indexing.
- Two-pointer palindrome is O(n) time, O(1) extra space.
- Edge cases: empty string, single character, mixed case, spaces and punctuation ("A man, a plan, a canal: Panama").

### Example
Input: "Level" → reversed "leveL" → palindrome when compared ignoring case.

### Code java | Reverse and palindrome
```java
public static String reverse(String s) {
    StringBuilder out = new StringBuilder();
    for (int i = s.length() - 1; i >= 0; i--) out.append(s.charAt(i));
    return out.toString();
}

public static boolean isPalindrome(String s) {
    String t = s.replaceAll("[^A-Za-z0-9]", "").toLowerCase();
    int i = 0, j = t.length() - 1;
    while (i < j) {
        if (t.charAt(i++) != t.charAt(j--)) return false;
    }
    return true;
}

// reverse("Selenium") -> "muineleS"
// isPalindrome("Madam") -> true
```

## Write a program to count the occurrence of each character in a string.
@topic programming

### 60s
I'd use a HashMap with the character as the key and the count as the value. Loop through the string's characters, and for each one use map.put with getOrDefault of that character plus one, or the merge method. To keep the order of first appearance, I'd use a LinkedHashMap. With Java 8 streams, I can do it in one line with groupingBy and counting. I'd also ask whether to ignore spaces and case.

### Explain
- Time O(n), space O(k) where k is the number of distinct characters.
- `LinkedHashMap` preserves insertion order; `TreeMap` sorts by character.
- Follow-ups: find the first non-repeating character (loop again and return the first with count 1), find duplicates (count > 1).

### Example
"automation" → a=2, u=1, t=2, o=2, m=1, i=1, n=1. First non-repeating: 'u'.

### Code java | HashMap and streams
```java
String s = "automation";
Map<Character, Integer> counts = new LinkedHashMap<>();
for (char c : s.toCharArray()) {
    counts.merge(c, 1, Integer::sum);
}
System.out.println(counts); // {a=2, u=1, t=2, o=2, m=1, i=1, n=1}

// Java 8 streams
Map<Character, Long> c2 = s.chars().mapToObj(ch -> (char) ch)
    .collect(Collectors.groupingBy(ch -> ch, LinkedHashMap::new, Collectors.counting()));
```

## What do static, final and the finally block mean in Java?
@topic programming

### 60s
static means the member belongs to the class rather than to an object, so it's shared by all instances and can be used without creating an object, like a static utility method or a static config. final means it can't change: a final variable can't be reassigned, a final method can't be overridden, and a final class can't be extended. finally is a block after try-catch that always runs, used for cleanup like closing files or quitting the browser. They're unrelated keywords that just sound similar.

### Explain
- **static:** `static WebDriver driver` is shared by all tests, which breaks parallel runs. That's why frameworks use `ThreadLocal<WebDriver>` instead.
- **final:** good for constants (`public static final int TIMEOUT = 10;`) and locators that shouldn't change.
- **finally:** runs even if an exception is thrown or there's a return. Doesn't run if the JVM exits (`System.exit`).
- **finalize()** was a deprecated method called by the garbage collector. Don't use it.

### Example
A framework had `public static WebDriver driver;`. When tests ran in parallel, one test closed another's browser. Switching to ThreadLocal fixed it.

### Code java | All three
```java
public class Config {
    public static final int TIMEOUT = 10;               // constant
    public static String env() { return System.getProperty("env", "qa"); }
}

try {
    runTest();
} finally {
    driver.quit();   // always clean up
}
```

## What is a constructor? What do this and super mean?
@topic programming

### 60s
A constructor is a special method with the same name as the class and no return type. It runs automatically when an object is created and initialises it. If you don't write one, Java provides a default no-argument constructor. this refers to the current object, often used to tell a field apart from a parameter with the same name, like this.driver equals driver. super refers to the parent class: super() calls the parent constructor and super.method() calls the parent's version of a method.

### Explain
- Constructors can be overloaded.
- `this()` calls another constructor in the same class; `super()` calls the parent constructor. Either must be the first line.
- In page objects, the constructor receives the WebDriver and often calls `PageFactory.initElements(driver, this)`.

### Example
`LoginPage(WebDriver driver) { super(driver); }` passes the driver to `BasePage`, which stores it for shared helper methods.

### Code java | Constructor, this, super
```java
public class BasePage {
    protected WebDriver driver;
    public BasePage(WebDriver driver) {
        this.driver = driver;            // this = current object
    }
}

public class HomePage extends BasePage {
    public HomePage(WebDriver driver) {
        super(driver);                   // call parent constructor
        PageFactory.initElements(driver, this);
    }
}
```

# Module: Introduction to automation and Selenium

## What is test automation, and which test cases should you automate?
@topic selenium

### 60s
Test automation means using tools and scripts to execute tests, compare actual and expected results and report, without manual effort. Good candidates are tests that are repetitive and run often, like regression and smoke; stable features; data-driven tests with many inputs; tests that are slow or error-prone by hand; and critical business flows. Poor candidates are features that change often, one-time tests, usability and look-and-feel checks, and exploratory testing. Automation supports manual testing; it doesn't replace thinking.

### Explain
Benefits: speed, repeatability, wider coverage, runs in CI on every change, frees testers for exploratory work.

Costs: initial build effort, maintenance when the UI changes, need for coding skills, flaky tests if poorly designed.

ROI rule of thumb: automate if the test will run many times and the feature is stable. Follow the test pyramid: more API and unit tests, fewer UI tests.

### Example
A 300-case manual regression took 4 days per release. Automating the 150 most-used flows brought it to 40 minutes in CI, and manual effort moved to exploratory testing of new features.

### Code text | Should I automate it?
```text
Runs every release?            yes -> +1
Feature stable?                yes -> +1
Many data combinations?        yes -> +1
Critical business flow?        yes -> +1
Needs human judgement (UX)?    yes -> -2
Score >= 2 -> automate
```

## What is Selenium and what are its components?
@topic selenium

### 60s
Selenium is a free, open-source suite for automating web browsers. It supports many languages, like Java, Python, C# and JavaScript, and all major browsers. Its components are Selenium WebDriver, the core library that drives the browser using the W3C WebDriver protocol; Selenium IDE, a browser extension to record and play back tests; and Selenium Grid, which runs tests in parallel on multiple machines and browsers. Selenium RC was the old version and is deprecated. Selenium 4 is the current major version.

### Explain
- **WebDriver:** language bindings send commands to a browser driver (chromedriver, geckodriver), which controls the real browser. Selenium 4 uses the W3C standard protocol.
- **IDE:** quick prototypes and learning; not for real frameworks.
- **Grid:** hub/router + nodes, or Docker images, for distributed runs.
- **Selenium Manager** (4.6+) downloads the right driver automatically.

Limitations: web only (use Appium for mobile), no built-in reporting or test runner (use TestNG/JUnit), can't automate CAPTCHA or desktop dialogs.

### Example
A Java + Selenium + TestNG framework runs 200 regression tests on Selenium Grid across Chrome, Firefox and Edge in parallel.

### Code java | Selenium 4 hello world
```java
WebDriver driver = new ChromeDriver();   // Selenium Manager finds the driver
driver.get("https://example.com");
System.out.println(driver.getTitle());
driver.quit();
```

## Write your first Selenium script to open a site and verify the title.
@topic selenium

### 60s
I create a WebDriver instance, like new ChromeDriver, which in Selenium 4 automatically gets the right driver through Selenium Manager. I maximise the window, open the URL with driver.get, read the title with getTitle, and assert it equals the expected title. Finally I call driver.quit to close the browser and end the session. In a real test I'd put setup in a BeforeMethod, the check in a Test method using TestNG assertions, and quit in an AfterMethod.

### Explain
- `driver.get(url)` waits for the page load event.
- `driver.close()` closes the current window; `driver.quit()` closes all windows and ends the session. Always use quit at the end to avoid leftover browser processes.
- Use an assertion library (TestNG `Assert`, JUnit `Assertions`) so failures are reported properly.

### Example
Open the Selenium website and check the title contains "Selenium".

### Code java | With TestNG
```java
public class TitleTest {
    WebDriver driver;

    @BeforeMethod
    public void setUp() {
        driver = new ChromeDriver();
        driver.manage().window().maximize();
    }

    @Test
    public void titleContainsSelenium() {
        driver.get("https://www.selenium.dev");
        Assert.assertTrue(driver.getTitle().contains("Selenium"));
    }

    @AfterMethod
    public void tearDown() {
        driver.quit();
    }
}
```

## What are the different locators in Selenium? Which is best?
@topic selenium

### 60s
Selenium has eight locators: id, name, className, tagName, linkText, partialLinkText, cssSelector and xpath. The best choice is a unique, stable attribute: id first if it's unique and not auto-generated, or a dedicated test attribute like data-testid. Next is a CSS selector, which is fast and readable. XPath is the most powerful, since it can find elements by text and navigate up to parents, but long absolute XPaths are fragile. I avoid locators based on position or styling classes that change often.

### Explain
Priority order: `id` / `data-testid` → `name` → CSS → relative XPath → link text.

Selenium 4 also added **relative locators**: `above`, `below`, `toLeftOf`, `toRightOf`, `near`.

Avoid:
- Absolute XPath `/html/body/div[2]/div/form/input[1]`
- Dynamic IDs like `input-8273`
- Index-based selectors unless there's no other option

Ask developers to add `data-testid` attributes. It's the most reliable approach.

### Example
For `<button id="loginBtn" class="btn primary" data-testid="login">Log in</button>`: best is `By.id("loginBtn")` or `By.cssSelector("[data-testid='login']")`, not `By.className("btn")`.

### Code java | All locator types
```java
driver.findElement(By.id("email"));
driver.findElement(By.name("password"));
driver.findElement(By.className("error-msg"));
driver.findElement(By.tagName("h1"));
driver.findElement(By.linkText("Forgot password?"));
driver.findElement(By.partialLinkText("Forgot"));
driver.findElement(By.cssSelector("[data-testid='login']"));
driver.findElement(By.xpath("//button[text()='Log in']"));
```

## What is the difference between findElement and findElements?
@topic selenium

### 60s
findElement returns the first matching WebElement, and throws NoSuchElementException if nothing matches. findElements returns a list of all matching elements, and returns an empty list if none match, without throwing. I use findElement when I expect exactly one element, like a login button. I use findElements to work with multiple elements, like all rows in a table or all links, or to safely check whether an element exists by checking if the list is empty.

### Explain
| | findElement | findElements |
|---|---|---|
| Returns | WebElement | List<WebElement> |
| No match | NoSuchElementException | Empty list |
| Use | One element | Many / existence check |

Both respect the implicit wait if one is set. With an implicit wait, `findElements` on a missing element waits the full timeout before returning empty, which slows down existence checks.

### Example
Count search results and verify every result title contains the search word.

### Code java | Both in action
```java
WebElement search = driver.findElement(By.name("q"));
search.sendKeys("laptop", Keys.ENTER);

List<WebElement> results = driver.findElements(By.cssSelector(".result-title"));
Assert.assertFalse(results.isEmpty(), "No results");
for (WebElement r : results) {
    Assert.assertTrue(r.getText().toLowerCase().contains("laptop"));
}

boolean bannerShown = !driver.findElements(By.id("promo")).isEmpty();
```

## How do you handle a dropdown in Selenium?
@topic selenium

### 60s
For a standard HTML select element, Selenium provides the Select class. I wrap the element with new Select, then choose an option with selectByVisibleText, selectByValue or selectByIndex. I can read the selected option with getFirstSelectedOption, and all options with getOptions. For multi-select lists there's isMultiple and deselect methods. If the dropdown is a custom one built with divs, not a select tag, Select won't work, so I click to open it and then click the option using a locator.

### Explain
- `selectByVisibleText("India")` is the most readable and most common.
- `selectByValue("IN")` uses the `value` attribute.
- `selectByIndex(2)` is fragile if options change.
- Using Select on a non-`<select>` element throws `UnexpectedTagNameException`.
- For custom dropdowns (React, Angular Material), wait for the list to appear before clicking the option.

### Example
Country dropdown: select "India", then verify the state dropdown loads Indian states.

### Code java | Standard and custom dropdowns
```java
// Standard <select>
Select country = new Select(driver.findElement(By.id("country")));
country.selectByVisibleText("India");
Assert.assertEquals(country.getFirstSelectedOption().getText(), "India");

// Custom div-based dropdown
driver.findElement(By.cssSelector(".city-dropdown")).click();
new WebDriverWait(driver, Duration.ofSeconds(5))
    .until(ExpectedConditions.elementToBeClickable(By.xpath("//li[text()='Pune']")))
    .click();
```

## What is the difference between implicit wait and explicit wait?
@topic selenium

### 60s
Waits handle the time a page takes to load or update. An implicit wait is set once on the driver and applies to every findElement call: Selenium keeps polling up to that time before throwing NoSuchElementException. An explicit wait, using WebDriverWait with ExpectedConditions, waits for a specific condition on a specific element, like visible or clickable, up to a timeout. Explicit waits are preferred because they're targeted and handle more than presence. Never use Thread.sleep, and don't mix implicit and explicit waits.

### Explain
| | Implicit | Explicit |
|---|---|---|
| Scope | Global, all find calls | One condition |
| Conditions | Presence only | Visible, clickable, text present, URL, alert, invisibility... |
| Set | `driver.manage().timeouts().implicitlyWait(...)` | `new WebDriverWait(driver, Duration)` |

Mixing them can cause unpredictable wait times. `Thread.sleep` always waits the full time, making tests slow and still flaky. There's also **FluentWait**, which lets you set polling interval and ignored exceptions.

### Example
After clicking "Search", results load via AJAX. An explicit wait for `visibilityOfElementLocated(By.css(".result"))` continues as soon as results appear, instead of sleeping 5 seconds.

### Code java | Implicit vs explicit
```java
// Implicit (global)
driver.manage().timeouts().implicitlyWait(Duration.ofSeconds(10));

// Explicit (preferred)
WebDriverWait wait = new WebDriverWait(driver, Duration.ofSeconds(10));
WebElement result = wait.until(
    ExpectedConditions.visibilityOfElementLocated(By.cssSelector(".result")));
wait.until(ExpectedConditions.elementToBeClickable(By.id("checkout"))).click();
```
