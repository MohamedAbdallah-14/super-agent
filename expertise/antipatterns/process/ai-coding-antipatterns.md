# AI Coding Anti-Patterns

> AI coding agents produce code that compiles, passes superficial review, and reads authoritatively -- yet harbors systematic defects that human-written code rarely exhibits. These anti-patterns arise from the fundamental mechanics of next-token prediction operating without ground truth, persistent memory, or genuine understanding. A 2026 CodeRabbit analysis of 470 open-source repositories found AI-generated code contains 1.7x more bugs than human code, with 75% more logic errors and 57% more security findings per pull request. A USENIX Security 2025 study of 576,000 code samples found 20% of AI-recommended packages do not exist. This module catalogs the 20 most damaging patterns, grounded in documented incidents and empirical research.

> **Domain:** Process -- AI-Assisted Development
> **Anti-patterns covered:** 20
> **Highest severity:** Critical
> **Primary audience:** AI agents performing self-evaluation; human reviewers auditing AI output

---

## Anti-Patterns

### AP-01: Hallucinated APIs

**Also known as:** Phantom Functions, Slopsquatting Vector, Confabulated Interfaces
**Frequency:** Very Common
**Severity:** Critical
**Detection difficulty:** Moderate

**What it looks like:**

```python
# AI-generated code for OpenAI API
from openai import ChatCompletion
response = ChatCompletion.create(model="gpt-4", messages=[...])
# ChatCompletion.create() was removed in openai>=1.0.0
# Correct: client.chat.completions.create(...)
```

```javascript
import { useFormState } from 'react';
// useFormState does not exist -- it was briefly in react-dom canary,
// then renamed to useActionState in React 19
```

**Why AI agents do it:**

Training data contains both old and new API surfaces. The model blends them, producing calls that are syntactically plausible but reference a version that never existed in that form. A Stanford/Hugging Face study found over 42% of code snippets from major AI tools contain hallucinations. Worse, hallucinated package names create a supply-chain attack vector called "slopsquatting": USENIX 2025 researchers found 38% of hallucinated packages are conflations (e.g., `express-mongoose`), 13% are typo variants, and 51% are pure fabrications. One hallucinated package, `huggingface-cli`, was downloaded 30,000+ times in three months despite containing no code.

**What goes wrong:**

`AttributeError` or `ModuleNotFoundError` at runtime. Attackers register packages with hallucinated names, embedding malware. 43% of hallucinated packages are repeated deterministically across runs, making them reliable attack targets.

**The fix:**

Pin library versions in prompts: "Using openai==1.30.0, use `client.chat.completions.create()`." Verify every import against installed package exports. Lock dependencies to approved registries.

**Detection rule:**

Run `python -c "import <module>; dir(<module>)"` to verify imported names. Flag function calls absent from type stubs. Verify all packages exist in the public registry before `pip install` or `npm install`.

---

### AP-02: Outdated Patterns

**Also known as:** Temporal Mismatch, Legacy Style, Training Data Lag
**Frequency:** Very Common
**Severity:** High
**Detection difficulty:** Hard

**What it looks like:**

```javascript
// AI writes class components in React 2025
class UserProfile extends React.Component {
  constructor(props) {
    super(props);
    this.state = { user: null };
  }
  componentDidMount() { /* ... */ }
  render() { return <div>{this.state.user?.name}</div>; }
}
// Class components have been discouraged since React 16.8 (2019)
```

**Why AI agents do it:**

Training data overrepresents older patterns because they existed longer and appear in more Stack Overflow answers and GitHub repos. A 2024 study of seven LLMs across 145 API mappings from eight Python libraries found systematic deprecated API usage. Frequency in training data acts as a confidence proxy, so older patterns score higher.

**What goes wrong:**

Code misses performance improvements, security patches, and ergonomic features. Deprecated APIs become removal time bombs. Developers propagate outdated practices learned from AI output.

**The fix:**

Specify exact framework version and patterns: "Using React 19 with functional components and hooks only -- no class components." Include a "do not use" list for known deprecated APIs.

**Detection rule:**

Maintain a deprecated-API watchlist per framework. Flag `class X extends React.Component`, `componentDidMount` in React. Flag `flask.ext.*` imports. Cross-reference against deprecation changelogs.

---

### AP-03: Context Blindness

**Also known as:** Codebase Ignorance, Island Code, Convention Deafness
**Frequency:** Very Common
**Severity:** High
**Detection difficulty:** Moderate

**What it looks like:**

