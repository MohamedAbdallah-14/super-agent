# Technical Debt Anti-Patterns

> Technical debt is a strategic tool when managed deliberately and a slow-motion catastrophe when ignored. These anti-patterns cover the ways teams mismanage, misunderstand, or simply deny the existence of technical debt -- turning a manageable liability into an existential threat to velocity, quality, and team morale. Each pattern has been observed repeatedly across startups and enterprises alike.

> **Domain:** Process
> **Anti-patterns covered:** 20
> **Highest severity:** Critical

## Anti-Patterns

### AP-01: Ignoring Debt Until Crisis

**Also known as:** Ostrich Strategy, Firefighting Mode, Boiling Frog
**Frequency:** Very Common
**Severity:** Critical
**Detection difficulty:** Easy (in retrospect)

**What it looks like:**

The team is aware of accumulating shortcuts, outdated libraries, and brittle test suites, but nobody raises the issue because features keep shipping. Then one day a deployment takes down production for 18 hours, or a security audit reveals a dependency with a known CVE that has been unpatched for two years.

**Why teams do it:**

Leadership equates visible feature delivery with progress. Debt is invisible to stakeholders, so there is no incentive to surface it. Engineers who raise concerns are labeled as pessimists or blockers. The quarterly roadmap has no line item for "fix what we already have."

**What goes wrong:**

The 2017 Equifax breach exploited an unpatched Apache Struts vulnerability (CVE-2017-5638) that had a fix available for months. The company knew about the dependency but deprioritized the update. The result: 147 million records exposed, $700M+ in settlements, and the CISO and CIO resigned. At smaller scale, teams experience sudden "velocity cliffs" where sprint throughput drops 40-60% as accumulated debt makes every change expensive.

**The fix:**

Establish a debt ceiling -- a maximum ratio of known debt items to total backlog. When the ceiling is breached, the team enters a mandatory debt sprint. Review debt quarterly with the same rigor as financial audits. Make debt visible on dashboards alongside feature metrics.

**Detection rule:**

Track the ratio of unplanned work (hotfixes, emergency patches, rollbacks) to planned work. If unplanned work exceeds 25% of sprint capacity for two consecutive sprints, debt is reaching crisis levels.

---

### AP-02: Not Tracking Debt

**Also known as:** Invisible Debt, Undocumented Shortcuts, The Memory Tax
**Frequency:** Very Common
**Severity:** High
**Detection difficulty:** Hard

**What it looks like:**

Developers know about debt through tribal knowledge -- "oh yeah, don't touch that module, it's fragile" -- but there is no backlog item, no label, no tracking system. Debt exists only in the heads of people who were there when the shortcut was taken.

**Why teams do it:**

Creating a ticket feels like admitting failure. Teams fear that a visible debt backlog will alarm stakeholders or be used against them in performance reviews. There is also genuine uncertainty about what constitutes "debt" vs. "good enough."

**What goes wrong:**

When team members leave, their knowledge of debt locations leaves with them (see AP-09). New developers unknowingly build on top of fragile foundations. The same debt gets "discovered" and discussed repeatedly in standups without ever being formally captured, wasting time. Without tracking, there is no data to justify a refactoring sprint to management.

**The fix:**

Add a `tech-debt` label to your issue tracker. Require every PR that introduces intentional debt to include a corresponding debt ticket with a description of the shortcut, why it was taken, and what the proper solution would look like. Review the debt backlog monthly.

**Detection rule:**

If the team cannot produce a list of their top 10 known debt items within 15 minutes, debt tracking is absent. If more than 3 developers mention the same pain point informally but no ticket exists, it qualifies as untracked debt.

---

### AP-03: Debt as Quality Excuse

**Also known as:** The Debt Shield, Quality Nihilism, "It's All Technical Debt"
**Frequency:** Common
**Severity:** High
**Detection difficulty:** Moderate

**What it looks like:**

Every quality problem is hand-waved as "technical debt." Flaky tests? Debt. Spaghetti architecture? Debt. No code review process? Debt. The term becomes a catch-all excuse that absolves the team of responsibility for maintaining standards on new code.

**Why teams do it:**

Framing current quality failures as inherited debt shifts blame to past decisions and past team members. It creates an illusion that the problem is structural and therefore unfixable without a major initiative -- which conveniently never gets prioritized.

**What goes wrong:**

The distinction between legacy debt and active negligence collapses. Teams stop enforcing quality gates on new code because "what's the point, the whole codebase is debt." This accelerates decay. Management loses trust in the team's quality claims because "technical debt" has been diluted to mean everything and nothing.

**The fix:**

Separate debt into categories: (1) legacy debt from past decisions, (2) deliberate debt taken consciously for speed, (3) active quality failures in new code. Only categories 1 and 2 are actual debt. Category 3 is a process failure that needs immediate correction, not future repayment.

**Detection rule:**

Review retrospective notes. If "technical debt" appears as a root cause for more than 50% of incidents without specific, actionable items attached, the term is being used as a shield.

