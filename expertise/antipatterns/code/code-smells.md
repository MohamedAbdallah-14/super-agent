# Code Smells

> Code smells are surface-level indicators of deeper structural problems. They are not bugs -- the code compiles, the tests pass -- but they signal design weaknesses that compound over time, slow development, and breed defects. Martin Fowler and Kent Beck cataloged them in *Refactoring* (1999); the list here extends and modernizes that catalog with real-world incidents.

> **Domain:** Code
> **Anti-patterns covered:** 20
> **Highest severity:** Critical

## Anti-Patterns

### AP-01: God Class / God Object

**Also known as:** Blob, Monster Class, Kitchen Sink
**Frequency:** Very Common
**Severity:** Critical
**Detection difficulty:** Easy

**What it looks like:**

A single class that centralizes most of the application logic, accumulating hundreds of methods and dozens of fields across unrelated responsibilities.

```java
class ApplicationManager {
    // 143 methods, 31 attributes
    void handleLogin() { ... }
    void calculateTax() { ... }
    void sendEmail() { ... }
    void renderDashboard() { ... }
    void processPayment() { ... }
    void generateReport() { ... }
    // ... 137 more methods
}
```

**Why developers do it:**

Sprint pressure and approaching deadlines cause developers to pack new functionality into whatever class is already "doing things." The god class grows incrementally -- no single commit looks unreasonable, but the cumulative result is catastrophic.

**What goes wrong:**

The jEdit text editor's `JEdit` class grew to 143 methods and 31 attributes accessing 28 attributes from 13 different classes, becoming nearly impossible to modify without regression. In any god class, a change to one responsibility (e.g., email formatting) can silently break unrelated functionality (e.g., tax calculation) because they share mutable state. Merge conflicts become constant as every developer touches the same file.

**The fix:**

Extract classes by responsibility using the Single Responsibility Principle.

```java
// Before: one god class
class ApplicationManager { /* everything */ }

// After: cohesive, focused classes
class AuthenticationService { void handleLogin() { ... } }
class TaxCalculator { BigDecimal calculateTax(Order o) { ... } }
class EmailService { void sendEmail(Message m) { ... } }
class DashboardRenderer { void render(DashboardModel m) { ... } }
```

**Detection rule:**

Flag classes with more than 20 public methods OR more than 10 fields OR more than 500 lines of code.

---

### AP-02: Copy-Paste Programming

**Also known as:** Duplicated Code, Clone-and-Own, Shotgun Cloning
**Frequency:** Very Common
**Severity:** Critical
**Detection difficulty:** Moderate

**What it looks like:**

Identical or near-identical blocks of code appear in multiple locations. When a bug is fixed in one copy, the other copies remain broken.

```python
# File: billing.py
def calculate_total(items):
    total = 0
    for item in items:
        total += item.price * item.quantity
        if item.taxable:
            total += item.price * item.quantity * 0.08
    return total

# File: reporting.py (copy-pasted, same logic)
def get_order_total(items):
    total = 0
    for item in items:
        total += item.price * item.quantity
        if item.taxable:
            total += item.price * item.quantity * 0.08  # tax rate hardcoded
    return total
```

**Why developers do it:**

It feels faster to copy working code than to extract and parameterize a shared function. Developers fear breaking the original by refactoring it.

**What goes wrong:**

Apple's "goto fail" SSL vulnerability (CVE-2014-1266) is the canonical example. Code was copied from `SSLDecodeSignedServerKeyExchange` to `SSLVerifySignedServerKeyExchange`, and during the copy a duplicate `goto fail;` line was introduced. This single duplicated line meant SSL/TLS certificate verification was silently skipped on every connection in iOS 6.x/7.x and OS X 10.9.x, exposing millions of devices to man-in-the-middle attacks. The fix was deleting one line of code. Research by Li et al. (CP-Miner) found that 20-28% of code in certain Linux kernel modules was copy-pasted, with bugs routinely propagating through clones. When a vulnerability exists in duplicated code, fixing one copy leaves the others exploitable -- a pattern documented in OpenSSL and multiple e-commerce platforms.

**The fix:**

Extract shared logic into a single function. Use parameterization for variations.

```python
# Shared module
def calculate_total(items, tax_rate=0.08):
    total = 0
    for item in items:
        subtotal = item.price * item.quantity
        total += subtotal
        if item.taxable:
            total += subtotal * tax_rate
    return total
```

**Detection rule:**

Flag code blocks of 6+ lines that are identical or differ only in variable names. Tools: PMD CPD, jscpd, SonarQube duplication detection.

---

### AP-03: Primitive Obsession

**Also known as:** Stringly Typed, Weakly Modeled Domain
**Frequency:** Very Common
**Severity:** Critical
**Detection difficulty:** Hard

**What it looks like:**

Using primitive types (int, string, double) to represent domain concepts that deserve their own types, losing all semantic safety.

```java
// Dangerous: both are just doubles
double thrustNewtons = computeThrust();
double thrustPoundForce = sensor.readThrust();

// Nothing prevents mixing them
double totalThrust = thrustNewtons + thrustPoundForce; // unit mismatch!
```

**Why developers do it:**

Creating wrapper types feels like overengineering. Primitives are easy, familiar, and require no extra classes. The type mismatch risk feels theoretical -- until it is not.