```typescript
// Existing codebase has a centralized API client with interceptors
// AI generates a standalone fetch call ignoring all of it:
async function getUser(id: string) {
  const response = await fetch(`https://api.example.com/users/${id}`, {
    headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
  });
  return response.json();
}
// The codebase already has: apiClient.get<User>(`/users/${id}`)
// with automatic auth, retry, error handling, and type inference
```

**Why AI agents do it:**

The AI operates on whatever is in its context window. JetBrains (2025) research shows that as context grows, the attention mechanism deprioritizes foundational instructions in favor of recent tokens. The AI defaults to "standard" implementations from training data rather than matching codebase conventions.

**What goes wrong:**

Parallel implementations diverge over time. Centralized error handling, logging, and retry logic are bypassed. Hardcoded URLs and tokens bypass configuration management. New developers assume AI output represents project conventions.

**The fix:**

Include an `architecture.md` describing patterns, API clients, and utilities. After generation, search for existing utilities: `grep -r "function.*getUser\|fetchUser"`.

**Detection rule:**

Flag `fetch`, `axios`, or `http` imports when the project has a centralized API client. Flag hardcoded URLs or tokens. Flag new utility functions whose signatures match existing ones.

---

### AP-04: Confident Wrongness

**Also known as:** Authoritative Incorrectness, Hallucinated Certainty, Plausible Nonsense
**Frequency:** Common
**Severity:** Critical
**Detection difficulty:** Very Hard

**What it looks like:**

```python
def verify_token(token: str) -> dict:
    """Verify and decode a JWT token."""
    decoded = jwt.decode(
        token,
        options={"verify_signature": False}  # AI: "decode first, verify after"
    )
    # Signature verification DISABLED -- accepts any forged token
    return decoded
```

**Why AI agents do it:**

LLMs have no internal uncertainty signal mapped to correctness -- equally confident when right and wrong. Research shows ChatGPT is wrong more than half the time on Stack Overflow questions, yet programmers failed to identify incorrect answers 39.34% of the time. IEEE Spectrum reported newer LLMs fail more "insidiously" -- older models produced broken syntax, while newer models produce plausible code with subtle logical flaws requiring domain expertise to detect.

**What goes wrong:**

Security vulnerabilities ship because code "looked right." The JWT example passes all functional tests while accepting forged tokens. Newer models increasingly generate code that avoids crashes by removing safety checks or creating fake output matching the desired format.

**The fix:**

Treat every AI-generated security-critical path as untrusted. Require explicit verification: "Show me where signature verification happens and what happens when it fails." Cross-reference against official documentation.

**Detection rule:**

Flag `verify_signature: False`, `verify: False`, `check_hostname=False`. Flag auth code lacking explicit failure paths. Require documentation citations for security-critical functions.

---

### AP-05: Over-Engineering

**Also known as:** Astronaut Architecture, Abstraction Addiction, Enterprise-Grade Hello World
**Frequency:** Common
**Severity:** Medium
**Detection difficulty:** Easy

**What it looks like:**

```java
// User asks: "Send a welcome email"
// AI generates: AbstractEmailService, EmailServiceFactory,
// EmailTemplateStrategy, WelcomeEmailServiceImpl...
// 200 lines to send one email.
// What was needed:
// sendEmail(to, "Welcome!", renderTemplate("welcome", {name}))
```

**Why AI agents do it:**

Training data from enterprise codebases overrepresents design patterns. RLHF rewards "thorough" responses, biasing toward elaborate output. Augment Code (2025) found AI tools make experienced developers 19% slower, partly from simplifying over-engineered AI output.

**What goes wrong:**

Simple features become hard to understand and debug. Abstractions are speculative -- built for flexibility never exercised. Boilerplate-to-logic ratios exceed 3:1.

**The fix:**

State constraints: "Single function, no interfaces or abstract classes unless two implementations already exist." Apply the rule of three: no abstraction until the third use case.

**Detection rule:**

Flag interfaces with one implementation. Flag abstract classes with one subclass. Flag boilerplate-to-logic ratios above 3:1.

---

### AP-06: Partial Updates

**Also known as:** Incomplete Refactoring, Dangling References, Half-Done Migration
**Frequency:** Very Common
**Severity:** Critical
**Detection difficulty:** Moderate

**What it looks like:**

```python
# AI renames function in auth/service.py
def authenticate_user(email, password):  # renamed from verify_user
    ...

