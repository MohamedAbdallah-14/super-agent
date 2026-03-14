# Architecture Decision Records — Architecture Expertise Module

> Architecture Decision Records (ADRs) document significant architectural decisions with context, consequences, and status. They answer "why did we choose X?" months or years later. Without ADRs, teams redebate the same decisions, new team members don't understand constraints, and architectural drift goes unnoticed.

> **Category:** Decision
> **Complexity:** Simple
> **Applies when:** Any project making architectural decisions that will be questioned later — which is every project lasting more than 3 months

**Cross-references:** [architectural-thinking], [technology-selection], [build-vs-buy], [domain-driven-design]

---

## What This Is (and What It Isn't)

An Architecture Decision Record is a short document — typically one to two pages — that captures a single architectural decision: the context that made the decision necessary, the options that were considered, the decision that was made, and the consequences (both positive and negative) that are expected or observed. The format was introduced by Michael Nygard in his 2011 blog post "Documenting Architecture Decisions" at Cognitect, and has since become the de facto standard for lightweight architectural decision documentation across the industry. AWS, Google Cloud, Microsoft Azure, and the UK Government Digital Service (GDS) all formally recommend ADRs in their architecture guidance.

Nygard's original format is deliberately minimal. It has exactly five sections:

1. **Title** — A short noun phrase. "ADR-007: Use PostgreSQL for the Orders Service," not "We should probably think about databases."
2. **Status** — One of: Proposed, Accepted, Deprecated, Superseded. The status changes over time; the record itself does not. When a decision is reversed, the original ADR's status is updated to "Superseded by ADR-NNN" and a new ADR documents the reversal.
3. **Context** — The forces at play. What problem are we facing? What constraints exist? What requirements drove this decision? This section is the most important and most often under-written. Context without specifics — "we need a scalable solution" — is useless. Context with specifics — "our projected write volume is 50k orders/day with 3x seasonal spikes, we have two engineers with PostgreSQL production experience and zero with MongoDB, and our query patterns require joins across 4 tables" — is the information that makes the decision intelligible six months later.
4. **Decision** — The decision itself, stated in active voice. "We will use PostgreSQL 16 with pgBouncer connection pooling." Not "It was decided that..." — passive voice obscures accountability.
5. **Consequences** — What happens because of this decision, both positive and negative. Good ADRs are honest about the negative consequences. "We accept that horizontal write scaling will require a sharding strategy if volume exceeds 50k writes/minute" is a consequence worth recording because it tells a future team member exactly when to revisit this decision.

This is what an ADR **is**: a decision record. It captures the reasoning at a specific point in time, under specific constraints, with specific information available.

This is what an ADR **is not**:

**ADRs are not architecture documentation.** They do not describe the system's structure, component interactions, or deployment topology. That is the job of C4 diagrams, arc42 templates, or whatever structural documentation the team maintains. An ADR answers "why did we choose X?" — it does not answer "how does the system work?" Conflating the two produces documents that are too long, too broad, and serve neither purpose well. Olaf Zimmermann, professor at OST and a leading voice on ADR methodology, calls the conflation anti-pattern "Blueprint in Disguise" — an ADR that reads like a design document because the author stuffed component responsibilities, collaboration diagrams, and implementation details into what should have been a focused decision record.

**ADRs are not requirements documents.** They do not specify what the system must do. They document a response to requirements and constraints that already exist. If the context section of your ADR reads like a requirements specification, the ADR is doing too much.

**ADRs are not meeting minutes.** They capture the outcome and rationale of a decision, not the discussion that led to it. The meeting discussion is ephemeral; the decision and its reasoning are durable. Teams that try to capture the full discussion in the ADR produce documents that nobody reads because they are 12 pages long and buried in conversational tangents.

**ADRs are not approval gates.** Some organizations turn ADRs into bureaucratic checkpoints where an Architecture Review Board must approve every decision before work can proceed. This is a misuse of the format. Nygard designed ADRs to be lightweight, written by the people closest to the decision, and reviewed by peers — not escalated through a hierarchy. When ADRs become approval gates, teams stop writing them because the overhead exceeds the value, and the decision history becomes invisible again.

The power of the ADR format is its constraint. Five sections. One decision per record. Short enough that a new team member can read the entire ADR log in an afternoon and understand why the system has the shape it does. The moment an ADR format grows beyond these bounds — adding sections for "stakeholder sign-off," "risk assessment matrices," "implementation timelines," and "rollback plans" — the format has been corrupted by process and will be abandoned by practitioners.

---

## When to Use It

ADRs are warranted whenever a decision meets the "would I explain this to a new team member?" test. If a new engineer joins the team in six months and would need to understand why this particular choice was made in order to work effectively with the system, that decision deserves an ADR. The test is practical, not theoretical: would the absence of this record cause confusion, wasted investigation, or a re-debate of a settled question?

**Any team larger than one person.** The moment a second person joins a project, the reasoning behind decisions can no longer live exclusively in one person's head. Even in a two-person team, decisions made by one engineer while the other was on vacation will be questioned when the second engineer encounters a surprising structural choice in the codebase. The ADR eliminates the "why did you do it this way?" conversation by providing the answer before the question is asked.

**Decisions that are hard to reverse.** Jeff Bezos's one-way door / two-way door framework applies directly. One-way doors — choices that are expensive or impossible to undo once made — deserve the 15 to 30 minutes it takes to write an ADR. The storage engine for a service, the inter-service communication protocol, the authentication mechanism, the data consistency model, the choice to adopt or reject a framework that will be woven through the entire codebase — these are one-way doors. Recording the reasoning is insurance against the future moment when someone asks "why didn't we use X instead?" and no one who was present for the original decision is still on the team.

