# Design Systems -- Expertise Module

> A design systems specialist architects, builds, documents, and governs shared libraries of reusable components, design tokens, patterns, and guidelines that unify product development across teams, platforms, and codebases. The scope spans component API design, token architecture, documentation infrastructure, contribution workflows, versioning strategy, adoption measurement, and the design-to-code pipeline that keeps design and engineering in continuous parity.

---

## 1. What This Discipline Covers

### Scope

A design system is the single source of truth for how a product family looks, feels, and behaves. It is not a style guide (static documentation), not a component library (code only), and not a UI kit (design files only). A mature design system encompasses all three plus governance, tooling, and culture.

**Core concerns:**
- Visual language: color, typography, spacing, elevation, motion, iconography
- Design tokens: platform-agnostic representation of design decisions
- Component library: reusable UI building blocks in both design tools and code
- Pattern library: recurring solutions to common UX problems (forms, navigation, empty states)
- Documentation: usage guidelines, do/don't examples, accessibility notes, code samples
- Governance: contribution model, review process, versioning, deprecation, quality gates
- Adoption: rollout strategy, metrics, training, internal advocacy

**What a design system is NOT:**
- A one-time deliverable. It is a living product requiring ongoing maintenance, staffing, and investment.
- A top-down mandate without buy-in. Systems imposed without practitioner input fail to gain adoption.
- A replacement for design thinking. Systems standardize execution; they do not replace problem-solving.

### Relationship to Other Disciplines

| Discipline | Relationship |
|---|---|
| Visual / UI Design | Codifies the visual language UI designers create. Designers contribute new patterns; the system enforces consistency. |
| UX Design | Patterns encode proven UX solutions. UX research informs which patterns exist and how they behave. |
| Interaction Design | Motion tokens, transition specs, and interactive component states bridge IxD decisions into the system. |
| Accessibility | Every component must meet WCAG 2.2 AA. The system embeds accessibility as a default, not an afterthought. |
| Frontend Engineering | The code component library is the primary consumer-facing artifact. Engineering owns implementation; design owns specification. |
| Brand Design | Brand tokens (color, typography, voice) flow into the system. The system operationalizes brand at scale. |
| Content Design | Writing guidelines, tone tokens, and content patterns are first-class system citizens. |

### When It Applies in the Design Process

- **Strategy phase**: Define design principles, audit existing UI for inconsistency, establish system scope
- **Exploration phase**: Designers use system primitives as building blocks; new patterns are prototyped outside the system first
- **Specification phase**: New components are proposed, reviewed, and formalized through the contribution model
- **Build phase**: Engineers implement against system specs; tokens flow into code via the build pipeline
- **QA phase**: Visual regression tests, accessibility audits, and component parity checks validate system compliance
- **Maintenance phase**: Deprecation cycles, version bumps, and adoption metrics drive continuous improvement

---

## 2. Core Methods & Frameworks

### Atomic Design

Brad Frost's Atomic Design provides the foundational mental model for structuring a component hierarchy, borrowing from chemistry to describe five levels of UI composition.

**Level 1 -- Atoms:** Smallest indivisible UI elements (button, input, label, icon, avatar, badge). Single responsibility, highly reusable, minimal props, well-defined states.

**Level 2 -- Molecules:** Simple groups of atoms functioning as a unit (search field = input + button + icon, form field = label + input + helper text + error). Rule of thumb: 2-4 atoms combined into one conceptual unit.

**Level 3 -- Organisms:** Complex interface sections composed of molecules and atoms (navigation header, data table, product card). Organisms carry domain-specific semantics.

**Level 4 -- Templates:** Page-level layouts arranging organisms into content structure. Define grid usage, responsive breakpoints, and content hierarchy.

**Level 5 -- Pages:** Specific instances of templates with real content. Pages validate system components in context but are not part of the system itself.

**Subatomic layer -- Design Tokens:** Below atoms sit tokens: the named values (color, spacing, typography, motion) that atoms consume. Tokens are essential ingredients but not functional on their own until applied to an atom.

### Design Tokens

Design tokens are the platform-agnostic representation of design decisions -- the contract between design and engineering.

**Token taxonomy (three-tier model, as used by Material Design 3 and Ant Design):**

