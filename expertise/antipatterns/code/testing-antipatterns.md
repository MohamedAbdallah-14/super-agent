# Testing Anti-Patterns

> Testing is the primary safety net for software quality, yet the tests themselves are frequently riddled with anti-patterns that create a false sense of security, slow down development, and allow real bugs to escape into production. A bad test suite is worse than no test suite: it costs time to maintain, lies about what it verifies, and erodes developer trust until the team ignores test results entirely. The anti-patterns below represent the most common, most damaging, and most subtle ways test suites fail their purpose.

> **Domain:** Code
> **Anti-patterns covered:** 22
> **Highest severity:** Critical

---

## Anti-Patterns

### AP-01: The Mockery (Over-Mocking)

**Also known as:** Mock Happy, Mock Hell, Mockitis, Test Double Abuse
**Frequency:** Very Common
**Severity:** Critical
**Detection difficulty:** Moderate

**What it looks like:**
A test where the majority of the code is setting up mocks, stubs, and fakes. The system under test calls mocked dependencies that return pre-configured values, and the assertions verify that those pre-configured values flowed through correctly. The actual business logic is barely exercised because every collaborator has been replaced with a controlled stand-in.

```python
# BAD: More mock setup than actual testing
def test_process_order(self):
    mock_db = Mock()
    mock_payment = Mock()
    mock_inventory = Mock()
    mock_email = Mock()
    mock_logger = Mock()

    mock_inventory.check_stock.return_value = True
    mock_payment.charge.return_value = PaymentResult(success=True)
    mock_db.save.return_value = Order(id=1)

    service = OrderService(mock_db, mock_payment, mock_inventory, mock_email, mock_logger)
    result = service.process(order_data)

    # Testing that mocks returned what we told them to return
    assert result.success == True
```

**Why developers do it:**
Mocking makes tests fast and isolated. Developers learn early that "unit tests should not touch the database" and overcorrect by mocking everything. Mocking frameworks make it trivially easy to stub out any dependency. The resulting test runs in milliseconds and appears to provide coverage.

**What goes wrong:**
The test verifies the wiring between mocks, not the actual behavior. When the real database, payment gateway, or inventory service behaves differently than the mock (different error format, different null handling, different timing), the test passes but production breaks. Google's testing blog documented that over-mocked tests accounted for a significant portion of tests that passed in CI but failed to catch real integration bugs. The mocking approach also couples tests tightly to implementation details -- any refactoring of how dependencies are called breaks every test, even when the behavior is unchanged.

**The fix:**
Reserve mocks for true external boundaries (network calls, third-party APIs, clocks). Use real implementations for internal collaborators. For database interactions, use in-memory databases or test containers. Apply the "Sociable Unit Test" pattern where the unit under test uses real collaborators.

```python
# BETTER: Real collaborators, mock only the external boundary
def test_process_order(self):
    db = InMemoryOrderRepository()
    payment = FakePaymentGateway(always_succeeds=True)
    inventory = InMemoryInventory({"SKU-1": 10})
    email = SpyEmailSender()

    service = OrderService(db, payment, inventory, email)
    result = service.process(order_data)

    assert result.success == True
    assert db.find(result.order_id) is not None
    assert email.sent_count == 1
```

**Detection rule:**
If a test method has more lines of mock setup than lines of assertions and action combined, suspect AP-01. Count the `Mock()`, `.return_value`, and `.side_effect` calls -- if they exceed 5, the test is likely over-mocked.

---

### AP-02: Testing Implementation, Not Behavior

**Also known as:** Structural Inspection, White-Box Obsession, Brittle Tests
**Frequency:** Very Common
**Severity:** Critical
**Detection difficulty:** Moderate

**What it looks like:**
Tests that assert on internal method calls, private state, execution order, or specific code paths rather than observable outputs. The test knows exactly how the code works and verifies that it works that way, rather than verifying what it produces.

```javascript
// BAD: Testing HOW it works, not WHAT it does
test('calculates discount', () => {
  const calculator = new PriceCalculator();
  const spy = jest.spyOn(calculator, '_applyTierDiscount');

  calculator.calculateTotal(items, customer);

  expect(spy).toHaveBeenCalledWith(items, 'gold');
  expect(spy).toHaveBeenCalledTimes(1);
});
```

**Why developers do it:**
It feels thorough. Developers reason: "I know the discount logic goes through `_applyTierDiscount`, so I should verify it gets called." It is also easier to write -- asserting on calls is simpler than computing the expected output. Code coverage tools reward this approach because every branch gets "tested."

**What goes wrong:**
Every refactoring breaks the tests even when the behavior is correct. Kent Beck's principle states: "Programmer tests should be sensitive to behavior changes and insensitive to structure changes." When tests are coupled to structure, developers stop refactoring because the cost of updating tests exceeds the perceived benefit. The codebase ossifies. Meanwhile, the tests provide a false sense of security because they verify the mechanism, not the result -- a method could be called correctly but produce the wrong output, and the test would still pass.

**The fix:**
Test the public API. Assert on outputs, side effects observable from outside, and state changes visible through the public interface.

```javascript
// GOOD: Testing WHAT it does
test('gold customers get 20% discount on orders over $100', () => {
  const calculator = new PriceCalculator();
  const goldCustomer = { tier: 'gold' };
  const items = [{ price: 50 }, { price: 80 }];

  const total = calculator.calculateTotal(items, goldCustomer);

  expect(total).toBe(104); // (50 + 80) * 0.80
});
```

**Detection rule:**
If a test uses `spyOn` on private/internal methods, accesses properties prefixed with `_`, uses reflection to read private fields, or asserts on the number of times an internal method was called, suspect AP-02.

---

### AP-03: Flaky / Non-Deterministic Tests

**Also known as:** The Blinking Test, Heisenbug Test, Random Failures
**Frequency:** Very Common
**Severity:** Critical
**Detection difficulty:** Hard

**What it looks like:**
A test that passes most of the time but occasionally fails without any code change. Re-running the test suite makes it pass again. Common causes include: reliance on system time, race conditions in async code, order-dependent tests, network calls to real services, and uncontrolled randomness.

```java
// BAD: Depends on timing
@Test
void testCacheExpiry() {
    cache.put("key", "value", Duration.ofMillis(100));
    Thread.sleep(150);  // Might not be enough on a loaded CI server
    assertNull(cache.get("key"));
}
```

**Why developers do it:**
The test works on the developer's machine. CI servers are faster or slower than expected, but the developer does not see the failure locally. Some flakiness is introduced unknowingly through shared state or implicit ordering. The developer ships it, and the flakiness only manifests under load or on different hardware.

**What goes wrong:**
Google reported that approximately 16% of their tests exhibit flaky behavior, and flaky tests took 1.5 times longer to fix than non-flaky ones. At scale, flaky tests cost engineering organizations over $4.3M annually in lost productivity (investigation time, re-runs, lost trust). The worst consequence is cultural: developers learn to ignore test failures ("it's just a flaky test"), and real bugs slip through because the signal is buried in noise. Spotify reported that their pre-merge suite of 48,000 tests required dedicated tooling to skip slow and flaky tests, and they invested heavily in flakiness detection infrastructure.