**Technology choices.** Choosing between PostgreSQL and MongoDB, between REST and gRPC, between React and Vue, between AWS Lambda and ECS — each of these decisions has consequences that cascade through the system for years. An ADR captures not just what was chosen but what was rejected and why. This is critical: the rejected alternatives are often more informative than the chosen one, because they explain the constraints that shaped the decision.

**Pattern choices.** Adopting event sourcing, choosing CQRS, selecting a modular monolith over microservices, implementing the strangler fig pattern for a legacy migration — these are structural decisions that define how the system works at a fundamental level. Without an ADR, a new team member encountering event sourcing in the codebase has no way to know whether it was a deliberate, considered choice or an experiment that was never cleaned up.

**Organizational and process decisions with architectural impact.** The decision to adopt trunk-based development, to require feature flags for all new functionality, to use contract testing between services, or to adopt a specific branching strategy for database migrations — these are not code decisions, but they shape the architecture as surely as a technology choice does.

**Cross-team decisions.** Any decision that affects more than one team — a shared API contract, a common authentication service, a standardized event schema — requires an ADR because the reasoning must be accessible to all affected teams, not just the one that made the decision.

**Compliance and regulatory contexts.** In regulated industries (finance, healthcare, government), ADRs serve as an audit trail showing that architectural decisions were made deliberately, with consideration of alternatives and consequences. The UK Government Digital Service mandates ADRs for all technology decisions in government projects, and Google Cloud's Architecture Center recommends them as part of their Well-Architected Framework.

---

## When NOT to Use It

The failure modes of over-applying ADRs are as real and as damaging as the failure modes of not having them at all. An organization drowning in unread ADRs is not better off than one with no ADRs — it is worse off, because team members develop the habit of ignoring architectural documentation entirely, and that habit persists even when a genuinely important ADR is written.

**Trivial decisions that are easily reversible.** Choosing a logging library, selecting a date formatting utility, picking a folder structure for test files, naming a REST endpoint — these are two-way doors. They can be changed in hours or days with minimal impact. Writing an ADR for every minor library choice buries the important decisions in a sea of noise. If your ADR log has 200 entries and 180 of them document trivial choices, the 20 that matter are invisible. The signal-to-noise ratio of the ADR log is its most important property.

**When ADRs become bureaucratic overhead.** If writing an ADR requires scheduling a meeting with an Architecture Review Board, filling out a 15-field template, getting three levels of sign-off, and waiting two weeks for approval before any work can proceed, the ADR process has been weaponized against the people it was meant to help. Teams in this situation stop writing ADRs — or worse, they write performative ADRs that satisfy the process without capturing real reasoning. The ADR becomes a tax on productivity rather than an investment in clarity. Nygard designed ADRs to be written by the decision-maker in 15 to 30 minutes. Any process that inflates that to days or weeks has broken the format.

**When nobody reads them.** An ADR that is written and never read is waste. If the team's ADR log exists in a Confluence space that no one visits, or in a docs/ folder that is not part of the onboarding process, or in a GitHub wiki that is not linked from the README, the effort of writing ADRs is producing no value. Before adding more ADRs, fix the discoverability problem. Put the ADR log where people actually look: in the repository alongside the code, linked from the README, referenced in code comments at the point where the decision manifests in the implementation.

**When they are never updated.** A stale ADR is worse than no ADR. An ADR with status "Accepted" for a decision that was reversed six months ago actively misleads anyone who reads it. If the team does not have the discipline to update ADR statuses when decisions change — marking old ADRs as "Superseded by ADR-NNN" and writing new ADRs for the replacement decisions — the ADR log becomes a historical fiction that erodes trust in all architectural documentation. Teams that cannot maintain ADR status should not start an ADR practice until they solve the maintenance problem, typically by integrating ADR review into their regular retrospective or architectural review cadence.

**Solo projects with no expected team growth.** A single developer working on a personal project or a prototype with no expectation of collaboration does not need ADRs. The developer's own memory and the git history are sufficient. The ROI of ADRs comes from communication across people and across time — if there is only one person and no expectation of a future audience, the overhead of formal decision records exceeds the benefit. The exception is when the solo developer expects to hand the project off or to return to it after a long absence; in those cases, ADRs serve as messages to a future self who will have forgotten the original context.

**When the team is moving too fast for the format.** During a one-week hackathon, a two-week spike, or the first 48 hours of incident response, stopping to write formal ADRs is counterproductive. The decisions being made are either temporary (and will be revisited when the pressure eases) or urgent (and the time spent documenting them is time not spent resolving the incident). The right approach is to capture decisions informally during the crunch — a Slack message, a comment in the PR, a bullet in the incident timeline — and formalize them into ADRs afterward if they turn out to be durable.

**When ADRs substitute for conversation.** If a team uses ADRs as a way to avoid face-to-face (or video-call) discussion — writing a long ADR and posting it for asynchronous approval rather than having a 30-minute conversation with the affected parties — the format is being misused. ADRs document the outcome of a decision process; they do not replace the process itself. The conversation produces alignment and shared understanding; the ADR preserves it.

---

## How It Works

### The ADR Format in Detail

The canonical ADR has five sections, each with a specific purpose and common mistakes:

**Title.** Format: "ADR-NNN: [Decision Statement]." The number provides a stable, unambiguous reference. Sequential numbering is conventional. The title should be a noun phrase that states the decision, not a question. "ADR-012: Use gRPC for inter-service communication" — not "ADR-012: What protocol should we use?" and not "ADR-012: Inter-service communication." The title must be specific enough that someone scanning the ADR index can determine whether this ADR is relevant to their question without opening it.

**Status.** The lifecycle of an ADR status:

- **Proposed** — The ADR has been written but not yet reviewed or accepted. In teams using a PR-based workflow, the ADR's PR being open is itself the "Proposed" status, making a separate status field redundant. The UK Government Digital Service recommends this approach: the PR status is the ADR status until the PR is merged.
- **Accepted** — The decision has been reviewed, discussed, and approved by the relevant stakeholders. The ADR is merged into the main branch. This is the default state for most ADRs in an active log.
- **Superseded** — The decision has been replaced by a newer decision. The superseded ADR's status is updated to "Superseded by ADR-NNN" with a link to the replacement. The old ADR is never deleted — it remains as historical context showing the evolution of the architecture.
- **Deprecated** — The decision is no longer relevant because the component, service, or system it applied to has been decommissioned. Deprecated ADRs remain in the log as historical records.
- **Amended** — Some teams add this status for minor updates to an accepted ADR that do not constitute a full reversal. Use this sparingly; if the amendment changes the core decision, it should be a new ADR that supersedes the original.

**Context.** This is the section that determines whether the ADR will be useful in six months or useless. Good context sections answer: What problem are we solving? What constraints exist (technical, organizational, budgetary, timeline)? What quality attributes are most important for this decision? What assumptions are we making? What information do we have and what information is missing?

The most common failure in context sections is vagueness. "We need a scalable, reliable database" is not context — it is a tautology. Every team wants scalability and reliability. Context that adds value is specific: "Our orders service processes 12k writes/minute at peak, growing 40% year-over-year. Our SLA requires 99.95% availability. The team has three years of PostgreSQL operational experience and no MongoDB experience. Our query patterns require multi-table joins for order reporting."

**Decision.** State the decision in one or two sentences, using active voice. "We will use..." or "We adopt..." — not "It was decided that..." The decision section should be the shortest section of the ADR. If it takes more than a paragraph to state the decision, the ADR is trying to capture multiple decisions and should be split.

**Consequences.** List both positive and negative consequences. This is where intellectual honesty matters most. Every architectural decision has downsides — constraints it introduces, capabilities it forecloses, risks it accepts. An ADR that lists only positive consequences is marketing, not documentation. The negative consequences are particularly valuable because they tell future teams what to watch for: "We accept that this choice limits our ability to X. If requirement Y changes, this decision should be revisited."

### The MADR Variant

The Markdown Architectural Decision Records (MADR) format, maintained by the adr.github.io community, extends Nygard's original with additional optional sections while preserving the lightweight spirit. MADR provides four template variants — full, minimal, and bare versions of each — so teams can choose their level of detail.

MADR adds several sections beyond Nygard's original:

- **Considered Options** — A dedicated section listing all alternatives evaluated, with brief pros and cons for each. Nygard's format folds this into Context and Consequences; MADR gives it its own section for clarity.
- **Decision Outcome** — Combines the decision with a brief rationale statement.
- **Confirmation** — How the team will verify that the decision was implemented correctly. This is particularly useful for decisions that have measurable properties: "We will confirm this by running load tests showing p99 latency under 200ms with the chosen database."
- **Pros and Cons of the Options** — A structured comparison of each considered option.
- **More Information** — Links to relevant documents, diagrams, or external resources.

The choice between Nygard's original and MADR is itself an architectural decision (and a good candidate for the team's first ADR). Nygard's format is simpler and faster to write; MADR provides more structure for complex decisions with many alternatives. Teams that find themselves consistently adding "Alternatives Considered" sections to Nygard-format ADRs should switch to MADR. Teams that find MADR's sections mostly empty should simplify to Nygard's original.

### The ADR Lifecycle

An ADR is written at decision time — not before (when the decision is still being discussed) and not after (when the context has faded from memory). The worst ADRs are retroactive: written weeks or months after the decision was made, they inevitably omit the constraints and alternatives that were vivid at decision time but have since been forgotten.

The lifecycle follows this pattern:

1. **A decision needs to be made.** Someone on the team identifies that a choice is coming that will be difficult to reverse and will affect the system's structure or quality attributes.
2. **Draft the ADR.** The person closest to the decision writes the first draft. This should take 15 to 30 minutes. If it takes longer, the ADR is either too detailed or the decision is not yet well enough understood to document.
3. **Review.** The ADR is reviewed by the people who will be affected by the decision. In a PR-based workflow, this is a pull request with the ADR as the only file. Reviewers should focus on: Is the context complete and accurate? Are the alternatives reasonable? Are the consequences honest? Is anything important missing?
4. **Accept or revise.** After review, the ADR is either accepted (merged) or revised based on feedback. If the review surfaces a fundamentally different alternative, the decision may need more investigation before the ADR can be accepted.
5. **Implement.** The decision is implemented in the codebase. Where possible, link the ADR to the code: a comment at the relevant architectural boundary that says "See ADR-012 for rationale" makes the decision discoverable from the code, not just from the ADR index.
6. **Review periodically.** At regular intervals (monthly for fast-moving projects, quarterly for stable ones), the team scans the ADR log and asks: Which ADRs are still valid? Which decisions were made in a context that no longer applies? Which ADRs should be superseded?

### Linking ADRs to Code

An ADR that exists only in a docs/ folder is half as valuable as one that is also referenced from the code it governs. When a developer encounters a surprising architectural choice in the codebase — "Why is this service using gRPC when everything else uses REST?" — the answer should be discoverable from the code itself, not from a separate search through a documentation repository.

Effective linking strategies:

- **Code comments at architectural boundaries.** A comment at the top of a gRPC service definition: `// Architecture: gRPC chosen for inter-service communication. See docs/adr/0012-use-grpc-for-inter-service-communication.md`
- **README references.** The service's README links to the ADRs that govern its major architectural choices.
- **Commit messages.** The commit that implements an architectural decision references the ADR: `feat(orders): implement PostgreSQL storage layer (ADR-007)`
- **PR descriptions.** The pull request that implements the decision links to the ADR and summarizes the key consequences.

### The "Would I Explain This?" Test

The simplest heuristic for whether a decision warrants an ADR: imagine a competent new team member joining in six months. Would you need to explain this decision to them? Would the explanation take more than two sentences? Would the explanation involve context that is not obvious from the code itself?