```
Reference Tokens (Global)         Semantic Tokens (System)           Component Tokens
-------------------------------   --------------------------------   ----------------------------
color.blue.500: #2563EB           color.primary: {color.blue.500}    button.primary.bg: {color.primary}
color.neutral.900: #111827        color.on-primary: {color.white}    button.primary.text: {color.on-primary}
font.size.300: 14px               font.body.size: {font.size.300}    input.label.size: {font.body.size}
spacing.400: 16px                 spacing.inline.md: {spacing.400}   card.padding: {spacing.inline.md}
```

- **Reference tokens** (global/primitive): Raw values with no semantic meaning. Name the value itself: `color.blue.500`, `spacing.200`.
- **Semantic tokens** (alias/system): Assign purpose to reference tokens. Name the intent: `color.primary`, `color.surface`. These are what designers and developers use day-to-day.
- **Component tokens**: Map semantic tokens to specific component properties: `button.primary.background`. Enable component-level theming without modifying global tokens.

**Why three tiers matter:** Changing a reference value cascades through the chain. Dark mode becomes a swap of semantic-to-reference mappings, not a parallel system. Material Design 3 demonstrates this: all component tokens point to semantic tokens rather than literals, so the entire UI updates automatically when the theme changes.

**Token categories:**

| Category | Examples | Notes |
|---|---|---|
| Color | Brand, semantic (success/warning/error/info), surface, text, border | Must include light/dark/high-contrast modes |
| Typography | Font family, size scale, weight, line height, letter spacing | Define type ramp as finite set (6-8 sizes) |
| Spacing | Inline (horizontal), stack (vertical), inset (padding), gutters | Consistent scale (4px or 8px base) |
| Sizing | Component heights (sm/md/lg), icon sizes, avatar sizes | Tied to density modes |
| Border radius | None, small, medium, large, full (pill) | Keep small (4-5 values) |
| Elevation | Shadow definitions per level, z-index scale | Map to semantic usage (card, dropdown, modal) |
| Motion | Duration scale, easing curves, transition properties | Reference MD3 motion or Apple HIG timing |

**W3C DTCG token format (emerging standard):**

```json
{
  "color": {
    "primary": {
      "$value": "#2563EB",
      "$type": "color",
      "$description": "Primary brand color for interactive elements"
    }
  }
}
```

### Component API Design

**Principles:**
1. **Sensible defaults**: A `<Button>` with just `children` should produce a valid, styled, accessible button
2. **Progressive disclosure**: Common use cases need few props; advanced customization is available but not required
3. **Consistent naming**: Same prop names across components for the same concept (`size` takes `sm | md | lg` everywhere)
4. **Composition over configuration**: Prefer slots/compound-components over monolithic prop-driven APIs
5. **Type safety**: Export TypeScript types for all props; use discriminated unions; never `any`

**Prop patterns:**

```typescript
type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps {
  variant?: ButtonVariant;   // default: 'primary'
  size?: ButtonSize;         // default: 'md'
  disabled?: boolean;
  loading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  children: ReactNode;
  onClick?: (event: MouseEvent) => void;
  asChild?: boolean;         // Radix-style composition escape hatch
}
```

**Composition patterns (preferred over excessive props):**

```tsx
// Compound component pattern (Radix-style)
<Dialog>
  <Dialog.Trigger asChild><Button>Open</Button></Dialog.Trigger>
  <Dialog.Content>
    <Dialog.Title>Confirm</Dialog.Title>
    <Dialog.Description>Are you sure?</Dialog.Description>
    <Dialog.Close asChild><Button variant="ghost">Cancel</Button></Dialog.Close>
  </Dialog.Content>
</Dialog>
```

**Slot-based architecture** is becoming the standard. Figma introduced slots at Schema 2025; Nathan Curtis advocates slots for flexibility. Slots provide named placeholders where consumers inject custom content while the component retains control of layout and styling.

**Headless primitives (Radix, React Aria, Headless UI):** Separate behavior (accessibility, keyboard, ARIA) from visual presentation. Build your system's visual layer on top of headless foundations for WAI-ARIA compliance by default.

### Documentation Patterns

