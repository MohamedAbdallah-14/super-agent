# Build vs Buy — Architecture Expertise Module

> The build vs buy decision determines whether to develop a capability in-house or adopt an existing solution (SaaS, open-source, or commercial off-the-shelf). The default should be "buy" for commodity capabilities and "build" for competitive differentiators. Most teams over-build — custom auth systems, custom CMS, custom email infrastructure — wasting months on solved problems. According to Forrester's 2024 Software Development Trends Report, 67% of failed software implementations stem from incorrect build vs buy decisions, and more than 35% of large enterprise custom software initiatives are abandoned entirely.

> **Category:** Decision
> **Complexity:** Moderate
> **Applies when:** Adding any new capability to a system — authentication, payments, search, email, analytics, CMS, scheduling, monitoring, or any infrastructure component

---

## What This Is

### The Build vs Buy Spectrum

Build vs buy is not a binary choice. It is a spectrum with at least four distinct positions, each with different cost profiles, control levels, and maintenance burdens.

**Fully Custom (Build from Scratch)** — Your team writes every line of code. You own the full stack, from data model to UI. You bear 100% of the maintenance burden, security patching, scaling, and on-call rotation. This is appropriate only when the capability is your core product or when no existing solution can meet genuinely unique requirements. Examples: a fintech company building its own ledger system, a search company building its own ranking algorithm.

**Open-Source with Customization** — You adopt an open-source project as a foundation and extend it to fit your needs. You get a head start (often years of community-hardened code) but still own deployment, configuration, upgrades, and any custom patches. You avoid vendor lock-in but accept operational burden. The fork-and-modify path is particularly dangerous — your customizations can diverge from upstream, making future upgrades painful or impossible. Examples: deploying Keycloak for auth, running self-hosted PostgreSQL, using Apache Airflow for workflow orchestration.

**SaaS with Integration (Buy and Integrate)** — You subscribe to a managed service and integrate it via APIs, SDKs, or webhooks. The vendor handles infrastructure, scaling, security patching, and compliance certifications. You trade control for velocity. Your integration code becomes the boundary — well-designed integrations use adapter patterns that allow future vendor swaps. Examples: Auth0/Clerk for authentication, Stripe for payments, SendGrid for email, Datadog for monitoring.

**Fully Managed / Embedded (Buy and Delegate)** — You use a turnkey solution that requires minimal integration. Often this means embedding a vendor's complete workflow — their UI, their data model, their opinionated flow. Maximum speed, minimum control. Appropriate for capabilities that are entirely commodity and where your users do not need a custom experience. Examples: Shopify for e-commerce, WordPress for content management, Zendesk for support ticketing.

### The Core vs Context Framework

The most useful mental model for build vs buy decisions comes from Geoffrey Moore's concept of **core vs context**:

- **Core** — Activities that create competitive differentiation. These are what your customers pay you for. They are unique to your business, hard to replicate, and directly drive revenue or retention. You should build these, because control over them is a strategic asset.

- **Context** — Everything else. Activities that are necessary but do not differentiate you. Authentication, email delivery, payment processing, logging, monitoring, CI/CD — these are table stakes. Every company needs them, none of your customers chose you because of your login page. You should buy these, because building them diverts engineering time from core work.

The mistake most engineering teams make is misclassifying context as core. "We need customization" is the most common justification, and it is almost always wrong. Most SaaS solutions cover 90% of requirements out of the box, and the remaining 10% is rarely worth months of custom development.

### What This Decision Is Not

**Not a one-time choice.** Build vs buy decisions should be revisited as the market evolves. What required custom development five years ago may now be a commodity SaaS offering. Conversely, a capability you bought may have become so central to your product that bringing it in-house is warranted.

**Not purely a cost calculation.** TCO analysis is necessary but not sufficient. Strategic alignment, team capability, time-to-market pressure, and competitive dynamics all factor in. A spreadsheet alone will not give you the right answer.

**Not a reflection of engineering competence.** Choosing to buy is not an admission that your team "can't build it." It is a recognition that their time is better spent on problems that only they can solve. The best engineering teams are aggressive about buying commodity capabilities precisely because they understand their own value.

---

## When to Build

### The Qualifying Conditions for Custom Development

Build when **two or more** of these conditions are true. If only one is true, the case for building is weak and should be scrutinized.

**The capability is your core competitive advantage.** If this is what customers pay you for — if removing it would make your product indistinguishable from competitors — then you need full control over its evolution. Google built its own search ranking algorithm. Stripe built its own payment infrastructure. Netflix built its own recommendation engine. These companies did not adopt off-the-shelf solutions for their core differentiators because doing so would have ceded their competitive moat.

**Existing solutions genuinely cannot meet your requirements.** Not "we want a slightly different button color" — genuinely cannot. This means you have evaluated at least three commercial solutions and two open-source options, spoken with their sales engineers, done proof-of-concept integrations, and confirmed that the gaps are fundamental, not configuration oversights. The bar here should be high: can you articulate exactly which requirements are unmet and why they are non-negotiable?