If the answer to all three is yes, write an ADR. If the answer to any is no, the decision probably does not need one. A decision that is obvious from the code ("we use TypeScript because the project is a TypeScript project") does not need an ADR. A decision that is surprising or counterintuitive ("we use MongoDB for the orders service even though we use PostgreSQL everywhere else, because...") absolutely does.

---

## Trade-Offs Matrix

| You Get | You Pay |
|---------|---------|
| **Decision history** — future team members can read the full reasoning behind every significant architectural choice without asking anyone | **Writing discipline** — someone must spend 15–30 minutes writing each ADR at decision time, which feels like overhead during delivery pressure |
| **Onboarding acceleration** — new engineers understand the system's shape and rationale in days instead of months of tribal-knowledge absorption | **Maintenance burden** — ADR statuses must be updated when decisions change; stale ADRs actively mislead readers |
| **Reduced decision re-litigation** — teams stop debating settled questions because the reasoning and constraints are documented and linkable | **False authority risk** — an outdated ADR can block a valid new approach if the team treats accepted ADRs as permanent mandates rather than context-dependent decisions |
| **Explicit trade-off awareness** — the consequences section forces the decision-maker to articulate what they are giving up, not just what they are gaining | **Honesty requirement** — documenting negative consequences requires intellectual honesty that some organizational cultures discourage |
| **Audit trail for regulated environments** — compliance and regulatory reviews can verify that architectural decisions were deliberate and considered | **Process overhead risk** — in bureaucratic organizations, ADRs can be co-opted as approval gates, adding weeks of delay to decisions that should take hours |
| **Cross-team alignment** — shared ADRs ensure that teams affected by a decision understand why it was made and what constraints they must respect | **Coordination cost** — cross-team ADRs require review from multiple teams, which takes longer and introduces scheduling friction |
| **Architectural coherence over time** — the ADR log reveals patterns, trends, and drift in the system's evolution that would be invisible without records | **Index maintenance** — the ADR log must be indexed, organized, and searchable; an unsorted pile of ADR files provides minimal navigability |
| **Risk documentation** — the consequences section identifies risks that the team is knowingly accepting, enabling proactive monitoring | **Premature specificity risk** — writing an ADR too early can lock the team into a decision before sufficient information is available |
| **Conflict resolution** — disputes about architectural direction can be resolved by examining the recorded context and reasoning | **Context decay** — the context that made a decision correct changes over time; the ADR captures a snapshot, not a living evaluation |
| **Git-native workflow** — ADRs stored as markdown in the repository are versioned, diffable, reviewable in PRs, and co-located with code | **Repository clutter** — large ADR logs add files to the repository that are not code, which some teams resist |

---

## Evolution Path

### Stage 1: First ADR (Day 1)

The first ADR a team writes should be "ADR-001: Use Architecture Decision Records." This is not a joke — it is a pattern recommended by the MADR documentation, the AWS Architecture Blog, and the Google Cloud Architecture Center. The first ADR documents the decision to use ADRs: what format the team will follow, where the ADRs will be stored, and what criteria will be used to determine whether a decision warrants an ADR. This bootstrapping ADR sets the norms for all subsequent records.

At this stage, keep the format minimal. Use Nygard's original five sections. Store ADRs in a `docs/adr/` or `docs/decisions/` directory in the repository. Number them sequentially. Do not install any tooling yet — a markdown file is sufficient.

### Stage 2: Establish Rhythm (Weeks 1–4)

The first month is about building the habit. Every significant decision gets an ADR, reviewed in a PR. The team discusses: Was this decision worth recording? Was the ADR too long or too short? Did the context section capture enough information?

Common adjustments at this stage:
- Teams discover that Nygard's format needs an explicit "Alternatives Considered" section and switch to MADR.
- Teams realize they are writing too many ADRs for trivial decisions and tighten the criteria.
- Teams find that no one reads the ADRs and add links from the README and from code comments.

### Stage 3: Integrate with Workflow (Months 2–3)

ADRs become part of the standard engineering workflow:
- Every PR that implements a significant architectural change includes or references an ADR.
- The onboarding checklist includes "read the ADR log."
- The sprint retrospective includes a standing item: "Are there any recent decisions that should have been ADRs?"
- The team adopts tooling if the manual approach becomes friction: `adr-tools` CLI for generating ADR files from templates, or Log4brains for publishing ADRs as a searchable static website.

### Stage 4: Periodic Review (Quarterly)

The team schedules a quarterly ADR review — a 30-minute meeting where the team scans the ADR log and asks:
- Which accepted ADRs are still valid?
- Which ADRs were made in a context that has changed materially?
- Are there any implicit decisions (made without ADRs) that should be retroactively documented?
- Are any ADR statuses stale (decision was reversed but the ADR still says "Accepted")?

AWS's prescriptive guidance recommends reviewing each ADR one month after acceptance to compare the documented expectations with actual practice — a feedback loop that improves both the quality of future ADRs and the team's decision-making.

### Stage 5: Cross-Team ADR Practice (6+ months)

For organizations with multiple teams, establish a shared ADR repository or index for decisions that affect more than one team. Platform decisions, shared API contracts, authentication standards, and data governance policies belong in a cross-team ADR log that all affected teams can discover and reference.

At this stage, consider Log4brains or a similar tool that aggregates ADRs from multiple repositories into a single searchable interface. The UK Government Digital Service uses a centralized ADR index across all government technology projects, enabling cross-team discovery of decisions and rationale.

---

## Failure Modes

### The ADR Graveyard

The most common failure mode. The team writes ADRs enthusiastically for the first few months, then stops. The existing ADRs are never updated. New decisions are not recorded. The ADR log becomes a historical artifact from a specific period of the project's life, not a living record of its architectural evolution.

