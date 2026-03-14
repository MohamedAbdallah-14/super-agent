# Naming & Abstraction Anti-Patterns

> **Domain:** Code
> **Anti-patterns covered:** 20
> **Highest severity:** High

---

## Introduction

Naming is the most pervasive act in software development. Every variable, function, class, module, and abstraction boundary carries a name, and that name shapes every reader's mental model forever after. Bad names are not merely aesthetic failures — they are correctness failures. A function named `processData` that silently mutates global state, a class named `Utils` that accumulates 3,000 lines over two years, an abstraction named `IRepository` that leaks SQL dialect details: each of these is a defect that static analysis cannot catch but that costs teams real hours every sprint.

Abstraction anti-patterns compound naming problems. An abstraction exists to let the reader stop thinking about one level of detail. When the abstraction is premature, wrong, or inverted, it forces the reader to hold *more* levels simultaneously, not fewer. The result is cognitive overhead that compounds with codebase growth.

This module catalogues 20 concrete anti-patterns across naming and abstraction, with real-world evidence, machine-applicable detection rules, and before/after fixes.

---

## AP-1: Meaningless Names

**Also known as:** Noise words, placeholder names left in production, data/info/temp variables
**Frequency:** Very Common
**Severity:** High
**Detection difficulty:** Easy

**What it looks like:**

```python
def process(data, info, temp):
    x = data["val"]
    y = info.get("thing")
    result2 = x + y
    return result2
```

**Why developers do it:**
Placeholder names are created during exploratory coding and never replaced. Developers are in flow state and treat naming as something to "fix later." Under deadline pressure, "later" never arrives.

**What goes wrong:**
Every future reader must reverse-engineer meaning from context. `data` could be a dict, a DataFrame, a byte buffer, or a domain object. Bugs hide in plain sight because variable misuse is invisible when names carry no semantics. Code reviews become ineffective — reviewers cannot spot a logic error when they cannot distinguish `temp` from `result2`.

**The fix:**

```python
# Before
def process(data, info, temp):
    x = data["val"]
    y = info.get("thing")
    result2 = x + y
    return result2

# After
def calculate_order_total(order: Order, pricing_config: PricingConfig) -> Decimal:
    base_price = order.unit_price
    discount_rate = pricing_config.get("discount_rate", Decimal("0"))
    total = base_price * (1 - discount_rate)
    return total
```

**Detection rule:**
Flag any identifier matching: `data`, `info`, `temp`, `tmp`, `result[0-9]*`, `val`, `thing`, `stuff`, `x`, `y`, `z`, `foo`, `bar`, `baz` outside of test fixtures and mathematical algorithms where single-letter names are conventional.

---

## AP-2: Misleading Names

**Also known as:** Lying names, deceptive identifiers, semantic mismatch
**Frequency:** Common
**Severity:** High
**Detection difficulty:** Hard

**What it looks like:**

```javascript
// isReady actually means "has the component been mounted at least once"
// It returns false during SSR and true after first hydration
class ComponentTracker {
  isReady() {
    return this._mountCount > 0;
  }

  // "save" actually sends an HTTP request AND updates local cache AND emits an event
  save(payload) {
    return fetch('/api/save', { method: 'POST', body: JSON.stringify(payload) })
      .then(() => { this._cache.set(payload.id, payload); this._emitter.emit('saved'); });
  }
}
```

**Why developers do it:**
The name was accurate when first written, then behavior evolved. Refactors add responsibilities without renaming. Or the developer chose an optimistic name hoping to match an intended final state.

**What goes wrong:**
Callers build mental models from the name, not from reading the implementation. Code that calls `if (tracker.isReady())` expects a readiness check, not a mount-count check. Bugs appear at integration boundaries where callers behave according to the name's implicit contract, not the implementation's actual contract.

**The fix:**

```javascript
// Before
isReady() { return this._mountCount > 0; }
save(payload) { /* fetches, caches, and emits */ }

// After
hasBeenMountedAtLeastOnce() { return this._mountCount > 0; }
// or: wasMounted, isHydrated

persistAndNotify(payload) {
  return this._apiClient.persist(payload)
    .then(() => {
      this._cache.set(payload.id, payload);
      this._eventBus.emit('record:saved', payload);
    });
}
```

**Detection rule:**
Automated detection is limited. Heuristic: flag boolean-returning functions named `is*` or `has*` whose implementation contains arithmetic, comparisons against non-boolean values, or side effects.

---

## AP-3: Abbreviations That Obscure Meaning

**Also known as:** Cryptic abbreviations, terse naming, compressed identifiers
**Frequency:** Very Common
**Severity:** Medium
**Detection difficulty:** Moderate

**What it looks like:**

```java
public class OrdProc {
    private CustMgr cm;
    private InvSvc invSvc;

    public OrdRes procOrd(OrdReq req, UsrCtx uctx) {
        Cust c = cm.getCust(uctx.getCustId());
        Inv inv = invSvc.chkInv(req.getProdId(), req.getQty());
        // ...
    }
}
```

**Why developers do it:**
Developers optimize for typing speed, imitate legacy codebases where line length was constrained, or confuse brevity with clarity. Domain-specific abbreviations feel obvious to their author.

**What goes wrong:**
Abbreviations have no canonical expansion. `OrdProc` could be OrderProcessor, OrderProcessing, OrderProcedure, or OrderProduct. New team members spend weeks building a mental glossary. Code search becomes unreliable — searching for "Order" misses `Ord` references. IDEs handle autocomplete, so typing cost is imaginary.

**The fix:**