**Regulatory or compliance constraints mandate full control.** Some industries (healthcare, defense, financial services) have compliance requirements that prohibit third-party data processing for certain data types. HIPAA, SOC 2, FedRAMP, PCI-DSS — these can constrain vendor choices or eliminate them entirely. But verify this carefully: most major SaaS vendors now hold these certifications. "We're in healthcare so we need to build everything" has not been true for years.

**Volume economics make SaaS pricing prohibitive.** SaaS pricing is designed for the median customer. If you are at extreme scale — sending billions of emails, processing millions of transactions, storing petabytes of data — the per-unit economics of SaaS can become untenable. At this point, custom infrastructure amortizes its development cost over enough volume to justify the investment. But be honest about whether you are actually at this scale or merely aspire to be. Building for hypothetical future scale is one of the most expensive mistakes in software engineering.

**The integration surface is the product itself.** If the capability you are evaluating is deeply intertwined with your user experience — if it is not a background service but a visible, interactive part of your product — then the limitations of vendor-provided UIs and workflows may be genuinely constraining. A generic embedded checkout flow may be acceptable; a generic core workflow editor probably is not.

### Real-World "Build" Decisions That Were Right

**Stripe building payment infrastructure** — When Stripe launched in 2010, existing payment processing required months of integration, byzantine APIs, and per-merchant bank relationships. Stripe's entire competitive advantage was making this easy. Building it was not optional — it was the product.

**Netflix building its recommendation engine** — Recommendations drive 80% of content watched on Netflix. This is not a feature — it is the core product experience. Netflix invested heavily in custom ML infrastructure because the quality of recommendations directly determines subscriber retention.

**Shopify building its own checkout** — Shopify's checkout conversion rate is a key competitive metric against competitors. Owning this flow end-to-end lets them optimize every pixel for conversion, run continuous A/B tests, and provide merchants with unique capabilities that generic checkout widgets cannot match.

---

## When to Buy

### The Case for Buying Is Usually Stronger Than You Think

The default should be "buy" unless you have a compelling, specific reason to build. Here is why.

**Commodity capabilities are solved problems.** Authentication, email delivery, payment processing, search, logging, monitoring, error tracking, feature flagging, A/B testing — these have been built, hardened, scaled, and battle-tested by dedicated companies whose entire business depends on them being excellent. Your custom implementation will not be better. It will be worse — less secure, less tested, less maintained, with fewer edge cases handled.

**The real cost of building is 5-10x the initial estimate.** Forrester Research found that 60% of companies underestimate the long-term cost of maintaining custom-built software. Forrester's Total Economic Impact model estimates that 78% of lifetime software TCO accrues after launch, not during initial development. That custom auth system you estimated at 3 weeks of work? Add ongoing security patching, session management edge cases, password reset flows, MFA support, SSO integration, compliance audits, and on-call rotation. You are now looking at a permanent maintenance burden that grows every year.

**Opportunity cost is the largest hidden cost.** Every month your team spends building a custom email system is a month they are not building features that differentiate your product. For a startup, this can be existential — competitors who bought commodity capabilities and spent their engineering time on core product are shipping faster, learning faster, and capturing market share.

**SaaS vendors have dedicated security teams.** When you build custom authentication, you are now responsible for credential storage, brute-force protection, session management, token rotation, CSRF protection, XSS mitigation, and every OWASP Top 10 vulnerability. Auth0 has an entire security team doing this full-time. Your team has one developer who "knows security pretty well." The risk asymmetry is enormous.

### The "We Need Customization" Fallacy

This is the most common justification for building, and it is almost always wrong. The pattern:

1. Team evaluates SaaS solution.
2. Team finds it covers 90% of requirements.
3. Team identifies a 10% gap in customization.
4. Team decides to build from scratch to get 100% coverage.
5. Team spends 6 months building a solution that covers 70% of what the SaaS offered, plus the 10% custom requirement.
6. Team now maintains a worse solution indefinitely.

The correct response to a 10% gap is usually: adapt your requirements, use the vendor's extension points, or build a thin integration layer on top of the vendor solution. Building from scratch to avoid a 10% compromise is almost never economically rational.

### Real-World "Buy" Decisions — Lessons from the Field

**Every startup that built custom auth** — Building custom authentication is the canonical example of wasted engineering effort. Auth0 integration takes hours. Clerk integration takes minutes (approximately 20 lines of code for production-ready auth). Building custom auth with email/password, social login, MFA, session management, and password reset takes 2-4 months minimum — and then requires ongoing security maintenance forever. The custom solution will be less secure than Auth0 or Clerk on day one and the gap will widen over time. Building SAML support alone is estimated at $250,000-500,000 in engineering time.

**Payment processing** — Stripe provides access to 125+ payment methods through a single integration. Building custom payment processing infrastructure requires 6-18 months of dedicated engineering time for initial integration alone, plus ongoing compliance with PCI-DSS, fraud detection, dispute management, and regulatory requirements across jurisdictions. Becoming a full payment facilitator requires handling customer onboarding, underwriting, dispute management, compliance, support, dashboards, and reporting — a multi-year, multi-team endeavor.