Root causes: lack of habit reinforcement (no retrospective item, no PR checklist item, no onboarding reference), the departure of the team member who championed ADRs, or the perception that ADRs are "extra work" rather than a core engineering practice.

The diagnostic signal: the most recent ADR is more than three months old, but significant architectural decisions have been made in that period.

The intervention: integrate ADR writing into existing workflows rather than treating it as a separate activity. Add "Does this PR need an ADR?" to the PR template. Add "Review the ADR log" to the quarterly retrospective. Make the ADR log the first thing new team members read during onboarding. The habit survives when it is embedded in processes the team already follows, not when it depends on individual motivation.

### Over-Documentation (The Mega-ADR)

The failure mode where ADRs become 8-page documents covering component responsibilities, sequence diagrams, deployment procedures, and implementation timelines. Zimmermann calls this the "Mega-ADR" anti-pattern: an ADR that has been inflated into a design document because the author could not resist documenting everything they knew about the topic.

The consequence: no one reads them. A developer looking for the rationale behind a specific decision does not want to wade through 8 pages of tangential implementation details. The team stops writing ADRs because each one takes half a day, and the format is abandoned.

The fix: enforce a length limit. A good ADR fits on one printed page — roughly 400 to 600 words. If the ADR is longer than that, it is either trying to capture multiple decisions (split it) or mixing decision documentation with design documentation (move the design content to a separate document and link to it from the ADR). The ADR should capture only what someone needs to understand the decision and its rationale, not everything the author knows about the topic.

### Missing Context

The failure mode where the ADR records what was decided but not why. "We will use PostgreSQL" — without any explanation of the constraints, requirements, alternatives considered, or consequences accepted — is a record that adds almost no value. Six months later, a new team member reading this ADR knows what was chosen but has no basis for evaluating whether the decision is still appropriate, what constraints it was optimizing for, or what alternatives were rejected and why.

This failure mode is most common in teams that treat ADRs as a compliance checkbox ("we wrote the ADR") rather than a communication tool ("we documented our reasoning so future us can evaluate it"). The fix: during ADR review, the reviewer's primary question should be "Would I understand this decision if I joined the team tomorrow with no prior context?" If the answer is no, the context section needs work.

### No Status Updates

The failure mode where decisions are reversed or superseded in practice but the ADR log still shows them as "Accepted." A new team member reads ADR-005 ("Use MongoDB for the user service"), sees it is Accepted, and builds a new feature accordingly — only to discover that the team migrated to PostgreSQL three months ago and ADR-005 should have been marked "Superseded by ADR-023."

This failure mode erodes trust in the entire ADR log. Once a team member discovers that ADR statuses are unreliable, they stop trusting any ADR without verbal confirmation from a senior engineer — which defeats the purpose of having ADRs at all.

The fix: treat ADR status updates as a required part of the architectural change process. When a new ADR supersedes an old one, the PR that introduces the new ADR must also update the old ADR's status. Automate this where possible: a CI check that verifies all "Superseded" links are bidirectional (the old ADR links forward to the new one, and the new one links back to the old one).

### Blueprint in Disguise

Zimmermann's term for an ADR whose writing style resembles a design specification or a policy document rather than a decision record. The telltale signs: imperative language ("teams SHALL use..."), excessive implementation detail ("the service MUST implement the following interface..."), multiple embedded diagrams, and section headers that look like a design document table of contents rather than the five ADR sections.

The root cause is usually organizational: someone in a governance role has been told to "use ADRs" and has reshaped the format to serve their existing design-review or policy-enforcement process. The result is a document that developers perceive as bureaucratic overhead rather than useful documentation.

The fix: return to Nygard's original format. Five sections, one decision, one page. If the organization needs design documents or policy documents, those are separate document types with separate templates. An ADR is not a substitute for either.

### Premature ADR

Writing an ADR before the decision has been sufficiently explored. A team writes "ADR-015: Use Kafka for event streaming," accepts it, and begins implementation — only to discover during implementation that their actual message volume does not justify Kafka's operational complexity and a simpler solution like Redis Streams would suffice. The premature ADR must now be superseded, and the implementation work must be partially redone.

The fix: use the "Proposed" status (or draft PR) for decisions that are still being investigated. Do not accept an ADR until the decision has been validated through spikes, prototypes, or sufficient analysis. The ADR should document a decision that has been made, not a decision that is being considered.

---

## Technology Landscape

### adr-tools (CLI)

The original ADR management tool, created by Nat Pryce. A bash-based CLI that automates ADR file creation, numbering, and linking. Commands: `adr new "Use PostgreSQL for orders"` creates a new ADR file from a template with the next sequential number. `adr list` shows all ADRs. `adr link` creates relationships between ADRs. `adr generate toc` generates a table of contents.

Strengths: extremely simple, no dependencies beyond bash, follows Nygard's format by default. Limitations: the original repository has been archived, and the tool does not support MADR format out of the box. Several community forks maintain compatibility and add features. Best suited for teams that want the simplest possible tooling with no external dependencies.

### Log4brains

A more comprehensive ADR management and publication tool. Log4brains provides a CLI for creating ADRs from templates (MADR by default), a local preview server, and a static site generator that publishes the ADR log as a searchable, navigable website. It supports multiple ADR repositories (for multi-team setups) and integrates with CI/CD pipelines for automated publishing.

Strengths: generates a browsable static site from the ADR log, supports MADR and custom templates, supports multi-package monorepo setups, active maintenance. Limitations: requires Node.js, adds a build step to the documentation pipeline, and some teams report performance issues with large ADR logs (50+ records). Best suited for teams that want a published, searchable ADR knowledge base.

### ADR in Plain Markdown Files

The zero-tooling approach: create a `docs/adr/` directory, number files manually (`0001-use-adrs.md`, `0002-choose-postgresql.md`), and maintain a `README.md` in the directory as a table of contents. This is the approach recommended by the UK Government Digital Service and used by many open-source projects.