**The fix:**
Eliminate non-determinism at the source. Use injectable clocks instead of `Thread.sleep`. Use deterministic seeds for randomness. Isolate test state so order does not matter. Replace real network calls with controlled fakes. For async operations, use explicit synchronization (latches, futures, polling with timeout) rather than arbitrary delays.

```java
// GOOD: Deterministic time control
@Test
void testCacheExpiry() {
    FakeClock clock = new FakeClock();
    Cache cache = new Cache(clock);
    cache.put("key", "value", Duration.ofMillis(100));
    clock.advance(Duration.ofMillis(150));
    assertNull(cache.get("key"));
}
```

**Detection rule:**
If a test uses `Thread.sleep`, `time.sleep`, `setTimeout` with a magic number, `Date.now()`, `Math.random()` without a seed, or makes real HTTP calls, suspect AP-03. Also flag any test that has been re-run or marked `@Retry` in CI configuration.

---

### AP-04: Testing Private Methods Directly

**Also known as:** The Anal Probe, The Inspector, Encapsulation Violation
**Frequency:** Common
**Severity:** High
**Detection difficulty:** Easy

**What it looks like:**
Tests that use reflection, `@VisibleForTesting` annotations, or language-specific hacks to access and test private/internal methods directly. The test reaches inside the class to call methods that are not part of the public contract.

```csharp
// BAD: Using reflection to test a private method
[Test]
public void TestParseInternalFormat()
{
    var parser = new DataProcessor();
    var method = typeof(DataProcessor).GetMethod("ParseInternalFormat",
        BindingFlags.NonPublic | BindingFlags.Instance);
    var result = method.Invoke(parser, new object[] { rawData });
    Assert.AreEqual(expected, result);
}
```

**Why developers do it:**
The private method contains complex logic that the developer wants to test in isolation. Testing it through the public API feels indirect and requires more setup. The developer reasons: "This private method is the hard part; I should test it directly." Some code coverage tools flag uncovered private methods, pressuring developers to test them.

**What goes wrong:**
The test is now coupled to the internal structure. Any refactoring -- renaming the method, changing its signature, inlining it, or splitting it -- breaks the test. Worse, it signals a design problem: if a private method is complex enough to need its own tests, it likely belongs in a separate class. Vladimir Khorikov documented that the root issue is not encapsulation violation per se, but that testing private methods masks a missing abstraction that should be extracted and tested through its own public API.

**The fix:**
Test private methods indirectly through the public API. If the private method is too complex for that, extract it into a separate class with its own public interface and test that class directly.

```csharp
// GOOD: Extract the complex logic into its own testable class
public class InternalFormatParser
{
    public ParsedData Parse(byte[] rawData) { /* ... */ }
}

[Test]
public void TestInternalFormatParsing()
{
    var parser = new InternalFormatParser();
    var result = parser.Parse(rawData);
    Assert.AreEqual(expected, result);
}
```

**Detection rule:**
If a test uses reflection to access non-public members, uses `@VisibleForTesting` or `internal` access modifiers added solely for testing, or imports a method that starts with `_`, suspect AP-04.

---

### AP-05: The Coverage Obsession

**Also known as:** 100% Coverage Cult, Goodhart's Test, Metric Gaming
**Frequency:** Common
**Severity:** High
**Detection difficulty:** Moderate

**What it looks like:**
Teams enforce a hard 100% (or near-100%) code coverage requirement. Developers write trivial tests for getters, setters, constructors, and configuration code just to hit the number. Tests verify that code runs but not that it works correctly. Coverage becomes a KPI that is gamed rather than a signal that is interpreted.

```java
// BAD: Testing a getter to inflate coverage
@Test
void testGetName() {
    User user = new User("Alice");
    assertEquals("Alice", user.getName());
}

// BAD: Testing framework configuration
@Test
void testSpringContextLoads() {
    assertNotNull(applicationContext);
}
```

**Why developers do it:**
Management mandates coverage thresholds. CI pipelines reject PRs below the threshold. Developers fill the gap with the easiest possible tests rather than the most valuable ones. The metric is visible and gameable, while actual test quality is invisible and subjective.

**What goes wrong:**
Google's own testing guidelines recommend "60% as acceptable, 75% as commendable, and 90% as exemplary" -- not 100%. Research has shown that when coverage becomes a target, teams optimize for the metric rather than for quality (Goodhart's Law). The resulting tests are expensive to maintain, break on every refactoring, and provide no safety. Codecov's analysis documented that teams pursuing 100% coverage spent disproportionate effort on the last 10-20% of code (edge cases in generated code, third-party adapters, trivial boilerplate), producing tests that caught zero real bugs. Meanwhile, the complex business logic at 80% coverage was undertested because developers spent their time elsewhere.

**The fix:**
Set coverage floors (70-85%), not ceilings. Track coverage trends rather than absolute numbers. Measure mutation testing scores for critical modules -- mutation testing verifies that tests actually catch bugs, not just execute code. Exclude generated code, DTOs, and trivial boilerplate from coverage requirements.

**Detection rule:**
If a test file contains only getter/setter tests, constructor tests, or tests that assert `assertNotNull` on injected dependencies, suspect AP-05. If the team has a 100% coverage requirement and tests are being added with no assertions beyond "it runs," this is active.

---

### AP-06: Assertion-Free Testing

**Also known as:** The Secret Catcher, The Placebo Test, Happy Path Smoke
**Frequency:** Common
**Severity:** High
**Detection difficulty:** Easy

**What it looks like:**
A test that calls production code but contains no assertions. It relies entirely on "no exception thrown" as the success criterion. The test method invokes a function and considers the test passed if execution completes without error.

```python
# BAD: No assertions at all
def test_process_payment():
    processor = PaymentProcessor()
    processor.process(valid_order)
    # ... that's it. No assertions.

# BAD: Assert only that no exception was thrown
def test_generate_report():
    generator = ReportGenerator()
    try:
        generator.generate(data)
    except Exception:
        self.fail("Report generation raised an exception")
    # But never checks the report content
```

**Why developers do it:**
The developer wants quick coverage credit. The function is hard to observe (it writes to a file, sends an email, updates a database) and the developer does not invest in making the output inspectable. Martin Fowler documented this as "Assertion Free Testing" and noted that the most common reason is lack of observability -- the system under test does not expose its results in a way that is easy to assert on.

**What goes wrong:**
The test passes regardless of whether the function produces correct output. A payment processor that silently charges the wrong amount, a report generator that produces empty files, a data pipeline that drops records -- all pass these tests. The developer and the team believe these paths are tested. They are not. Research on JUnit test suites found that tests without assertions can achieve 100% code coverage while catching zero defects.

**The fix:**
Every test must assert on at least one observable outcome. If the function's output is hard to observe, refactor for testability: return values instead of void, use spy objects for side effects, or inject observable collaborators.