**Email infrastructure** — SendGrid, Postmark, and Amazon SES handle deliverability, bounce management, spam compliance (CAN-SPAM, GDPR), IP reputation management, and scaling to millions of messages. Building custom email sending infrastructure means managing SMTP servers, SPF/DKIM/DMARC configuration, deliverability optimization, bounce handling, feedback loops with ISPs, and blocklist monitoring. Teams that build this spend months getting out of spam folders.

**Monitoring and observability** — Datadog, New Relic, and Grafana Cloud provide unified logging, metrics, tracing, and alerting with pre-built integrations for hundreds of technologies. Custom monitoring stacks require deploying and maintaining Prometheus, Grafana, Loki, Tempo, AlertManager, and their associated storage backends — a full-time job for at least one infrastructure engineer.

**Search** — Algolia and Elasticsearch-as-a-Service (Elastic Cloud) provide sub-50ms search with typo tolerance, faceting, relevance tuning, and analytics. Custom search implementation requires building and maintaining inverted indices, relevance scoring, query parsing, and scaling infrastructure. Teams that build custom search spend months achieving what Algolia provides on day one.

---

## How It Works — The Evaluation Framework

### Step 1: Classify Core vs Context

Before evaluating any specific solution, answer this question honestly: **Is this capability a competitive differentiator?**

Apply the "press release test": if you removed this capability from your product, would your customers notice? Would they switch to a competitor? If the answer is no, it is context, and you should default to buying.

Apply the "10x test": if you made this capability 10x better, would it meaningfully improve your competitive position? If a 10x improvement in your auth system would not matter to customers but a 10x improvement in your recommendation engine would, then auth is context and recommendations are core.

### Step 2: Total Cost of Ownership Analysis

TCO must be calculated over a 3-5 year window to capture the full picture. Short-term cost comparisons are misleading because they hide the maintenance iceberg.

**Build TCO Components:**

| Cost Category | Year 1 | Year 2-5 (Annual) |
|---|---|---|
| Development (salaries, benefits) | High | Moderate |
| Infrastructure (servers, databases) | Moderate | Moderate-High |
| Security (audits, patching, incidents) | Low | Moderate-High |
| Maintenance (bug fixes, upgrades) | Low | High |
| Opportunity cost (features not built) | Very High | High |
| On-call and operational support | Moderate | Moderate |
| Documentation and knowledge transfer | Moderate | Moderate |
| **Cumulative trajectory** | **High** | **Accelerating** |

**Buy TCO Components:**

| Cost Category | Year 1 | Year 2-5 (Annual) |
|---|---|---|
| Subscription / licensing fees | Moderate | Moderate (may increase) |
| Integration development | Moderate | Low |
| Training and onboarding | Low | Low |
| Migration / data portability prep | Low | Low |
| Vendor management overhead | Low | Low |
| Risk of vendor price increases | None | Low-Moderate |
| Risk of vendor discontinuation | None | Low |
| **Cumulative trajectory** | **Moderate** | **Predictable** |

**The critical insight:** Build costs accelerate over time (technical debt, security patches, framework upgrades, team turnover requiring knowledge transfer). Buy costs are predictable and often decrease as a percentage of revenue as the company grows.

**TCO Formula:**

```
Build TCO = Development Cost + (Annual Maintenance x Years) + Opportunity Cost
Buy TCO   = (Annual Subscription x Years) + Integration Cost + Migration Risk Premium
```

The opportunity cost term is what most analyses omit — and it is usually the largest number. If your 4-person team spends 3 months building custom search instead of core product features, and your burn rate is $80K/month fully loaded per engineer, the opportunity cost is $960K — not in cash, but in deferred product development that could have driven revenue.

### Step 3: Vendor Evaluation Criteria

When evaluating buy options, assess these dimensions:

**Functional fit** — Does it cover at least 80% of your requirements without customization? What are its extension points (APIs, webhooks, plugins)? Can you work around gaps with integration code rather than forking or replacing?

**Integration architecture** — Does it offer well-documented REST/GraphQL APIs? Does it support webhooks for event-driven integration? Are there SDKs for your language/framework? Can you integrate at the API level (loose coupling) rather than the UI level (tight coupling)?

**Pricing model and trajectory** — What is the pricing model (per-seat, per-usage, flat-rate)? How does pricing scale with your projected growth? Are there tier cliffs where costs jump dramatically? What is the pricing history — does this vendor raise prices aggressively?

**Vendor viability** — Is the company profitable or well-funded? How large is the customer base? Is it a single-product company (higher risk) or a diversified platform (lower risk)? What is the bus factor — is the product tied to a single founder or small team?

**Data portability** — Can you export all your data in standard formats? Are there contractual guarantees for data portability? How long would a migration take? What is the documented exit process?

**Compliance and security** — Does the vendor hold relevant certifications (SOC 2, HIPAA, ISO 27001, PCI-DSS)? Where is data stored geographically? What is their incident response track record? Do they support your data residency requirements?