Strengths: no tooling dependencies, works with any editor, fully portable, versioned by git, reviewable in PRs. Limitations: manual numbering requires coordination in large teams, no automated table of contents, no search beyond git grep. Best suited for small to medium teams that value simplicity over tooling features.

### GitHub PR-Based ADR Workflow

A workflow pattern (not a tool) where the ADR lifecycle is mapped directly to GitHub's pull request workflow. A new ADR is submitted as a PR. The PR review process serves as the decision review. The PR being open means the ADR is "Proposed." The PR being merged means the ADR is "Accepted." This eliminates the need for a separate status field in the ADR file — the git history is the status history.

The GDS way documents this approach explicitly: "When the team agrees, the pull request is merged, and the ADR is now 'accepted.' If a decision is reversed later, you write a new ADR, rather than editing the old one."

Strengths: uses existing git workflow, provides built-in review and approval mechanisms, creates an audit trail of who approved each decision and when. Limitations: does not handle "Superseded" status as cleanly (requires a separate commit to update the old ADR), and the decision discussion is spread across PR comments rather than consolidated in a single document.

### Notion/Confluence Templates

Enterprise teams often maintain ADRs in Notion or Confluence rather than in the code repository. Templates are available for both platforms that implement Nygard's or MADR's format as structured pages with metadata fields for status, date, and author.

Strengths: familiar to non-engineering stakeholders, supports rich formatting and embedded diagrams, searchable within the organization's existing knowledge management system. Limitations: ADRs are decoupled from the codebase (not versioned with code, not reviewable in PRs), discoverability depends on the organization's wiki discipline, and the temptation to add process (approval workflows, stakeholder sign-off fields) is stronger in enterprise wiki platforms. Teams using this approach should establish a clear link from the codebase to the wiki — at minimum, a `docs/adr/README.md` in the repository that links to the Confluence space.

### Structurizr

Simon Brown's architecture-as-code tool supports embedding ADR references directly in the architecture model. ADRs can be defined alongside C4 model definitions in the Structurizr DSL, creating a direct link between structural diagrams and the decisions that shaped them. This is the tightest integration between architectural documentation and decision records currently available.

### ADR Manager (VS Code Extension)

A Visual Studio Code extension that provides a graphical interface for creating, browsing, and managing ADRs within the editor. Supports MADR format and integrates with the file explorer for navigation. Useful for teams where developers prefer GUI tooling over CLI.

---

## Decision Tree

```
START
  |
  v
Is this an architectural decision (affects structure, quality attributes,
technology choices, or is difficult to reverse)?
  |
  +-- NO  --> Do not write an ADR.
  |           Document in commit message, PR description, or code comment.
  |
  +-- YES --> Is the team using ADRs already?
                |
                +-- NO  --> Write ADR-001: "Use Architecture Decision Records."
                |           Choose format (Nygard or MADR).
                |           Choose storage location (docs/adr/ in repo recommended).
                |           Then write the ADR for the current decision as ADR-002.
                |
                +-- YES --> Has this decision been sufficiently explored?
                              |
                              +-- NO  --> Is a spike/prototype needed to reduce uncertainty?
                              |            |
                              |            +-- YES --> Run the spike first. Write the ADR
                              |            |           after the spike produces evidence.
                              |            |
                              |            +-- NO  --> Draft the ADR as "Proposed."
                              |                        Submit as a draft PR for discussion.
                              |                        Accept after the team aligns.
                              |
                              +-- YES --> Write the ADR now.
                                            |
                                            v
                                          Does this decision affect more than one team?
                                            |
                                            +-- YES --> Include reviewers from all affected
                                            |           teams. Store in a shared location
                                            |           or cross-reference from team repos.
                                            |
                                            +-- NO  --> Review within the team.
                                            |
                                            v
                                          Does this decision supersede an existing ADR?
                                            |
                                            +-- YES --> Update the old ADR's status to
                                            |           "Superseded by ADR-NNN."
                                            |           Link from the new ADR back to
                                            |           the old one for history.
                                            |
                                            +-- NO  --> Submit the ADR PR.
                                                        Merge when approved.
                                                        Link from code where relevant.
```

**Concrete thresholds for when to write an ADR:**
- Any technology choice that the team will live with for more than 6 months.
- Any decision that affects the system's data model, service boundaries, or inter-service communication.
- Any decision where two or more viable alternatives were seriously considered.
- Any decision that a new team member would find surprising or counterintuitive.
- Any decision with compliance or regulatory implications.
- Any decision that affects more than one team's codebase or workflow.

---

## Implementation Sketch

### ADR Folder Structure

```
project-root/
  docs/
    adr/
      README.md                              # Index of all ADRs with links and status
      0001-use-architecture-decision-records.md
      0002-use-postgresql-for-orders-service.md
      0003-adopt-grpc-for-inter-service-communication.md
      0004-use-event-sourcing-for-audit-trail.md
      0005-choose-react-for-frontend.md
      0006-deprecate-mongodb-migrate-to-postgresql.md   # Supersedes ADR-0002 context
      templates/
        adr-template-nygard.md               # Nygard's original 5-section format
        adr-template-madr.md                 # MADR full template
```

### ADR Index (README.md)

```markdown
# Architecture Decision Records

| ADR | Title | Status | Date |
|-----|-------|--------|------|
| [ADR-0001](0001-use-architecture-decision-records.md) | Use Architecture Decision Records | Accepted | 2026-01-15 |
| [ADR-0002](0002-use-postgresql-for-orders-service.md) | Use PostgreSQL for Orders Service | Accepted | 2026-01-22 |
| [ADR-0003](0003-adopt-grpc-for-inter-service-communication.md) | Adopt gRPC for Inter-Service Communication | Accepted | 2026-02-03 |
| [ADR-0004](0004-use-event-sourcing-for-audit-trail.md) | Use Event Sourcing for Audit Trail | Proposed | 2026-02-10 |
| [ADR-0005](0005-choose-react-for-frontend.md) | Choose React for Frontend | Accepted | 2026-02-17 |
| [ADR-0006](0006-deprecate-mongodb-migrate-to-postgresql.md) | Deprecate MongoDB, Migrate to PostgreSQL | Accepted | 2026-03-01 |
```