```python
# GOOD: Assert on observable outcomes
def test_process_payment():
    ledger = InMemoryLedger()
    processor = PaymentProcessor(ledger)

    result = processor.process(valid_order)

    assert result.status == "completed"
    assert ledger.last_entry().amount == valid_order.total
    assert ledger.last_entry().merchant == valid_order.merchant_id
```

**Detection rule:**
If a test method contains zero `assert`, `expect`, `should`, or equivalent assertion calls, it is AP-06. Static analysis tools can flag test methods with no assertion statements.

---

### AP-07: The Ice Cream Cone (Inverted Test Pyramid)

**Also known as:** Inverted Pyramid, E2E Heavy, Manual Testing Addiction
**Frequency:** Common
**Severity:** High
**Detection difficulty:** Easy

**What it looks like:**
The test suite has many end-to-end and UI tests, fewer integration tests, and very few (or no) unit tests. The majority of test effort goes into manual testing. The test distribution is the inverse of the recommended testing pyramid (many unit tests at the base, fewer integration tests in the middle, few E2E tests at the top).

**Why developers do it:**
E2E tests feel more "real" and trustworthy because they test the whole system. Writing unit tests requires understanding dependency injection and test doubles, which feels harder. In organizations without a strong testing culture, QA teams write E2E/manual tests because that is what they know. The first tests a team writes are often E2E because they require no code changes to support testability.

**What goes wrong:**
LayerX, a fintech company, documented this pattern: their manual E2E test suite grew to 900 items, and despite a two-day release cycle, three bugs slipped through immediately after a stable release due to human error in manual E2E testing. The problems with the inverted pyramid are compounding: E2E tests are slow (minutes to hours per run), flaky (browser timeouts, network issues, CSS selector changes), expensive to maintain (UI changes break many tests), and provide poor failure localization (a failing E2E test does not tell you which module has the bug). Teams with this pattern ship slower because the feedback loop is measured in hours, not seconds.

**The fix:**
Adopt the testing pyramid: 70% unit tests (fast, isolated, precise), 20% integration tests (verify module interactions), 10% E2E tests (critical user journeys only). When an E2E test fails, write a unit test that catches the same bug, then consider removing the E2E test.

**Detection rule:**
Count the tests at each level. If E2E/UI tests outnumber unit tests, or if the majority of testing is manual, suspect AP-07. If the full test suite takes more than 15 minutes, the pyramid is likely inverted.

---

### AP-08: Shared Mutable State Between Tests

**Also known as:** Generous Leftovers, Test Pollution, Order-Dependent Tests
**Frequency:** Common
**Severity:** High
**Detection difficulty:** Hard

**What it looks like:**
Tests share a database, a static/global variable, a singleton, a file on disk, or an in-memory collection that is mutated by one test and read by another. Tests pass when run in a specific order but fail when run in isolation, in parallel, or in a different order.

```python
# BAD: Shared class-level state
class TestUserService:
    users_db = {}  # Shared across all tests

    def test_create_user(self):
        self.users_db["alice"] = User("alice")
        assert "alice" in self.users_db

    def test_list_users(self):
        # Depends on test_create_user having run first
        assert len(self.users_db) == 1
```

**Why developers do it:**
Setting up test data is expensive. Developers reason: "The previous test already created the user, so I'll just use it." Shared setup methods (`@BeforeAll`, `setUpClass`) are convenient but dangerous when they create mutable state. Some developers are unaware that test execution order is not guaranteed in most frameworks.

**What goes wrong:**
Research from the University of Illinois found that Test Order Dependency accounts for 12% of flaky test failures, and 74% of these issues are fixed by cleaning shared state between test runs. When tests share state, failures become non-reproducible: a test fails in CI but passes locally because the local runner uses a different order. Debugging these failures is exceptionally time-consuming because the root cause is in a different test than the one that fails. In large test suites, shared state prevents parallelization, which multiplies execution time.

**The fix:**
Each test must create its own state and clean up after itself. Use `@BeforeEach`/`setUp` (not `@BeforeAll`) for test data. Use transactions that roll back after each test for database tests. Never use static mutable fields in test classes.

```python
# GOOD: Each test owns its state
class TestUserService:
    def setup_method(self):
        self.users_db = {}  # Fresh state for each test

    def test_create_user(self):
        self.users_db["alice"] = User("alice")
        assert "alice" in self.users_db

    def test_list_users_empty(self):
        assert len(self.users_db) == 0
```

**Detection rule:**
If tests use class-level mutable fields, static variables, singletons, or `@BeforeAll`/`setUpClass` that creates mutable data, suspect AP-08. If a test has `@Order` annotations or passes only when run in a specific sequence, this is confirmed.

---

### AP-09: The Slow Suite

**Also known as:** The Slow Poke, CI Bottleneck, Coffee Break Tests
**Frequency:** Common
**Severity:** High
**Detection difficulty:** Easy

**What it looks like:**
The test suite takes 10+ minutes to run locally and 30+ minutes in CI. Developers stop running tests before pushing because "it takes too long." CI feedback arrives after the developer has context-switched to another task.

**Why developers do it:**
Individual tests are added without considering cumulative impact. Each test seems reasonable in isolation (100ms here, 200ms there), but 5,000 of them add up. Tests hit real databases, make real HTTP calls, or use `Thread.sleep` for synchronization. Nobody owns the test suite performance budget.

**What goes wrong:**
Dropbox documented that their Android test pipeline averaged 25 minutes with a worst case of 3 hours before they invested in optimization. The root cause was poor developer experience: developers stopped waiting for CI and pushed untested code. A study cited by DevOps.com estimated that a typical developer with 5 CI runs per day at 30 minutes each loses 2.5 hours daily to waiting -- equivalent to 3+ full-time engineers' time for a 10-person team. Slow suites also prevent continuous deployment: if tests take 45 minutes, you can deploy at most ~10 times per day, even with parallelization.

**The fix:**
Set a test suite time budget (e.g., 5 minutes for unit tests). Profile the slowest tests and fix them first. Replace real I/O with in-memory alternatives. Parallelize test execution. Separate fast unit tests from slow integration tests and run them in different CI stages. Use test impact analysis to run only tests affected by the change.

**Detection rule:**
If the full unit test suite takes more than 5 minutes, or if individual tests take more than 1 second, suspect AP-09. If developers have a habit of pushing without running tests ("CI will catch it"), this is confirmed.

---

### AP-10: Copy-Paste Test Code

**Also known as:** Copypasta Tests, Test Code Duplication, WET Tests
**Frequency:** Very Common
**Severity:** Medium
**Detection difficulty:** Easy

**What it looks like:**
Test methods that are near-identical copies of each other with minor variations in input data or expected values. The test setup, action, and assertion structure is duplicated across dozens of test methods. When the production API changes, every copied test must be updated individually.