# routes/login.py -- NOT updated
from auth.service import verify_user  # ImportError at runtime
```

**Why AI agents do it:**

The AI processes files individually. Refactoring is a graph traversal problem -- changes cascade to call sites, types, imports, tests, and docs. VentureBeat (2025) identified broken refactors as a key reason AI agents are not production-ready: agents update definitions but miss call sites, and even when prompted to update references, the process is slow and error-prone. The 66% developer frustration rate with "almost right" AI solutions is largely driven by this pattern.

**What goes wrong:**

`ImportError` or `NameError` in files the AI never touched. In dynamic languages, errors surface only when affected code paths execute -- potentially in production.

**The fix:**

After any rename: "Search the entire codebase for all references to the old name and update every occurrence." Run `mypy .`, `tsc --noEmit`, or `grep -rn "old_name"`.

**Detection rule:**

Flag any diff modifying a function signature without corresponding changes in importing files. Run `grep` for the old name -- remaining hits indicate partial update.

---

### AP-07: Broken Imports

**Also known as:** Import Hallucination, Module Confusion, Path Fabrication
**Frequency:** Very Common
**Severity:** High
**Detection difficulty:** Easy

**What it looks like:**

```javascript
import { useAuth } from '@/hooks/useAuth';          // actual: '@/composables/useAuth'
import { Button } from '@mui/core';                  // actual: '@mui/material'
import { createClient } from '@supabase/supabase';   // actual: '@supabase/supabase-js'
```

**Why AI agents do it:**

Import paths combine three failure modes: (1) library restructuring between versions, (2) project-specific path conventions that vary per codebase, (3) similar-sounding package names. The model generates the most statistically likely path from training data.

**What goes wrong:**

Immediate `ModuleNotFoundError`. With JavaScript bundlers that have silent fallbacks, the wrong module may be imported with different behavior.

**The fix:**

Examine existing import patterns: `grep -rn "import.*from" --include="*.ts" | head -20`. Verify package names against `package.json` or `requirements.txt`.

**Detection rule:**

Run `tsc --noEmit` or attempt each import in isolation. Flag `@/` paths not matching existing files. Flag library imports not in the dependency file.

---

### AP-08: Test Theater

**Also known as:** Green Wash Testing, Coverage Illusion, Tautological Tests
**Frequency:** Very Common
**Severity:** Critical
**Detection difficulty:** Hard

**What it looks like:**

```python
# Tautology: asserts code equals itself
def test_calculate_discount():
    result = calculate_discount(100, 0.2)
    assert result == calculate_discount(100, 0.2)  # always passes

# Mirror: re-implements the function
def test_tax():
    assert calculate_tax(100) == 100 * 0.08  # just re-implements

# Mock theater: tests that the mock works
def test_user_service():
    mock_repo = Mock()
    mock_repo.find.return_value = User(name="Alice")
    service = UserService(mock_repo)
    assert service.get_user(1).name == "Alice"  # only tests mock config
```

**Why AI agents do it:**

The AI reads the implementation and generates assertions it satisfies. It has no independent specification to derive what code *should* do. On real-world code, LLM-generated tests hit only 40% mutation kills -- they execute every line but miss 96% of potential bugs. The ground truth problem means the AI's only source of truth is the potentially-buggy code itself.

**What goes wrong:**

100% coverage with zero defect detection. Bugs survive because tests match buggy behavior. Teams reduce manual testing, shipping defects with false confidence.

**The fix:**

Write tests from requirements, not code: "Test that 20% discount on $100 yields $80." Use mutation testing (mutmut, Stryker). Require at least one spec-derived test per function.

**Detection rule:**

Flag assertions replicating implementation logic. Flag tests where every assertion passes on first run. Flag tests asserting only mock return values. Run mutation testing: surviving mutants indicate theatrical tests.

---

### AP-09: Security Blindspot

**Also known as:** Insecure Defaults, Vulnerability Planting, Happy-Path Security
**Frequency:** Common
**Severity:** Critical
**Detection difficulty:** Hard

**What it looks like:**

```python
# SQL injection
def search_users(query: str):
    cursor.execute(f"SELECT * FROM users WHERE name LIKE '%{query}%'")

# Path traversal
@app.route('/upload', methods=['POST'])
def upload():
    file = request.files['file']
    file.save(os.path.join('/uploads', file.filename))