**What goes wrong:**

The Mars Climate Orbiter ($327.6 million) was destroyed on September 23, 1999, because Lockheed Martin's ground software produced thrust values in pound-force seconds while NASA's navigation software expected Newton seconds. Both systems used raw `double` values with no type-level unit distinction. A typed wrapper (e.g., `Force<Newtons>` vs. `Force<PoundForce>`) would have caught the mismatch at compile time. The Ariane 5 explosion (1996, ~$370 million) had a related cause: a 64-bit floating-point value representing horizontal velocity was converted to a 16-bit signed integer without bounds checking. The value exceeded 32,767, causing an overflow that crashed the inertial reference system 40 seconds after launch.

**The fix:**

Introduce value objects or wrapper types for domain concepts.

```java
// After: units are enforced by the type system
record Newtons(double value) {}
record PoundForce(double value) {}

Newtons toNewtons(PoundForce pf) {
    return new Newtons(pf.value() * 4.44822);
}

// Compiler rejects: addThrust(Newtons, PoundForce) -- type mismatch
```

**Detection rule:**

Flag methods with more than 2 parameters of the same primitive type. Flag `String` parameters named `*id`, `*code`, `*type`, `*status`, `*currency`.

---

### AP-04: Long Method / Long Function

**Also known as:** Mega-Function, Do-Everything Method
**Frequency:** Very Common
**Severity:** High
**Detection difficulty:** Easy

**What it looks like:**

A single function that spans hundreds of lines, mixing multiple levels of abstraction and responsibilities.

```python
def process_order(order):
    # Validate (lines 1-45)
    # Apply discounts (lines 46-90)
    # Calculate tax (lines 91-130)
    # Check inventory (lines 131-180)
    # Process payment (lines 181-240)
    # Send confirmation email (lines 241-290)
    # Update analytics (lines 291-340)
    # ... total: 340 lines
```

**Why developers do it:**

Adding a few lines to an existing function is the path of least resistance. Extracting methods feels like unnecessary ceremony, especially under deadline pressure.

**What goes wrong:**

Long methods are the primary driver of high cyclomatic complexity. Research by SonarSource shows that functions exceeding cognitive complexity thresholds are disproportionately associated with bug-introducing commits. Each additional responsibility interleaved in a long method multiplies the number of states a developer must hold in working memory. In practice, developers modifying a 300-line function routinely introduce bugs in logic paths they did not intend to touch, because they cannot see all the interacting state.

**The fix:**

Extract method by responsibility. Each extracted method should operate at one level of abstraction.

```python
def process_order(order):
    validated = validate_order(order)
    discounted = apply_discounts(validated)
    taxed = calculate_tax(discounted)
    check_inventory(taxed)
    charge = process_payment(taxed)
    send_confirmation(order, charge)
    update_analytics(order)
```

**Detection rule:**

Flag functions exceeding 30 lines of logic (excluding blank lines and comments). Flag cyclomatic complexity > 10.

---

### AP-05: Deep Nesting / Arrow Code

**Also known as:** Pyramid of Doom, Arrowhead Anti-Pattern, Callback Hell
**Frequency:** Very Common
**Severity:** High
**Detection difficulty:** Easy

**What it looks like:**

Control flow nested 4+ levels deep, forming an arrow shape when the code is viewed sideways.

```javascript
function processRequest(req) {
    if (req) {
        if (req.user) {
            if (req.user.isActive) {
                if (req.body) {
                    if (req.body.items) {
                        if (req.body.items.length > 0) {
                            // actual logic buried here
                        }
                    }
                }
            }
        }
    }
}
```

**Why developers do it:**

Each additional condition feels like a small, reasonable guard. The nesting accumulates one `if` at a time across multiple commits.

**What goes wrong:**

Code beyond 3 levels of nesting has high cognitive complexity, forcing developers to track multiple conditions simultaneously. Research from TU Delft shows this directly correlates with increased bug density. Bugs hide in obscure branches because reviewers cannot hold all the conditional paths in working memory. In async code (Node.js callbacks, nested promises), this pattern creates "callback hell" where error handling paths become untraceable.

**The fix:**

Use early returns (guard clauses) to flatten the nesting.

```javascript
function processRequest(req) {
    if (!req?.user?.isActive) return;
    if (!req.body?.items?.length) return;

    // actual logic at top level
    processItems(req.body.items);
}
```

**Detection rule:**

Flag any code block nested more than 3 levels deep. Flag cognitive complexity > 15 per function.

---

### AP-06: Feature Envy

**Also known as:** Misplaced Method, Data Jealousy
**Frequency:** Common
**Severity:** High
**Detection difficulty:** Moderate

**What it looks like:**

A method that uses more data and methods from another class than from its own.

```java
class OrderPrinter {
    String formatOrder(Order order) {
        return order.getCustomer().getName() + "\n"
             + order.getCustomer().getAddress().getStreet() + "\n"
             + order.getCustomer().getAddress().getCity() + ", "
             + order.getCustomer().getAddress().getState() + " "
             + order.getCustomer().getAddress().getZip() + "\n"
             + "Total: $" + order.getTotal();
    }
}
```

**Why developers do it:**