```javascript
// BAD: Copy-pasted test with tiny variations
test('validates email with no @', () => {
  const validator = new EmailValidator();
  const result = validator.validate('invalidemail.com');
  expect(result.valid).toBe(false);
  expect(result.error).toBe('Invalid email format');
});

test('validates email with no domain', () => {
  const validator = new EmailValidator();
  const result = validator.validate('user@');
  expect(result.valid).toBe(false);
  expect(result.error).toBe('Invalid email format');
});

// ... 15 more identical copies with different input strings
```

**Why developers do it:**
Duplicating a test and changing one value is faster than designing a reusable test structure. The developer is "in the zone" and wants to add test cases quickly. Some developers have heard that "tests should be DAMP (Descriptive And Meaningful Phrases) not DRY" and interpret this as "duplication in tests is always fine."

**What goes wrong:**
When the `EmailValidator` API changes (e.g., the error message format changes), every copy must be updated. The xUnit Patterns wiki documents that Test Code Duplication causes a "very large increase in the cost to introduce new functionality because of the effort involved in updating all the tests that have copies of the affected code." In practice, developers update some copies but miss others, creating tests that fail for the wrong reason.

**The fix:**
Use parameterized tests (data-driven tests) for input variations. Extract common setup into helper methods or test fixtures. Keep each test readable but eliminate structural duplication.

```javascript
// GOOD: Parameterized test
test.each([
  ['invalidemail.com', 'no @ symbol'],
  ['user@', 'no domain'],
  ['@domain.com', 'no local part'],
  ['user@.com', 'domain starts with dot'],
])('validates email: %s (%s)', (email, _description) => {
  const result = new EmailValidator().validate(email);
  expect(result.valid).toBe(false);
});
```

**Detection rule:**
If two or more test methods in the same file share more than 80% of their code and differ only in input values, suspect AP-10. If a test file has more than 200 lines and most tests look structurally identical, this is confirmed.

---

### AP-11: Testing Too Many Things at Once

**Also known as:** The Giant, The Kitchen Sink Test, Mega-Test
**Frequency:** Common
**Severity:** Medium
**Detection difficulty:** Easy

**What it looks like:**
A single test method that verifies multiple independent behaviors. It creates data, calls several functions, and asserts on many unrelated outcomes. When it fails, the failure message does not indicate which behavior is broken.

```python
# BAD: Testing creation, validation, persistence, and notification in one test
def test_user_registration(self):
    user = UserService.register("alice", "alice@example.com", "password123")

    assert user.id is not None
    assert user.name == "alice"
    assert user.email == "alice@example.com"
    assert user.password != "password123"  # hashed
    assert user.created_at is not None
    assert UserRepository.find(user.id) is not None
    assert EmailService.last_sent_to == "alice@example.com"
    assert AuditLog.last_entry().action == "user_registered"
    assert RateLimiter.attempts_for("alice@example.com") == 1
```

**Why developers do it:**
Setting up the test context is expensive, so the developer wants to maximize assertions per setup. It feels efficient: "I already have the user object, why not test everything about it?" This is especially common when the system under test has complex setup requirements.

**What goes wrong:**
When the test fails on the 4th assertion, the developer does not know whether assertions 5-9 would also fail. Fixing the 4th assertion and re-running might reveal another failure, creating a slow debugging cycle. The test name (`test_user_registration`) does not describe what specifically is being tested, making the test suite less useful as documentation. When adding a new feature, the developer cannot tell which mega-test to update.

**The fix:**
One concept per test. Group related assertions (e.g., "user is persisted with correct fields") but separate unrelated behaviors (e.g., "notification is sent" vs. "rate limiter is updated") into distinct tests. Invest in test fixture builders to make setup cheap.

**Detection rule:**
If a test method has more than 5-6 assertions on different objects or properties, or if the test name is generic (e.g., `testEverything`, `testUserFlow`), suspect AP-11.

---

### AP-12: Not Testing Edge Cases

**Also known as:** Happy Path Only, Golden Path Trap, Boundary Blindness
**Frequency:** Very Common
**Severity:** High
**Detection difficulty:** Hard

**What it looks like:**
Tests only cover the normal successful case. There are no tests for empty inputs, null values, boundary values (0, -1, MAX_INT), Unicode characters, concurrent access, or error conditions.

```go
// BAD: Only tests the happy path
func TestDivide(t *testing.T) {
    result := Divide(10, 2)
    assert.Equal(t, 5.0, result)
}
// Missing: Divide(0, 5), Divide(10, 0), Divide(-1, -1),
// Divide(math.MaxFloat64, 0.001), Divide(0, 0)
```

**Why developers do it:**
The happy path is the obvious test case. Edge cases require more thought and often reveal uncomfortable design questions ("what should happen when the input is nil?"). Developers under deadline pressure write the test that proves the feature works and move on. Edge cases "probably won't happen in production."

**What goes wrong:**
Edge cases are where the majority of production bugs live. The Ariane 5 rocket (Flight 501, 1996) exploded because a 64-bit float was converted to a 16-bit integer, causing an overflow -- a boundary condition that was never tested. More commonly, APIs that work perfectly with typical data fail on empty strings, null fields, very long inputs, or concurrent requests. These failures manifest as 500 errors in production, data corruption, or security vulnerabilities (integer overflows, buffer overruns).

**The fix:**
For every function, explicitly test: null/nil/undefined inputs, empty collections, zero values, negative numbers, boundary values (MAX/MIN), very large inputs, special characters (Unicode, emoji, newlines, SQL metacharacters), and concurrent access where applicable. Use property-based testing (QuickCheck, Hypothesis, fast-check) to automatically generate edge cases.

**Detection rule:**
If a test file has only positive-case tests (inputs that exercise the main code path) and no tests with empty, null, zero, negative, or boundary inputs, suspect AP-12.

---

### AP-13: Commenting Out Failing Tests

**Also known as:** @Ignored Tests, Skipped Tests, Test Graveyard
**Frequency:** Common
**Severity:** High
**Detection difficulty:** Easy

**What it looks like:**
Tests that were commented out, annotated with `@Ignore`/`@Disabled`/`skip`, or wrapped in `if (false)` blocks. The test was failing, and instead of fixing it, someone disabled it. The comment says "TODO: fix this" or "temporarily disabled" -- from 18 months ago.

```java
// BAD: Disabled "temporarily" in 2024
@Disabled("Flaky on CI, will fix later")
@Test
void testPaymentRefund() {
    // ... test code that once worked ...
}
```

**Why developers do it:**
The test is failing and blocking the CI pipeline. The developer does not have time to investigate. Disabling it unblocks the build immediately. The developer genuinely intends to fix it later. Later never comes. Other developers see the pattern and follow it.

**What goes wrong:**
Disabled tests are dead code that rots. The production code they tested continues to change, so the disabled test becomes increasingly invalid. The behavior it tested is now unverified -- if a bug is introduced in that code path, nothing catches it. Over time, a test suite can accumulate dozens of disabled tests, representing a growing blind spot. The practical impact is test debt: teams documented that when regression suites are not updated, "chaos forms quickly when testers attempt to execute regression tests with known defects or technical debt."