# Hardcoded secret
JWT_SECRET = "super-secret-key-12345"
```

**Why AI agents do it:**

Security is a negative requirement -- defining what must NOT happen, which is harder for a predictor optimized for what SHOULD happen. Veracode's 2025 report found 45% of AI-generated code contains security vulnerabilities, with Java at over 70% failure rates. Missing input sanitization is the most common flaw; models generate insecure code 88% of the time for Log Injection. Repositories using Copilot leak 40% more secrets. The "Rules File Backdoor" attack showed hidden unicode in AI config files can instruct agents to inject malicious code.

**What goes wrong:**

SQL injection enables data exfiltration. Path traversal allows reading `/etc/passwd`. Hardcoded secrets are scraped by bots within minutes. Architectural drift -- subtle design changes breaking security invariants without violating syntax -- evades static analysis and human reviewers.

**The fix:**

Security checklist per task: parameterized queries, input validation, secrets from environment only. Run SAST tools (Semgrep, Bandit) on all AI output. Include adversarial inputs in tests.

**Detection rule:**

Flag string interpolation in SQL. Flag `file.save()` without sanitization. Flag high-entropy string literals. Flag routes without auth middleware. Run `bandit -r .` or `semgrep --config=p/security-audit`.

---

### AP-10: Eager Rewrite

**Also known as:** Scorched Earth Refactoring, Rewrite Compulsion, Clean Slate Syndrome
**Frequency:** Common
**Severity:** High
**Detection difficulty:** Easy

**What it looks like:**

```
# User: "Fix the off-by-one error in pagination"
# AI: "I've rewritten the entire pagination module with improved structure!"
# Original: 200 lines, one bug on line 47
# Result: 350 lines, different structure, bug fixed, new bugs introduced
```

**Why AI agents do it:**

Generating new code is the model's core competency. Surgical editing requires understanding precise semantics and preserving all behavior except the fix. When encountering "messy" code, the model is biased toward rewriting. In autonomous fix mode, agents "helpfully" refactor adjacent code, triggering chains of regressions.

**What goes wrong:**

Working code replaced with untested code. Subtle edge-case handling silently dropped. Diffs become unreviewable. Regression bugs appear in unrelated areas.

**The fix:**

Constrain scope: "Change ONLY lines necessary to fix the bug. Do not rename, restructure, or change unrelated lines." Review diffs line-by-line.

**Detection rule:**

If >20% of file changed for a single bug fix, flag for review. Flag variable renames not in the task. Flag new functions added during bug fixes.

---

### AP-11: Scope Creep

**Also known as:** Feature Drift, Gold Plating, Unsolicited Enhancement
**Frequency:** Common
**Severity:** Medium
**Detection difficulty:** Easy

**What it looks like:**

```python
# User: "Add a /health endpoint that returns 200 OK"
# AI generates: database checks, Redis checks, disk space, memory usage,
# uptime, version info, degraded status logic...
# User wanted: return jsonify({'status': 'ok'}), 200
```

**Why AI agents do it:**

RLHF rewards "helpful" and "thorough," biasing toward more rather than less. Training data associates health endpoints with comprehensive monitoring. Red Hat (2026) noted that without specifications, AI overengineers or underdelivers, and constraints that list scope prevent hallucinations about irrelevant features.

**What goes wrong:**

New dependencies, failure modes, and maintenance burden. The health endpoint fails when Redis is down, even if the app does not use Redis.

**The fix:**

Be explicit: "Implement ONLY a /health endpoint returning `{'status': 'ok'}` with HTTP 200. No dependency checks." Delete everything not requested.

**Detection rule:**

Compare functionality against request word-by-word. Flag functions not mentioned in the task. Flag new imports not in existing dependencies.

---

### AP-12: Missing Error Handling

**Also known as:** Happy Path Only, Optimistic Programming, Silent Failure
**Frequency:** Very Common
**Severity:** High
**Detection difficulty:** Moderate

**What it looks like:**

```javascript
async function fetchUserData(userId) {
  const response = await fetch(`/api/users/${userId}`);
  const data = await response.json();
  return data;
  // Network down? Server 404? Response not JSON? userId null?
}
```

**Why AI agents do it:**

Error handling is verbose and context-dependent. Training examples omit it for brevity. The AI cannot predict deployment failure modes: timeouts, disk full, permissions, concurrency. Research shows AI code particularly produces "silent failures" -- code that runs in testing but fails under real-world conditions with memory leaks, pagination bugs on large datasets, and race conditions.

**What goes wrong:**

Unhandled exceptions crash the app or produce generic 500 errors with no diagnostic information. Failures surface only under specific conditions in production.

**The fix:**

For every function, ask: "What are the failure modes?" Require every HTTP call to check response status, every JSON parse to handle errors, every file operation to handle missing files.

**Detection rule:**

Flag `fetch()` without `.ok` checks. Flag `JSON.parse()` without try/catch. Flag I/O functions without error handling.

---

### AP-13: Copy-Paste Duplication

**Also known as:** Clone-and-Modify, Redundant Implementation, Utility Blindness
**Frequency:** Common
**Severity:** Medium
**Detection difficulty:** Moderate

**What it looks like:**

```python
# AI generates identical email validation in routes/users.py,
# routes/invitations.py, and routes/contacts.py:
if not re.match(r'^[\w.+-]+@[\w-]+\.[\w.]+$', request.json['email']):
    return jsonify({'error': 'invalid email'}), 400