The developer has the data available through getters and builds logic where they happen to be working, rather than putting the method where the data lives.

**What goes wrong:**

Feature envy binds classes together tightly. When `Customer` or `Address` changes its internal representation, `OrderPrinter` breaks -- even though `OrderPrinter` has no business knowing the internal structure of addresses. This coupling is a leading cause of shotgun surgery (AP-10). Research shows feature-envious methods are involved in bug-introducing commits at a significantly higher rate than well-placed methods, because changes to the envied class propagate unpredictably.

**The fix:**

Move the method to the class whose data it uses.

```java
class Customer {
    String formatAddress() {
        return name + "\n" + address.format();
    }
}

class Address {
    String format() {
        return street + "\n" + city + ", " + state + " " + zip;
    }
}
```

**Detection rule:**

Flag methods where more than 50% of accessed fields/methods belong to a different class. Tools: IntelliJ IDEA structural search, JDeodorant.

---

### AP-07: Data Clumps

**Also known as:** Parameter Clusters, Traveling Data
**Frequency:** Common
**Severity:** Medium
**Detection difficulty:** Moderate

**What it looks like:**

The same group of parameters appears together across multiple method signatures.

```python
def create_user(first_name, last_name, street, city, state, zip_code):
    ...

def update_address(user_id, street, city, state, zip_code):
    ...

def validate_shipping(street, city, state, zip_code):
    ...
```

**Why developers do it:**

Each parameter is "just one more." The clump forms incrementally, and introducing a new class for a group of parameters feels heavyweight early on.

**What goes wrong:**

Data clumps force every caller to know the exact order and types of parameters. When a new field is needed (e.g., `country`), every function signature and every call site must change -- a combinatorial maintenance burden. Martin Fowler notes that data clumps are often primitive values that nobody thinks to turn into an object, leading to duplicated validation logic scattered across every function that receives the clump.

**The fix:**

Extract a parameter object.

```python
@dataclass
class Address:
    street: str
    city: str
    state: str
    zip_code: str

def create_user(first_name: str, last_name: str, address: Address):
    ...

def update_address(user_id: int, address: Address):
    ...

def validate_shipping(address: Address):
    ...
```

**Detection rule:**

Flag 3+ parameters that co-occur in 3+ method signatures. Flag any method with more than 4 parameters.

---

### AP-08: Magic Numbers and Strings

**Also known as:** Unnamed Constants, Hard-Coded Values
**Frequency:** Very Common
**Severity:** Medium
**Detection difficulty:** Easy

**What it looks like:**

Literal values embedded directly in logic with no explanation of what they represent.

```python
def calculate_shipping(weight):
    if weight > 50:
        return weight * 0.45 + 8.99
    elif weight > 20:
        return weight * 0.35 + 4.99
    else:
        return 3.99

if user.role == "ADMN":  # typo? or valid code?
    grant_access()
```

**Why developers do it:**

The meaning is obvious to the person writing it. Adding named constants feels verbose when "everyone knows" what 0.45 means.

**What goes wrong:**

When the shipping rate changes, a developer must find every occurrence of `0.45` across the codebase -- and distinguish it from other uses of `0.45` (tax rate? discount factor?). The string `"ADMN"` is a typo waiting to happen with no compiler protection. In the Ariane 5 failure, hardcoded assumptions about maximum horizontal velocity values (appropriate for Ariane 4 but not Ariane 5) were embedded directly in the inertial reference system code rather than being parameterized, contributing to the overflow that destroyed the rocket.

**The fix:**

Extract named constants. Use enums for categorical values.

```python
HEAVY_WEIGHT_THRESHOLD = 50
MEDIUM_WEIGHT_THRESHOLD = 20
HEAVY_RATE_PER_KG = 0.45
HEAVY_BASE_FEE = 8.99
MEDIUM_RATE_PER_KG = 0.35
MEDIUM_BASE_FEE = 4.99
LIGHT_FLAT_FEE = 3.99

class Role(Enum):
    ADMIN = "ADMIN"
    USER = "USER"
```

**Detection rule:**

Flag numeric literals other than 0, 1, -1 in logic code (not declarations). Flag string comparisons used for branching.

---

### AP-09: Dead Code

**Also known as:** Zombie Code, Unreachable Code, Vestigial Code
**Frequency:** Common
**Severity:** Critical
**Detection difficulty:** Moderate

**What it looks like:**

Code that is never executed: unreachable branches, unused functions, commented-out blocks, obsolete feature flags.

```java
// Deprecated in 2003, never removed
void executePowerPeg(Order order) {
    // Legacy market-making algorithm
    while (order.isOpen()) {
        placeAggressiveTrade(order);
    }
}
```

**Why developers do it:**

"We might need it later." Deleting code feels risky. Commented-out code serves as a "backup." Feature flags are left in place long after the feature ships.

**What goes wrong:**

Knight Capital Group, August 1, 2012: During deployment of a new trading system (RLP), only 7 of 8 servers received the update. The 8th server still contained dormant "Power Peg" code from 2003 that was never fully removed. A reused configuration flag accidentally reactivated Power Peg, which began executing an obsolete aggressive market-making strategy. In 45 minutes, the algorithm acquired $7.65 billion in unwanted positions across 154 stocks, resulting in a $440 million loss. Knight Capital's stock dropped 75%, and the company was forced to sell itself. The root cause was dead code that should have been deleted a decade earlier.