### Step 4: Integration Architecture

Regardless of what you buy, the integration design determines whether you can switch later. Follow these principles:

**Use the Adapter Pattern (Ports and Adapters).** Never let vendor-specific types leak into your domain layer. Define your own interface (port) for the capability and implement it using the vendor's SDK (adapter). If you later switch vendors, you replace the adapter, not the domain code.

```
// Port (your interface)
interface PaymentGateway {
  charge(amount: Money, method: PaymentMethod): Promise<PaymentResult>
  refund(paymentId: string, amount: Money): Promise<RefundResult>
}

// Adapter (vendor implementation)
class StripePaymentGateway implements PaymentGateway {
  charge(amount: Money, method: PaymentMethod): Promise<PaymentResult> {
    // Stripe-specific implementation
  }
}

// Your domain code depends only on PaymentGateway, never on Stripe directly
```

**Store canonical data in your own database.** Even when using a SaaS for a capability, maintain a local copy of critical data in your own schema. If you use Auth0 for authentication, still store user profiles in your database. If you use Stripe for payments, still record transactions in your ledger. This makes vendor migration tractable and gives you query flexibility the vendor may not offer.

**Use webhooks over polling.** Webhook-based integration creates clear event boundaries between your system and the vendor. These events become your integration contract — if you switch vendors, you just need the new vendor to emit equivalent events.

**Wrap vendor UIs in your own components.** If you embed vendor-provided UI elements (Stripe Elements, Auth0 Lock), wrap them in your own components. This localizes the blast radius of a vendor swap to the wrapper, not every page that uses the component.

### Step 5: Vendor Risk Assessment and Lock-In Mitigation

**Architectural mitigation:**
- Modular architecture with clear boundaries between vendor-dependent and vendor-independent code.
- Use open standards (OAuth 2.0, OpenID Connect, SMTP, S3-compatible APIs) wherever possible, so you can swap implementations without changing contracts.
- Avoid proprietary query languages, data formats, or protocols when open alternatives exist.
- Design for data portability from day one — never store critical data exclusively in a vendor's system without a synchronization or export mechanism.

**Contractual mitigation:**
- Negotiate annual renewal options over multi-year commitments to maintain flexibility.
- Include explicit data portability and exit clauses in contracts.
- Define SLAs with financial penalties for downtime or data availability failures.
- Require advance notice of pricing changes (12+ months) and cap annual price increases contractually.

**Operational mitigation:**
- Maintain a documented exit plan for every critical vendor dependency, including estimated migration timeline and resource requirements.
- Run periodic "fire drills" — can you actually export your data and import it into an alternative? Theory is not enough; test it.
- Monitor vendor health signals: employee reviews on Glassdoor, funding news, customer sentiment, product roadmap activity.
- Avoid concentrating too many capabilities with a single vendor (the "all-in-on-AWS" trap).

---

## Trade-Offs Matrix

### Build vs Buy — Detailed Comparison

| Dimension | Build | Buy |
|---|---|---|
| **Time to market** | Months to years. Even a v1.0 of a well-functioning platform takes 6-12 months. | Days to weeks. SaaS setup is typically hours; integration takes days to weeks. |
| **Upfront cost** | High. Developer salaries, infrastructure setup, design, testing. | Low to moderate. Subscription fees, integration development. |
| **Long-term cost** | Accelerating. Maintenance, security, upgrades, on-call, knowledge transfer. 78% of TCO accrues post-launch. | Predictable. Subscription fees with potential price increases. |
| **Customization** | Unlimited. You control every aspect of the implementation. | Limited to vendor extension points. APIs, webhooks, plugins, configuration. |
| **Control** | Full. You own the code, the data, the roadmap. | Partial. You are dependent on vendor roadmap, pricing decisions, and API stability. |
| **Security responsibility** | Yours entirely. You handle patching, auditing, penetration testing, incident response. | Shared. Vendor handles infrastructure security; you handle integration security. |
| **Scalability** | Your problem. You architect, provision, and operate the scaling infrastructure. | Vendor's problem (mostly). Enterprise SaaS is designed to scale; you handle integration scaling. |
| **Vendor lock-in risk** | None. | Moderate to high, depending on integration architecture and data portability. |
| **Maintenance burden** | Permanent and growing. Bug fixes, dependency updates, framework migrations, OS patches. | Minimal. Vendor handles maintenance; you maintain integration code only. |
| **Opportunity cost** | Very high. Every engineer building commodity capabilities is not building core product. | Low. Engineers focus on differentiating features. |
| **Team expertise required** | Deep domain expertise needed. Auth requires security expertise; payments require fintech expertise. | Integration expertise only. API consumption, webhook handling, error mapping. |
| **Reliability track record** | Unproven. Your custom solution has zero production hours on day one. | Proven. Major SaaS products serve thousands of customers and have battle-tested reliability. |

### The Hybrid Row — Often the Right Answer