**Per-component documentation structure (11 sections):**
1. Overview: what, when to use, when NOT to use
2. Anatomy: labeled diagram of component parts
3. Variants: visual catalog with descriptions
4. Props/API table: every prop, type, default, description
5. States: all interactive states (default, hover, focus, active, disabled, loading, error)
6. Accessibility: ARIA roles, keyboard interactions, screen reader behavior
7. Do/Don't examples: visual pairs with rationale
8. Content guidelines: writing rules for labels, placeholders, errors
9. Related components: links to similar/complementary components
10. Code examples: copy-pasteable implementations
11. Changelog: version history with breaking changes highlighted

### Versioning Strategy

**Semantic versioning (SemVer):**
- **MAJOR** (X.0.0): Breaking changes -- removed components, renamed props, altered token values
- **MINOR** (0.X.0): New components, new props, new tokens -- backward-compatible
- **PATCH** (0.0.X): Bug fixes, accessibility fixes, doc corrections -- no API changes

**Scope strategies:**
- **Library-level**: Single version for the entire system. Simpler. Used by Polaris, Carbon.
- **Component-level**: Each component versioned independently. More flexible at scale. Used by Atlassian.

**Deprecation protocol:** Mark deprecated in code (`@deprecated` JSDoc) and docs. Add console warnings. Maintain for at least 2 minor versions or 6 months. Remove in next major. Provide codemod scripts for migration (as Ant Design does).

### Contribution Model

**4-stage contribution workflow:**

| Stage | Activities |
|---|---|
| 1. Proposal | RFC/design proposal, problem statement, use case inventory, proposed API |
| 2. Design Review | Cross-team review panel, compatibility check, token compliance, accessibility review, naming consistency |
| 3. Build | Implementation in code + Figma, unit + a11y tests, visual regression, Storybook stories |
| 4. Release | Final system team review, documentation complete, changelog entry, version bump |

**Contribution tiers:** Bug fixes (low barrier, anyone submits). Enhancement to existing component (medium, requires design review). New component (high, requires RFC + cross-team review). Token/foundation changes (highest, requires system-wide impact analysis).

**Ambassador program:** Atlassian uses internal champions embedded in product teams as local experts. IBM Carbon uses dedicated adoption teams for pilot programs.

### Governance

**Structure:** System team (2-5 full-time, mix of design + engineering) + Review council (cross-functional, meets biweekly) + RACI matrix (system team Responsible, council Accountable, product teams Consulted).

**Quality gates for component acceptance:**
1. Pixel-level design-code parity
2. Accessibility audit passes (axe-core zero violations, keyboard test, screen reader test)
3. All interactive states implemented
4. Responsive behavior tested across breakpoints
5. RTL support verified (for i18n products)
6. Performance budget met (bundle size, render time)
7. Unit test coverage above 80%
8. Visual regression baselines established
9. Documentation complete (all 11 sections)
10. At least 3 real-world use cases validated

---

## 3. Deliverables

### Component Library

The coded implementation of all design system components, published as one or more packages.

**Characteristics of a production-quality library:**
- Published to a package registry (npm for web, CocoaPods/SPM for iOS, Maven for Android)
- Tree-shakeable -- consumers import only what they use
- TypeScript types shipped with the package (`.d.ts` files)
- All components meet WCAG 2.2 AA by default
- Supports theming via token override (CSS custom properties, theme provider, or equivalent)
- SSR-compatible (no client-only assumptions for web)
- Tested: unit tests, accessibility tests, visual regression tests

**Quality criteria:**
- Zero axe-core violations across all components
- Keyboard navigation works for every interactive component
- Bundle size monitored per component (budget enforced in CI)
- All props documented with TypeScript JSDoc comments
- Every component has at least 3 Storybook stories (default, variants, edge cases)

### Token System

The complete set of design tokens in source format, build pipeline, and platform-specific outputs.

**Deliverables:**
- Source tokens in JSON or YAML (W3C DTCG format where possible)
- Build pipeline (Style Dictionary, Cobalt UI, or custom) generating: CSS custom properties, Tailwind theme config, SCSS/LESS variables, Swift/Kotlin constants, JSON for design tool sync
- Token documentation with visual swatches, usage examples, and naming rationale