```java
// Before
public OrdRes procOrd(OrdReq req, UsrCtx uctx)

// After
public OrderResponse processOrder(OrderRequest request, UserContext userContext)
```

**Detection rule:**
Flag identifiers shorter than 4 characters (excluding loop counters `i`, `j`, `k` and mathematical variables), and identifiers matching common abbreviation patterns: `[A-Z][a-z]{0,2}[A-Z]` (camelCase abbreviations), `Mgr`, `Svc`, `Proc`, `Req`, `Res`, `Ctx`, `Usr`, `Cust`, `Ord`, `Inv`, `Prd`.

---

## AP-4: Hungarian Notation in Modern Languages

**Also known as:** Type-encoded names, systems Hungarian, strPrefix naming
**Frequency:** Common (in legacy codebases), Occasional (in new code)
**Severity:** Medium
**Detection difficulty:** Easy

**What it looks like:**

```typescript
const strUserName: string = "Alice";
const nItemCount: number = 42;
const bIsActive: boolean = true;
const arrProductList: Product[] = [];
const objUserConfig: UserConfig = {};
const fnHandleClick = (e: Event) => {};
```

**Why developers do it:**
Hungarian notation was recommended in early Windows API documentation and spread widely. Developers carry it forward from C/C++ habits into typed languages. The original intent — encoding *kind* (not type) in names — was sound, but systems Hungarian (encoding types) became the dominant misapplication.

**What goes wrong:**
Modern IDEs show types on hover. Compilers enforce types at compile time. The prefix provides zero information not already available from the type system, while adding noise that the brain must filter on every read. When types change during refactoring (e.g., `strCount` becomes a number), the prefix becomes actively misleading. As Herb Sutter noted, the notation forces code to read like "hieroglyphics" rather than natural language.

**The fix:**

```typescript
// Before
const strUserName: string = "Alice";
const arrProductList: Product[] = [];
const bIsActive: boolean = true;

// After
const userName: string = "Alice";
const products: Product[] = [];
const isActive: boolean = true;
```