| Dimension | Hybrid (Buy + Extend) |
|---|---|
| **Time to market** | Weeks to low months. Buy the foundation, build the differentiation layer. |
| **Cost profile** | Moderate and predictable. Subscription + targeted custom development. |
| **Customization** | Targeted. Customize the 10-20% that matters; accept defaults for the rest. |
| **Lock-in risk** | Manageable. Adapter pattern isolates vendor dependency; data stays in your systems. |
| **Maintenance burden** | Low. Vendor maintains the platform; you maintain integration and extension code. |

---

## Evolution Path

### Stage 1: Default to Buy (Seed to Series A)

At this stage, every engineering hour is precious. Buy everything that is not your core product. Auth? Clerk or Auth0. Payments? Stripe. Email? SendGrid. Search? Algolia. Monitoring? Datadog or a simple logging stack. CMS? Contentful or Sanity. The goal is to ship your core product as fast as possible and validate product-market fit. Building commodity infrastructure at this stage is one of the most common startup killers.

**Anti-pattern to avoid:** "We'll build our own because SaaS costs will be too high at scale." You do not have scale. You may never have scale. Optimize for survival and learning speed, not hypothetical future costs.

### Stage 2: Selective In-Housing (Series B to Series C)

Once you have product-market fit and meaningful scale, some bought capabilities may warrant bringing in-house. Criteria for in-housing:

- The vendor's pricing has become a material percentage of COGS (>5% of revenue).
- The capability has become a competitive differentiator that the vendor's product constrains.
- Your team has grown enough to absorb the maintenance burden without impacting core product velocity.
- You have identified specific limitations in the vendor solution that are demonstrably costing you revenue or growth.

Even at this stage, most capabilities should remain bought. Typically only 1-2 capabilities merit in-housing, not a wholesale "bring everything in-house" initiative.

### Stage 3: Strategic Platform Ownership (Growth / Enterprise)

At significant scale, some companies build internal platforms for capabilities that are strategically important. Amazon built its own deployment infrastructure (which became AWS). Netflix built its own CDN (Open Connect). These decisions were justified by extreme scale (hundreds of millions of users) and strategic importance (infrastructure became a competitive moat or revenue stream).

Most companies never reach this stage, and those that do still buy extensively for non-core capabilities. Amazon uses third-party vendors for plenty of internal tooling. Netflix uses third-party solutions for many back-office functions.

### The Re-evaluation Cadence

Every 18-24 months, review your build vs buy decisions:

- Has the vendor landscape changed? New entrants may solve problems your custom code addresses.
- Has your custom solution accumulated technical debt that a vendor migration would eliminate?
- Has a previously commodity capability become a competitive differentiator (or vice versa)?
- Has your scale changed enough to shift the cost calculus?

---

## Failure Modes

### NIH Syndrome (Not Invented Here)

**What it is:** A cultural bias toward building everything in-house, rejecting external solutions regardless of their merit. Engineers want to build because building is more interesting than integrating. Managers want to build because it feels like "owning" the solution. Neither is a valid business justification.

**How it manifests:**
- "We can build a better version." (You almost certainly cannot, for commodity capabilities.)
- "We don't want to depend on a third party." (You already depend on your cloud provider, your programming language, your operating system, and dozens of open-source libraries.)
- "It'll be a good learning experience for the team." (Learning experiences should not be funded by the business as production infrastructure.)
- "We tried [vendor] and it didn't work." (Did you try configuring it correctly? Did you contact support? Did you try the three other vendors?)

**Real-world consequences:** MIT Sloan Management Review research documents how NIH syndrome kills innovation across industries. In software, it manifests as startups spending their first 6 months building custom auth, custom email, custom admin panels, and custom deployment pipelines — and shipping zero product features. A logistics startup built its own web framework instead of adopting Django or Rails, burning months on a solved problem while competitors shipped.

**How to counter it:**
- Require a formal "buy analysis" before any build decision. The team must evaluate at least 3 external options and document why each was rejected.
- Track the ratio of time spent on core vs context development. If more than 30% of engineering time goes to context work, something is wrong.
- Celebrate smart buying decisions as loudly as building achievements.

### Vendor Over-Reliance (The Other Extreme)

**What it is:** Outsourcing so aggressively that you lose the ability to operate independently. Your entire stack is SaaS — your auth, your database, your search, your analytics, your email, your payments — all from different vendors, with no local data copies and no exit plans.

**How it manifests:**
- A single vendor outage takes down your entire product.
- A vendor price increase of 3x forces an emergency migration with no prepared alternative.
- A vendor sunset announcement leaves you scrambling with 12 months to replace a deeply integrated dependency.
- You cannot answer basic questions about your own users, transactions, or content without querying vendor APIs.

**How to counter it:**
- Maintain canonical data in your own database for every critical entity.
- Document exit plans for every Tier 1 vendor dependency.
- Never let a single vendor control more than 2 critical capabilities.
- Test data export and migration procedures annually.

### Underestimating Maintenance Cost

**What it is:** Approving a build decision based on initial development estimates without accounting for the years of maintenance that follow. The build is funded, the feature ships, the team celebrates — and then the slow drain begins.