---

### AP-04: Rewrite from Scratch

**Also known as:** Second System Effect, Big Bang Rewrite, v2 Delusion
**Frequency:** Common
**Severity:** Critical
**Detection difficulty:** Easy

**What it looks like:**

The team concludes the existing codebase is unsalvageable and proposes a ground-up rewrite. A parallel project is launched. The new system is estimated at 6 months. Eighteen months later, it has achieved 60% feature parity, the old system still runs in production, and both codebases need maintenance.

**Why teams do it:**

Reading someone else's code is harder than writing your own. Existing systems carry years of accumulated edge cases, workarounds, and business rules that look like cruft but are actually load-bearing. The appeal of a clean slate is emotionally powerful. Joel Spolsky famously called this "the single worst strategic mistake that any software company can make."

**What goes wrong:**

Netscape's rewrite of their browser from scratch (1998-2000) gave Microsoft's Internet Explorer time to capture dominant market share. The rewrite took three years instead of one and Netscape never recovered. Development resources split between maintaining the old system and building the new one, degrading both. The new system often reintroduces bugs that the old system had already fixed through years of production hardening. The Second System Effect, described by Fred Brooks, leads teams to over-engineer the replacement.

**The fix:**

Adopt the Strangler Fig pattern: incrementally replace components of the old system behind stable interfaces. Martin Fowler's strangler pattern lets teams migrate one module at a time, validating each step in production. Reserve full rewrites only for systems where the technology platform is truly end-of-life (e.g., COBOL on unsupported hardware).

**Detection rule:**

Any rewrite proposal that lacks a concrete, phase-by-phase migration plan with rollback capability at each phase should be flagged. If the rewrite timeline exceeds 6 months, require executive review with explicit risk acknowledgment.

---

### AP-05: Gold Plating

**Also known as:** Over-Engineering, Premature Abstraction, Resume-Driven Development
**Frequency:** Common
**Severity:** Moderate
**Detection difficulty:** Moderate

**What it looks like:**

A developer builds a configurable, plugin-based event processing pipeline with a custom DSL when the requirement was "send an email when an order ships." The solution handles 47 theoretical use cases but makes the actual use case harder to understand, debug, and modify.

**Why teams do it:**

Engineers are problem solvers who enjoy elegant abstractions. Building for imagined future requirements feels responsible ("we'll need this eventually"). Conference talks and blog posts celebrate clever architectures, creating social incentives to over-build. Some developers pad their resume by introducing technologies they want experience with, regardless of project needs.

**What goes wrong:**