**The fix:**

Delete dead code. Version control is your backup. Remove obsolete feature flags. Use time-bounded feature flags with automatic expiration.

```java
// Before: dead code left in place "just in case"
// void executePowerPeg(Order order) { ... }

// After: deleted entirely.
// If needed, recover from git history: git log --all -p -- PowerPeg.java
```

**Detection rule:**

Flag functions with zero callers. Flag commented-out code blocks > 3 lines. Flag feature flags older than 90 days. Tools: IntelliJ "unused declaration," ESLint no-unreachable, SonarQube dead code detection.

---

### AP-10: Shotgun Surgery

**Also known as:** Scattered Change, Ripple Effect
**Frequency:** Common
**Severity:** High
**Detection difficulty:** Hard

**What it looks like:**

A single logical change requires modifications across many files and classes.

```
Adding a new "currency" field requires changes in:
  - UserModel.java         (add field)
  - UserDTO.java           (add field)
  - UserMapper.java        (add mapping)
  - UserValidator.java     (add validation)
  - UserRepository.java    (update query)
  - UserController.java    (add parameter)
  - UserService.java       (pass through)
  - user-form.html         (add input)
  - user-api.yaml          (update spec)
  - UserTest.java          (update fixtures)
```

**Why developers do it:**

It emerges from poorly factored abstractions, often due to copy-paste (AP-02) or feature envy (AP-06). Each individual class looks reasonable in isolation; the problem is only visible when making a cross-cutting change.

**What goes wrong:**

Shotgun surgery is the inverse of divergent change (AP-11). Every change becomes a multi-file commit with high risk of missing one location. Wikipedia notes that due to commercial pressure, developers often resort to copy-paste rather than refactoring, which compounds the shotgun surgery pattern. Missing one file in the change set produces silent bugs -- the system compiles, tests may pass, but one code path uses stale logic.

**The fix:**

Consolidate related logic using Move Method and Move Field. If multiple classes change together for every feature, they likely belong in one module.

```java
// Before: currency scattered across 10 files
// After: currency encapsulated in a Money value object
record Money(BigDecimal amount, Currency currency) {
    // All currency logic in one place
    Money convertTo(Currency target, ExchangeRate rate) { ... }
    String format() { ... }
}
```

**Detection rule:**

Flag commits that modify more than 5 files for a single logical change. Track co-change frequency in version history. Tools: CodeScene temporal coupling analysis.

---

### AP-11: Divergent Change

**Also known as:** Swiss Army Class, Multiple Reasons to Change
**Frequency:** Common
**Severity:** High
**Detection difficulty:** Moderate

**What it looks like:**

A single class is modified for many different, unrelated reasons. This is the sibling of shotgun surgery, but in the opposite direction: instead of one change touching many classes, many different changes touch one class.

```python
class ReportGenerator:
    def generate_pdf(self, data): ...      # changed for PDF library updates
    def fetch_from_database(self, q): ...  # changed for schema migrations
    def apply_business_rules(self, d): ... # changed for policy updates
    def send_email(self, report): ...      # changed for email provider switches
```

**Why developers do it:**

The class started with one responsibility and accumulated others because "it already has the data" or "it's the natural place." Each addition seemed small.

**What goes wrong:**

Every team member working on a different concern (PDF rendering, database, email) must modify the same file, causing constant merge conflicts and increasing the risk that a database schema change accidentally breaks email sending. This is the god class (AP-01) in its early growth phase.

**The fix:**

Extract classes by axis of change.

```python
class DataFetcher:
    def fetch(self, query): ...

class BusinessRuleEngine:
    def apply(self, data): ...

class PdfRenderer:
    def render(self, report): ...

class ReportEmailer:
    def send(self, report): ...
```

**Detection rule:**

Flag classes modified in more than 5 unrelated pull requests within 30 days. Track distinct commit message topics per file.

---

### AP-12: Speculative Generality

**Also known as:** YAGNI Violation, Premature Abstraction, Crystal Ball Coding
**Frequency:** Common
**Severity:** Medium
**Detection difficulty:** Moderate

**What it looks like:**

Abstractions, interfaces, and extension points built for hypothetical future requirements that never materialize.

```java
// Interface with exactly one implementation
interface DataProcessor<T extends Serializable & Comparable<T>> {
    ProcessResult<T> process(ProcessContext<T> ctx, ProcessOptions opts);
}

// Abstract factory for the one processor that exists
abstract class DataProcessorFactory<T extends Serializable & Comparable<T>> {
    abstract DataProcessor<T> create(FactoryConfig config);
}

// The only concrete implementation
class CsvDataProcessor implements DataProcessor<String> {
    // ... the actual logic
}
```

**Why developers do it:**

Anticipating future requirements feels like good engineering. "What if we need to support XML later?" The developer builds the abstraction now to avoid refactoring later.

**What goes wrong:**