**How it manifests:**
- "We built it in 3 months" becomes "we've had 2 engineers maintaining it for 3 years."
- Security vulnerabilities in the custom solution are discovered months after they would have been patched by a vendor.
- The original developers leave the company. Knowledge transfer is incomplete. The remaining team is afraid to modify the code.
- Dependency upgrades (Node.js major versions, framework migrations, OS updates) require dedicated sprints that compete with product development.

**The numbers:** Forrester found that 78% of lifetime software TCO accrues after initial development. A $200K build project with a 5-year lifespan has a true cost closer to $900K when maintenance, security, and opportunity cost are included.

### The "We'll Open-Source It" Trap

**What it is:** Justifying a build decision by claiming the result will be open-sourced, attracting community contributions that reduce maintenance burden. In reality, successful open-source projects require dedicated investment in documentation, community management, contributor onboarding, and governance — often as much effort as the software itself.

**Reality check:** The vast majority of corporate open-source projects receive zero external contributions. Open-sourcing code does not create a community. It creates a GitHub repository that the original team still maintains entirely.

### Sunk Cost Continuation

**What it is:** Continuing to invest in a custom solution because of the resources already spent, even when a vendor solution would be cheaper going forward. "We've already spent 18 months building this — we can't throw it away."

**The correction:** The 18 months are gone regardless. The only question is: what is the cheapest path forward from today? If migrating to a vendor costs 2 months but saves 1 engineer-year annually in maintenance, the migration pays for itself in 2 months. The sunk cost is irrelevant.

---

## Technology Landscape — Common Build vs Buy Decisions

### Authentication and Identity

| Option | Type | Integration Time | Annual Cost (10K users) | Key Strength |
|---|---|---|---|---|
| Auth0 | SaaS | Hours-Days | ~$1,000-3,000 | Enterprise features, extensive identity provider support |
| Clerk | SaaS | Minutes-Hours | ~$200-500 | Developer experience, pre-built UI components, fastest integration |
| Firebase Auth | SaaS | Hours | Free-$300 | Google ecosystem integration, generous free tier |
| Keycloak | Open-source | Days-Weeks | $0 + ops cost | Full control, self-hosted, enterprise SSO |
| SuperTokens | Open-source | Hours-Days | Free-$500 | Self-hosted option with managed offering |
| Custom build | Build | 2-4 months | $250K+ (engineering) | Full control (rarely justified) |

**Recommendation:** Buy. Authentication is the most commonly over-built capability. Unless you are building an identity product (like Auth0 itself), there is no competitive advantage in custom auth. The security risk of custom auth alone should disqualify it for most teams.

### Payments

| Option | Type | Integration Time | Pricing Model | Key Strength |
|---|---|---|---|---|
| Stripe | SaaS | Days | 2.9% + $0.30/txn | Developer experience, 125+ payment methods, global |
| Braintree | SaaS | Days-Weeks | 2.59% + $0.49/txn | PayPal integration, established enterprise presence |
| Adyen | SaaS | Weeks | Interchange++ | Enterprise-grade, unified commerce |
| Square | SaaS | Days | 2.6% + $0.10/txn | In-person + online unified |
| Custom PSP integration | Build | 6-18 months | Interchange + custom | Full control (justified only at extreme scale) |

**Recommendation:** Buy. Payment processing involves PCI-DSS compliance, fraud detection, dispute management, and regulatory compliance across jurisdictions. The engineering effort to build this is 6-18 months minimum and requires specialized fintech expertise. Only companies processing billions in annual volume should consider custom infrastructure.

### Email Delivery

| Option | Type | Volume (monthly) | Pricing | Key Strength |
|---|---|---|---|---|
| SendGrid | SaaS | Up to 100B+ | Free-$90/month (low vol) | Deliverability, analytics, templates |
| Postmark | SaaS | Up to millions | $15/month (10K emails) | Transactional email specialist, best deliverability |
| Amazon SES | SaaS/IaaS | Unlimited | $0.10/1K emails | Lowest cost at scale, AWS integration |
| Mailgun | SaaS | Up to millions | $35/month (50K emails) | Developer-focused, good API |
| Custom SMTP | Build | Unlimited | Infra + engineering | Full control (rarely justified) |

**Recommendation:** Buy. Email deliverability is a specialized discipline involving IP reputation management, ISP relationship management, bounce handling, and spam compliance. Building custom email infrastructure means months of work getting out of spam folders.

### Search

| Option | Type | Integration Time | Pricing | Key Strength |
|---|---|---|---|---|
| Algolia | SaaS | Hours-Days | Free-$1/1K requests | Speed (<50ms), typo tolerance, relevance tuning |
| Elasticsearch (Elastic Cloud) | Managed | Days-Weeks | $95+/month | Full-text search, aggregations, analytics |
| Typesense | Open-source | Hours-Days | Free + hosting | Simple, fast, open-source alternative to Algolia |
| Meilisearch | Open-source | Hours-Days | Free + hosting | Developer-friendly, easy setup |
| Custom search | Build | Months | Engineering cost | Full control (justified only for core search products) |