**Detection rule:**
Flag identifiers with type-encoding prefixes: `str`, `n`, `i`, `b`, `arr`, `obj`, `fn`, `d`, `f`, `sz`, `lp`, `p`, `h` followed immediately by a capitalized word, in languages with static or structural type systems (TypeScript, Java, C#, Kotlin, Swift, Go).

---

## AP-5: Naming Booleans Without Semantic Prefix

**Also known as:** Ambiguous boolean names, undeclared boolean intent
**Frequency:** Very Common
**Severity:** Medium
**Detection difficulty:** Easy

**What it looks like:**

```python
user = User(active=True, delete=False, login=True, cache=False)

if user.active and not user.delete:
    if user.login:
        pass
```

**Why developers do it:**
Brevity. The noun or verb form feels "obvious" to the author in context.

**What goes wrong:**
`user.active` could mean "is the user currently active" (state) or "make this user active" (command). `user.delete` is especially dangerous — it reads as a method invocation, not a flag. Reading `not user.delete` requires conscious re-parsing. `user.login` could be a noun (the login value), a verb (perform login), or a state (currently logged in). Booleans without `is/has/should/can/was/will` prefixes are systematically ambiguous.

**The fix:**

```python
# Before
user = User(active=True, delete=False, login=True, cache=False)

# After
user = User(
    is_active=True,
    is_deleted=False,
    is_logged_in=True,
    should_cache=False
)

if user.is_active and not user.is_deleted:
    if user.is_logged_in:
        pass
```

**Detection rule:**
Flag boolean-typed fields, parameters, and variables whose names do not begin with: `is_`, `has_`, `should_`, `can_`, `was_`, `will_`, `needs_`, `allows_`, `enables_`, `supports_` (or their camelCase equivalents).

---

## AP-6: Inconsistent Naming Across Codebase

**Also known as:** Naming drift, synonym proliferation, vocabulary fragmentation
**Frequency:** Very Common
**Severity:** High
**Detection difficulty:** Moderate

**What it looks like:**

```python
# In user_service.py
def get_user(user_id): ...
def fetch_account(account_id): ...
def load_profile(profile_id): ...
def retrieve_member(member_id): ...

# In the database layer
class UserRepository: ...
class AccountDao: ...
class ProfileStore: ...
class MemberModel: ...

# In the API layer
def create_user(): ...
def register_account(): ...
def signup_member(): ...
```

**Why developers do it:**
Different developers write different layers. Naming conventions are not documented or enforced. The codebase grows organically across teams and time.

**What goes wrong:**
Readers cannot tell if `User`, `Account`, `Profile`, and `Member` refer to the same entity or distinct concepts. Every new developer must map the entire synonym set before reasoning about data flow. Search and refactoring tools produce incomplete results. Domain modeling becomes impossible when the domain vocabulary is undefined.

**The fix:**
Establish and document a ubiquitous language (from Domain-Driven Design). Pick one term per concept codebase-wide:

```python
# Chosen vocabulary: "user" for the core entity, "fetch" for retrieval
def fetch_user(user_id): ...
class UserRepository: ...
def create_user(): ...
```

**Detection rule:**
Build a synonym set from the codebase's identifier vocabulary. Flag entities that appear under multiple names within the same domain layer: detect via clustering of identifiers that share data-type relationships (same field types, same return types) but differ in naming.

---

## AP-7: The Wrong Abstraction

**Also known as:** Inappropriate DRY, premature unification, forced reuse
**Frequency:** Common
**Severity:** High
**Detection difficulty:** Hard

**What it looks like:**

```ruby
# Started as a clean abstraction for rendering two similar forms
def render_form(type:, show_address:, show_phone:, show_email:,
                require_address:, address_label: "Address",
                show_secondary_address:, show_company:,
                company_required: false, skip_validation:,
                legacy_mode:, use_new_layout: false)
  if legacy_mode
    render_legacy_form(...)
  elsif type == :checkout
    # ... 40 lines specific to checkout
  elsif type == :profile
    # ... 40 lines specific to profile
  else
    # ... default path that is now used by nobody
  end
end
```

**Why developers do it:**
Two pieces of code look similar. A developer extracts them into one function to avoid duplication (applying DRY). Later, requirements diverge and the abstraction accumulates parameters to handle each case. As Sandi Metz documented, each new programmer feels obligated to preserve the existing abstraction and adds another parameter rather than questioning it.

**What goes wrong:**
The abstraction becomes a catch-all procedure with combinatorial complexity. Every caller must understand all parameters, most of which are irrelevant to it. Adding a new caller requires understanding (and not breaking) every existing caller's path. The code is harder to read than the original duplication would have been.

**The fix:**
Metz's prescription: inline the abstraction back into every caller, then let each caller have only what it needs. Accept duplication until a genuinely shared pattern emerges.

```ruby
# Before: one function with 10 parameters serving 3 callers

# After: three focused functions
def render_checkout_form(show_address:, require_address:)
  # only checkout-relevant logic
end

def render_profile_form(show_phone:, show_email:, show_company:)
  # only profile-relevant logic
end
```

**Detection rule:**
Flag functions with: (a) more than 5 boolean/flag parameters, or (b) internal branching on a `type:` / `mode:` / `variant:` parameter with 3 or more branches, or (c) a parameter count that has grown by more than 3 over the git history of the function.

---

## AP-8: Premature Abstraction

**Also known as:** Speculative generality, YAGNI violation, over-engineering
**Frequency:** Common
**Severity:** High
**Detection difficulty:** Moderate

**What it looks like:**

```typescript
// Written for a single use case: logging to a file
interface Logger {
  log(level: LogLevel, message: string, context?: Record<string, unknown>): void;
  flush(): Promise<void>;
  close(): void;
}

abstract class BaseLogger implements Logger {
  protected abstract formatMessage(level: LogLevel, message: string): string;
  protected abstract writeRecord(record: string): Promise<void>;
  // ...
}

class FileLogger extends BaseLogger {
  // The only implementation that ever existed
}

// FileLogger is created through a factory
class LoggerFactory {
  static create(config: LoggerConfig): Logger {
    return new FileLogger(config); // always FileLogger
  }
}
```

**Why developers do it:**
Developers correctly recognize that "I might need other implementations later." The logger example above is pervasive: it appears in tutorials as a best practice. The problem is not the pattern — it is applying the pattern before the second use case exists.

**What goes wrong:**
Every new team member must navigate the interface, the abstract base, the factory, and the concrete class to understand "we write logs to a file." The abstraction adds four files, two levels of inheritance, and a factory with one code path. When the second use case never arrives (often the case), all this structure becomes permanent overhead. Premature abstraction is the root cause of enterprise framework bloat.

**The fix:**

```typescript
// Before: interface + abstract base + factory + concrete = 4 files, 0 second implementations
// After: start with the concrete, extract interface when the second use case arrives

class FileLogger {
  private readonly stream: WriteStream;

  constructor(private readonly config: LoggerConfig) {
    this.stream = createWriteStream(config.path, { flags: 'a' });
  }

  log(level: LogLevel, message: string): void {
    this.stream.write(`[${level}] ${message}\n`);
  }
}
```

**Detection rule:**
Flag: (a) interfaces with exactly one implementing class in the codebase, (b) abstract base classes with exactly one concrete subclass, (c) factory classes whose factory method returns a single concrete type unconditionally.

---

## AP-9: Leaky Abstractions

**Also known as:** Implementation bleed-through, abstraction boundary violation
**Frequency:** Common
**Severity:** High
**Detection difficulty:** Hard

**What it looks like:**

```python
class UserRepository:
    """Abstracts database access for users."""

    def find_users_by_status(self, status: str) -> list[User]:
        # Leaks: caller must know MySQL ENUM values and NULL behavior
        return self._db.query(
            "SELECT * FROM users WHERE status = %s AND deleted_at IS NULL",
            (status,)
        )

    def find_recent_users(self) -> list[User]:
        # Leaks: caller must know the index name for performance
        # Documented in a comment that belongs in the database schema
        # Use the idx_created_at index — do not add ORDER BY or it will full-scan
        return self._db.query("SELECT * FROM users USE INDEX (idx_created_at) LIMIT 100")
```

**Why developers do it:**
Building abstractions is hard. Developers reach through the abstraction layer for performance, for pragmatism, or because the abstraction boundary was never clearly defined.

**What goes wrong:**
Joel Spolsky's Law of Leaky Abstractions states: "All non-trivial abstractions, to some degree, are leaky." The problem is *how much* they leak. When a repository leaks SQL syntax, callers cannot be swapped to a different database without understanding and rewriting every caller. Performance surprises — like the index hint above — require knowing the underlying storage engine. The abstraction provides the vocabulary of the layer above without the isolation.

**The fix:**

```python
class UserRepository:
    def find_active_users(self) -> list[User]:
        # Caller knows: "give me active users" — not how "active" is stored
        return self._db.query(
            "SELECT * FROM users WHERE status = 'active' AND deleted_at IS NULL"
        )

    def find_recently_registered(self, limit: int = 100) -> list[User]:
        # Performance details are an implementation concern, not caller's concern
        return self._db.query(
            "SELECT * FROM users USE INDEX (idx_created_at) "
            "ORDER BY created_at DESC LIMIT %s", (limit,)
        )
```

**Detection rule:**
Flag: (a) SQL strings in non-repository/DAO classes, (b) database-specific syntax (USE INDEX, NOLOCK, ROWNUM) outside the data access layer, (c) HTTP status codes or header names in business logic classes, (d) filesystem paths in domain objects.

---

## AP-10: Abstraction Inversion

**Also known as:** Upside-down abstraction, re-implementing built-ins through the abstraction
**Frequency:** Occasional
**Severity:** High
**Detection difficulty:** Hard

**What it looks like:**

```csharp
// The ORM exposes SaveChanges() which handles transactions internally.
// The repository hides SaveChanges() behind a "unit of work" abstraction.
// Now callers need transaction semantics, but the abstraction doesn't expose them.
// Solution: fetch all records and filter in application code.

public class OrderService {
    public async Task<List<Order>> GetPendingOrdersForCustomer(int customerId) {
        // Cannot call SQL WHERE because the repository hides it.
        // Must fetch ALL orders and filter here.
        var allOrders = await _repository.GetAllOrders(); // 50,000 rows
        return allOrders.Where(o => o.CustomerId == customerId
                                 && o.Status == OrderStatus.Pending).ToList();
    }
}
```

**Why developers do it:**
Abstraction inversion happens when an abstraction is designed for one use case (e.g., simple CRUD) and then used for a more complex one (e.g., filtered queries). Rather than extend the abstraction properly, developers implement the missing functionality on top of the abstraction's public API, which re-uses the abstraction's internals without direct access.

**What goes wrong:**
Performance degrades (fetching 50,000 rows to return 3). The workaround becomes load-bearing, persists indefinitely, and is never cleaned up. The abstraction now has the worst of both worlds: it hides complexity without providing the tools to manage that complexity.

**The fix:**

```csharp
// Expose the needed capability at the correct abstraction level
public interface IOrderRepository {
    Task<List<Order>> GetPendingOrdersByCustomer(int customerId);
    // or: Task<List<Order>> FindOrders(OrderQuery query);
}

public class SqlOrderRepository : IOrderRepository {
    public async Task<List<Order>> GetPendingOrdersByCustomer(int customerId) {
        return await _context.Orders
            .Where(o => o.CustomerId == customerId && o.Status == OrderStatus.Pending)
            .ToListAsync();
    }
}
```

**Detection rule:**
Flag: (a) `GetAll()` calls followed by in-memory LINQ/filter operations in a service layer, (b) loading full collections to find single entities by non-primary-key fields, (c) N+1 query patterns where one call retrieves parents and a loop retrieves children individually.

---

## AP-11: Too Many Layers of Indirection

**Also known as:** Over-engineering, Enterprise FizzBuzz, abstraction tax
**Frequency:** Common
**Severity:** Medium
**Detection difficulty:** Moderate

**What it looks like:**

```
GET /users/{id}
  → UserController
    → UserApplicationService
      → UserDomainService
        → UserRepository
          → UserDataMapper
            → UserEntityFactory
              → UserDao
                → DatabaseConnectionPool
                  → SELECT * FROM users WHERE id = ?
```

Ten hops to read one database row. Each layer has its own class, its own interface, and its own test file. The `UserEntityFactory` has one method: `create(row: Row): UserEntity`.

**Why developers do it:**
Architecture guidelines recommend separation of concerns. Clean Architecture diagrams show layered rings. Developers apply these patterns uniformly regardless of domain complexity, producing enterprise patterns around what is effectively a CRUD operation.

**What goes wrong:**
Debugging requires tracing a call stack ten levels deep. Onboarding takes days instead of hours. Every new feature requires touching 8-10 files. The indirection layers add no semantic content — they rename data without transforming it. The fundamental theorem of software engineering ("any problem can be solved by adding a layer of indirection") has a corollary: the solution may introduce more problems than it solves.

**The fix:**
Apply layering proportional to actual complexity. A simple CRUD resource needs: a controller, a repository, and a domain object. Extract additional layers only when they carry distinct responsibilities that differ in rate of change.

```
GET /users/{id}
  → UserController  (HTTP boundary: parse request, render response)
    → UserRepository  (data boundary: query + map to domain object)
      → SELECT * FROM users WHERE id = ?
```

**Detection rule:**
Flag call chains where more than 4 consecutive classes are single-method pass-throughs (methods that call exactly one other method with no transformation logic).

---

## AP-12: Util/Helper/Manager/Service God Classes

**Also known as:** Dunghill anti-pattern, junk drawer class, catch-all module
**Frequency:** Very Common
**Severity:** High
**Detection difficulty:** Easy

**What it looks like:**

```python
# utils.py — 2,847 lines
def format_date(d): ...
def validate_email(email): ...
def calculate_tax(amount, rate): ...
def send_slack_notification(message): ...
def parse_csv(path): ...
def generate_uuid(): ...
def truncate_string(s, max_len): ...
def get_current_user_from_request(req): ...
def deep_merge_dicts(a, b): ...
def retry_with_backoff(fn, retries): ...
# ... 200 more functions
```

**Why developers do it:**
A utility function does not obviously "belong" to any single domain class. Rather than create a new focused module, the developer drops it into the nearest catch-all. The moment `utils.py` is created, it becomes a gravity well — the path of least resistance for every "I don't know where this goes" function.

**What goes wrong:**
The `utils.py` file becomes untestable (every test must import 2,000 lines of unrelated code), unsearchable (nothing is where you would look for it), and unmaintainable (nobody owns it). Import cycles proliferate because everything imports utils and utils imports everything. New developers cannot discover capability that already exists.

**The fix:**
Every function belongs somewhere specific. When it seems not to belong, it usually belongs on the primary domain object it operates on:

```python
# Before: utils.format_date(order.created_at)
# After: order.formatted_created_at (property) or DateFormatter.format(order.created_at)

# Before: utils.calculate_tax(order.subtotal, region.tax_rate)
# After: order.calculate_tax(region) or TaxCalculator(region).calculate(order)

# Before: utils.send_slack_notification(message)
# After: SlackNotifier(config).send(message)
```

**Detection rule:**
Flag files/modules named `utils`, `helpers`, `common`, `misc`, `shared`, `tools`, `lib` that contain more than 15 functions, or any class named `*Util`, `*Helper`, `*Manager`, `*Handler` with more than 10 public methods spanning more than 3 distinct responsibility domains.

---

## AP-13: Naming by Implementation, Not Intention

**Also known as:** How-naming vs what-naming, implementation-leaking names
**Frequency:** Common
**Severity:** Medium
**Detection difficulty:** Moderate

**What it looks like:**

```java
public class UserService {
    // Name describes mechanism, not purpose
    public User iterateUsersAndFindByEmailUsingHashMap(String email) { ... }

    // Name exposes storage format
    public List<Order> getOrdersFromRedisCache(int userId) { ... }

    // Name exposes algorithm
    public List<Product> sortProductsWithQuicksort(List<Product> products) { ... }

    // Name exposes network call
    public UserProfile callProfileServiceAndDeserializeJson(String userId) { ... }
}
```

**Why developers do it:**
The implementation is fresh in the developer's mind while writing the function. Naming it by mechanism is cognitive shorthand. It also feels precise.

**What goes wrong:**
Implementation names create false coupling. When `getOrdersFromRedisCache` switches storage backends (Redis to Memcached, or cache to database), the name is wrong. Callers who read the name form expectations about caching behavior that may no longer hold. `sortProductsWithQuicksort` prevents the implementation from switching to mergesort without a rename cascade.

**The fix:**

```java
// Before
public User iterateUsersAndFindByEmailUsingHashMap(String email)
public List<Order> getOrdersFromRedisCache(int userId)
public List<Product> sortProductsWithQuicksort(List<Product> products)

// After
public Optional<User> findUserByEmail(String email)
public List<Order> getRecentOrders(int userId)
public List<Product> sortByPopularity(List<Product> products)
```

**Detection rule:**
Flag method names containing implementation-specific terms: `HashMap`, `ArrayList`, `Redis`, `Mysql`, `Postgres`, `Json`, `Xml`, `Quicksort`, `Bubblesort`, `Iterator`, `Loop`, `Iterate`, `Http`, `Socket`, `Cache` (when used as a mechanism indicator rather than a domain term).

---

## AP-14: Generic Action Names

**Also known as:** Vague verbs, do-everything names, handle/process/manage
**Frequency:** Very Common
**Severity:** Medium
**Detection difficulty:** Easy

**What it looks like:**

```javascript
function handleData(data) { ... }
function processOrder(order) { ... }
function manageUsers(users) { ... }
function doStuff(input) { ... }
function runTask(task) { ... }
function executeRequest(request) { ... }
function performAction(action) { ... }
```

**Why developers do it:**
Generic verbs defer the decision about what the function actually does. They provide the illusion of naming while conveying no information. "Handle" is the default verb when a developer has not decided what the function's single responsibility is.

**What goes wrong:**
`handleData` communicates that a function receives data and does something with it — which is true of every function in every program. The caller cannot predict behavior, pre-conditions, post-conditions, or side effects from the name alone. When a bug appears inside `handleData`, the name provides no triage information. Functions with these names tend to accumulate unrelated behavior because their names permit it.

**The fix:**

```javascript
// Before: generic
function handleData(data) { /* validates, transforms, persists, and notifies */ }

// After: specific — one name per responsibility
function validateOrderPayload(payload) { ... }
function transformOrderToInvoice(order) { ... }
function persistInvoice(invoice) { ... }
function notifyCustomerOfInvoice(invoice, customer) { ... }
```

**Detection rule:**
Flag function/method names consisting solely of: `handle`, `process`, `manage`, `do`, `run`, `execute`, `perform`, `operate`, `deal`, `take_care_of`, with no domain-specific qualifier following the verb.

---

## AP-15: Negated Boolean Names

**Also known as:** Double-negative conditions, inverted flags, isNot* naming
**Frequency:** Common
**Severity:** Medium
**Detection difficulty:** Easy

**What it looks like:**

```python
class User:
    is_not_banned: bool
    is_not_deleted: bool
    cannot_login: bool
    has_no_subscription: bool

# Call site creates double negatives
if not user.is_not_banned:
    # Is this: banned? or not-not-banned?
    block_user(user)

if user.is_not_deleted and not user.cannot_login:
    # Reader must parse two negations simultaneously
    allow_login(user)
```

**Why developers do it:**
The feature is added incrementally. The default state starts as the negative case ("most users are not banned"), so the flag is named for the default. Or the developer reasons in terms of exceptions and names the flag for the exception.

**What goes wrong:**
`not user.is_not_banned` requires readers to evaluate a double negative, which reliably causes off-by-one reasoning errors. Studies on boolean logic errors consistently show that double negatives increase error rates. Code review becomes inadequate because reviewers mentally "simplify" the double negative and miss bugs in the simplification.

**The fix:**

```python
# Before
is_not_banned: bool
cannot_login: bool

# After — flip to positive form
is_banned: bool      # default: False
can_login: bool      # default: True
has_subscription: bool
is_deleted: bool

if user.is_banned:
    block_user(user)

if not user.is_deleted and user.can_login:
    allow_login(user)
```

**Detection rule:**
Flag boolean identifiers matching patterns: `is_not_*`, `isNot*`, `cannot_*`, `cannot*`, `has_no_*`, `hasNo*`, `no_*` (as boolean prefix), `never_*`, `without_*`, `lacks_*`.

---

## AP-16: Encoding Type in Name

**Also known as:** Type suffix naming, redundant type annotations in names
**Frequency:** Common
**Severity:** Low
**Detection difficulty:** Easy

**What it looks like:**

```python
user_list = []          # it's a list, we said so twice
user_dict = {}          # same problem
product_string = ""
price_integer = 0
config_object = {}
callback_function = lambda: None
error_exception = ValueError("bad input")
```

**Why developers do it:**
A variant of Hungarian notation. Developers want to communicate the data structure to be used "just in case." Also appears when refactoring — a variable named `users` gets renamed to `user_list` to distinguish it from a newly added `users_dict`.

**What goes wrong:**
Types change. `user_list` becomes a generator, a queryset, or a tuple. The name is now wrong and misleading. The type suffix adds noise that readers learn to ignore, which means it contributes nothing after the first read. In statically typed languages the compiler makes it redundant; in dynamically typed languages the type hint makes it redundant.

**The fix:**

```python
# Before
user_list = []
user_dict = {}

# After — name the content/purpose, let the type be inferred or annotated
users: list[User] = []
users_by_id: dict[int, User] = {}
active_users: QuerySet[User] = User.objects.filter(is_active=True)
```

**Detection rule:**
Flag identifiers ending in `_list`, `_dict`, `_array`, `_map`, `_set`, `_tuple`, `_string`, `_int`, `_float`, `_bool`, `_object`, `_function`, `_callback`, `_exception`, `_error` (as type suffix, not domain term).

---

## AP-17: Comments Compensating for Bad Names

**Also known as:** Explanatory comments as naming shortcuts, comment-instead-of-rename
**Frequency:** Very Common
**Severity:** Medium
**Detection difficulty:** Moderate

**What it looks like:**

```javascript
// Checks if user can proceed (not just if they're logged in — also checks
// subscription status, account standing, and rate limit)
function isReady(user) { ... }

// The multiplier for regional pricing adjustment
const x = 1.23;

// Loop through users and filter out inactive ones, then sort by signup date
function processData(users) { ... }

// Flag that tracks whether we've already sent the welcome email this session
let sent = false;
```

**Why developers do it:**
The developer knows the comment is necessary and writes it — but does not take the next step of embedding that comment in the name. It feels faster to add a comment than to rename and update all references.

**What goes wrong:**
Comments lie. The code is the truth; comments are assertions about the code that go stale. When `isReady` evolves to add a fourth check, the comment may or may not be updated. The name `isReady` persists and continues to mislead. Comments are also invisible in call sites — readers of `if (isReady(user))` elsewhere in the codebase see no comment, only the misleading name.

**The fix:**

```javascript
// Before
// Checks if user can proceed to checkout
function isReady(user) { ... }

// After — name replaces the comment
function canProceedToCheckout(user) { ... }

// Before
const x = 1.23; // regional pricing multiplier

// After
const REGIONAL_PRICING_MULTIPLIER = 1.23;

// Before
// loop through users, filter inactive, sort by signup
function processData(users) { ... }

// After
function getActiveUsersSortedBySignupDate(users) { ... }
```

**Detection rule:**
Flag inline comments (single-line `//` or `#` comments) that appear on the same line as, or immediately preceding, a variable declaration or function definition. These are almost always naming failures waiting to be fixed.

---

## AP-18: Renaming Without Updating All References

**Also known as:** Partial rename, ghost identifiers, alias drift
**Frequency:** Common
**Severity:** High
**Detection difficulty:** Moderate

**What it looks like:**

```python
# Original function
def get_user(user_id: int) -> User:
    return db.query(User).filter_by(id=user_id).first()

# Renamed in user_service.py during a refactor
def fetch_user_by_id(user_id: int) -> User:
    return db.query(User).filter_by(id=user_id).first()

# But 23 other files still call get_user()
# So both coexist, one as an alias or duplicate
def get_user(user_id: int) -> User:
    return fetch_user_by_id(user_id)  # thin wrapper preserved "for compatibility"
```

**Why developers do it:**
Renaming is interrupted. The refactor tool misses dynamic call sites. The developer renames in one module but does not run a global search. Or the rename is intentional: the old name is kept as a "backwards compatible alias" that is never removed.

**What goes wrong:**
The codebase develops two canonical names for the same concept. New code uses the new name; old code uses the old name. The transition never completes. Six months later, neither name is clearly primary, and every junior developer wonders whether `get_user` and `fetch_user_by_id` do different things. Bugs appear when the wrapper alias and the real function diverge.

**The fix:**
Complete renames atomically using IDE refactoring tools. When renaming across a public API boundary, deprecate with a sunset date and a migration guide:

```python
import warnings

def get_user(user_id: int) -> User:
    warnings.warn(
        "get_user() is deprecated; use fetch_user_by_id() instead. "
        "Will be removed in v3.0.",
        DeprecationWarning,
        stacklevel=2
    )
    return fetch_user_by_id(user_id)
```

**Detection rule:**
Flag functions/methods where: (a) the body is a single call to another function with the same parameter signature (thin wrappers), (b) the old name appears in a deprecation warning, (c) git log shows a rename event without a corresponding sweep of all call sites.

---

## AP-19: Abstract Class with One Implementation

**Also known as:** Speculative inheritance, phantom polymorphism, one-class hierarchy
**Frequency:** Common
**Severity:** Medium
**Detection difficulty:** Easy

**What it looks like:**

```java
public abstract class NotificationSender {
    protected abstract void connect();
    protected abstract void disconnect();
    public abstract void send(Notification notification);
    protected abstract boolean isConnected();
}

public class EmailNotificationSender extends NotificationSender {
    // The only subclass. No other implementation has ever been written.
    @Override protected void connect() { /* SMTP connect */ }
    @Override protected void disconnect() { /* SMTP disconnect */ }
    @Override public void send(Notification notification) { /* send email */ }
    @Override protected boolean isConnected() { return this.smtpClient.isConnected(); }
}
```

**Why developers do it:**
"We might add SMS or push notifications later." The abstract base class is written in anticipation of future polymorphism. The architecture feels clean and extensible.

**What goes wrong:**
The abstract class defines a template that the single concrete class must conform to, even if the template does not fit the concrete implementation well. Adding SMS later requires conforming to an interface designed for SMTP. The abstract class calcifies the wrong abstraction (AP-7) before any second use case has revealed what the right abstraction would be. The overhead: two files instead of one, a template method pattern where none is needed, and forced overrides of methods that may not apply to all future implementors.

**The fix:**

```java
// Start with the concrete class
public class EmailNotificationSender {
    public void send(Notification notification) { ... }
}

// When SMS arrives, THEN extract the interface based on what both share
public interface NotificationSender {
    void send(Notification notification);
}
```

**Detection rule:**
Flag abstract classes and interfaces with exactly one non-abstract/non-test implementing class in the codebase. Cross-reference with: (a) the abstract class was introduced in the same commit as its only implementation, (b) no second implementation exists anywhere in the git history.

---

## AP-20: Interface for Every Class

**Also known as:** IRepository/IService suffix proliferation, unnecessary interface extraction
**Frequency:** Common
**Severity:** Medium
**Detection difficulty:** Easy

**What it looks like:**

```csharp
// Every class has a matching interface, regardless of need
public interface IUserService { User GetUser(int id); void UpdateUser(User user); }
public class UserService : IUserService { ... }

public interface IOrderRepository { Order FindById(int id); void Save(Order order); }
public class OrderRepository : IOrderRepository { ... }

public interface IEmailSender { void Send(EmailMessage message); }
public class EmailSender : IEmailSender { ... }

public interface IDateTimeProvider { DateTime UtcNow(); }
public class DateTimeProvider : IDateTimeProvider { ... }

// Result: 40 interfaces for 40 classes, 80 files to navigate
```

**Why developers do it:**
Dependency injection frameworks and unit testing guidance recommend coding to interfaces. This gets cargo-culted into "every class needs an interface." The `I` prefix for interfaces is a C# convention that gets applied universally.

**What goes wrong:**
The codebase doubles in file count with no corresponding increase in flexibility or testability. For the 90% of interfaces with exactly one implementation, the interface adds: one additional file, one additional concept to search, one additional place to maintain method signatures. As the Okta developer blog noted, `IInterface` naming is a code smell that signals over-engineering. The actual benefit — swap implementations for testing — is achievable through other means (virtual methods, subclassing in tests, fakes).

**The fix:**
Extract interfaces when: (a) there are or will imminently be multiple implementations, (b) the interface crosses an architectural boundary (e.g., hexagonal ports), or (c) the interface is needed to break a circular dependency. Not: "for every class, automatically."

```csharp
// Before: IUserService exists solely so UserService can be mocked in tests

// After: make UserService methods virtual, subclass in tests
public class UserService {
    public virtual User GetUser(int id) { ... }
}

// In tests
public class TestUserService : UserService {
    public override User GetUser(int id) => _testUsers[id];
}
```

**Detection rule:**
Flag `I`-prefixed interfaces (or interfaces following `*Interface`, `*Contract` naming) where: (a) only one non-test class implements the interface, and (b) the interface and its sole implementation were created in the same commit.

---

## Root Cause Analysis

| Root Cause | Anti-Patterns Triggered | Primary Driver |
|---|---|---|
| Naming deferred during flow state | AP-1, AP-17 | Productivity pressure |
| Feature evolution without rename discipline | AP-2, AP-18 | Refactoring cost perception |
| Legacy conventions carried forward | AP-4, AP-16 | Institutional inertia |
| DRY applied as rule rather than heuristic | AP-7, AP-8 | Misapplied principles |
| Abstraction defined before second use case | AP-8, AP-19, AP-20 | Speculative design |
| No domain vocabulary documented | AP-6, AP-13 | Missing architecture discipline |
| Utility-first organization | AP-12 | Missing domain model |
| Catch-all verbs used as placeholders | AP-14 | Insufficient domain understanding |
| Negative-first reasoning about state | AP-15 | Incremental feature accretion |
| Abbreviation culture / line-length habits | AP-3 | Historical constraints misapplied |
| Abstraction boundary not designed | AP-9, AP-10, AP-11 | Incomplete architecture definition |
| Interface-for-testability cargo cult | AP-20 | Overgeneralized testing guidance |

---

## Self-Check Questions

Use these questions during code review or when auditing a codebase for naming and abstraction quality.

1. If you removed all comments from a function, could a new team member still understand what it does from names alone? (AP-1, AP-17)

2. For every boolean field or parameter, does its name start with `is`, `has`, `should`, `can`, `was`, or `will`? (AP-5, AP-15)

3. Does your codebase have exactly one term for each domain concept, used consistently across all layers? (AP-6)

4. For every abstraction (class, interface, function), can you name the second use case it serves — not one you imagine in the future, but one that exists today? (AP-8, AP-19, AP-20)

5. Can every layer in your call stack be removed without the remaining layers needing to know about the removed layer's implementation details? (AP-9, AP-11)

6. If you renamed every function by its implementation details, would the names change? If yes, the current names may be leaking implementation. (AP-13)

7. Do you have any files named `utils`, `helpers`, `common`, or `misc` with more than 10 functions? If so, which specific domain does each function belong to? (AP-12)

8. For every abstract class and interface, how many concrete implementations exist today? If the answer is one, why does the abstraction exist now? (AP-8, AP-19, AP-20)

9. Are there any functions in your codebase whose sole body is a call to another function with the same parameters? (AP-18)

10. Are there any functions with more than 5 boolean parameters, or any function whose behavior changes based on a `type` or `mode` parameter? (AP-7)

11. Does every function name include at least one domain-specific noun alongside its verb? `processOrder` has a noun; `processData` does not. (AP-14)

12. When you search the codebase for a domain concept (e.g., "user"), do you find it under one name or under many (`user`, `account`, `member`, `profile`)? (AP-6)

13. Are there places where a higher-level layer fetches all records and filters them in memory when a lower-level query could do it? (AP-10)

14. For every variable with a comment explaining it, ask: could the comment be eliminated by putting its content in the variable name? (AP-17)

15. Does your codebase have abbreviations that are not defined in a glossary? Would a developer from another team know what `OrdProc` or `CustMgr` means on day one? (AP-3)

---

## Code Smell Quick Reference

| Smell | Anti-Pattern | One-Line Rule |
|---|---|---|
| Variable named `data`, `info`, `temp`, `x` | AP-1 | Every name must answer: "data about what?" |
| Function description contradicts its behavior | AP-2 | Read the code, not the name — they should match |
| Identifier with `Mgr`, `Svc`, `Proc` suffix | AP-3 | Spell it out; abbreviations are not universal |
| Variable prefix `str`, `n`, `b`, `arr` | AP-4 | Remove type prefixes in typed languages |
| Boolean field named `active`, `delete`, `login` | AP-5 | Prefix with `is_`, `has_`, `should_` |
| Same entity called by 3+ names | AP-6 | One concept, one name; document in a glossary |
| Function with 6+ flag parameters | AP-7 | Split into focused functions per use case |
| Interface with one implementation, created together | AP-8, AP-20 | Build it when the second use case arrives |
| SQL string in a service class | AP-9 | Data access details belong in the data layer |
| `GetAll()` + in-memory filter in service | AP-10 | Push filtering to the query layer |
| 4+ pass-through wrappers in a call chain | AP-11 | Layers should transform, not just relay |
| File named `utils.py` over 200 lines | AP-12 | Every function belongs to a domain |
| Method named `getOrdersFromDatabase` | AP-13 | Name the intent; hide the mechanism |
| Function named `handleData` or `processRequest` | AP-14 | Add a domain noun: `handlePaymentData` |
| Boolean named `isNotDisabled`, `cannot_edit` | AP-15 | Flip to positive: `isEnabled`, `can_edit` |
| Variable named `user_list`, `config_dict` | AP-16 | Remove type suffix; use type annotation instead |
| Line comment immediately above a function | AP-17 | Move the comment content into the function name |
| Two functions that do the same thing | AP-18 | Complete renames atomically; delete the alias |
| Abstract class with one concrete subclass | AP-19 | Inline to concrete; extract when second arrives |
| `I`-prefixed interface, one implementation | AP-20 | Reserve interfaces for real polymorphism |

---

*Researched: 2026-03-08 | Sources: [The Wrong Abstraction — Sandi Metz](https://sandimetz.com/blog/2016/1/20/the-wrong-abstraction), [The Law of Leaky Abstractions — Joel on Software](https://www.joelonsoftware.com/2002/11/11/the-law-of-leaky-abstractions/), [Abstraction Inversion — Wikipedia](https://en.wikipedia.org/wiki/Abstraction_inversion), [Hungarian Notation Postmortem — SubMain](https://blog.submain.com/hungarian-notation-postmortem-went-wrong/), [IInterface Considered Harmful — Okta Developer](https://developer.okta.com/blog/2019/06/25/iinterface-considered-harmful), [Dunghill Anti-Pattern — Matti Lehtinen](https://mattilehtinen.com/articles/dunghill-anti-pattern-why-utility-classes-and-modules-smell/), [Post-Architecture: Premature Abstraction — Arend Jr](https://www.arendjr.nl/blog/2024/07/post-architecture-premature-abstraction-is-the-root-of-all-evil/), [AHA Programming — Kent C. Dodds](https://kentcdodds.com/blog/aha-programming), [Indirection Is Not Abstraction — Silas Reinagel](https://www.silasreinagel.com/blog/2018/10/30/indirection-is-not-abstraction/)*