**Quality criteria:**
- Every token has a description field explaining its purpose
- No orphaned tokens (defined but never consumed)
- No hard-coded values in component code -- all values reference tokens
- Dark mode and high-contrast token sets complete and tested
- Token names follow consistent, predictable naming convention

### Documentation Site

A dedicated website serving as the canonical reference for the design system.

**Required sections:**
- Getting started guide (installation, setup, first component)
- Foundations (color, typography, spacing, grid, elevation, motion, iconography)
- Component pages (one per component, following the 11-section structure)
- Pattern pages (forms, navigation, empty states, loading, error handling)
- Design principles and philosophy
- Accessibility guidelines
- Contributing guide
- Changelog and migration guides
- Search functionality across all content
- Interactive code playgrounds or embedded Storybook stories

**Quality criteria:**
- All code examples tested and runnable
- Content reviewed by both design and engineering
- Search returns relevant results within 2 keystrokes
- The documentation site itself meets WCAG 2.2 AA

### Pattern Library

Reusable solutions to recurring UX problems, composed entirely from system components.

**Common patterns to document:**
- Form patterns: validation, inline errors, multi-step forms, conditional fields
- Navigation: sidebar, top nav, breadcrumbs, tabs, pagination
- Data display: tables, lists, cards, data visualization
- Feedback: toasts, alerts, modals, inline notifications, progress indicators
- Empty states: first use, no results, error state, offline state
- Loading: skeleton screens, spinners, progress bars, optimistic updates
- Authentication: sign-in, sign-up, password reset, MFA

**Quality criteria:** Each pattern includes problem statement, solution description, rationale, accessibility notes, responsive behavior, and is composed entirely from system components.

### Usage Guidelines

Prescriptive rules with do/don't examples covering: when-to-use/when-not-to-use per component, content guidelines (tone, terminology, casing), layout guidelines (grid, spacing, breakpoints), accessibility guidelines (testing checklist, common pitfalls), and platform-specific behavioral differences.

**Quality criteria:**
- Guidelines are prescriptive ("Use sentence case for button labels") not vague ("Be consistent")
- Do/Don't examples accompany every rule
- Content written in plain language accessible to non-specialists

---

## 4. Tools & Techniques

### Design Tools -- Figma

- **Component architecture**: Auto-layout on every component. Use component properties (boolean, text, instance swap, variant) to reduce variant explosion.
- **Variants**: Organize by property groups: `Type=Primary, Size=Medium, State=Default`.
- **Slots (2025+)**: Named placeholders for consumer content injection, matching code composition model.
- **Variables over styles**: Figma Variables support modes (light/dark), scoping, and aliasing -- mirroring the three-tier token model.
- **Library management**: Publish as shared library. Use branching for development. Track adoption via library analytics.

**Reference Figma kits:** Material Design 3 (Google), Apple Design Resources, Ant Design for Figma, Polaris for Figma, Carbon Design Kit, Atlassian DS Kit.

### Development Tools

**Storybook:** Standard for component development, testing, and documentation in isolation. Write 3+ stories per component (default, variants, edge cases). Use Controls addon, Accessibility addon (axe-core), Chromatic for visual regression, Docs addon for auto-generated documentation, Interaction testing via play functions.

**Design Token Tools:**

| Tool | Role |
|---|---|
| Style Dictionary (Amazon) | Token build pipeline; transforms source tokens into any platform format |
| Tokens Studio (Figma plugin) | Syncs tokens between Figma Variables and JSON in Git |
| Cobalt UI | W3C DTCG-compliant token pipeline; modern Style Dictionary alternative |
| Specify | Design data platform; syncs across Figma, GitHub, npm |

**Documentation Tools:**

| Tool | Best For |
|---|---|
| Zeroheight | Non-technical contributors, cross-department docs, Figma/Storybook embedding |
| Docusaurus (Meta) | Developer-centric systems, MDX, versioned docs |
| Storybook Docs | Tight coupling between component code and documentation |
| Custom (Next.js/Astro) | Full brand control (used by Polaris, Carbon) |

**Recommended stack:** Figma + Tokens Studio + Style Dictionary + Storybook + Chromatic + Zeroheight/Docusaurus.

### Testing Techniques