### Example ADR: Choosing PostgreSQL over MongoDB (Nygard Format)

```markdown
# ADR-0002: Use PostgreSQL for Orders Service

## Status
Accepted — 2026-01-22

## Context
We are building an orders service for our e-commerce platform. The service must handle
order lifecycle management including creation, payment processing, fulfillment tracking,
and returns. Our requirements:

- **Consistency:** Order creation involves multiple entities (order header, line items,
  payment record, inventory reservation). These must be created atomically — a partially
  created order is a data integrity bug that causes customer-visible errors and accounting
  discrepancies.
- **Query patterns:** The operations team requires reporting queries that join orders with
  line items, payments, and customer records. These queries run in real-time dashboards
  and are not suitable for eventual-consistency models.
- **Write volume:** Projected peak is 2,000 orders/minute during seasonal sales events.
  Expected steady-state is 200 orders/minute. Growth projection is 40% year-over-year.
- **Team expertise:** Three of four backend engineers have 3+ years of PostgreSQL
  production experience. No one on the team has operated MongoDB or DynamoDB in production.
- **Existing infrastructure:** We already run PostgreSQL 16 for the customer service and
  product catalog service. Operational tooling (monitoring, backups, failover) is
  established.

We evaluated three options: PostgreSQL, MongoDB, and DynamoDB.

## Decision
We will use PostgreSQL 16 for the orders service, with pgBouncer for connection pooling
and streaming replication to a read replica for reporting queries.

## Consequences
**Positive:**
- ACID transactions across order creation eliminate an entire class of partial-state bugs
  that would require application-level compensation logic with eventually-consistent stores.
- Complex reporting queries with multi-table joins are straightforward in SQL and perform
  well with proper indexing.
- No new operational skills required — the team can deploy, monitor, and troubleshoot
  PostgreSQL immediately using existing tooling and knowledge.
- Infrastructure reuse — shared PostgreSQL operational playbooks, monitoring dashboards,
  and backup procedures across services.

**Negative:**
- Horizontal write scaling is limited. If order volume exceeds approximately 50,000
  writes/minute, we will need a sharding strategy (Citus, application-level sharding,
  or vertical partitioning). At current growth rates, this threshold is approximately
  3 years away. **Action:** Revisit this ADR when write volume reaches 20,000/minute.
- Schema rigidity. Schema changes require coordinated migrations across the service.
  MongoDB's flexible schema would allow faster iteration on the order data model. We
  accept this trade-off because our order schema has been stable for 18 months in the
  legacy system and is unlikely to change frequently.
- Vendor lock-in to relational data modeling. If future requirements demand graph
  traversal, time-series, or document-oriented access patterns for order data, PostgreSQL
  may not be the optimal choice. We mitigate this through a repository abstraction layer
  that isolates storage-specific logic from business logic.

## Alternatives Considered
- **MongoDB:** Flexible schema and horizontal scaling via sharding are attractive. Rejected
  because: (1) multi-document transactions, while supported since MongoDB 4.0, add
  complexity and performance overhead that our consistency requirements would trigger on
  every write; (2) our query patterns require joins that MongoDB handles less efficiently
  than PostgreSQL; (3) no team member has MongoDB production operations experience, adding
  operational risk during launch.
- **DynamoDB:** Excellent horizontal scaling and managed operations. Rejected because:
  (1) single-table design requires significant data modeling investment and couples our
  query patterns permanently to DynamoDB's access patterns (one-way door); (2) complex
  reporting queries require export to a secondary analytics store, adding infrastructure
  complexity; (3) cost model is unpredictable for our bursty write patterns during
  seasonal sales.
```

### Example ADR: Superseding a Previous Decision

```markdown
# ADR-0006: Deprecate MongoDB, Migrate User Service to PostgreSQL

## Status
Accepted — 2026-03-01
Supersedes: [ADR-0009](0009-use-mongodb-for-user-service.md)

## Context
In ADR-0009 (accepted 2025-06-15), we chose MongoDB for the user service because user
profiles had a highly variable schema — different user types (individual, business,
enterprise) had different field sets, and the product team was iterating rapidly on
profile features.

Since that decision, three things have changed:
1. The user profile schema has stabilized. The product team completed the profile feature
   set in Q3 2025 and has made no schema changes in 4 months.
2. We have encountered recurring issues with MongoDB's multi-document transactions when
   updating user profiles and their associated preferences atomically. Three production
   incidents in Q4 2025 were traced to partial updates under transaction retry storms.
3. Operational burden: our team now maintains two database technologies (PostgreSQL for
   4 services, MongoDB for 1 service). The MongoDB instance requires separate monitoring
   dashboards, backup procedures, and upgrade playbooks. Engineering time spent on
   MongoDB operations exceeds the time saved by its flexible schema.

## Decision
We will migrate the user service from MongoDB to PostgreSQL. User profile variability
will be handled using PostgreSQL's JSONB column for type-specific fields, with common
fields in typed columns.

## Consequences
**Positive:**
- Single database technology across all services reduces operational overhead.
- ACID transactions eliminate the partial-update bugs we experienced with MongoDB.
- JSONB provides sufficient schema flexibility for the remaining variable fields.

**Negative:**
- Migration effort estimated at 3 weeks of engineering time including data migration,
  query rewriting, and testing.
- JSONB queries are less performant than MongoDB's native document queries for deeply
  nested field access. We accept this because our profile queries access top-level
  fields only.
```