**The fix:**
Treat disabled tests as bugs. If a test fails, either fix it immediately or delete it and create a tracked ticket. Set a CI rule: no `@Disabled` without a linked issue. Run a weekly report of disabled tests. If a test has been disabled for more than 2 weeks without progress, delete it.

**Detection rule:**
Search for `@Ignore`, `@Disabled`, `skip(`, `xit(`, `xdescribe(`, `@pytest.mark.skip`, or commented-out test methods. If any exist without a linked issue tracker reference, suspect AP-13.

---

### AP-14: Test Data Coupling

**Also known as:** Database-Dependent Tests, Seed Data Addiction, Fixture Coupling
**Frequency:** Common
**Severity:** High
**Detection difficulty:** Moderate

**What it looks like:**
Tests depend on specific data existing in a shared database, fixture file, or seed script. The test assumes that user ID 42 exists, that the "admin" role is pre-loaded, or that the test database was seeded before the suite ran.

```ruby
# BAD: Depends on specific seed data
test "admin can delete users" do
  admin = User.find(1)  # Assumes seed data has admin with ID 1
  target = User.find(42)  # Assumes user 42 exists

  delete :destroy, params: { id: target.id }, session: { user_id: admin.id }

  assert_response :success
end
```

**Why developers do it:**
Using pre-existing data is faster than creating it in each test. Seed files are "just there" in the test database. The developer tested locally where the seeds were loaded and did not realize the coupling.

**What goes wrong:**
Seed data changes break tests that depend on it. New developers run the tests without loading seeds and get mysterious failures. Tests cannot be run in parallel because they compete for the same database rows. Database migrations can invalidate fixture data, causing cascading test failures across the entire suite. In microservice architectures, shared test databases between services create implicit coupling that makes independent deployment impossible.

**The fix:**
Each test creates exactly the data it needs. Use factory patterns (Factory Bot, Fishery, test builders) to create test data declaratively. Use database transactions that roll back after each test. Never reference specific IDs or assume pre-existing data.

```ruby
# GOOD: Test creates its own data
test "admin can delete users" do
  admin = create(:user, role: :admin)
  target = create(:user)

  delete :destroy, params: { id: target.id }, session: { user_id: admin.id }

  assert_response :success
  assert_nil User.find_by(id: target.id)
end
```

**Detection rule:**
If a test calls `find(literal_id)`, references hardcoded database IDs, or has a comment like "make sure seeds are loaded," suspect AP-14.

---

### AP-15: Using Sleep/Delays for Synchronization

**Also known as:** Thread.sleep Testing, Arbitrary Waits, Timing Bombs
**Frequency:** Common
**Severity:** Medium
**Detection difficulty:** Easy

**What it looks like:**
Tests use fixed-duration waits (`Thread.sleep`, `time.sleep`, `setTimeout`) to wait for asynchronous operations to complete, rather than using explicit synchronization mechanisms.

```python
# BAD: Arbitrary sleep
def test_async_processing():
    queue.submit(job)
    time.sleep(2)  # Hope it's done by now
    assert job.status == "completed"
```

**Why developers do it:**
It is the simplest way to handle async behavior: "just wait long enough." The developer tested locally where 2 seconds was sufficient. The alternative (polling, callbacks, latches) requires more code and understanding of concurrency primitives.

**What goes wrong:**
The developer is stuck between two bad options: a short sleep that causes flaky failures on slow CI servers, or a long sleep that makes the test suite unnecessarily slow. A 2-second sleep across 100 async tests adds 3+ minutes to the suite. On loaded CI servers, even generous sleeps may be insufficient, causing intermittent failures. Enterprise Craftsmanship documented that "you cannot know for sure when exactly a job will complete and thus you are essentially guessing with the time interval."

**The fix:**
Use polling with a timeout: check the condition repeatedly with a short interval and a maximum wait time. Use synchronization primitives (CountDownLatch, Future, Promise). Use test-specific hooks that signal completion. For UI tests, use explicit wait conditions ("wait until element is visible") rather than `sleep`.

```python
# GOOD: Polling with timeout
def test_async_processing():
    queue.submit(job)
    wait_until(lambda: job.status == "completed", timeout=5.0, interval=0.1)
    assert job.status == "completed"
```

**Detection rule:**
If a test contains `sleep`, `Thread.sleep`, `time.sleep`, `Task.Delay`, or `setTimeout` with a numeric literal, suspect AP-15. Every sleep in a test is a potential flakiness source.

---

### AP-16: Tautological Tests

**Also known as:** Self-Fulfilling Tests, Circular Assertions, Mirror Tests
**Frequency:** Occasional
**Severity:** High
**Detection difficulty:** Very Hard

**What it looks like:**
A test where the expected value is computed using the same logic as the production code, so the test is guaranteed to pass by construction. The test and the code use the same formula, making the test a tautology.

```javascript
// BAD: Computing expected value with the same logic
test('calculates tax', () => {
  const price = 100;
  const taxRate = 0.08;
  const expected = price * taxRate;  // Same formula as production code

  const result = calculateTax(price, taxRate);

  expect(result).toBe(expected);  // Will always pass, even if the formula is wrong
});

// BAD: Asserting what was just set up
test('user has correct name', () => {
  const user = new User({ name: 'Alice' });
  expect(user.name).toBe('Alice');  // Testing the constructor, not behavior
});
```

**Why developers do it:**
The developer wants to avoid hardcoding expected values (which feels fragile) and instead derives them. They reason: "If the formula changes, the test will automatically update." They do not realize this defeats the purpose of the test. As Randy Coulman documented, "test code that's impossible to edit without looking at the implementation is a strong indicator that you've got a tautological test."

**What goes wrong:**
If the formula in production code has a bug (e.g., tax should be `price * taxRate / 100` but is `price * taxRate`), the test replicates the same bug and passes. The test can never fail for a logic error because it uses the same logic. This creates maximum false confidence: the code has 100% coverage and all tests pass, but the result is wrong.

**The fix:**
Always use pre-computed literal values as expected results. Work from concrete examples, not from derived computations. If you need to test `calculateTax(100, 0.08)`, the expected result is `8.00`, hardcoded.

```javascript
// GOOD: Hardcoded expected value from requirements
test('calculates 8% tax on $100', () => {
  expect(calculateTax(100, 0.08)).toBe(8.00);
});

test('calculates 8% tax on $250', () => {
  expect(calculateTax(250, 0.08)).toBe(20.00);
});
```

**Detection rule:**
If a test's expected value is computed using a function or formula (not a literal), and that computation mirrors the production code, suspect AP-16. Also flag tests that only assert on values that were directly set in the test setup.

---

### AP-17: Not Testing Error Paths

**Also known as:** Sunny Day Testing, Exception Blindness, Error Path Amnesia
**Frequency:** Very Common
**Severity:** High
**Detection difficulty:** Moderate

**What it looks like:**
Tests verify that the function works when given valid input but never test what happens with invalid input, network failures, timeout conditions, permission errors, or resource exhaustion.