- **Visual regression**: Chromatic, Percy, or Playwright screenshot assertions. Baselines per component, per theme, per viewport.
- **Accessibility**: axe-core (Storybook addon + jest-axe + CI), manual keyboard audit, screen reader testing (VoiceOver, NVDA, JAWS). Block merges on violations.
- **Component unit testing**: Test behavior not implementation (Testing Library). Test all interactive states and prop combinations. Avoid fragile snapshot tests.
- **Token validation**: Lint naming consistency, verify contrast ratios between foreground/background pairs, confirm all references resolve.

---

## 5. Common Failures

### Premature Abstraction

**The problem:** Building components for imagined future use cases. Creating a "universal card" with 40 props instead of the 3 specific cards your product needs.

**How it manifests:**
- Components with excessive configuration props nobody uses
- Abstract naming that obscures purpose ("Container" instead of "ProductCard")
- Months of building before any product team can consume the system

**Prevention:** Follow the Rule of Three (do not abstract until 3 real-world instances). Start product-specific; extract shared abstractions later. Audit prop usage -- if <10% of instances use a prop, reconsider it. Prefer composition (slots) over configuration (props) for variation.

### No Governance

**The problem:** No clear process for who decides what enters the system, how quality is enforced, or how changes are communicated.

**How it manifests:**
- Inconsistent components (two slightly different button variants from different contributors)
- Breaking changes shipped without warning or migration path
- Stale documentation that no longer matches the code
- Product teams fork the system because they cannot get changes approved

**Prevention:** Contribution model with stages and SLAs. Review council with consuming-team representatives. Public changelog and migration guides. SLAs: proposals acknowledged within 3 business days, reviews within 10.

### Design-Dev Drift

**The problem:** Figma components and code components diverge over time. Neither is wrong -- they are just out of sync.

**How it manifests:**
- Figma shows 16px spacing; code uses 12px
- Design has a variant that does not exist in code (or vice versa)
- Token values in Figma do not match values in CSS
- Designers stop trusting the Figma library; engineers stop reading design specs

**Prevention:** Single-source tokens synced to both design and code via pipeline (Tokens Studio + Style Dictionary). Quarterly parity audits. Shared naming conventions. Co-ownership per component (design owner + engineering owner). Automated parity tools (Handoff.com, Interplay, UXPin Merge).

### Over-Engineering

**The problem:** Building infrastructure far exceeding actual needs. A 3-person startup does not need multi-platform, multi-theme, multi-brand token architecture with 500 tokens.

**How it manifests:**
- Months of setup before a single component is usable
- Token architecture with 5 tiers when 2 would suffice
- Custom build tooling when off-the-shelf tools work fine
- Excessive documentation requirements that slow contribution to a crawl

**Prevention:** Right-size to team size and product count (1 product = lightweight; 10+ = full infrastructure). Start with minimal viable system: core tokens + 5-10 most-used components + simple docs page. Use existing tools before building custom ones. Add complexity when pain is felt, not anticipated.

### No Adoption Strategy

**The problem:** A beautiful system that nobody uses. Product teams continue ad-hoc styles; new engineers do not know the system exists.

**How it manifests:**
- Usage metrics flat or declining
- Product teams cite "it does not have what I need" or "it is too hard to use"
- New hires build features without knowing the system exists

**Prevention:** Co-create initial components with pilot teams. Make adoption frictionless (starter templates, CLI scaffolding, excellent getting-started docs). Measure quantitatively (system imports vs. ad-hoc code, Figma library analytics). Training program: onboarding workshops, office hours, ambassador network. Address component gaps quickly -- if teams consistently need what the system lacks, that is a prioritization problem.

### Inconsistent Component Quality

Some components are production-ready; others are half-finished. Consumers cannot tell which is which. **Prevention:** Maturity levels (Alpha/Beta/Stable) with visible badges. Block promotion to Stable until all quality gates pass. Maintain public roadmap of component status.

---

## 6. Integration with Development

### Design-to-Code Pipeline

```
Figma Variables          Tokens Studio          Git Repository
(design source)    -->   (sync plugin)    -->   (tokens/*.json)
                                                      |
                                                      v
                                               Style Dictionary
                                               (build pipeline)
                                                      |
                              +----------------+------+------+----------------+
                              v                v             v                v
                         css/tokens.css   tailwind/      ios/Tokens.     android/
                         (CSS vars)       theme.js       swift           tokens.xml
```