Jeff Atwood (Coding Horror) documented how gold plating leads to wasted time, resources, and quality issues. The extra abstraction layers become their own source of debt -- they must be learned, maintained, and debugged. When requirements change (and they always do), the premature abstraction often does not fit the actual need, requiring rework of both the abstraction and the feature. YAGNI (You Aren't Gonna Need It) exists precisely because engineers are poor at predicting future requirements.

**The fix:**

Apply the Rule of Three: do not abstract until you have three concrete, real instances of duplication. Require that any architectural component beyond the immediate requirement has a specific, funded user story justifying it. Code review should flag speculative abstractions as aggressively as it flags bugs.

**Detection rule:**

Flag PRs where the ratio of framework/infrastructure code to business logic exceeds 3:1. Watch for abstractions with exactly one concrete implementation.

---

### AP-06: Boy Scout Overreach

**Also known as:** Drive-By Refactoring, Scope Creep Cleanup, Yak Shaving
**Frequency:** Common
**Severity:** Moderate
**Detection difficulty:** Moderate

**What it looks like:**

A developer picks up a small bug fix. Following the Boy Scout Rule ("leave the campground cleaner than you found it"), they refactor the surrounding module, rename variables for clarity, restructure the class hierarchy, and update the test suite. The one-line bug fix becomes a 400-line PR that touches 15 files, is hard to review, and introduces a regression in an unrelated area.

**Why teams do it:**

The Boy Scout Rule is good advice taken too far. Engineers with high standards feel physical discomfort working in messy code and cannot resist cleaning it. Refactoring is more satisfying than fixing a single bug. There is no clear boundary defined for "how much cleanup is appropriate."

**What goes wrong:**

Large, mixed-purpose PRs are difficult to review, making it easy for regressions to slip through. When a bug is discovered later, `git bisect` points to the mega-PR, and untangling which change caused the issue is expensive. The original bug fix may be urgent, and bundling it with refactoring delays the fix.

**The fix:**

Separate cleanup from feature/fix work into distinct PRs. If you spot debt while working on a ticket, create a follow-up ticket for the cleanup rather than doing it inline. Limit Boy Scout improvements to cosmetic, zero-risk changes (whitespace, typos, clarifying comments) within the immediate scope of the current change.

**Detection rule:**

Flag PRs where the diff includes files outside the ticket's stated scope. Track the ratio of "lines changed for cleanup" vs. "lines changed for the stated objective" -- if cleanup exceeds 50%, the PR should be split.

---

### AP-07: No Time for Debt

**Also known as:** Feature Factory, Sprint Hamster Wheel, Velocity Theater
**Frequency:** Very Common
**Severity:** Critical
**Detection difficulty:** Easy

**What it looks like:**

Every sprint is 100% packed with feature work. When engineers propose allocating time for debt reduction, they are told "we'll schedule a tech debt sprint next quarter." That quarter never arrives. The team optimizes for story points delivered while the codebase decays beneath them.

**Why teams do it:**

Product managers are incentivized by feature delivery, not code quality. Debt reduction is difficult to demonstrate to stakeholders in a sprint review. There is a genuine tension between short-term delivery pressure and long-term sustainability, and organizations default to short-term thinking.

**What goes wrong:**

Velocity gradually degrades but the cause is invisible. What once took 3 story points now takes 8, but the team adjusts their estimates upward without questioning why. Atlassian recommends reserving 15-25% of each sprint for debt reduction, treating it as seriously as feature development. Teams that skip this allocation see a compounding productivity tax that eventually makes feature delivery slower than if they had invested in debt reduction all along.

**The fix:**

Dedicate a fixed percentage (15-25%) of every sprint to debt work -- not as a negotiable item but as a standing allocation. Track and present "developer experience" metrics: build time, deploy time, time-to-first-meaningful-test. These make the cost of debt visible to non-technical stakeholders.

**Detection rule:**

Audit sprint backlogs over the past 6 sprints. If zero items are labeled as tech debt, refactoring, or maintenance, the team is running a feature factory. If planned debt work is consistently deprioritized or removed during sprint planning, the allocation is performative.

---

### AP-08: Not Prioritizing Debt

**Also known as:** Debt Graveyard, Backlog Black Hole, FIFO Debt
**Frequency:** Common
**Severity:** High
**Detection difficulty:** Moderate

**What it looks like:**

The team tracks debt (unlike AP-02), but all debt items sit in a flat, unprioritized backlog. When debt time is allocated, engineers pick whatever interests them rather than what would deliver the most impact. A developer spends three days renaming variables in a stable, rarely-touched module while the payment processing pipeline has a known race condition.

**Why teams do it:**

Prioritizing debt requires understanding both the business impact and the technical risk of each item, which demands cross-functional conversation that teams avoid. Letting engineers self-select feels empowering and avoids conflict. There is no established framework for comparing debt items.

**What goes wrong:**

High-risk, high-impact debt remains unaddressed while low-impact cosmetic issues get cleaned up. The debt backlog grows monotonically because easy items get picked off but hard items persist. Eventually, the unprioritized items become so numerous that the backlog is abandoned entirely.

**The fix:**

Score debt items on two axes: (1) blast radius (how much code/users/revenue is affected if this debt causes a failure), and (2) fix cost (how much effort to resolve). Prioritize high-blast-radius, low-fix-cost items first. Review and re-prioritize the debt backlog quarterly with both engineering and product leadership.

**Detection rule:**

Check the age distribution of debt tickets. If the oldest 20% of debt tickets have been open for more than 6 months with no activity, prioritization is broken. If debt work completed in the last quarter correlates with engineer preference rather than business impact, self-selection bias is present.

---

### AP-09: Departed Developer Debt

**Also known as:** Bus Factor Debt, Tribal Knowledge Loss, The Orphan Module
**Frequency:** Common
**Severity:** High
**Detection difficulty:** Hard

**What it looks like:**

A critical subsystem was built by a developer who has since left the company. Nobody else understands the design decisions, the implicit constraints, or the workarounds baked into the code. The code has no documentation, cryptic variable names, and a single integration test that may or may not pass.

**Why teams do it:**

Knowledge sharing is deprioritized during crunch periods. Code review becomes rubber-stamping when a single developer is the domain expert. The organization does not require documentation of architectural decisions, and by the time the developer's departure is announced, it is too late for a meaningful knowledge transfer.

**What goes wrong:**

The module becomes a "no-go zone" that nobody dares to modify. Features that require changes to this module are either blocked or implemented as fragile workarounds that layer on more debt. When a bug is found, debugging takes 5-10x longer because the team lacks mental models for the code's behavior. In the worst case, the module must be rewritten (see AP-04), compounding the loss.

**The fix:**

Enforce mandatory code review with at least two reviewers for any module with a bus factor of 1. Require Architecture Decision Records (ADRs) for non-obvious design choices. Rotate module ownership periodically so that no module has fewer than two knowledgeable maintainers. Conduct structured knowledge-transfer sessions during notice periods.

**Detection rule:**

Run `git log --format='%aN' -- <path> | sort | uniq -c | sort -rn` on each module. If more than 70% of commits come from a single author who is no longer on the team, the module is at high risk. Flag modules where the last commit by any current team member is older than 6 months.

---

### AP-10: Permanent Shortcuts

**Also known as:** TODO Graveyard, Temporary Permanent Solutions, The Hack That Shipped
**Frequency:** Very Common
**Severity:** High
**Detection difficulty:** Easy

**What it looks like:**

The codebase is littered with comments like `// TODO: fix this properly`, `// HACK: temporary workaround`, and `// FIXME: this will break if we ever have more than 100 users`. The timestamps on these comments, when traced through `git blame`, reveal they are 2-5 years old. The "temporary" solution is now load-bearing production infrastructure.

**Why teams do it:**

Under deadline pressure, a shortcut is taken with genuine intent to fix it later. But "later" never arrives because the shortcut works, the developer moves to the next task, and the ticket (if one was created) sinks in the backlog. Over time, the team forgets the shortcut is there until it causes a failure.

**What goes wrong:**

Temporary workarounds often have implicit assumptions (data volumes, user counts, concurrency levels) that silently break as the system scales. A "temporary" hardcoded connection pool of 10 works fine until traffic triples and the database starts rejecting connections at 3 AM. The cost of fixing a shortcut increases over time as other code builds on top of it.

**The fix:**

Require every TODO/HACK/FIXME comment to include a ticket reference (e.g., `// TODO(PROJ-1234): replace with proper auth`). Run a linter that flags TODOs without ticket references. Set expiration dates on intentional shortcuts: if the ticket is not resolved within two sprints, it auto-escalates.

**Detection rule:**

`grep -rn "TODO\|HACK\|FIXME\|WORKAROUND\|TEMPORARY" --include="*.{js,ts,py,java,go,rb}" | wc -l`. Track this count over time. If it increases monotonically, shortcuts are permanent. Cross-reference TODO comments with ticket status -- if more than 50% reference closed or nonexistent tickets, the process is broken.

---

### AP-11: No Documentation of WHY

**Also known as:** Missing Context, The What Without Why, Undocumented Decisions
**Frequency:** Very Common
**Severity:** Moderate
**Detection difficulty:** Hard

**What it looks like:**

The code documents WHAT it does (function signatures, class names, inline comments explaining mechanics) but never WHY a particular approach was chosen. There is no record of the constraints, trade-offs, or business rules that drove the implementation. A future developer sees a seemingly inefficient database query pattern and "optimizes" it, unknowingly breaking a subtle concurrency invariant that the original author designed around.

**Why teams do it:**

Developers assume that code should be self-documenting (and it should be, for the WHAT). But the WHY -- why this algorithm over that one, why this data model, why this error handling strategy -- is business context that cannot be expressed in code. Writing decision records feels like overhead when the decision seems obvious in the moment.

**What goes wrong:**

Every non-obvious design decision becomes a trap for future developers. Without context, "improving" the code means guessing at constraints that may or may not still apply. Teams waste hours in meetings debating decisions that were already made and forgotten. When the original author leaves (AP-09), the rationale is permanently lost.

**The fix:**

Adopt lightweight Architecture Decision Records (ADRs): a short markdown file per significant decision, recording the context, the options considered, the decision made, and the consequences accepted. Store ADRs alongside the code they describe. For inline decisions, use comments that explain WHY, not WHAT: `// We use eventual consistency here because the billing system cannot handle synchronous writes at peak load (see ADR-017)`.

**Detection rule:**

Sample 10 non-trivial modules. For each, ask a developer who did not write it: "Why was it built this way?" If the answer is "I don't know" or "I'd have to ask [person]" for more than 60% of modules, documentation of WHY is missing.

---

### AP-12: Test Rot

**Also known as:** Flaky Suite, Test Graveyard, Green Bar Illusion
**Frequency:** Common
**Severity:** Critical
**Detection difficulty:** Moderate

**What it looks like:**

The test suite technically passes, but 15% of tests are skipped (`@skip`, `xit`, `@pytest.mark.skip`), another 10% are flaky (pass on retry), and the remaining tests have not been updated to reflect current behavior. The green CI badge is meaningless -- it signals "nothing crashed" rather than "the system is correct."

**Why teams do it:**

Fixing a flaky test is unglamorous work that does not appear on any roadmap. When a test starts failing intermittently, the fastest way to unblock the pipeline is to mark it as skipped rather than investigate the root cause. Over time, the number of skipped tests grows, and the suite's coverage silently degrades. Google's Engineering Productivity team found that approximately 1.5% of all test runs at Google were flaky, and that this seemingly small number consumed enormous engineering resources.

**What goes wrong:**

Developers lose trust in the test suite and stop running tests locally. Bugs that would have been caught by now-skipped tests make it to production. The CI pipeline's pass rate is no longer correlated with code quality. New developers see skipped tests and internalize the norm that tests are optional. Research shows that flaky tests are demoralizing and can trigger a vicious cycle where developers skip writing tests because "they'll just become flaky anyway."

**The fix:**

Treat flaky tests as P1 bugs. Track the flake rate as a team metric (number of flaky test runs / total test runs). Set a policy: any test skipped for more than 2 weeks must be either fixed or deleted (a deleted test is honest; a skipped test is a lie). Quarantine flaky tests into a separate CI stage that does not block merges but is reviewed weekly.

**Detection rule:**

Count `@skip`, `@ignore`, `xit`, `xdescribe`, and `pytest.mark.skip` annotations. If skipped tests exceed 5% of the total suite, rot is present. Track CI retry rates -- if more than 3% of builds require retries to pass, flakiness is systemic.

---

### AP-13: Dependency Rot

**Also known as:** Library Neglect, Version Drift, The Unpatched Stack
**Frequency:** Very Common
**Severity:** Critical
**Detection difficulty:** Easy

**What it looks like:**

The project's dependency file (`package.json`, `requirements.txt`, `go.mod`, `pom.xml`) references libraries that are 2-5 major versions behind current. Running `npm audit` or `pip-audit` returns dozens of known vulnerabilities. The team says "we'll update when we upgrade" but the upgrade never happens.

**Why teams do it:**

Updating dependencies is boring, risky, and unrewarded. Major version bumps often include breaking changes that require code modifications. Without automated testing, there is no confidence that an update will not break something. The pain of outdated dependencies is gradual and invisible until a vulnerability is exploited. Research found that 96% of vulnerable open-source releases downloaded had a fixed version available, yet organizations still failed to update.

**What goes wrong:**

13% of Log4j downloads in 2024 were still vulnerable versions despite the Log4Shell vulnerability being one of the most publicized in history. Outdated dependencies accumulate transitively: managing just 10 direct dependencies can involve up to 170 transitive ones. Eventually, the version gap becomes so large that updating requires a coordinated, multi-week effort -- which is exactly the kind of project that gets deprioritized (see AP-07). Security vulnerabilities compound: 70% of vulnerable dependencies require minor or major version updates that potentially break source code.

**The fix:**

Enable automated dependency update tools (Dependabot, Renovate). Configure them to open PRs for patch and minor updates automatically. Run `npm audit` / `pip-audit` / `trivy` in CI and fail the build on high/critical vulnerabilities. Schedule quarterly "dependency update" days where major version bumps are tackled as a team.

**Detection rule:**

Run `npm outdated`, `pip list --outdated`, or equivalent. If more than 30% of dependencies are more than one major version behind, dependency rot is present. If any dependency has a known critical CVE with an available fix, that is an immediate red flag.

---

### AP-14: Documentation Debt

**Also known as:** The Undocumented System, Oral Tradition, README Lies
**Frequency:** Very Common
**Severity:** Moderate
**Detection difficulty:** Easy

**What it looks like:**

The README describes a setup process that no longer works. API documentation references endpoints that were removed two releases ago. The architecture diagram shows three services, but the system now has seven. New developers spend their first two weeks asking questions that should be answered by documentation.

**Why teams do it:**

Documentation is not tested by CI, so it drifts silently from reality. Developers update code but not docs because docs are in a separate system (Confluence, Notion, wiki) with a different workflow. Writing documentation is perceived as low-status work. Agile teams sometimes misinterpret "working software over comprehensive documentation" as "no documentation."

**What goes wrong:**

Onboarding time increases from days to weeks. Support tickets increase as users encounter undocumented behavior. Developers make incorrect assumptions based on outdated docs, introducing bugs. Knowledge becomes concentrated in senior team members (AP-09), creating bottlenecks and bus factor risks.

**The fix:**

Colocate documentation with code (README files, inline doc comments, ADRs in the repo). Include documentation updates as part of the definition of done for any PR that changes public APIs or system behavior. Use documentation testing tools (e.g., `doctest` in Python, API schema validation) to catch drift automatically.

**Detection rule:**

Compare the timestamp of the last documentation update to the last code change in the same module. If documentation is more than 3 months older than the code, drift is likely. Track onboarding time for new developers -- if it exceeds 2 weeks to first meaningful contribution, documentation debt is a likely factor.

---

### AP-15: Infrastructure Debt

**Also known as:** Snowflake Servers, Configuration Drift, The Untouchable Pipeline
**Frequency:** Common
**Severity:** High
**Detection difficulty:** Moderate

**What it looks like:**

Production infrastructure was set up manually years ago and has never been codified. Server configurations differ between environments ("works on staging but not prod"). The CI/CD pipeline is a fragile chain of shell scripts that nobody understands. Deploying to production requires following a 47-step runbook maintained in a shared Google Doc.

**Why teams do it:**

Infrastructure was "someone else's problem" until DevOps became mainstream. Early-stage companies provision infrastructure manually because it is faster for the first setup. As the team grows, nobody has time to go back and codify what exists. Infrastructure changes are high-risk and low-reward from a feature perspective.

**What goes wrong:**

Configuration drift causes "works on my machine" failures at scale. Disaster recovery is untested and unreliable because the infrastructure cannot be reproduced from code. Scaling requires manual intervention, limiting the team's ability to respond to traffic spikes. Half of Kubernetes deployments have been characterized as technical debt due to configurations that were copied without understanding, leading to security misconfigurations and resource waste.

**The fix:**

Adopt Infrastructure as Code (Terraform, Pulumi, CloudFormation). Start with the most painful manual process and codify it first. Use immutable infrastructure patterns (containers, AMIs) to eliminate configuration drift. Treat infrastructure code with the same rigor as application code: version control, code review, testing, CI/CD.

**Detection rule:**

Count the number of manual steps in the deployment runbook. If any deployment requires SSH access to a production server, infrastructure debt is present. If staging and production environments cannot be provisioned from the same code, configuration drift exists.

---

### AP-16: Migration Debt (Half-Finished)

**Also known as:** Lava Layer, Parallel Universe, The Bridge to Nowhere
**Frequency:** Common
**Severity:** Critical
**Detection difficulty:** Easy

**What it looks like:**

The team started migrating from REST to GraphQL, or from MongoDB to PostgreSQL, or from monolith to microservices. The migration reached 60% completion, then the champion left, priorities shifted, or funding was cut. Now the system uses both patterns simultaneously, and every new feature requires understanding and maintaining two paradigms.

**Why teams do it:**

Migrations are started with enthusiasm but completing the last 30% requires digging into "the nooks and crannies" -- obscure edge cases, rarely-used features, and legacy integrations that resist change. This tail work is unglamorous and hard to estimate. Will Larson observed that "if you leave one migration partially finished, folks will be exceedingly suspicious of participating in the next."

**What goes wrong:**

Mike Hadlow described the "Lava Layer anti-pattern" where successive half-finished migrations create geological strata of different architectural styles, each adding complexity. Developers must maintain mental models for multiple paradigms. New hires face a steeper learning curve. The dual-system state doubles the surface area for bugs. Eventually, someone proposes a third migration to unify the first two, adding another layer.

**The fix:**

Treat migrations as first-class projects with dedicated ownership, budget, and completion criteria. Use the "Derisk, Enable, Finish" playbook: prove the approach on the hardest case first, build tooling to make migration easy, then drive to 100%. Never start a new migration until the previous one is complete. Assign a migration owner who is accountable for completion.

**Detection rule:**

Search the codebase for coexisting patterns that should be mutually exclusive (e.g., both `fetch()` and `axios`, both REST clients and GraphQL clients for the same service, both ORM patterns for different databases). If more than 2 architectural paradigms coexist for the same concern, migration debt is present.

---

### AP-17: Framework Version Debt

**Also known as:** Major Version Avoidance, The LTS Trap, Upgrade Procrastination
**Frequency:** Very Common
**Severity:** High
**Detection difficulty:** Easy

**What it looks like:**

The application runs on a framework version that is 2-3 major versions behind current. The team postpones upgrades because each major version introduces breaking changes. Meanwhile, the framework community moves on: new plugins, tutorials, Stack Overflow answers, and security patches all target the current version. The team is stuck on an island.

**Why teams do it:**

Major version upgrades are high-effort, high-risk, and produce zero visible features. The current version "works fine." Testing coverage is insufficient to provide confidence in an upgrade. The longer the team waits, the larger the gap becomes, and the more daunting the upgrade appears -- a vicious cycle.

**What goes wrong:**

The team cannot use new framework features that would simplify development. Security patches stop being backported to old versions. Hiring becomes harder because candidates do not want to work with obsolete technology. When the upgrade finally becomes unavoidable (e.g., a critical security fix), the accumulated breaking changes make it a multi-week or multi-month project.

**The fix:**

Upgrade one major version at a time, on a regular cadence (e.g., within 6 months of a new major release). Automate upgrade testing with a comprehensive test suite. Follow the framework's official migration guides immediately on release -- do not wait until you "need" the new version. Budget framework upgrades as ongoing maintenance, not special projects.

**Detection rule:**

Compare the project's framework version to the latest stable release. If the gap is more than one major version, framework version debt is accumulating. Check the framework's support lifecycle -- if the project is on an EOL (end-of-life) version, this is urgent.

---

### AP-18: Copy-Paste Debt

**Also known as:** Clone-and-Own, Duplicated Logic, Shotgun Surgery Waiting to Happen
**Frequency:** Very Common
**Severity:** High
**Detection difficulty:** Moderate

**What it looks like:**

The same business logic (validation rules, pricing calculations, permission checks) exists in 3-7 places across the codebase, each copy slightly different due to independent modifications over time. A bug fix applied in one location is not applied in the others because nobody knows all the copies exist.

**Why teams do it:**

Copying working code feels faster and safer than extracting a shared abstraction. Developers unfamiliar with the codebase do not know a shared implementation already exists. In microservices architectures, teams duplicate logic across services rather than creating shared libraries because cross-service dependencies are politically difficult.

**What goes wrong:**

In one documented case, a system had multiple email validation implementations -- some allowed certain address formats that others rejected, causing data inconsistency as records moved between subsystems. Authorization logic copy-pasted across components meant that every role change required modifications across the entire program. Studies show that codebases with high duplication rates have proportionally higher defect rates because fixes are applied inconsistently.

**The fix:**

Run clone detection tools (jscpd, PMD CPD, Simian) as part of CI. When duplication is detected, extract shared logic into a well-tested utility module or shared library. For microservices, create internal packages or contract-tested shared libraries. Apply the Rule of Three: tolerate two copies, extract on the third.

**Detection rule:**

Run clone detection in CI. Flag any block of 10+ lines that appears in 3 or more locations. Track the "duplication ratio" (duplicated lines / total lines) -- healthy codebases stay below 5%.

---

### AP-19: Dead Code Accumulation

**Also known as:** Boat Anchor, Phantom Features, Digital Hoarding
**Frequency:** Common
**Severity:** Moderate
**Detection difficulty:** Moderate

**What it looks like:**

The codebase contains feature flags that were never cleaned up, API endpoints that no client calls, classes that no code instantiates, and configuration options that no deployment uses. Developers are afraid to delete anything because "it might be used somewhere" or "someone might need it later."

**Why teams do it:**

Deleting code feels riskier than leaving it. Without comprehensive tests or runtime monitoring, it is genuinely difficult to prove that code is unused. Feature flags are added for gradual rollouts but never removed after the rollout is complete. In one documented case, engineers were reluctant to remove error-handling code for error codes that were never actually generated because they feared it would introduce new bugs.

**What goes wrong:**

Dead code inflates the codebase, increasing cognitive load for developers who must mentally filter out irrelevant code. It increases build times, test times, and artifact sizes. Dead code can mask real issues -- unused exception handlers, for instance, give a false sense of error coverage. During refactoring, dead code creates false dependencies that complicate the work.

**The fix:**

Use static analysis tools (tree-shaking for JS, `vulture` for Python, `deadcode` for Go) to identify unreachable code. Monitor runtime code coverage in production (not just tests) to find code that is reachable in theory but never executed in practice. Establish a policy: feature flags must be cleaned up within 2 sprints of full rollout. When in doubt, delete the code -- version control means it is never truly gone.

**Detection rule:**

Run dead code detection tools quarterly. Track the ratio of unreachable code to total code. If more than 10% of the codebase is unreachable by static analysis, dead code accumulation is a problem. Count stale feature flags -- if any flag has been in a permanent ON or OFF state for more than 3 months, it is dead code.

---

### AP-20: No Debt Metrics

**Also known as:** Gut Feel Management, The Unmeasured Codebase, Flying Blind
**Frequency:** Common
**Severity:** High
**Detection difficulty:** Moderate

**What it looks like:**

The team has no quantitative measurement of their technical debt. They cannot answer questions like "how much debt do we have?", "is it getting better or worse?", or "what is the business cost of this debt?" Decisions about debt investment are made based on anecdotes, emotion, and whoever argues most persuasively in meetings.

**Why teams do it:**

Measuring debt is genuinely hard. Unlike financial debt, technical debt has no standard unit of measurement. Tools like SonarQube provide a "technical debt ratio" but teams do not configure or monitor them. There is skepticism about whether any metric can truly capture the complexity of code quality.

**What goes wrong:**

Without metrics, teams cannot make data-driven arguments for debt investment. "We need to spend a sprint on debt reduction" is met with "prove it" -- and without metrics, the team cannot. This creates a doom loop: no metrics means no evidence, no evidence means no investment, no investment means debt grows, and growing debt means lower velocity, but without metrics the cause of the velocity drop cannot be attributed to debt.

**The fix:**

Adopt a small set of actionable metrics. The Technical Debt Ratio (remediation cost / development cost) provides a single percentage. Complement it with: (1) code churn hotspots (files changed most frequently are where debt hurts most), (2) cyclomatic/cognitive complexity trends, (3) dependency freshness scores, and (4) CI pipeline duration trends. Tools like SonarQube, CodeScene, CodeClimate, and NDepend automate collection. Present metrics monthly alongside velocity and incident reports.

**Detection rule:**

Ask the tech lead: "What is your current technical debt ratio?" If the answer is not a number, metrics are absent. Check whether any code quality tool is integrated into CI. If not, measurement infrastructure is missing entirely.

---

## Root Cause Analysis

| Root Cause | Anti-Patterns It Drives | Systemic Fix |
|---|---|---|
| Short-term delivery pressure | AP-01, AP-07, AP-10, AP-12 | Executive sponsorship for 15-25% maintenance allocation |
| Invisible cost of debt | AP-01, AP-02, AP-20 | Dashboards showing debt metrics alongside feature metrics |
| No ownership model | AP-09, AP-15, AP-16 | Module ownership registry with mandatory backup owners |
| Missing quality gates | AP-03, AP-10, AP-12, AP-18 | Automated CI checks for debt indicators (TODOs, skipped tests, duplication) |
| Emotional attachment to clean slate | AP-04, AP-05 | Mandatory Strangler Fig evaluation before any rewrite proposal |
| Knowledge concentration | AP-09, AP-11, AP-14 | Code review rotation, ADRs, documentation-as-code |
| Absent measurement | AP-02, AP-08, AP-20 | SonarQube/CodeScene integration with trending dashboards |
| Fear of breaking changes | AP-13, AP-17, AP-19 | Comprehensive test coverage enabling confident refactoring |
| Scope discipline failure | AP-05, AP-06, AP-16 | Clear PR scope rules, migration completion budgets |
| Cultural normalization of debt | AP-03, AP-07, AP-10 | Regular debt retrospectives, debt as a standing agenda item |

## Self-Check Questions

Use these during sprint planning, retrospectives, or architecture reviews:

1. Can we produce a prioritized list of our top 10 known technical debt items right now, with estimated business impact?
2. What percentage of our last 6 sprints was allocated to debt reduction, and what was actually delivered?
3. How many TODO/HACK/FIXME comments exist in the codebase today vs. 6 months ago? Is the trend up or down?
4. If our most tenured developer left tomorrow, which modules would become no-go zones?
5. How many of our dependencies have known critical vulnerabilities with available fixes right now?
6. What is our test suite's skip rate and flake rate? Has it improved or degraded over the past quarter?
7. When was the last time our README or onboarding documentation was validated by a new team member?
8. Are there any migrations (database, framework, architecture) that were started but never completed?
9. Can a new developer set up the development environment using only written documentation, without asking anyone?
10. How long does our CI pipeline take today vs. 6 months ago? What is driving the increase?
11. What is our framework/language version gap relative to the latest stable release?
12. Do we have any infrastructure that cannot be reproduced from code (snowflake servers, manual configurations)?
13. When was the last time we deleted code, and do we have a process for identifying dead code?
14. Do our code quality metrics (complexity, duplication, coverage) have visible trend lines that the team reviews?
15. If a critical production incident occurred in our oldest module, how confident are we in diagnosing and fixing it within 4 hours?

## Code Smell Quick Reference

| Smell | Typical Indicator | Related Anti-Pattern | Automated Tool |
|---|---|---|---|
| Stale TODOs | `TODO` comments older than 90 days | AP-10: Permanent Shortcuts | Custom linter with `git blame` date check |
| Skipped tests | `@skip`, `xit`, `xdescribe` count > 5% | AP-12: Test Rot | Test framework reporting, CI metrics |
| Outdated dependencies | `npm outdated` shows 30%+ major version gaps | AP-13: Dependency Rot | Dependabot, Renovate, `pip-audit` |
| High duplication | Clone detection shows > 5% duplicated lines | AP-18: Copy-Paste Debt | jscpd, PMD CPD, SonarQube |
| Dead code | Static analysis flags unreachable functions | AP-19: Dead Code Accumulation | `vulture` (Python), tree-shaking (JS), `deadcode` (Go) |
| God modules | Files with > 500 LOC or > 20 public methods | AP-05 overlap, codebase complexity | SonarQube, CodeClimate |
| Bus factor 1 | `git log` shows > 70% single-author modules | AP-09: Departed Developer Debt | `git-fame`, CodeScene knowledge maps |
| No ADRs | Zero `adr-*.md` or `doc/decisions/` files | AP-11: No Documentation of WHY | File existence check in CI |
| Coexisting paradigms | Both REST and GraphQL clients for same service | AP-16: Migration Debt | Custom grep rules in CI |
| Rising build times | CI duration trend increasing > 20% quarter-over-quarter | AP-15, AP-19 | CI platform analytics (GitHub Actions, CircleCI) |
| No quality dashboard | No SonarQube/CodeScene/CodeClimate integration | AP-20: No Debt Metrics | Check for tool configuration in repo |
| Snowflake infra | Manual SSH steps in deployment runbook | AP-15: Infrastructure Debt | Audit deployment documentation |
| Version lock-in | Framework version > 1 major behind latest | AP-17: Framework Version Debt | Version comparison scripts |
| Feature flag rot | Flags in permanent ON/OFF state > 90 days | AP-19: Dead Code Accumulation | Feature flag management platform reports |

---

*Researched: 2026-03-08 | Sources: Wikipedia (Technical Debt), Atlassian (Managing Technical Debt), SIG (Technical Debt Examples), Brainhub (15 Technical Debt Examples), Joel Spolsky / Joel on Software (Things You Should Never Do), Martin Fowler (Strangler Fig Pattern, Refactoring), Fred Brooks (The Mythical Man-Month, Second System Effect), Jeff Atwood / Coding Horror (Gold Plating), Will Larson / Irrational Exuberance (Migrations), Mike Hadlow (Lava Layer Anti-Pattern), Google Engineering Productivity (Flaky Tests Research), DevIQ (Copy-Paste Programming), SonarSource (Measuring Technical Debt), CodeScene, Help Net Security (DevSecOps Supply Chain Risk), SourceMaking (Software Development Anti-Patterns), vFunction (Technical Debt Measurement), freecodecamp.org (Anti-Patterns in Code)*