```python
# Tests exist for: create_user("valid_name", "valid@email.com")
# No tests for:
#   create_user("", "")  -- empty inputs
#   create_user(None, None)  -- null inputs
#   create_user("a"*1000, "valid@email.com")  -- oversized input
#   create_user("valid", "valid@email.com") when DB is down
#   create_user("valid", "valid@email.com") when duplicate exists
```

**Why developers do it:**
Error paths are less interesting to write. The developer focuses on making the feature work and writes tests to confirm it works. Error handling is often an afterthought in both the production code and the tests. Testing error paths requires simulating failures (database down, network timeout), which is harder than testing the happy path.

**What goes wrong:**
Error paths are where production incidents happen. When the database connection pool is exhausted, when a downstream service returns an unexpected 500, when disk space runs out -- these are the scenarios that cause outages. If these paths are untested, the error handling code may be incorrect (swallowing exceptions, returning null instead of throwing, leaking resources). The code may crash with an unhandled exception, exposing stack traces to users or creating security vulnerabilities.

**The fix:**
For every function, explicitly list the error conditions and write tests for each. Test: invalid inputs, null/undefined values, resource failures (DB down, network timeout), concurrent access conflicts, permission violations, and resource limits. Use fault injection to simulate infrastructure failures.

**Detection rule:**
If a test file has only tests for valid inputs and no tests that expect exceptions, error codes, or error states, suspect AP-17. If the production code has `try/catch` blocks or error handling, but no tests exercise those branches, this is confirmed.

---

### AP-18: Testing the Framework

**Also known as:** Framework Verification, Third-Party Testing, Library QA
**Frequency:** Common
**Severity:** Medium
**Detection difficulty:** Moderate

**What it looks like:**
Tests that verify the behavior of the framework, library, or language runtime rather than the application's own logic. The test is confirming that Spring injects dependencies, that React renders JSX, that Django ORM persists objects, or that Array.sort() works.

```java
// BAD: Testing that Spring DI works
@Test
void testServiceIsInjected() {
    assertNotNull(userService);
    assertNotNull(userRepository);
}

// BAD: Testing that JPA saves entities
@Test
void testUserIsSaved() {
    User user = new User("Alice");
    entityManager.persist(user);
    entityManager.flush();
    assertNotNull(user.getId());  // Testing that JPA generates IDs
}
```

**Why developers do it:**
It is easy to write and provides coverage numbers. The developer is learning the framework and writes tests to confirm their understanding. Some testing tutorials use framework verification as examples, and developers carry the pattern into production code. It feels safer to "verify everything."

**What goes wrong:**
These tests provide zero value in catching application bugs. The framework is already tested by its own test suite (Spring has thousands of tests; you do not need to re-test dependency injection). They add to the maintenance burden and suite execution time. When the framework is upgraded, these tests may break due to internal changes, creating noise that obscures real failures. As the Codepipes blog documented: "Writing software tests for trivial code because this is the correct way to 'do TDD' will get you nowhere."

**The fix:**
Test your application's behavior, not the framework's. If your code configures Spring beans, test that your application behaves correctly (e.g., "when a user signs up, they receive a welcome email"), not that Spring wired the beans. Trust the framework's own tests.

**Detection rule:**
If a test's only assertions are `assertNotNull` on injected dependencies, or if the test verifies behavior that is documented in the framework's own documentation (e.g., "JPA generates IDs"), suspect AP-18.

---

### AP-19: Logic in Tests

**Also known as:** Conditional Tests, Test Spaghetti, Computed Assertions
**Frequency:** Occasional
**Severity:** Medium
**Detection difficulty:** Moderate

**What it looks like:**
Tests that contain conditional logic (`if/else`), loops (`for/while`), or complex computations. The test code itself is complex enough to have bugs.

```python
# BAD: Logic in tests
def test_bulk_processing(self):
    results = processor.process_batch(items)

    for i, result in enumerate(results):
        if items[i].type == "premium":
            assert result.priority == "high"
        elif items[i].type == "standard":
            assert result.priority == "normal"
        else:
            assert result.priority == "low"
```

**Why developers do it:**
The developer wants to test multiple scenarios efficiently. Loops feel like a DRY approach to testing. The developer does not realize that the logic in the test introduces the same risk of bugs that testing is supposed to catch.

**What goes wrong:**
As Gil Zilberfeld documented: "Logic is a petri dish for bugs. The reason we're testing in the first place is to make sure code that contains logic works. Adding logic to tests is like inviting a vampire into your home." If the conditional in the test has a bug, the test may silently skip assertions or assert the wrong thing. The test becomes harder to read and debug because the reader must trace the logic to understand what is being verified.

**The fix:**
Use parameterized tests for multiple scenarios. Each test path should be explicit and linear -- no branching. If a test needs a loop, it should be a parameterized test where each iteration is an independent test case.

```python
# GOOD: Explicit, linear test cases
@pytest.mark.parametrize("item_type,expected_priority", [
    ("premium", "high"),
    ("standard", "normal"),
    ("budget", "low"),
])
def test_processing_priority(self, item_type, expected_priority):
    item = create_item(type=item_type)
    result = processor.process(item)
    assert result.priority == expected_priority
```

**Detection rule:**
If a test method contains `if`, `else`, `for`, `while`, or `switch`/`match` statements, suspect AP-19. Test methods should be linear: arrange, act, assert -- no branching.

---

### AP-20: Ignoring Test Maintenance

**Also known as:** Test Rot, Stale Tests, Abandoned Test Suite
**Frequency:** Common
**Severity:** High
**Detection difficulty:** Moderate

**What it looks like:**
The test suite has not been updated alongside the production code. Tests reference deprecated APIs, use outdated patterns, have hardcoded dates that have passed, or test features that no longer exist. Warning messages flood the test output. The suite "mostly passes" but the failures are background noise.

**Why developers do it:**
Tests are treated as second-class code. Production code has PR reviews, coding standards, and refactoring cycles; tests do not. When a feature changes, the developer updates the production code but says "I'll fix the tests later." Test maintenance is not tracked in sprint planning or velocity calculations. Nobody "owns" the test suite.

**What goes wrong:**
The test suite becomes unreliable and developers stop trusting it. Legitimate failures are ignored because "that test always fails." New developers cannot use the tests to understand the system because the tests describe old behavior. The cost of reviving an abandoned test suite grows exponentially -- after 6 months of neglect, it is often cheaper to rewrite than to fix. Organizations documented that test debt, unlike code debt, affects how effectively teams validate quality, and the accumulation of gaps in test coverage reduces the team's ability to release with confidence.

**The fix:**
Treat test code with the same quality standards as production code. Include test updates in the definition of done for every feature. Assign test suite ownership. Track and trend: number of disabled tests, test suite execution time, flaky test rate. Budget 15-20% of development time for test maintenance.

**Detection rule:**
If the test suite has `@SuppressWarnings`, deprecation warnings, tests referencing removed classes, or tests that have not been modified in 12+ months while the production code has changed, suspect AP-20.

---

### AP-21: Excessive Test Setup