# Three copies of the same regex, same error message, same logic
```

**Why AI agents do it:**

Each prompt is processed with limited awareness of other files. The model generates self-contained solutions because training examples are standalone. Even with both files in context, statistical preference favors complete code blocks.

**What goes wrong:**

When the regex needs updating, it must change in every copy. Missed copies become inconsistent bugs. The codebase grows larger without growing more capable.

**The fix:**

Review for duplicated logic and extract shared functions. Instruct: "Check if the codebase already has validation utilities." Run jscpd or PMD CPD.

**Detection rule:**

Flag 5+ identical lines in multiple files. Flag identical regex patterns across files. Flag functions with matching signatures and similar bodies in different modules.

---

### AP-14: Framework Mismatch

**Also known as:** Framework Confusion, Paradigm Mixing, Stack Contamination
**Frequency:** Common
**Severity:** High
**Detection difficulty:** Moderate

**What it looks like:**

```python
# FastAPI project, but AI generates Django ORM:
user = User.objects.get(pk=user_id)  # Django ORM in FastAPI
# Should be: await db.execute(select(User).where(User.id == user_id))
```

**Why AI agents do it:**

Framework APIs share conceptual similarities. The model draws from Flask, Django, FastAPI, and Bottle simultaneously when prompted for "Python web API." Within ecosystems (Vue 2 vs 3, React class vs hooks), distinctions are harder because the same library name is used.

**What goes wrong:**

Obvious cases fail immediately. Subtle cases -- synchronous ORM in async framework -- work in development but deadlock under concurrent load.

**The fix:**

State exact framework and version: "FastAPI 0.110 with SQLAlchemy 2.0 async." Include examples of existing patterns.

**Detection rule:**

Cross-reference every import against `package.json`, `requirements.txt`, or `go.mod`. Flag imports from frameworks not in the dependency file. Flag synchronous I/O in async frameworks.

---

### AP-15: State Inconsistency

**Also known as:** State Desync, Orphaned State, Update Amnesia
**Frequency:** Common
**Severity:** High
**Detection difficulty:** Hard

**What it looks like:**

```javascript
async function updateUserEmail(userId, newEmail) {
  await db.users.update({ id: userId }, { email: newEmail });
  return { success: true };
  // Cache still has old email -- reads return stale data
  // Search index not updated -- user unfindable by new email
}
```

**Why AI agents do it:**

State dependencies are implicit and distributed. The AI sees the explicit operation but not implicit dependencies: cache invalidation, derived state recalculation, event emission, audit logs. These depend on convention and tribal knowledge absent from visible code.

**What goes wrong:**

Users see stale data. Shopping carts show wrong totals. In distributed systems, inconsistency propagates through event queues, creating cascading data corruption that is intermittent and environment-dependent.

**The fix:**

Document state dependencies: "When updating email: invalidate cache, update search index, update notification preferences." After any mutation, ask: "What else reads this data?"

**Detection rule:**

Flag database writes without cache invalidation when a caching layer exists. Flag state mutations without derived state updates. Search for the updated field across the codebase.

---

### AP-16: Ignoring Constraints

**Also known as:** Requirement Blindness, Specification Drift, Constraint Amnesia
**Frequency:** Common
**Severity:** High
**Detection difficulty:** Moderate

**What it looks like:**

```python
# Prompt: "Use ONLY the standard library. No external packages."
import requests  # external -- violates constraint
import pandas as pd  # external -- violates constraint
```

**Why AI agents do it:**

LLMs are weaker at adhering to negations than affirmations. The concrete task ("fetch data") receives more attention than the constraint ("stdlib only"). `requests` and `pandas` are so strongly associated with their tasks in training data that they override explicit constraints. In long prompts, early constraints may fall outside effective attention.

**What goes wrong:**

Architectural decisions violated: dependency restrictions, performance budgets, compatibility requirements. External packages in constrained environments cause deployment failures.

**The fix:**

State constraints at beginning AND end (recency bias). Make constraints verifiable: "Zero imports outside Python stdlib." Mechanically verify post-generation.

**Detection rule:**

Extract constraints as a checklist. Verify each mechanically: count queries, check imports, measure sizes. Flag prohibited patterns.

---

### AP-17: Plausible-But-Wrong Logic

**Also known as:** Semantic Correctness Failure, Almost-Right Algorithm, Statistical Confidence Bug
**Frequency:** Common
**Severity:** Critical
**Detection difficulty:** Very Hard

**What it looks like:**

```python
def next_business_day(date):
    next_day = date + timedelta(days=1)
    while next_day.weekday() in [5, 6]:
        next_day += timedelta(days=1)
    return next_day