**Steps:** Design (define tokens in Figma) --> Sync (Tokens Studio pushes PR) --> Transform (Style Dictionary generates outputs) --> Validate (CI lints tokens, runs tests) --> Publish (merge releases package) --> Consume (product teams update dependency).

### Design Tokens in CSS and Tailwind

**CSS Custom Properties:**

```css
:root {
  --color-primary: #2563eb;
  --color-surface: #f8fafc;
  --spacing-md: 16px;
  --font-size-base: 1rem;
}
[data-theme="dark"] {
  --color-primary: #60a5fa;
  --color-surface: #0f172a;
}
```

**Tailwind v4 (CSS-first):**

```css
@theme {
  --color-primary: #2563eb;
  --spacing-md: 16px;
  --font-sans: 'Inter', system-ui, sans-serif;
}
```

**Tailwind v3 (config-based):** Style Dictionary generates `tailwind.config.js` values referencing CSS custom properties. Tokens Studio provides `@tokens-studio/sd-tailwindv4` for direct Figma-to-Tailwind v4 pipeline.

### Component Parity

Parity means every Figma component has a corresponding code implementation with matching variants, states, and behavior.

**Parity dimensions:** Component inventory, variant coverage, prop-to-property mapping, state coverage, token usage, responsive behavior, accessibility, naming.

**Audit process:** Export inventories from Figma and code, compare, flag discrepancies, prioritize fixes (missing components > missing variants > naming mismatches). Track parity percentage as health metric (target: 95%+ for Stable components).

### Handoff Considerations

**What the system handles (no handoff needed):** Token values, component behavior/states, accessibility, responsive behavior.

**What still requires handoff:** Layout composition, content, business logic, animation choreography, edge cases (long text, missing data, extreme viewports).

**Best practices:** Reference system component names in annotations. Annotate only deviations from system defaults. Link to Storybook stories. Use Figma Dev Mode. Treat handoff as conversation, not throw-over-the-wall.

---

## 7. Reference Systems

**Material Design 3 (Google)** -- Three-tier token architecture (reference/system/component), the gold standard. Dynamic color via HCT color space. Cross-platform (web, Android, Flutter). Learn from: token naming, color system architecture, component anatomy. Reference: m3.material.io

**Apple HIG** -- Platform-native philosophy. 2025 Liquid Glass design language (translucency, depth, fluid responsiveness). Strengths: interaction patterns, spatial computing (visionOS), motion/haptics. Learn from: platform-adaptive patterns, shared anatomy across platforms. Reference: developer.apple.com/design/human-interface-guidelines

**Ant Design (Alibaba)** -- Three-tier tokens (Seed/Map/Alias) with algorithmic derivation: seed tokens auto-generate map tokens. Theme composition via CSS-in-JS ConfigProvider (dark + compact = dark compact). 50+ enterprise components. Learn from: algorithmic token derivation, theme composition. Reference: ant.design

**Shopify Polaris** -- Exemplary governance: open-source with structured contribution workflow. Outstanding documentation with problem/solution framing and content guidelines per component. Learn from: contribution model, doc structure, content integration. Reference: polaris.shopify.com

**Atlassian Design System** -- Supports 20+ products. Component-level versioning. Ambassador program for adoption. Learn from: multi-product governance, ambassador model, versioning at scale. Reference: atlassian.design

**IBM Carbon** -- Fully open-source. Four built-in themes. Dedicated adoption teams for pilot programs. Learn from: adoption team model, theme architecture, enterprise patterns. Reference: carbondesignsystem.com

**Radix (WorkOS)** -- Headless primitives: unstyled, accessible, composable. Compound components with `asChild` prop. Powers shadcn/ui. Learn from: headless architecture, composition over configuration, accessibility implementation. Reference: radix-ui.com

---

## 8. Adoption Metrics & Success Measurement

A design system is a product. Like any product, it needs metrics to demonstrate value and guide investment.

### Quantitative Metrics