**Also known as:** The Ceremony, Test Novel, Arrangement Overload
**Frequency:** Common
**Severity:** Medium
**Detection difficulty:** Easy

**What it looks like:**
A test method where 80% of the code is setting up the context (creating objects, configuring dependencies, loading data) and only 2-3 lines perform the action and assertion. The setup is so long that the reader cannot see what is actually being tested.

```java
// BAD: 30 lines of setup for a 2-line test
@Test
void testOrderDiscount() {
    Address address = new Address("123 Main St", "City", "ST", "12345");
    Customer customer = new Customer("Alice", "alice@test.com", address);
    customer.setTier(CustomerTier.GOLD);
    customer.setMemberSince(LocalDate.of(2020, 1, 1));
    Product product1 = new Product("Widget", 29.99, Category.ELECTRONICS);
    Product product2 = new Product("Gadget", 49.99, Category.ELECTRONICS);
    product1.setWeight(0.5);
    product2.setWeight(1.2);
    Order order = new Order(customer);
    order.addItem(product1, 2);
    order.addItem(product2, 1);
    order.setShippingMethod(ShippingMethod.STANDARD);
    order.setCouponCode("SAVE10");
    // ... 15 more lines of setup ...

    double total = order.calculateTotal();

    assertEquals(92.97, total, 0.01);
}
```

**Why developers do it:**
The system under test has many dependencies and requires a complex object graph. The developer does not invest in builder patterns or factory methods because each test "only" needs this setup. Over time, every test copies and slightly modifies the same setup.

**What goes wrong:**
Tests become unreadable: the reader cannot determine what matters for this specific test and what is incidental setup. When the domain model changes (e.g., `Customer` requires a new field), every test with this setup must be updated. The setup noise hides the intent of the test, making it useless as documentation.

**The fix:**
Use the Builder or Object Mother pattern to create test data with sensible defaults. Only specify values that matter for the specific test. Extract common setup into well-named helper methods.

```java
// GOOD: Builder with defaults, only specify what matters
@Test
void testGoldCustomerGets20PercentDiscount() {
    Order order = anOrder()
        .withGoldCustomer()
        .withItems(aProduct().priced(100.00))
        .build();

    double total = order.calculateTotal();

    assertEquals(80.00, total, 0.01);
}
```

**Detection rule:**
If a test method has more than 10 lines of object construction before the action, or if the setup-to-assertion ratio exceeds 5:1, suspect AP-21.

---

### AP-22: Test Double Misuse

**Also known as:** Wrong Double, Stub-Mock Confusion, Fake Fragility
**Frequency:** Occasional
**Severity:** Medium
**Detection difficulty:** Hard

**What it looks like:**
Using the wrong type of test double for the situation: using a mock (which verifies interactions) when a stub (which provides canned answers) would suffice, or using a full mock framework when a simple hand-written fake would be clearer. Verifying every interaction with every mock, even when only the output matters.

```python
# BAD: Using mock verification when only the output matters
def test_calculate_shipping(self):
    mock_weight_service = Mock()
    mock_weight_service.get_weight.return_value = 5.0

    cost = calculator.calculate_shipping(order, mock_weight_service)

    assert cost == 12.50
    # Unnecessary: verifying HOW the weight was retrieved
    mock_weight_service.get_weight.assert_called_once_with(order.items)
    mock_weight_service.get_weight.assert_called_with(order.items)
```

**Why developers do it:**
Mock frameworks make it trivially easy to add verification calls. The developer adds them "just to be thorough." The difference between mocks, stubs, fakes, and spies is poorly understood -- many developers use "mock" as a generic term for all test doubles.

**What goes wrong:**
Over-verified mocks couple tests to implementation details (AP-02). When the production code changes how it calls collaborators (e.g., batching calls, reordering calls, adding caching), the mock verifications fail even though the behavior is correct. This creates maintenance overhead and discourages refactoring. As the Cash App engineering blog documented: "Mocking isn't evil, but avoid it anyway" -- not because mocking is wrong, but because it is chronically misused.

**The fix:**
Use stubs for queries (methods that return data) and mocks only for commands (methods that cause side effects you need to verify). Prefer hand-written fakes over mock frameworks for complex collaborators. Only verify interactions that are part of the test's purpose.

**Detection rule:**
If a test uses `.assert_called_with()` or `verify()` on a test double that is only used for its return value, suspect AP-22. If every mock in the test has verification calls, this is confirmed.

---

## Root Cause Analysis

| Anti-Pattern | Root Cause | Prevention |
|---|---|---|
| AP-01: The Mockery | Cargo culting ("unit tests must be isolated") | Prefer sociable unit tests; mock only external boundaries |
| AP-02: Testing Implementation | Ignorance of behavior vs. structure distinction | Train on Kent Beck's test desiderata; review tests for structural coupling |
| AP-03: Flaky Tests | Laziness (non-deterministic shortcuts) | Inject clocks, seeds, and controlled dependencies; quarantine flaky tests |
| AP-04: Testing Private Methods | Ignorance (missing abstraction) | Extract complex private methods into separate classes |
| AP-05: Coverage Obsession | Cargo culting (metrics as goals) | Use mutation testing; set coverage floors not ceilings |
| AP-06: Assertion-Free Testing | Laziness (quick coverage credit) | Enforce assertion count > 0 in CI linter rules |
| AP-07: Ice Cream Cone | Ignorance (no unit test culture) | Adopt testing pyramid; require unit tests in PR reviews |
| AP-08: Shared Mutable State | Laziness (reusing existing data) | Fresh state per test; rollback transactions |
| AP-09: The Slow Suite | Premature integration (testing too much via I/O) | Set time budgets; profile slowest tests; parallelize |
| AP-10: Copy-Paste Tests | Laziness (faster than designing abstractions) | Use parameterized tests and test builders |
| AP-11: Testing Too Many Things | Laziness (maximize assertions per setup) | One concept per test; cheap test setup via builders |
| AP-12: Not Testing Edge Cases | Laziness (deadline pressure) | Boundary value checklists; property-based testing |
| AP-13: Commenting Out Tests | Laziness (unblock CI quickly) | CI rule: no @Disabled without issue link; weekly report |
| AP-14: Test Data Coupling | Ignorance (unaware of seed dependency) | Factory patterns; each test creates its own data |
| AP-15: Sleep/Delays | Ignorance (simplest async solution) | Polling with timeout; explicit synchronization |
| AP-16: Tautological Tests | Ignorance (computed expectations feel robust) | Always use hardcoded expected values |
| AP-17: Not Testing Errors | Laziness (error paths are boring) | Error condition checklist per function |
| AP-18: Testing the Framework | Cargo culting ("test everything") | Only test your application's behavior |
| AP-19: Logic in Tests | Copy-paste from AI/SO (complex test patterns) | Parameterized tests; no branching in test methods |
| AP-20: Ignoring Maintenance | Laziness (tests are second-class) | Include test updates in definition of done |
| AP-21: Excessive Setup | Ignorance (no builder/factory patterns) | Object Mother / Builder pattern for test data |
| AP-22: Test Double Misuse | Ignorance (mock/stub/fake confusion) | Learn test double taxonomy; stubs for queries, mocks for commands |