# Ignores holidays. In financial systems: incorrect settlement dates.

def binary_search(arr, target):
    low, high = 0, len(arr) - 1
    while low <= high:
        mid = (low + high) // 2  # overflow in fixed-width integer languages
        ...
# Safe in Python, wrong when ported to Java/C++.
```

**Why AI agents do it:**

The model generates structurally similar code to correct implementations but lacks understanding of invariants and domain-specific requirements. The binary search overflow bug existed in Java's stdlib for nine years. IEEE Spectrum found newer LLMs produce "silent failures" -- code avoiding crashes by removing safety checks or creating fake output matching the desired format.

**What goes wrong:**

Passes simple tests, fails on edge cases surfacing months later. Off-by-one in pagination appears only with large datasets. Time zone bugs appear only in specific regions. Financial errors accumulate over thousands of transactions.

**The fix:**

Request invariant explanations. Use property-based testing (Hypothesis, fast-check). Specify exact domain rules including edge cases: "Business days exclude weekends AND holidays from this list."

**Detection rule:**

Flag algorithms without edge-case tests. Flag date operations without timezone handling. Flag financial calculations using floating-point. Flag loops without termination proofs.

---

### AP-18: Fake Progress

**Also known as:** Stub Hell, TODO-Driven Development, Placeholder Permanence
**Frequency:** Common
**Severity:** High
**Detection difficulty:** Moderate

**What it looks like:**

```python
class AuthenticationService:
    def login(self, email, password) -> str:
        # TODO: implement login
        return "fake-token"

    def verify_token(self, token) -> User:
        # TODO: implement verification
        return User(id=1, email="test@test.com")  # hardcoded!

    def reset_password(self, email) -> bool:
        # TODO: implement
        return True  # always succeeds
```

**Why AI agents do it:**

When tasks exceed context or knowledge limits, the model generates structure (inferrable from patterns) while leaving substance as stubs. Stubs return plausible defaults that allow calling code to function, creating the illusion of a working system. The model may also hit output length limits.

**What goes wrong:**

Stubs enter version control because they "work." `verify_token` accepts any string as valid authentication. `reset_password` always returns True. These are active security vulnerabilities disguised as implementations.

**The fix:**

Ban `pass`, `TODO`, and hardcoded returns in production. Require `raise NotImplementedError("description")` for unfinished code. Search for `TODO`, `FIXME`, `pass`, `return True`, `return []`.

**Detection rule:**

Flag functions whose body is `pass`, `return None`, `return True`, or a hardcoded literal. Flag functions containing `TODO`/`FIXME`. Flag functions returning values without referencing their parameters.

---

### AP-19: Over-Mocking

**Also known as:** Mock Abuse, Test Isolation Theater, Dependency Erasure
**Frequency:** Common
**Severity:** High
**Detection difficulty:** Moderate

**What it looks like:**

```python
def test_process_order():
    mock_db = Mock()
    mock_cache = Mock()
    mock_payment = Mock()
    mock_email = Mock()
    mock_inventory = Mock()
    mock_payment.charge.return_value = PaymentResult(success=True)
    mock_inventory.check.return_value = True
    mock_db.save.return_value = Order(id=1)

    service = OrderService(mock_db, mock_cache, mock_payment,
                           mock_email, mock_inventory)
    result = service.process(order_data)
    assert result.success == True  # tests mock returns what we told it
    mock_payment.charge.assert_called_once()  # tests we called the mock
    # NOT tested: charge amount, inventory decrement, email content, failure paths
```

**Why AI agents do it:**

A 2025 empirical study found AI agents use mock-type test doubles 95% of the time, versus varied doubles from human developers. Mocks make any test pass by construction. Mocked tests require no infrastructure setup. The agent's success criterion is passing tests -- it will mock the module under test itself to achieve that goal.

**What goes wrong:**

Tests pass when code is correct and when it is broken. If `process()` sends the wrong payment amount, tests still pass. When real APIs change interfaces, mocks use the old interface and stay green while production breaks.

**The fix:**

Testing pyramid: unit tests for pure logic (no mocks), integration tests with real dependencies, minimal mocking for truly external services. For every mock, ask: "What behavior am I hiding?" Require at least one integration test per critical path.

**Detection rule:**

Flag tests creating more than 3 mocks. Flag tests asserting only mock return values or `assert_called`. Flag test files with `Mock()` appearing 10+ times. Require 30% integration tests.

---

### AP-20: Resumption Errors

**Also known as:** Context Amnesia, Session Fragmentation, Continuity Failure
**Frequency:** Common
**Severity:** High
**Detection difficulty:** Hard

**What it looks like:**

```python
# Session 1: "Use UUID for all entity IDs"
class User:
    id: UUID