The unused abstractions add cognitive overhead for every developer who reads the code. They must understand the generic type parameters, the factory pattern, and the interface -- all to find the one class that does the actual work. The YAGNI principle (You Aren't Gonna Need It) exists precisely because speculative abstractions are wrong more often than they are right, and the cost of maintaining them exceeds the cost of adding them later when actually needed. Test cases become the only users of speculative classes, which is a direct indicator of this smell.

**The fix:**

Delete unused abstractions. Add them back when (and only when) a second concrete need arises.

```java
// Before: interface + factory + abstract class + one implementation
// After: just the implementation
class CsvDataProcessor {
    ProcessResult process(List<String> records) { ... }
}
```

**Detection rule:**

Flag interfaces with exactly one implementation. Flag abstract classes with exactly one subclass. Flag type parameters used in only one concrete type. Flag classes whose only callers are tests.

---

### AP-13: Boolean Blindness

**Also known as:** Boolean Trap, Flag Arguments
**Frequency:** Common
**Severity:** Medium
**Detection difficulty:** Moderate

**What it looks like:**

Boolean parameters that obscure meaning at the call site, or boolean return values that erase the semantic information they represent.

```python
# What does True mean here?
widget.render(True, False, True)

# Does this sell alcohol to minors or prevent it?
sell_alcohol(user, lambda u: u.age >= 21)  # returns bool, but what does True mean?

# Caller must remember parameter order
create_user("Alice", True, False, True)
#                    ^      ^     ^
#                    admin? active? verified?
```

**Why developers do it:**

Booleans are the simplest type. Adding a parameter to toggle behavior feels cleaner than creating separate methods or enum types.

**What goes wrong:**

At every call site, the reader must look up the method signature to understand what `True` and `False` mean. Adam Johnson documented the "boolean trap" in Python type hints, showing how boolean parameters become a persistent source of inverted-logic bugs. When `create_user("Alice", True, False, True)` is called, swapping two adjacent booleans produces a user who is active but not admin -- a silent, type-safe bug that passes all compile-time checks.

**The fix:**

Replace booleans with enums or named types. Use keyword arguments.

```python
class Permission(Enum):
    ADMIN = "admin"
    USER = "user"

class Status(Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"

create_user("Alice", permission=Permission.ADMIN,
            status=Status.ACTIVE, verified=True)

# Or separate methods
widget.render_expanded()
widget.render_collapsed()
```

**Detection rule:**

Flag methods with more than 1 boolean parameter. Flag call sites with boolean literals. Flag `def foo(..., flag: bool)` patterns.

---

### AP-14: Comments as Deodorant

**Also known as:** Comment Overcompensation, Explaining Bad Code
**Frequency:** Very Common
**Severity:** Medium
**Detection difficulty:** Easy

**What it looks like:**

Long comments that explain what confusing code does, instead of rewriting the code to be self-explanatory.

```java
// Check if the user is eligible for discount:
// The user must be active (status == 1), must have been
// a member for at least 2 years (joining date before
// 730 days ago), and must not be on the blacklist
// (blacklist flag == 0), and their order total must
// exceed $100
if (u.s == 1 && daysSince(u.j) > 730 && u.b == 0 && o.t > 100) {
    applyDiscount(o);
}
```

**Why developers do it:**

Writing a comment is faster than refactoring the code. The developer recognizes the code is unclear but addresses the symptom (readability) rather than the cause (poor naming, cryptic logic).

**What goes wrong:**

Research by Lin et al. (2024) found that code-comment inconsistencies are 1.5x more likely to be involved in bug-introducing commits than consistent changes. Comments drift from code as the code evolves. A documented Mozilla case showed an outdated comment causing a developer to build a feature on assumed behavior that no longer existed, introducing a bug in a later version. The comment above will eventually become wrong when the discount rules change, but the cryptic variable names (`u.s`, `u.j`, `u.b`) will remain opaque forever.

**The fix:**

Make the code self-documenting. Reserve comments for "why," not "what."

```java
boolean isEligibleForDiscount =
    user.isActive()
    && user.membershipYears() >= 2
    && !user.isBlacklisted()
    && order.total() > MINIMUM_DISCOUNT_THRESHOLD;

if (isEligibleForDiscount) {
    applyDiscount(order);
}
```

**Detection rule:**

Flag comments that begin with "check if," "this code does," or "the following." Flag functions where comment lines exceed code lines. Flag single-letter variable names adjacent to explanatory comments.

---

### AP-15: Stringly-Typed Code

**Also known as:** String Abuse, Type Erasure by Convention
**Frequency:** Common
**Severity:** High
**Detection difficulty:** Moderate

**What it looks like:**

Using strings where enums, types, or structured data would be safer.

```python
def move_robot(x: str, y: str, direction: str):
    if direction == "up":
        ...
    elif direction == "dwon":  # typo: undetected
        ...

def process_event(event_type: str, payload: str):
    if event_type == "user.created":
        data = json.loads(payload)
        ...
```

**Why developers do it:**

Strings are universal. They work across serialization boundaries, require no type definitions, and are quick to add. "Just pass a string" is the fastest path to a working prototype.

**What goes wrong:**

Scott Hanselman coined "stringly typed" to contrast with "strongly typed." String-based dispatch has no compiler support: typos like `"dwon"` instead of `"down"` are valid strings that silently take the wrong branch. Every consumer must independently know and correctly spell the valid values. Refactoring is impossible without full-text search. In a Hacker News discussion (2024), developers documented production incidents where stringly-typed event systems silently dropped events because the string constants drifted between producer and consumer codebases.

**The fix:**

Replace strings with enums or algebraic types.

```python
class Direction(Enum):
    UP = "up"
    DOWN = "down"
    LEFT = "left"
    RIGHT = "right"

def move_robot(x: int, y: int, direction: Direction):
    match direction:
        case Direction.UP: ...
        case Direction.DOWN: ...
        # compiler warns about unhandled cases
```

**Detection rule:**

Flag `if x == "literal_string"` chains with 3+ branches. Flag method parameters of type `String` named `*type`, `*status`, `*mode`, `*action`, `*event`.

---

### AP-16: Message Chains / Train Wrecks

**Also known as:** Law of Demeter Violation, Dot-Dot-Dot
**Frequency:** Common
**Severity:** Medium
**Detection difficulty:** Easy

**What it looks like:**

A chain of method calls traversing an object graph: `a.getB().getC().getD().doSomething()`.

```java
String cityName = order
    .getCustomer()
    .getAddress()
    .getCity()
    .getName()
    .toUpperCase();
```

**Why developers do it:**

The data is "right there," reachable by traversing the object graph. Creating intermediary methods feels like unnecessary indirection.

**What goes wrong:**

The calling code is now coupled to the entire chain structure. If `Address` is refactored to split `city` into `city` and `region`, every chain that traverses through `getCity()` breaks -- even code in modules that have no business knowing about address internals. Null/undefined at any link in the chain causes a NullPointerException at a location that reveals the entire internal structure to the error log. The code is also extremely difficult to mock in tests, as documented in industrial testing literature on "mock trainwrecks."

**The fix:**

Apply the Law of Demeter: "talk only to your immediate friends." Use delegation methods.

```java
// Order delegates to Customer, which delegates to Address
class Order {
    String getShippingCity() {
        return customer.getShippingCity();
    }
}

class Customer {
    String getShippingCity() {
        return address.getCityName();
    }
}

// Caller
String city = order.getShippingCity();
```

**Detection rule:**

Flag chains of 3+ method calls on return values (excluding builders and fluent APIs). Tools: PMD `LawOfDemeter` rule.

---

### AP-17: Middle Man

**Also known as:** Thin Wrapper, Pass-Through Class, Bureaucrat
**Frequency:** Occasional
**Severity:** Medium
**Detection difficulty:** Moderate

**What it looks like:**

A class that delegates almost all its work to another class, adding no logic of its own.

```java
class CustomerService {
    private CustomerRepository repo;

    Customer find(int id) { return repo.find(id); }
    void save(Customer c) { repo.save(c); }
    void delete(int id) { repo.delete(id); }
    List<Customer> findAll() { return repo.findAll(); }
    // Every method is a one-line delegation
}
```

**Why developers do it:**

Architectural patterns (service layers, facades) encourage indirection. Developers create a "service" class because the pattern says to, even when there is no business logic to put there yet.

**What goes wrong:**

Every new repository method requires a corresponding pass-through in the service, doubling the maintenance surface. The middle man obscures the actual dependency, making navigation harder during debugging. When combined with speculative generality (AP-12), the codebase accumulates layers of empty indirection.

**The fix:**

If the class adds no logic, remove it and let callers use the delegate directly. If business logic will be added later, add the class when the logic arrives.

```java
// Before: callers -> CustomerService -> CustomerRepository
// After: callers -> CustomerRepository (until business logic is needed)

// When business logic appears, THEN introduce the service:
class CustomerService {
    private CustomerRepository repo;

    Customer findOrThrow(int id) {
        return repo.find(id)
            .orElseThrow(() -> new CustomerNotFoundException(id));
    }
    // Now the class earns its existence
}
```

**Detection rule:**

Flag classes where >80% of public methods are single-line delegations to the same field.

---

### AP-18: Refused Bequest

**Also known as:** Inheritance Misuse, Broken Liskov, Fake-Is-A
**Frequency:** Occasional
**Severity:** High
**Detection difficulty:** Moderate

**What it looks like:**

A subclass inherits from a parent but ignores, overrides with no-ops, or throws exceptions for inherited methods.

```python
class Bird:
    def fly(self):
        return "flying"

    def eat(self):
        return "eating"

class Penguin(Bird):
    def fly(self):
        raise NotImplementedError("Penguins can't fly")  # refused bequest
```

**Why developers do it:**

The subclass needs some of the parent's functionality, and inheritance seems quicker than composition. "A penguin *is* a bird" feels logically correct, even though the behavioral contract breaks.

**What goes wrong:**

This violates the Liskov Substitution Principle: code that accepts `Bird` and calls `fly()` will crash on `Penguin`. The Java `Stack` class inheriting from `Vector` is a classic real-world refused bequest -- `Stack` inherits methods like `insertElementAt(index)` that violate stack semantics (you should not be able to insert in the middle of a stack). Clients using `Stack` as a `Vector` bypass LIFO ordering with no compiler warning.

**The fix:**

Replace inheritance with composition (delegation).

```python
class Bird:
    def eat(self):
        return "eating"

class FlyingBird(Bird):
    def fly(self):
        return "flying"

class Penguin(Bird):
    # No fly() method -- does not promise what it cannot deliver
    def swim(self):
        return "swimming"
```

**Detection rule:**

Flag subclass methods that throw `NotImplementedError`, `UnsupportedOperationException`, or return `null`/no-op for inherited methods. Flag subclasses that override >50% of parent methods.

---

### AP-19: Data Class

**Also known as:** Anemic Domain Model, Dumb Container, Struct Syndrome
**Frequency:** Common
**Severity:** Medium
**Detection difficulty:** Easy

**What it looks like:**

A class that contains only fields and getters/setters, with all behavior living in other classes.

```java
class Customer {
    private String name;
    private String email;
    private List<Order> orders;
    // 15 getters and setters, zero behavior
}

class CustomerService {
    boolean isVip(Customer c) {
        return c.getOrders().stream()
            .mapToDouble(Order::getTotal)
            .sum() > 10000;
    }

    String formatDisplayName(Customer c) {
        return c.getName() + " (" + c.getEmail() + ")";
    }
}
```

**Why developers do it:**

Many frameworks (JPA, Hibernate, serialization libraries) encourage POJOs with getters/setters. MVC patterns place all logic in services. The "data class" feels clean and simple.

**What goes wrong:**

Martin Fowler calls this the "Anemic Domain Model" anti-pattern. Business logic that belongs with the data scatters across service classes, causing feature envy (AP-06) and shotgun surgery (AP-10). The data class exposes its internals, making it impossible to enforce invariants. Any service can set invalid state because the data class has no self-defense.

**The fix:**

Move behavior to the data class. Encapsulate invariants.

```java
class Customer {
    private String name;
    private String email;
    private List<Order> orders;

    boolean isVip() {
        return orders.stream()
            .mapToDouble(Order::getTotal)
            .sum() > VIP_THRESHOLD;
    }

    String displayName() {
        return name + " (" + email + ")";
    }

    void addOrder(Order order) {
        Objects.requireNonNull(order);
        this.orders.add(order);
    }
}
```

**Detection rule:**

Flag classes where public methods are exclusively getters/setters. Flag classes with >5 fields and zero non-accessor methods.

---

### AP-20: Misleading / Outdated Comments

**Also known as:** Comment Rot, Lying Documentation, Stale Comments
**Frequency:** Very Common
**Severity:** High
**Detection difficulty:** Very Hard

**What it looks like:**

Comments that describe behavior the code no longer exhibits, creating a trap for future developers.

```python
def calculate_tax(amount):
    """Calculates tax at 7% rate for domestic orders."""
    # Updated to 8.5% per 2024 regulation
    # Actually updated again to 9% for 2025
    return amount * 0.085  # Neither comment matches the code
```

**Why developers do it:**

Developers update code but forget to update comments. Comment maintenance has no enforcement mechanism. Code reviews focus on logic, not comment accuracy.

**What goes wrong:**

Research by Lin et al. (2024, arXiv:2409.10781) found that code-comment inconsistencies are approximately 1.5x more likely to appear in bug-introducing commits. A documented Mozilla incident showed that an outdated comment persisted across versions, leading a developer to build new functionality based on the documented (but no longer actual) behavior, resulting in a reported bug. In one case study, a developer trusting an outdated comment about pricing logic built a feature that relied on the documented behavior, producing a pricing bug that cost thousands of dollars before detection.

**The fix:**

Delete comments that describe "what." Keep comments that describe "why" (design decisions, regulatory constraints, non-obvious tradeoffs). Treat comment accuracy as a code review checklist item.

```python
def calculate_tax(amount):
    """Apply current tax rate per regulation XYZ-2025."""
    return amount * CURRENT_TAX_RATE  # rate defined in config
```

**Detection rule:**

Flag TODO/FIXME comments older than 90 days. Flag functions where the docstring mentions different constants than the code uses. Automated: compare function names/docstrings against actual behavior using LLM-based analysis.

---

## Root Cause Analysis

| Root Cause | Contributing Smells | Systemic Fix |
|---|---|---|
| **Time pressure / sprint deadlines** | God Class, Long Method, Copy-Paste, Deep Nesting | Allocate refactoring budget per sprint (15-20% of velocity) |
| **Missing domain modeling** | Primitive Obsession, Data Clumps, Stringly Typed, Magic Numbers | Domain-Driven Design workshops; value object patterns |
| **Path of least resistance** | Feature Envy, Divergent Change, Dead Code | Architectural fitness functions; automated smell detection in CI |
| **Fear of deletion** | Dead Code, Speculative Generality, Comments as Deodorant | Git history as backup; feature flag TTL enforcement |
| **Framework-driven design** | Data Class, Middle Man, Shotgun Surgery | Challenge framework defaults; add behavior to domain objects |
| **Misapplied patterns** | Speculative Generality, Middle Man, Refused Bequest | "Three strikes" rule before abstracting; favor composition |
| **Inadequate code review** | Copy-Paste, Misleading Comments, Boolean Blindness | Smell-specific review checklists; automated reviewers (SonarQube, CodeClimate) |
| **Solo development / knowledge silos** | God Class, Long Method, Magic Numbers | Pair programming; mob programming; mandatory review |
| **Weak type system usage** | Primitive Obsession, Stringly Typed, Boolean Blindness | Strict compiler settings; custom lint rules for domain types |
| **Incremental accumulation** | All smells | Track code health metrics over time; set quality gates |

## Self-Check Questions

1. **God Class:** Does any class in the codebase have more than 20 public methods or more than 500 lines? Can you describe its responsibility in a single sentence without using "and"?

2. **Copy-Paste:** If you fix a bug in this function, is there an identical block somewhere else that also needs the fix? Search for a distinctive line from the function -- do you get multiple hits?

3. **Primitive Obsession:** Are you passing raw `int`, `double`, or `String` values that represent domain concepts (money, distance, user IDs, status codes)? Could two values of the same primitive type be accidentally swapped?

4. **Long Method:** Can you read and understand this function without scrolling? Does it operate at a single level of abstraction, or does it mix HTTP parsing with business logic with database calls?

5. **Deep Nesting:** Is any code block nested more than 3 levels deep? Can you explain the conditions required to reach the innermost block without re-reading the function?

6. **Feature Envy:** Does this method access more fields from another class than from its own? Would it be simpler if it lived in the other class?

7. **Dead Code:** Are there functions with zero callers? Commented-out code blocks? Feature flags that shipped months ago and were never cleaned up?

8. **Shotgun Surgery:** When you add a new field to a domain object, how many files do you need to touch? Is the answer greater than 3?

9. **Boolean Blindness:** At any call site, can you understand what each `True`/`False` argument means without looking up the method signature?

10. **Magic Numbers:** If a business rule changes (tax rate, threshold, timeout), can you change it in exactly one place? Or must you grep for a numeric literal?

11. **Data Class:** Do any classes consist entirely of getters and setters? Is all the behavior in separate "service" classes that pull data out, process it, and push it back in?

12. **Speculative Generality:** Are there interfaces with exactly one implementation? Abstract classes with one subclass? Can you delete an abstraction layer and have everything still compile?

13. **Message Chains:** Do you see chains of 3+ method calls like `a.getB().getC().getD()`? If any intermediate object changes its structure, how many call sites break?

14. **Misleading Comments:** Pick any comment in the codebase. Does it accurately describe what the adjacent code does *right now*? When was the comment last updated relative to the code?

15. **Refused Bequest:** Do any subclasses override parent methods to throw exceptions or return no-ops? Could clients of the parent type be surprised by the subclass behavior?

## Code Smell Quick Reference

| Smell | AKA | Severity | Frequency | Key Signal | First Action |
|---|---|---|---|---|---|
| God Class | Blob | Critical | Very Common | >500 LOC, >20 methods | Extract Class |
| Copy-Paste | Duplicated Code | Critical | Very Common | Identical blocks in 2+ places | Extract Method |
| Primitive Obsession | Stringly Typed | Critical | Very Common | Raw primitives for domain concepts | Introduce Value Object |
| Long Method | Mega-Function | High | Very Common | >30 LOC of logic | Extract Method |
| Deep Nesting | Arrow Code | High | Very Common | >3 levels of indentation | Guard Clauses |
| Feature Envy | Misplaced Method | High | Common | Method uses other class's data | Move Method |
| Data Clumps | Parameter Clusters | Medium | Common | Same params in 3+ signatures | Introduce Parameter Object |
| Magic Numbers | Unnamed Constants | Medium | Very Common | Literal numbers in logic | Extract Constant |
| Dead Code | Zombie Code | Critical | Common | Zero callers, commented blocks | Delete (git is your backup) |
| Shotgun Surgery | Scattered Change | High | Common | 5+ files changed for one feature | Move Method/Field |
| Divergent Change | Swiss Army Class | High | Common | Class changed for unrelated reasons | Extract Class |
| Speculative Generality | YAGNI Violation | Medium | Common | Interface with 1 implementation | Collapse Hierarchy |
| Boolean Blindness | Boolean Trap | Medium | Common | `foo(true, false, true)` | Replace with Enum |
| Comments as Deodorant | Explaining Bad Code | Medium | Very Common | Comment longer than code it explains | Rename + Extract |
| Stringly Typed | String Abuse | High | Common | String comparison chains | Introduce Enum |
| Message Chains | Train Wreck | Medium | Common | `a.b().c().d()` | Hide Delegate |
| Middle Man | Pass-Through | Medium | Occasional | >80% one-line delegations | Remove Middle Man |
| Refused Bequest | Broken Liskov | High | Occasional | Override with throw/no-op | Replace Inheritance with Delegation |
| Data Class | Anemic Model | Medium | Common | All getters, no behavior | Move behavior to data class |
| Misleading Comments | Comment Rot | High | Very Common | Comment contradicts code | Delete or update comment |

---
*Researched: 2026-03-08 | Sources: Fowler, "Refactoring" (1999, 2018); Beck & Fowler code smell catalog; Apple goto fail CVE-2014-1266 (dwheeler.com); Mars Climate Orbiter mishap (NASA/JPL); Ariane 5 Flight 501 Inquiry Board Report; Knight Capital SEC filing and post-mortem (henricodolfing.ch); Heartbleed CVE-2014-0160 (heartbleed.com); Li et al. CP-Miner (UIUC); Lin et al. code-comment inconsistency study (arXiv:2409.10781); SonarSource cognitive complexity whitepaper; refactoring.guru; sourcemaking.com; luzkan.github.io/smells*