---

## Self-Check Questions

Ask these questions during code review or while writing tests:

1. **Am I testing behavior or implementation?** If I refactored the internals without changing the output, would this test break?
2. **Does this test have at least one meaningful assertion?** Not just "it didn't throw" -- does it verify a specific output or state change?
3. **Could this test fail for the wrong reason?** Is it coupled to test execution order, system time, or specific database state?
4. **Am I mocking things I own?** Mocks should wrap external boundaries, not internal collaborators.
5. **What happens if I change the input to null, empty, zero, or MAX_INT?** Is that tested?
6. **Is the expected value hardcoded or computed?** If computed, am I just re-implementing the production logic in the test?
7. **Would a new team member understand what this test verifies from the test name alone?**
8. **If this test fails, will the failure message tell me exactly what broke?** Or will I need to debug?
9. **Am I testing my code or the framework's code?** Would this test be useful if I swapped frameworks?
10. **How long does this test take?** Would I notice if it was 10x slower?
11. **Does this test create its own data, or does it depend on data created elsewhere?**
12. **Am I using `sleep` or `Thread.sleep` in this test?** Is there a deterministic alternative?
13. **If I delete this test, what bug could slip into production undetected?** If none, the test may not be worth maintaining.
14. **Am I commenting out this test because it is flaky, or because it found a real bug I don't want to fix right now?**
15. **Does my test suite have tests for error paths, not just success paths?**

---

## Code Smell Quick Reference

| If you see... | Suspect... | Verify... |
|---|---|---|
| More mock setup lines than assertion lines | AP-01: The Mockery | Are internal collaborators mocked? Could real implementations be used? |
| `spyOn(obj, '_privateMethod')` | AP-02: Testing Implementation | Does the test still pass after an internal refactoring? |
| `Thread.sleep` or `time.sleep` in a test | AP-03/AP-15: Flaky/Sleep | Can this be replaced with polling or an injectable clock? |
| Reflection to access private members | AP-04: Testing Private Methods | Should this logic be extracted to its own public class? |
| Coverage report at 100% but bugs in production | AP-05: Coverage Obsession | Run mutation testing -- how many mutants survive? |
| Test method with zero `assert`/`expect` calls | AP-06: Assertion-Free | What observable outcome should be verified? |
| E2E test count > unit test count | AP-07: Ice Cream Cone | Can the same bug be caught by a unit test instead? |
| `static` or class-level mutable fields in tests | AP-08: Shared State | Does each test method get a fresh instance? |
| Full suite > 10 minutes | AP-09: Slow Suite | Which 10 tests are slowest? Do they use real I/O? |
| 3+ test methods with >80% identical code | AP-10: Copy-Paste | Can these become a parameterized test? |
| Test with 8+ assertions on different objects | AP-11: Too Many Things | Does the test name describe a single behavior? |
| All test inputs are "valid" or "normal" | AP-12: No Edge Cases | Where are the null, empty, zero, and boundary tests? |
| `@Disabled`, `@Ignore`, `skip(`, `xit(` | AP-13: Commented Out | Is there a linked issue? How old is this skip? |
| `User.find(1)` or `Order.find(42)` in tests | AP-14: Data Coupling | Does the test create this data or depend on seeds? |
| `expected = price * rate` in test assertion | AP-16: Tautological | Is the expected value a hardcoded literal? |
| Test file with zero tests for exceptions/errors | AP-17: No Error Paths | What error handling code exists but is untested? |
| `assertNotNull(injectedService)` as only assertion | AP-18: Testing Framework | Does this test verify application behavior? |
| `if`/`else`/`for` inside a test method | AP-19: Logic in Tests | Can this be a parameterized test instead? |
| Test warnings, deprecations in test output | AP-20: Stale Tests | When was this test last updated vs. production code? |
| 20+ lines of object construction before the action | AP-21: Excessive Setup | Is there a builder or factory pattern available? |
| `mock.verify()` on every mock in the test | AP-22: Test Double Misuse | Is this mock used for its return value or its side effect? |

---

*Researched: 2026-03-08 | Sources: [Software Testing Anti-patterns (Codepipes)](https://blog.codepipes.com/testing/software-testing-antipatterns.html), [Unit Testing Anti-Patterns Full List (Yegor256)](https://www.yegor256.com/2018/12/11/unit-testing-anti-patterns.html), [Flaky Tests at Google (Google Testing Blog)](https://testing.googleblog.com/2016/05/flaky-tests-at-google-and-how-we.html), [Unit Testing Principles, Practices, and Patterns (Manning)](https://livebook.manning.com/book/unit-testing/chapter-11), [The Case Against 100% Code Coverage (Codecov)](https://about.codecov.io/blog/the-case-against-100-code-coverage/), [Assertion Free Testing (Martin Fowler)](https://martinfowler.com/bliki/AssertionFreeTesting.html), [Tautological Tests (Randy Coulman)](https://randycoulman.com/blog/2016/12/20/tautological-tests/), [Test Desiderata (Kent Beck)](https://medium.com/@kentbeck_7670/test-desiderata-94150638a4b3), [Mocking is an Anti-Pattern (AmazingCTO)](https://www.amazingcto.com/mocking-is-an-antipattern-how-to-test-without-mocking/), [Mocking isn't evil (Cash App)](https://code.cash.app/mocking), [Test Code Duplication (xUnit Patterns)](http://xunitpatterns.com/Test%20Code%20Duplication.html), [Ice Cream Cone Anti-Pattern (BugBug)](https://bugbug.io/blog/software-testing/ice-cream-cone-anti-pattern/), [Test Flakiness at Spotify (Spotify Engineering)](https://engineering.atspotify.com/2019/11/test-flakiness-methods-for-identifying-and-dealing-with-flaky-tests/), [Revamping Android Testing at Dropbox (Dropbox Tech)](https://dropbox.tech/mobile/revamping-the-android-testing-pipeline-at-dropbox), [Logic in Tests (TestinGil)](https://www.everydayunittesting.com/2016/08/unit-test-anti-patterns-logic-in-tests.html), [Private Methods and Encapsulation (Vladimir Khorikov)](https://khorikov.org/posts/2020-03-26-private-methods-encapsulation/), [Non-determinism in Tests (Enterprise Craftsmanship)](https://enterprisecraftsmanship.com/posts/non-determinism-tests/), [LayerX QA Initiative (Autify)](https://nocode.autify.com/blog/layerxs-qa-initiative-dont-be-tempted-by-the-ice-cream-cone), [Flaky Tests Cost $4.3M (Medium)](https://medium.com/@ran.algawi/its-just-a-flaky-test-the-most-expensive-lie-in-engineering-4b18b0207d96), [An Empirical Analysis of Flaky Tests (U of Illinois)](https://mir.cs.illinois.edu/lamyaa/publications/fse14.pdf)*
