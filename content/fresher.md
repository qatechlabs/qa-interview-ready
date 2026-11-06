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