**Recommendation:** Buy unless search is your core product. Algolia provides sub-50ms search with typo tolerance, faceting, and analytics out of the box. Custom search requires building and maintaining inverted indices, relevance scoring, query parsing, and scaling infrastructure.

### Monitoring and Observability

| Option | Type | Integration Time | Pricing | Key Strength |
|---|---|---|---|---|
| Datadog | SaaS | Hours | $15-35/host/month | Unified platform, 700+ integrations |
| New Relic | SaaS | Hours | Free-$0.30/GB | Generous free tier, full-stack observability |
| Grafana Cloud | SaaS | Hours-Days | Free-usage based | Open-source foundation, flexible |
| Self-hosted (Prometheus + Grafana + Loki) | Open-source | Days-Weeks | $0 + ops cost | Full control, no data egress costs |
| Custom monitoring | Build | Months | Engineering cost | Full control (never justified) |

**Recommendation:** Buy or use managed open-source. Custom monitoring stacks require dedicated infrastructure engineering. Self-hosted Prometheus/Grafana is viable for cost-sensitive teams with infrastructure expertise, but Datadog or Grafana Cloud is almost always the better choice for teams without dedicated platform engineers.

---

## Decision Tree

Use this flowchart for any new capability:

```
START: You need a new capability

Q1: Is this your core competitive differentiator?
├─ YES → Q2: Can you hire/retain the expertise to build and maintain it?
│         ├─ YES → Q3: Is your timeline > 6 months?
│         │         ├─ YES → BUILD (with milestones and kill criteria)
│         │         └─ NO  → BUY now, plan to BUILD later if validated
│         └─ NO  → BUY and invest in hiring (do not build with insufficient expertise)
│
└─ NO (this is context) → Q4: Does a commercial/open-source solution exist?
                           ├─ YES → Q5: Does it cover ≥80% of requirements?
                           │         ├─ YES → BUY (adapt the 20% or accept the gap)
                           │         └─ NO  → Q6: Can you combine solutions to reach 80%?
                           │                   ├─ YES → BUY (hybrid integration)
                           │                   └─ NO  → BUILD (but reassess — is the
                           │                             requirement genuinely unique or
                           │                             over-specified?)
                           │
                           └─ NO  → Q7: Is this a common capability that should exist?
                                     ├─ YES → BUILD minimally, consider open-sourcing
                                     └─ NO  → BUILD (you may have found a genuine gap)
```

**Kill criteria for build decisions:** Before starting any build, define conditions under which you will abandon the custom implementation and switch to buying. Examples: "If we exceed 4 months of development," "If we cannot achieve 99.9% uptime in the first 3 months," "If maintenance consumes more than 20% of one engineer's time." Without kill criteria, build projects become zombie projects that consume resources indefinitely.

---

## Implementation Sketch — Structuring a Buy Decision

### Phase 1: Requirements and Market Scan (1-2 weeks)

```markdown
## Capability Assessment Template

### 1. Capability Definition
- What capability do we need?
- Is this core (competitive differentiator) or context (necessary but not differentiating)?
- What is the business impact of not having this capability?

### 2. Requirements (MoSCoW)
- Must Have: [list non-negotiable requirements]
- Should Have: [list important but flexible requirements]
- Could Have: [list nice-to-have requirements]
- Won't Have: [list explicitly excluded requirements]

### 3. Market Scan
- Commercial SaaS options evaluated: [minimum 3]
- Open-source options evaluated: [minimum 2]
- For each option:
  - Functional fit (% of Must Have covered)
  - Integration complexity (API quality, SDK availability)
  - Pricing at current and projected scale
  - Vendor viability assessment
  - Data portability and exit cost

### 4. TCO Comparison (3-year window)
- Build: [development + maintenance + opportunity cost]
- Buy (option A): [subscription + integration + migration risk]
- Buy (option B): [subscription + integration + migration risk]
- Hybrid: [subscription + custom extension development]

### 5. Recommendation
- Recommended approach: [Build / Buy / Hybrid]
- Primary justification: [1-2 sentences]
- Risk mitigation plan: [vendor exit plan or build kill criteria]
- Timeline and resource requirements: [estimate]
```

### Phase 2: Proof of Concept (1-2 weeks)

For buy decisions, run a PoC with the top 1-2 vendors:

```typescript
// Example: Evaluating a payment provider
// Goal: Validate integration complexity, API ergonomics, and feature coverage

// 1. Set up sandbox/test environment
// 2. Implement core flows: charge, refund, webhook handling
// 3. Measure: integration time, documentation quality, error handling
// 4. Test edge cases: failed payments, partial refunds, currency conversion
// 5. Evaluate: dashboard quality, reporting capabilities, support responsiveness

// Integration architecture using adapter pattern:
interface PaymentPort {
  createCharge(request: ChargeRequest): Promise<ChargeResult>;
  processRefund(chargeId: string, amount: Money): Promise<RefundResult>;
  handleWebhook(payload: unknown, signature: string): Promise<WebhookEvent>;
}

// Vendor-specific adapter (replaceable without touching domain code)
class StripeAdapter implements PaymentPort {
  constructor(private stripe: Stripe) {}

  async createCharge(request: ChargeRequest): Promise<ChargeResult> {
    const intent = await this.stripe.paymentIntents.create({
      amount: request.amount.cents,
      currency: request.amount.currency,
      payment_method: request.methodId,
      confirm: true,
    });
    return this.mapToChargeResult(intent);
  }

  async processRefund(chargeId: string, amount: Money): Promise<RefundResult> {
    const refund = await this.stripe.refunds.create({
      payment_intent: chargeId,
      amount: amount.cents,
    });
    return this.mapToRefundResult(refund);
  }

  async handleWebhook(payload: unknown, signature: string): Promise<WebhookEvent> {
    const event = this.stripe.webhooks.constructEvent(
      payload as string, signature, this.webhookSecret
    );
    return this.mapToWebhookEvent(event);
  }
}

// Domain code uses only PaymentPort — never Stripe types directly
class OrderService {
  constructor(private payments: PaymentPort) {}

  async checkout(order: Order): Promise<CheckoutResult> {
    const charge = await this.payments.createCharge({
      amount: order.total,
      methodId: order.paymentMethodId,
    });
    // Domain logic here — completely vendor-agnostic
  }
}
```

### Phase 3: Integration and Rollout (2-4 weeks)

For the selected vendor:

1. **Implement the adapter pattern** — Vendor-specific code lives exclusively in adapter classes. Domain code depends on your interfaces, never on vendor types.
2. **Set up data synchronization** — Critical entities (users, transactions, subscriptions) are mirrored to your own database via webhooks.
3. **Configure monitoring** — Track vendor API latency, error rates, and availability as first-class metrics in your observability stack.
4. **Document the exit plan** — Before going to production, write the migration runbook for switching to an alternative vendor.
5. **Gradual rollout** — Use feature flags to roll out the vendor integration to a subset of users first. Monitor for integration issues before full rollout.

---

## Anti-Patterns Checklist

Use this checklist in architecture reviews to catch common build vs buy mistakes:

- [ ] **Resume-driven development** — Is the team building this because it is technically interesting rather than business-justified?
- [ ] **NIH syndrome** — Has the team evaluated at least 3 external solutions before proposing to build?
- [ ] **Premature optimization** — Is the team building for hypothetical future scale rather than current reality?
- [ ] **Missing TCO analysis** — Does the build proposal include maintenance cost estimates for years 2-5?
- [ ] **Missing opportunity cost** — Does the analysis account for what the team will not build while building this?
- [ ] **Single-vendor evaluation** — Did the team try one vendor, find it lacking, and conclude "we need to build"?
- [ ] **Over-specified requirements** — Are requirements genuinely non-negotiable, or could they be relaxed to enable a buy solution?
- [ ] **No kill criteria** — If building, are there defined conditions under which the team will stop and switch to buying?
- [ ] **No exit plan** — If buying, is there a documented plan for migrating away from the vendor?
- [ ] **Sunk cost fallacy** — Is the team continuing a build because of past investment rather than future value?

---

## Key Takeaways

1. **Default to buy for context, build for core.** If a capability is not your competitive differentiator, you should almost certainly buy it.

2. **The real cost of building is 5-10x the initial estimate.** 78% of TCO accrues post-launch. Factor in maintenance, security, on-call, and opportunity cost.

3. **"We need customization" is usually wrong.** Most SaaS covers 90% of requirements. Building from scratch for the remaining 10% is rarely rational.

4. **Use the adapter pattern for all vendor integrations.** Vendor-specific code in adapter classes, domain code depends on your interfaces. This makes vendor swaps tractable.

5. **Store canonical data in your own database.** Never let a vendor be the sole owner of your critical data. Mirror it locally via webhooks.

6. **Define kill criteria before building and exit plans before buying.** Without these, build projects become zombies and vendor dependencies become traps.

7. **Revisit decisions every 18-24 months.** The vendor landscape evolves. Yesterday's build-only capability may be today's commodity SaaS.

8. **Opportunity cost is the largest hidden cost.** Every month spent building commodity infrastructure is a month not spent on your core product.

---

## Cross-References

- **[Technology Selection](../foundations/architectural-thinking.md)** — Broader framework for evaluating technology choices beyond build vs buy.
- **[Architecture Decision Records](../foundations/architectural-thinking.md)** — Document build vs buy decisions as ADRs for future reference and institutional learning.
- **[Third-Party Integration](../integration/api-design-rest.md)** — API design patterns for integrating with vendor services.
- **[Hexagonal / Clean Architecture](../patterns/hexagonal-clean-architecture.md)** — The adapter pattern that enables vendor-agnostic integration architecture.
- **[Domain-Driven Design](../foundations/domain-driven-design.md)** — Core vs context aligns with DDD's bounded context concept; vendor integrations belong in anti-corruption layers.