### ADR Template (Nygard Original)

```markdown
# ADR-NNNN: [Short title of the decision]

## Status
[Proposed | Accepted | Deprecated | Superseded by [ADR-NNNN](link)]

## Context
[Describe the context and problem. What forces are at play? What constraints exist?
What requirements drove this decision? Be specific — include numbers, team composition,
timeline, and technical constraints. Vague context produces useless ADRs.]

## Decision
[State the decision in active voice. "We will..." or "We adopt..." Keep this short —
one to three sentences.]

## Consequences
[List both positive and negative consequences. Be honest about the downsides.
Include triggers for revisiting this decision: "If X changes, revisit this ADR."]
```

### ADR Template (MADR)

```markdown
# [Short title of solved problem and solution]

## Status
[Proposed | Accepted | Deprecated | Superseded by [ADR-NNNN](link)]

Date: [YYYY-MM-DD]

## Context and Problem Statement
[Describe the context and problem in 2-5 sentences. What is forcing this decision?]

## Decision Drivers
- [Driver 1: e.g., required consistency model]
- [Driver 2: e.g., team expertise]
- [Driver 3: e.g., operational constraints]

## Considered Options
1. [Option 1]
2. [Option 2]
3. [Option 3]

## Decision Outcome
Chosen option: "[Option N]", because [justification in one sentence].

### Confirmation
[How will you verify the decision was implemented correctly? Optional but recommended
for measurable decisions.]

### Consequences
**Good:**
- [Positive consequence 1]
- [Positive consequence 2]

**Bad:**
- [Negative consequence 1]
- [Negative consequence 2]

**Neutral:**
- [Side effect that is neither clearly good nor bad]

## Pros and Cons of the Options

### [Option 1]
- Good, because [argument]
- Bad, because [argument]

### [Option 2]
- Good, because [argument]
- Bad, because [argument]

### [Option 3]
- Good, because [argument]
- Bad, because [argument]

## More Information
[Links to related ADRs, design documents, spike results, or external resources.]
```

---

## Summary

Architecture Decision Records are the simplest high-leverage practice in software architecture. They require no tooling, no process changes, and no organizational buy-in beyond the team itself. A markdown file with five sections — Title, Status, Context, Decision, Consequences — written in 15 to 30 minutes at decision time, prevents hours of re-debate, confusion, and architectural drift over the following months and years.

The minimum viable ADR practice is:
1. Create a `docs/adr/` directory in the repository.
2. Write ADR-001: "Use Architecture Decision Records" — documenting the format and criteria.
3. Write an ADR for every decision that is difficult to reverse and would need to be explained to a new team member.
4. Review ADRs in PRs. Link accepted ADRs from the code they govern.
5. Review the ADR log quarterly. Update statuses. Write retroactive ADRs for decisions that were made without them.

The failure modes are symmetric: too few ADRs (undocumented decisions, tribal knowledge, re-litigation) and too many ADRs (noise, bureaucracy, abandonment). The sweet spot is a log where every entry answers a question that someone will actually ask.

Michael Nygard's original insight remains the foundation: "If you do a Google search, you'll find that most software architecture documentation discusses the structure or the behavior of the system, but rarely discusses why particular solutions were chosen over other possible alternatives. The short answer of how to document architecture decisions is: keep a collection of short text files, one per decision."

---

*Researched: 2026-03-08 | Sources:*
- *[Documenting Architecture Decisions — Michael Nygard / Cognitect](https://www.cognitect.com/blog/2011/11/15/documenting-architecture-decisions)*
- *[Master ADRs: Best Practices for Effective Decision-Making — AWS Architecture Blog](https://aws.amazon.com/blogs/architecture/master-architecture-decision-records-adrs-best-practices-for-effective-decision-making/)*
- *[Best Practices — AWS Prescriptive Guidance](https://docs.aws.amazon.com/prescriptive-guidance/latest/architectural-decision-records/best-practices.html)*
- *[Architecture Decision Records Overview — Google Cloud Architecture Center](https://cloud.google.com/architecture/architecture-decision-records)*
- *[Maintain an Architecture Decision Record — Microsoft Azure Well-Architected Framework](https://learn.microsoft.com/en-us/azure/well-architected/architect-role/architecture-decision-record)*
- *[Documenting Architecture Decisions — UK Government Digital Service (GDS)](https://gds-way.digital.cabinet-office.gov.uk/standards/architecture-decisions.html)*
- *[MADR — Markdown Architectural Decision Records](https://adr.github.io/madr/)*
- *[ADR Templates — adr.github.io](https://adr.github.io/adr-templates/)*
- *[Architecture Decision Record Examples — Joel Parker Henderson / GitHub](https://github.com/joelparkerhenderson/architecture-decision-record)*
- *[How to Create ADRs — and How Not To — Olaf Zimmermann](https://ozimmer.ch/practices/2023/04/03/ADRCreation.html)*
- *[The MADR Template Explained and Distilled — Olaf Zimmermann](https://www.ozimmer.ch/practices/2022/11/22/MADRTemplatePrimer.html)*
- *[8 Best Practices for Creating Architecture Decision Records — TechTarget](https://www.techtarget.com/searchapparchitecture/tip/4-best-practices-for-creating-architecture-decision-records)*
- *[Log4brains — ADR Management and Publication Tool](https://github.com/thomvaill/log4brains)*
- *[adr-tools — Command-Line Tools for ADRs — Nat Pryce](https://github.com/npryce/adr-tools)*
- *[Why You Should Be Using ADRs — Red Hat](https://www.redhat.com/en/blog/architecture-decision-records)*
- *[A Documentation Framework for Architecture Decisions — MIT](https://www.mit.edu/~richh/writings/doc-framework-decisions.pdf)*