| Metric | How to Measure | Target |
|---|---|---|
| Component coverage | % of UI built with system components vs. ad-hoc code | 80%+ for mature products |
| Figma detach rate | % of component instances detached from the library | < 5% |
| Token compliance | % of values in code that reference tokens vs. hard-coded | 95%+ |
| Accessibility violations | axe-core violations across all system components | 0 critical, 0 serious |
| Bundle size per component | KB (gzipped) for each component | Track trend, set budgets |
| Time to first component | Minutes for new developer to install and render first component | < 15 minutes |
| Contribution rate | PRs from non-system-team members per quarter | Growing quarter-over-quarter |
| Documentation coverage | % of components with complete documentation (all 11 sections) | 100% for Stable components |

### Qualitative Metrics

- **Developer satisfaction survey** (quarterly): NPS-style score for usability, docs quality, support
- **Designer satisfaction survey** (quarterly): ease of Figma library use, component completeness
- **Support ticket themes**: categorize recurring questions to identify gaps
- **Time-to-market impact**: compare delivery speed for teams using vs. not using the system

### Business Impact

- Reduction in design QA defects (fewer "does not match design" issues)
- Faster onboarding (days to first contribution)
- Consistent brand expression (brand audit scores)
- Reduced duplicate code across repositories
- Research from Figma: designers with a design system complete tasks 34% faster -- equivalent to adding 3.5 designers to a team of seven

---

## 9. Quick Reference Checklist

### Foundation
- [ ] Design principles documented and referenced in component decisions
- [ ] Token architecture defined (minimum: reference + semantic tiers)
- [ ] Token categories complete: color, typography, spacing, sizing, radius, elevation, motion
- [ ] Light/dark mode token sets defined and tested
- [ ] Spacing scale uses consistent base unit (4px or 8px)
- [ ] Typography scale: finite set of sizes (6-8 levels)
- [ ] Color contrast ratios verified (WCAG 2.2 AA: 4.5:1 text, 3:1 UI)

### Component Library
- [ ] Core components: Button, Input, Select, Checkbox, Radio, Toggle, TextArea
- [ ] Layout: Stack, Grid, Container, Divider
- [ ] Feedback: Alert, Toast, Dialog/Modal, Tooltip, Progress
- [ ] Navigation: Link, Tabs, Breadcrumb, Pagination, Menu
- [ ] Data: Card, Badge, Avatar, Table, List, Tag
- [ ] All components use tokens (no hard-coded values)
- [ ] All components meet WCAG 2.2 AA
- [ ] TypeScript types exported; all states handled (hover, focus, active, disabled)
- [ ] Tree-shakeable and SSR-compatible

### Documentation
- [ ] Getting-started guide tested with fresh project
- [ ] Every component has all 11 documentation sections
- [ ] Foundations pages for each token category
- [ ] Pattern library: forms, navigation, empty states, loading, errors
- [ ] Changelog maintained with every release
- [ ] Search works across all content
- [ ] Documentation site itself meets WCAG 2.2 AA

### Process & Governance
- [ ] Contribution model with clear stages and templates
- [ ] Review SLAs defined (acknowledgment, review, decision)
- [ ] SemVer versioning documented
- [ ] Deprecation policy: minimum support window before removal
- [ ] Quality gates enforced (accessibility, testing, documentation)
- [ ] Component maturity labels (Alpha/Beta/Stable)

### Design-Dev Integration
- [ ] Token pipeline automated: source generates platform outputs without manual steps
- [ ] Figma library and code share same token source
- [ ] Component parity tracked (target: 95%+)
- [ ] Storybook stories for every code component
- [ ] Visual regression tests on every PR
- [ ] Accessibility tests in CI (zero violations policy)

### Adoption & Health
- [ ] Adoption metrics tracked (system imports vs. ad-hoc, Figma detach rate)
- [ ] 2+ product teams actively using the system
- [ ] Onboarding training for new team members
- [ ] Feedback channel (Slack, GitHub Discussions, office hours)
- [ ] System team capacity sufficient (minimum 2 for active maintenance)
- [ ] Quarterly parity audit scheduled

---

*Apply proportionally: a startup with one product needs a lightweight system; an enterprise with 20 products needs full governance. Start small, validate with real usage, grow in response to demonstrated need -- never in anticipation of imagined need.*