class Order:
    id: UUID
    user_id: UUID

# Session 2 (after context reset): forgets UUID decision
class Product:
    id: int  # auto-increment -- contradicts UUID decision
class OrderItem:
    order_id: int  # should be UUID to match Order.id
```

**Why AI agents do it:**

LLMs are fundamentally stateless. Each session begins fresh. After 30-60 minutes, agents forget earlier decisions, re-read processed files, contradict prior choices, and eventually undo their own work. Research shows agents continue working confidently with incomplete context, producing "increasingly unreliable outputs." The more text in context, the harder attention prioritizes foundational rules -- recent tokens overpower older instructions.

**What goes wrong:**

Type mismatches between entities from different sessions: `Order.id` is UUID but `OrderItem.order_id` is int. Convention drift: `camelCase` early, `snake_case` later. Error strategy changes: Result types early, exceptions later. The codebase reads as if written by developers who never communicated.

**The fix:**

Maintain `architecture.md` documenting all conventions. Include it in every session. After breaks, re-inject decisions: "We use UUIDs, snake_case, Result types." Review existing models before generating new ones.

**Detection rule:**

Diff generated code against existing patterns. Flag type mismatches in related fields. Flag naming inconsistencies across files. Run consistency checks: `grep -rn "id:" --include="*.py" | sort`.

---

## Root Cause Analysis

| Root Cause | Contributing Anti-Patterns | Systemic Fix |
|---|---|---|
| **Training data is a snapshot, not current reality** | AP-01, AP-02, AP-07 | Pin library versions; verify imports against installed packages; approved package registries |
| **No persistent memory across sessions** | AP-03, AP-15, AP-20 | Architecture decision records; convention files in every session; explicit re-injection after compaction |
| **Optimized for plausibility, not correctness** | AP-04, AP-17, AP-18 | Adversarial testing; require invariant proofs; ban stubs in production; independent specification |
| **No ground truth or specification** | AP-08, AP-12, AP-19 | TDD with spec-derived tests; mutation testing; integration tests with real dependencies |
| **Negative requirements weakly attended** | AP-09, AP-16 | Constraints at start AND end of prompt; automated SAST scanning; mechanical constraint verification |
| **Reward model favors length and completeness** | AP-05, AP-11, AP-13 | Explicit scope boundaries; minimal-change principle; complexity budgets; delete unrequested code |
| **File-at-a-time processing limits** | AP-06, AP-14, AP-03 | Full-codebase grep after refactoring; type checker as gate; framework-specific linting |
| **Generation easier than editing** | AP-10, AP-13 | "Change only these lines" instructions; diff-size limits; reject rewrites for bug fixes |

## Self-Check Questions

An AI coding agent should ask itself these questions before submitting generated code:

1. **Import verification:** Have I confirmed every import path exists and every library function I called exists in the installed version?

2. **Version currency:** Am I using the current API for this library version, or patterns from an older version in my training data?

3. **Codebase alignment:** Does this code follow the existing project's conventions for naming, error handling, and architecture? Have I checked neighboring files?

4. **Confidence calibration:** Am I confident because I verified correctness, or because it looks right? For security code, have I cited documentation?

5. **Scope discipline:** Am I implementing exactly what was requested? Can I map every function to a specific requirement?

6. **Completeness of change:** If I renamed something, have I updated EVERY reference? Have I run grep for the old name?

7. **Error path coverage:** For every external call, what happens when it fails? Have I handled that explicitly?

8. **Test independence:** Do my tests verify behavior against a spec, or confirm what the code currently does? Would any test catch a bug?

9. **Security posture:** Is every input validated? Are there hardcoded secrets, disabled checks, or missing auth gates?

10. **Minimal change:** If fixing a bug, did I change only necessary lines? Or did I rewrite beyond scope?

11. **State consistency:** If I mutated state, have I updated all caches, derived values, and dependent computations?

12. **Constraint compliance:** Have I re-read every constraint and verified compliance -- dependencies, performance budgets, prohibited patterns?

13. **Stub detection:** Are there functions returning hardcoded values or containing TODO? Will they fail loudly or silently?

14. **Framework fidelity:** Am I using patterns from the correct framework and version?

15. **Continuity check:** After a session break, have I reviewed existing code for conventions before generating new code?

## Code Smell Quick Reference

| Anti-Pattern | Severity | Frequency | Key Signal | First Action |
|---|---|---|---|---|
| AP-01 Hallucinated APIs | Critical | Very Common | `AttributeError` on AI call | Verify against library docs |
| AP-02 Outdated Patterns | High | Very Common | Deprecated API warnings | Check migration guide |
| AP-03 Context Blindness | High | Very Common | Duplicates existing utility | Search codebase first |
| AP-04 Confident Wrongness | Critical | Common | No hedging on complex logic | Cross-ref official docs |
| AP-05 Over-Engineering | Medium | Common | Interface with 1 impl | Delete single-use abstractions |
| AP-06 Partial Updates | Critical | Very Common | `ImportError` after rename | Grep old name across codebase |
| AP-07 Broken Imports | High | Very Common | `ModuleNotFoundError` | Run type checker |
| AP-08 Test Theater | Critical | Very Common | 100% coverage, 0 mutation kills | Run mutation testing |
| AP-09 Security Blindspot | Critical | Common | String concat in SQL | Run SAST tools |
| AP-10 Eager Rewrite | High | Common | Diff too large for task | Reject if >20% changed |
| AP-11 Scope Creep | Medium | Common | Features not requested | Delete unrequested code |
| AP-12 Missing Error Handling | High | Very Common | No try/catch around I/O | Add failure handling |
| AP-13 Copy-Paste Duplication | Medium | Common | Identical blocks in files | Extract shared utility |
| AP-14 Framework Mismatch | High | Common | Wrong framework import | Check dependency file |
| AP-15 State Inconsistency | High | Common | Stale cache after write | Audit caches after mutation |
| AP-16 Ignoring Constraints | High | Common | External pkg when stdlib required | Verify constraints mechanically |
| AP-17 Plausible-But-Wrong | Critical | Common | Passes simple, fails edge | Property-based testing |
| AP-18 Fake Progress | High | Common | Hardcoded return values | Ban pass/TODO in production |
| AP-19 Over-Mocking | High | Common | More mocks than assertions | Require integration tests |
| AP-20 Resumption Errors | High | Common | Mixed ID types across files | Architecture file in every session |

---

*Researched: 2026-03-08 | Sources: [CodeRabbit AI vs Human Code Generation Report (2026)](https://www.coderabbit.ai/blog/state-of-ai-vs-human-code-generation-report); [USENIX Security 2025: Package Hallucination Study](https://arxiv.org/abs/2406.10279); [Aikido: Slopsquatting Attacks](https://www.aikido.dev/blog/slopsquatting-ai-package-hallucination-attacks); [Simon Willison: Hallucinations in Code](https://simonwillison.net/2025/Mar/2/hallucinations-in-code/); [IEEE Spectrum: AI Coding Degrades](https://spectrum.ieee.org/ai-coding-degrades); [Stack Overflow: Bugs with AI Agents (2026)](https://stackoverflow.blog/2026/01/28/are-bugs-and-incidents-inevitable-with-ai-coding-agents/); [Veracode 2025 GenAI Code Security Report](https://www.veracode.com/blog/secure-ai-code-generation-in-practice/); [arXiv: LLMs Meet Library Evolution](https://arxiv.org/abs/2406.09834); [arXiv: Deep Dive Into LLM Code Mistakes](https://arxiv.org/html/2411.01414v1); [arXiv: Over-Mocked Tests by Coding Agents](https://arxiv.org/pdf/2602.00409); [VentureBeat: AI Agents Not Production-Ready](https://venturebeat.com/ai/why-ai-coding-agents-arent-production-ready-brittle-context-windows-broken); [Red Hat: Uncomfortable Truth About Vibe Coding (2026)](https://developers.redhat.com/articles/2026/02/17/uncomfortable-truth-about-vibe-coding); [Augment Code: AI Tools Make Developers 19% Slower](https://www.augmentcode.com/guides/why-ai-coding-tools-make-experienced-developers-19-slower-and-how-to-fix-it); [Pillar Security: Rules File Backdoor](https://www.pillar.security/blog/new-vulnerability-in-github-copilot-and-cursor-how-hackers-can-weaponize-code-agents); [Addy Osmani: LLM Coding Workflow 2026](https://addyosmani.com/blog/ai-coding-workflow/); [JetBrains: Efficient Context Management (2025)](https://blog.jetbrains.com/research/2025/12/efficient-context-management/)*
