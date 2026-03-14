# User Research — Expertise Module

> User research is the systematic study of users — their needs, behaviors, motivations, and contexts — through observation, feedback, and measurement. It provides the empirical foundation for design decisions, replacing assumptions with evidence. The scope spans generative research (discovering opportunities), evaluative research (validating solutions), qualitative methods (understanding why), and quantitative methods (measuring how much). A skilled user researcher selects the right method for each question, manages bias rigorously, and translates raw findings into actionable insights that shape product strategy, interaction design, and development priorities.

---

## 1. What This Discipline Covers

### Definition and Scope

User research is the practice of understanding the people who use (or will use) a product through direct and indirect methods of inquiry. It sits at the intersection of design, product management, and engineering, informing all three with empirical human data.

The discipline encompasses:

- **Generative (discovery) research** — conducted before or early in design to uncover unmet needs, mental models, workflows, and opportunity spaces. The goal is to learn what to build.
- **Evaluative research** — conducted during and after design to assess whether a solution meets user needs effectively. The goal is to learn whether what was built works.
- **Continuous research** — ongoing, lightweight research embedded into product development cadences to maintain a current understanding of users as the product and market evolve.

### The NNG Research Landscape

Nielsen Norman Group frames user research along three dimensions that determine which method to choose:

**Dimension 1 — Attitudinal vs. Behavioral**
- Attitudinal: what people *say* — their beliefs, preferences, stated needs, self-reported satisfaction
- Behavioral: what people *do* — observed actions, task completion, click paths, error rates
- The gap between the two is one of the most important findings in research; people routinely overstate their competence and mispredict their own behavior

**Dimension 2 — Qualitative vs. Quantitative**
- Qualitative: direct observation or listening, generating rich descriptive data; answers *why* and *how to fix*
- Quantitative: indirect measurement through instruments (surveys, analytics, A/B tests); answers *how many* and *how much*

**Dimension 3 — Context of Use**
- Natural: studying users in their real environment (field studies, diary studies, analytics)
- Scripted: giving users specific tasks to perform (usability testing, benchmarking)
- Decontextualized: removing context entirely (surveys, card sorting, interviews)
- Hybrid: combining approaches (contextual inquiry blends observation and interview)

### The IDEO Human-Centered Design Philosophy

IDEO's Field Guide to Human-Centered Design structures research within three phases:

1. **Inspiration** — immerse yourself in the lives of the people you are designing for through empathy-driven research methods
2. **Ideation** — synthesize findings into frameworks (personas, journey maps, "How Might We" questions) and generate solutions
3. **Implementation** — prototype, test, and iterate with real users

IDEO's core principle: start with people, end with solutions tailor-made for their needs. Research is not a phase that ends — it is a continuous practice that bookends every design decision.

### Steve Krug's Pragmatic Research Philosophy

Steve Krug ("Don't Make Me Think," "Rocket Surgery Made Easy") champions accessible, frequent, low-overhead research with these principles:

- **Testing one user is 100% better than testing none** — the first participant reveals more than any amount of internal debate
- **Test early and test often** — one morning a month, three participants, is enough to surface the most critical issues
- **Finding the "right" target-market users is less important than you think** — most usability problems are universal enough that almost any user will reveal them
- **The goal is to identify problems, not document them** — keep reports short, fix issues fast, test again
- **Involve stakeholders as observers** — watching real users struggle builds more conviction than any slide deck

---

## 2. Core Methods & Frameworks

### 2.1 User Interviews

**What it is:** One-on-one conversations with users or prospective users, typically 30-60 minutes, following a semi-structured discussion guide.

**When to use:**
- Discovery phase to understand goals, pain points, and workflows
- After quantitative signals suggest a problem but the cause is unclear
- When exploring a new market or user segment

**Lightweight version (30 min):**
- 5 participants, one user segment
- 5-7 open-ended questions, no discussion guide beyond a topic list
- Notes taken live, debrief same day

**Thorough version (60 min):**
- 12-20 participants across multiple segments (NNG recommends 5 per segment for thematic saturation, with Griffin & Hauser research showing 20-30 interviews uncover 90-95% of all customer needs)
- Formal discussion guide with warm-up, core topics, probing questions, and wrap-up
- Audio/video recorded, transcribed, affinity-mapped

**Key technique — the Five Whys:**
When a participant states a preference or behavior, ask "why" up to five times to reach the root motivation. Stop when you reach an emotional or identity-level driver.

**Anti-patterns to avoid:**
- Leading questions: "Don't you think the new design is cleaner?" (leads to yes)
- Double-barreled questions: "How do you feel about our pricing and customer support?" (two topics, one answer)
- Hypothetical questions: "Would you use this feature?" (stated intent does not predict behavior)

### 2.2 Surveys

**What it is:** Structured questionnaires distributed to a large sample, producing quantitative data and optional open-ended qualitative responses.

**When to use:**
- Measuring satisfaction, preference, or frequency across a large population
- Validating qualitative findings with statistical confidence
- Baseline measurement before a redesign (benchmarking)
- Tracking sentiment over time (NPS, CSAT, SUS)

**Lightweight version:**
- 5-10 questions, single-page form
- Distributed via in-app prompt or email to existing users
- 50-100 responses for directional findings

**Thorough version:**
- 20-30 questions with validated scales (System Usability Scale, SUPR-Q, AttrakDiff)
- Screener to ensure representative sample
- 200+ responses for statistical significance (margin of error under 7% at 95% confidence)
- Cross-tabulation by segment, regression analysis for drivers

**Question design principles:**
- Use closed-ended questions for measurement, open-ended for exploration
- Randomize option order to prevent position bias
- Include attention-check and foil questions to filter inattentive respondents (NNG recommends foils — fake but plausible options that catch dishonest or inattentive participants)
- Avoid absolute questions ("always/never") — use frequency scales instead
- Pre-test the survey with 3-5 people to catch ambiguity

### 2.3 Contextual Inquiry

**What it is:** A field research method that combines observation and interview in the user's real environment. The researcher watches the participant perform actual tasks, then asks questions in context to understand motivations and workarounds.

**When to use:**
- Understanding complex workflows (enterprise software, professional tools)
- Discovering environmental factors that affect usage (interruptions, physical setup, social dynamics)
- Early discovery when you need to learn the problem space before designing anything

**Lightweight version:**
- 3-5 participants, 60-90 minutes each
- Visit their workspace (or observe via screen-share for remote)
- Capture photos, sketches of environment, and key quotes

**Thorough version:**
- 8-12 participants across roles and environments
- Full-day or multi-day immersion
- Video recording, artifact collection (sticky notes, printouts, workaround documents)
- Interpretation sessions with the full team after each visit

**The four principles of contextual inquiry (Beyer & Holtzblatt):**
1. **Context** — go to the user's environment; do not rely on recalled behavior
2. **Partnership** — the user is the expert; the researcher is the apprentice
3. **Interpretation** — share your interpretation during the session to validate or correct it
4. **Focus** — enter with a clear research focus, but remain open to unexpected findings

### 2.4 Diary Studies

**What it is:** Participants self-report their experiences, behaviors, and emotions over an extended period (typically 1-4 weeks) through structured prompts sent at intervals or triggered by events.

**When to use:**
- Understanding behaviors that unfold over time (habit formation, onboarding journeys, seasonal patterns)
- Capturing in-the-moment experiences that would be distorted by retrospective recall
- When the behavior of interest is sporadic or unpredictable (e.g., error encounters, customer support contacts)
- Late in development or post-launch to monitor real-world experience over time

**Lightweight version:**
- 5-8 participants, 1 week
- Daily prompts via messaging app (Slack, WhatsApp) or simple form
- 3-5 questions per entry: what happened, how they felt, what they did

**Thorough version:**
- 15-25 participants, 2-4 weeks
- Structured diary app (dscout, Indeemo) with photo/video capture
- Entry prompts tied to specific events (signal-contingent) or fixed intervals (interval-contingent)
- Compensation structure that rewards consistent participation
- Thematic analysis of entries, longitudinal pattern identification

**Key advantage over interviews:** Diary studies capture behavior and context in real time, eliminating the recall bias that plagues retrospective interviews. NNG specifically recommends them as a complement to contextual inquiry — diary studies are remote and asynchronous, giving access to geographically distributed users at lower cost.

### 2.5 Personas

**What it is:** Archetypal user profiles synthesized from research data, representing distinct segments of the user population with different goals, behaviors, and contexts.

**When to use:**
- Aligning a team around shared understanding of who they are designing for
- Prioritizing features by tying them to the needs of specific persona segments
- Evaluating design decisions: "Would [Persona] understand this?"

**NNG's three persona types:**

1. **Proto-personas (lightweight)** — created in a 2-4 hour team workshop using existing knowledge and assumptions; useful for alignment when no research budget exists; must be validated later
2. **Qualitative personas** — built from 5-30 user interviews; segments based on observed behavioral patterns, goals, and attitudes; the standard recommended approach
3. **Statistical personas** — built from large-scale survey or analytics data using cluster analysis; validated quantitatively; high investment but high confidence

**What to include in a research-backed persona:**
- Name and photo (realistic, not stock-model glamour)
- Role and context (job title, environment, key constraints)
- Goals — what they are trying to accomplish (primary and secondary)
- Behaviors — how they currently accomplish their goals
- Pain points — frustrations, inefficiencies, unmet needs
- Motivations — why they care, what drives their decisions
- Technology comfort — relevant tools and proficiency levels

**What to exclude:**
- Demographics that do not affect behavior (age, gender, location — unless they demonstrably change usage patterns)
- Fictional backstories that add color but not insight
- Too many personas — 3-5 primary personas cover most products; more than 7 causes decision paralysis

**Common failure:** Personas built on assumptions rather than research are imaginary characters, not tools. If you cannot trace every attribute to a research finding, the persona is fiction.

### 2.6 Jobs-to-Be-Done (JTBD)

**What it is:** A framework that shifts focus from who the user is (demographics) to what the user is trying to accomplish (the "job" they hire a product to do). Originated by Tony Ulwick (1991, Outcome-Driven Innovation) and popularized by Clayton Christensen ("The Innovator's Solution," 2003).

**The core insight:** People do not buy products — they hire products to make progress in specific circumstances. Every job has functional, social, and emotional dimensions.

**The classic example (Christensen's milkshake study):**
A fast-food chain discovered that half of all milkshakes were sold before 8 AM. Ethnographic research revealed the "job" was not "enjoy a treat" but "give me something to consume during my boring commute that keeps me full until lunch, fits in my cupholder, and takes a long time to finish." Competing solutions were not other milkshakes — they were bananas, bagels, and boredom.

**JTBD statement format:**
```
When [situation/trigger],
I want to [motivation/goal],
so I can [expected outcome].
```

**When to use JTBD:**
- Product strategy and positioning — understanding what you actually compete with
- Feature prioritization — mapping features to unmet jobs
- Innovation — discovering over-served and under-served jobs
- When personas feel too demographic and not actionable enough

**Research methods for uncovering JTBD:**
- Switch interviews — talk to recent customers about the moment they switched from a previous solution
- Timeline mapping — reconstruct the buying/adoption decision chronologically
- Contextual inquiry — observe what users are actually trying to accomplish, not what they say they want

### 2.7 Empathy Maps

**What it is:** A collaborative visualization that captures what is known about a user across four quadrants: Says, Thinks, Does, and Feels. Created by Dave Gray (XPLANE), widely adopted by the d.school at Stanford and promoted by NNG.

**When to use:**
- At the start of a design project to externalize and align team assumptions
- During or after interviews to synthesize individual participant data
- As a lightweight alternative to full personas when time is limited

**The four quadrants:**
1. **Says** — direct quotes from interviews or usability sessions
2. **Thinks** — inferred thoughts that the user may not vocalize (beliefs, assumptions, concerns)
3. **Does** — observable behaviors and actions
4. **Feels** — emotional states (frustrated, confident, anxious, delighted)

**Lightweight version:** One empathy map per participant, created during a debrief session, using sticky notes on a whiteboard or Miro board. Takes 15-20 minutes per participant.

**Thorough version:** Aggregate empathy map per user segment, synthesized from multiple participants. Cross-referenced with quantitative data. Used as input for persona creation.

**Key value:** The gap between Says and Does (and between Thinks and Feels) often contains the most important insights. Users who say "I always read the documentation" but are observed clicking randomly reveal a design problem that self-reported data alone would miss.

### 2.8 User Journey Maps

**What it is:** A visualization of the end-to-end process a user goes through to accomplish a goal, including stages, actions, touchpoints, thoughts, emotions, and pain points at each step.

**When to use:**
- Identifying friction points and drop-off moments across a multi-step experience
- Aligning cross-functional teams around the full user experience (not just their own touchpoint)
- Prioritizing improvement efforts by severity of pain at each stage
- Communicating research findings to stakeholders who respond to narrative formats

**Components of a journey map:**
1. **Actor** — the persona or user type whose journey is being mapped
2. **Scenario** — the specific goal or task (e.g., "First-time user sets up their account")
3. **Stages** — the high-level phases (Awareness, Consideration, Onboarding, First Use, Retention)
4. **Actions** — what the user does at each stage
5. **Touchpoints** — where the user interacts with the product or brand
6. **Thoughts** — what the user is thinking at each stage
7. **Emotions** — the emotional arc (typically visualized as a curve moving between positive and negative)
8. **Pain points** — specific frustrations or blockers
9. **Opportunities** — design or product improvements identified at each stage

**Lightweight version:** Whiteboard session with the team, mapping 4-6 stages based on existing knowledge and 3-5 interviews. Completed in 2-3 hours.

**Thorough version:** Research-backed map synthesizing data from 10-20 interviews, diary studies, and analytics. Validated with users. Published as a reference artifact for the organization.

**NNG's key distinction:** Journey maps represent a *specific* user type completing a *specific* goal. A map that tries to cover all users doing all things becomes so generic it is useless.

### 2.9 Competitive Analysis (UX-Focused)

**What it is:** Systematic evaluation of competitor products to understand market conventions, identify differentiation opportunities, and learn from others' successes and failures.

**When to use:**
- Early discovery to understand the landscape before designing
- When stakeholders reference competitor features ("Why don't we have X like Competitor Y?")
- To establish baseline expectations for interaction patterns in a category
- During redesign to identify best-in-class patterns worth adopting

**Lightweight version (heuristic review):**
- Select 3-5 direct competitors and 2-3 indirect competitors
- Walk through key user flows (onboarding, core task, recovery from error)
- Score against heuristics (Nielsen's 10 Usability Heuristics)
- Document in a comparison matrix with screenshots

**Thorough version (competitive usability study):**
- Recruit 5-8 participants per competitor product
- Assign identical tasks across all products
- Measure task success rate, time on task, error rate, and satisfaction
- Produces quantitative benchmarks and qualitative insight into competitor strengths/weaknesses

---

## 3. Deliverables

### 3.1 Personas Document

**Format:** 1-2 page document per persona (PDF or shared design file).

**Contents:**
- Photo, name, and quote that captures their core attitude
- Context (role, environment, tools, constraints)
- Goals (primary and secondary)
- Behaviors (current workflows and habits)
- Pain points (ranked by severity)
- Motivations and values
- Technology proficiency and tool preferences
- A scenario illustrating a typical interaction with the product

**Distribution:** Printed and posted in the team area. Embedded in design system documentation. Referenced in user story templates.

### 3.2 User Journey Maps

**Format:** Large-format visualization (poster, Miro/FigJam board, or slide deck for remote teams).

**Contents:**
- Stage-by-stage breakdown with actions, thoughts, emotions, and pain points
- Emotional arc visualization (positive/negative curve)
- Opportunity annotations linked to backlog items or design recommendations
- Data sources cited for each insight

**Quality criteria:**
- Based on research data, not assumptions (cite participant IDs or data sources)
- Specific to one persona and one scenario
- Includes both the current-state experience and (optionally) a future-state vision

### 3.3 Research Reports

**Format:** Written document (5-15 pages) or recorded presentation (20-30 min).

**Structure:**
1. **Executive summary** — 3-5 key findings and their implications (one page; this is often the only section stakeholders read)
2. **Research objectives** — what questions the study was designed to answer
3. **Methodology** — method, sample size, participant demographics, timeline, tools used
4. **Detailed findings** — organized by theme or research question, with supporting evidence (quotes, metrics, screenshots, video clips)
5. **Recommendations** — specific, actionable design or product changes, prioritized by impact and effort
6. **Appendix** — discussion guide, raw data summaries, participant screener

**Anti-pattern:** Reports that describe findings without recommendations. If the report does not tell the reader what to do differently, it has failed its purpose.

### 3.4 Insight Summaries (Research Nuggets)

**Format:** Single-page or single-slide format for rapid consumption.

**Structure:**
- **Insight statement** — one sentence capturing the finding (e.g., "Users abandon the checkout flow when asked to create an account because they perceive it as a commitment, not a convenience")
- **Evidence** — 2-3 supporting data points (quotes, metrics, observation counts)
- **Impact** — what happens if this is not addressed (churn, support cost, lost revenue)
- **Recommendation** — what to do about it
- **Confidence level** — high (multiple sources), medium (single method), low (preliminary signal)

**Distribution:** Shared in Slack/Teams after each research session. Accumulated in a research repository (Dovetail, Notion, Confluence) for longitudinal reference.

### 3.5 User Stories (Research-Informed)

**Format:** Agile user story cards with research traceability.

**Structure:**
```
As a [persona name],
I want to [goal derived from research],
so that [motivation uncovered in interviews].

Acceptance Criteria:
- Given [context observed in research],
  when [action users actually take],
  then [outcome users expect based on mental model].

Research Source: [Study name, participant IDs, insight reference]
```

**Key principle:** User stories derived from research carry more weight in prioritization because they are grounded in observed need, not stakeholder opinion or competitive mimicry. The "so that" clause should trace to a real motivation discovered through interviews or observation, not a product manager's hypothesis.

---

## 4. Tools & Techniques

### 4.1 Unmoderated Testing & Research Platforms

**Maze**
- Unmoderated usability testing, prototype testing, card sorting, tree testing, surveys
- Integrates with Figma prototypes for click-through testing
- Best for: product teams wanting continuous, fast testing on a moderate budget
- Strength: speed — tests can launch and collect results within hours
- Limitation: less depth than moderated sessions; complex tasks may confuse participants without a moderator

**UserTesting (now UserZoom)**
- Moderated and unmoderated testing with a large participant panel
- Video recording of sessions with highlight reels
- Best for: B2C companies needing diverse demographic panels at scale
- Strength: panel breadth and quality; enterprise-grade reporting
- Limitation: expensive; per-session pricing discourages frequent testing

**Lyssna (formerly UsabilityHub)**
- Quick preference tests, first-click tests, five-second tests, design surveys
- Best for: rapid design validation with low overhead
- Strength: fast turnaround for simple design questions
- Limitation: limited to specific test types; not suited for complex task flows

### 4.2 Behavioral Analytics & Heatmaps

**Hotjar**
- Heatmaps (click, scroll, move), session recordings, feedback polls, surveys
- Best for: understanding aggregate behavioral patterns on web pages
- Strength: visual and intuitive; non-technical stakeholders understand heatmaps immediately
- Limitation: limited product analytics; no funnel analysis or cohort tracking

**FullStory**
- Session replay, heatmaps, frustration signals (rage clicks, dead clicks, error clicks)
- AI-powered session summarization (StoryAI, powered by Google Gemini)
- Best for: UX teams and customer experience teams focused on digital experience quality
- Strength: high-fidelity replay; frustration detection surfaces issues automatically
- Limitation: no free plan; premium pricing; no feature flags or A/B testing

**PostHog**
- Session recording, product analytics, feature flags, A/B testing, error tracking — all-in-one
- Open-source core with generous free tier (1M events + 5K recordings/month)
- Best for: engineering-oriented teams wanting a unified analytics + experimentation platform
- Strength: tight integration between analytics, flags, and replays; transparent pricing
- Limitation: replay quality less polished than FullStory; steeper learning curve for non-technical users

### 4.3 Product Analytics

**Mixpanel**
- Event-based analytics: funnels, retention, flows, cohorts, A/B test analysis
- Best for: teams tracking specific user actions and conversion funnels
- Strength: powerful segmentation; flexible event taxonomy
- Limitation: requires disciplined event instrumentation; garbage in, garbage out

**Amplitude**
- Behavioral analytics, user segmentation, experimentation, CDP (Customer Data Platform)
- Best for: product-led growth companies analyzing user behavior at scale
- Strength: behavioral cohorting; chart collaboration features; strong governance model
- Limitation: complex setup; expensive at scale; can overwhelm teams without a dedicated analyst

**Google Analytics 4 (GA4)**
- Web and app analytics with event-based model
- Best for: marketing-oriented analytics; acquisition and traffic analysis
- Strength: free; ubiquitous; integrates with Google Ads ecosystem
- Limitation: limited for product-level behavioral analysis; privacy-sampling at high volumes

### 4.4 Survey & Form Tools

**Typeform**
- Conversational, one-question-at-a-time survey experience
- Best for: customer-facing surveys where completion rate matters (higher engagement than traditional forms)
- Strength: beautiful design; logic branching; high response rates
- Limitation: analytics are basic; expensive per-response at scale

**Google Forms**
- Free, simple form builder integrated with Google Sheets
- Best for: internal surveys, quick polls, research screeners
- Strength: zero cost; real-time Google Sheets integration; unlimited responses
- Limitation: minimal design control; no logic branching in free tier; limited question types

**SurveyMonkey**
- Enterprise survey platform with advanced logic, analysis, and panel access
- Best for: large-scale research surveys requiring statistical rigor
- Strength: validated question templates (NPS, CSAT, SUS); cross-tabulation; data export

### 4.5 Qualitative Research & Synthesis Tools

| Tool | Purpose | Best For |
|---|---|---|
| **Dovetail** | Research repository, transcription, tagging, insight management | Teams conducting regular research who need to organize and retrieve insights over time |
| **Miro / FigJam** | Collaborative whiteboarding | Remote synthesis workshops: affinity mapping, empathy maps, journey maps |
| **Optimal Workshop** | Card sorting, tree testing, first-click testing | Information architecture research and navigation design validation |
| **dscout** | Mobile diary study platform with photo/video/text | Longitudinal research capturing in-context experiences over days or weeks |

### 4.6 Recruitment & Scheduling

| Tool | Best For |
|---|---|
| **User Interviews** | Finding qualified participants quickly across demographics and industries |
| **Respondent.io** | Hard-to-reach professional audiences (doctors, engineers, executives) |
| **Calendly / Cal.com** | Coordinating moderated sessions with participants across time zones |

---

## 5. Common Failures

### 5.1 Confirmation Bias

**The failure:** Designing research to validate a pre-existing belief rather than to discover truth. Interpreting ambiguous data as supporting the hypothesis. Ignoring or downplaying contradictory findings.

**How it manifests:** choosing only participants who match the ideal user profile; stopping research once supportive data is found; cherry-picking quotes that support the team's preferred direction; framing findings as "users confirmed that..." rather than "users revealed that..."

**Mitigation:** state hypotheses before research begins, then actively seek disconfirming evidence. Use triangulation (multiple methods, researchers, and data sources). Have a team member play devil's advocate during analysis. Pre-register research questions before data collection. Invite cross-functional observers who have no stake in the outcome.

### 5.2 Leading Questions

**The failure:** Phrasing questions in a way that suggests the "correct" answer, producing data that reflects the researcher's beliefs rather than the participant's experience.

**Examples of leading vs. neutral questions:**

| Leading (Bad) | Neutral (Good) |
|---|---|
| "How much did you like the new design?" | "What was your experience with the design?" |
| "Don't you think this is easier?" | "How would you compare this to your current approach?" |
| "Would you use this feature?" | "Walk me through how you currently handle this task." |
| "What problems did you have?" | "Describe what happened when you tried to complete the task." |
| "The old version was confusing, right?" | "Tell me about your experience with the previous version." |

**Mitigation:** pilot the discussion guide with a colleague to flag implied preferred answers. Start questions with "how," "what," "tell me about," and "describe" rather than "do you," "would you," or "don't you." Avoid adjectives in questions (never say "easy," "confusing," "better," "improved"). Control body language — do not nod, smile, or react. Record sessions and review your own moderating behavior for unconscious bias.

### 5.3 Insufficient Sample Sizes

**The failure:** Drawing conclusions from too few participants (for quantitative work) or too few segments (for qualitative work), producing findings that do not generalize.

**NNG sample size guidelines:**

| Method | Lightweight | Standard | Rigorous |
|---|---|---|---|
| Qualitative usability testing | 3-5 participants | 5 per user segment | 8-12 across segments |
| User interviews | 5 participants | 5-8 per segment | 20-30 for saturation |
| Surveys (quantitative) | 50-100 directional | 200+ for statistical significance | 400+ for segment-level analysis |
| Quantitative usability study | 15-20 participants | 40 participants (NNG standard) | 40+ per segment |
| Card sorting | 15 participants (open) | 30 participants (closed) | 50+ for statistical patterns |
| A/B testing | Depends on effect size | Use power calculator | Typically 1,000+ per variant |

**The critical distinction:** Five participants is appropriate for qualitative usability testing (finding problems) but dangerously inadequate for quantitative measurement (measuring prevalence). NNG explicitly warns: "5 users — okay for qual, wrong for quant."

**Mitigation:**
- Choose sample size based on the *type of question* you are answering, not on budget alone
- For qualitative work, test 5 users per distinct user segment, not 5 total
- For quantitative work, use a sample size calculator based on desired confidence level and margin of error
- Be transparent about confidence levels when presenting findings from small samples
- Label preliminary findings as "signals" not "conclusions"

### 5.4 Research Without Action

**The failure:** Conducting research that produces reports but does not change decisions. The most damaging and most common failure in organizational research practice.

**How it manifests:** reports filed but never referenced during design or planning; findings presented but no one assigned to act on them; research cadence disconnected from sprint planning or roadmap cycles; stakeholders say "we already know that" and dismiss findings that challenge existing plans.

**Mitigation:** tie every research study to a pending decision — if no decision depends on the outcome, do not run the study. Include specific, actionable recommendations in every deliverable. Present findings where decisions are made (sprint planning, roadmap review), not in a separate "research share-out." Track recommendation adoption rate as a research team metric. Embed researchers in product teams rather than centralizing them separately.

### 5.5 No Stakeholder Involvement

**The failure:** Researchers conduct studies in isolation, then present findings to stakeholders who are not invested and therefore ignore the results.

**How it manifests:** product managers and engineers never observe sessions; findings communicated via document, never via shared experience; stakeholders challenge methodology instead of engaging with findings.

**Mitigation (Steve Krug's approach):** invite stakeholders to observe sessions live or watch recordings — watching a real user struggle is worth more than any report. Run a debrief immediately: "What did you see? What surprised you? What should we do?" Create a 2-minute highlight reel. Have stakeholders help prioritize which issues to fix. Share raw quotes and video clips in Slack/Teams, not polished decks.

### 5.6 Researching the Wrong Questions

**The failure:** Spending research resources answering questions that are irrelevant to product decisions, already answered by existing data, or framed at the wrong level of abstraction.

**Examples:** conducting interviews to decide button color (this is an A/B test); running a survey to understand mental models (this requires qualitative inquiry); testing a prototype when the team has not validated the problem exists; asking "would you use this?" instead of "how do you currently solve this?"

**Mitigation — the research question audit:** Before any study, answer: (1) What decision will this inform? If you cannot name one, do not run the study. (2) What method is appropriate? Match the method to the question type. (3) Does this data already exist? Check analytics, support tickets, previous research, and industry reports first.

### 5.7 Treating Research as a Phase

**The failure:** Conducting research only at the beginning of a project ("discovery phase"), then designing and building without further user input until launch.

**Why it fails:** assumptions accumulate silently during design and development; the product evolves away from original findings; by launch, the product reflects the team's mental model, not the user's.

**Mitigation — continuous research cadence:** weekly: review analytics dashboards and support ticket themes. Biweekly: conduct 2-3 lightweight usability tests. Monthly: run a focused study (interviews, survey, or diary study). Quarterly: synthesize accumulated findings into updated personas and journey maps.

---

## 6. Integration with Development

### 6.1 From Research to User Stories

Research findings should flow directly into the product backlog as user stories with traceable evidence:

**Step 1 — Extract insights from research**
Each research study produces a set of insight statements. Example:
> "Enterprise users managing 50+ team members need to bulk-assign permissions because doing it one-by-one takes 20+ minutes and causes errors when they lose track of who has been updated."

**Step 2 — Frame as user stories**
```
As an enterprise admin managing a large team,
I want to select multiple team members and assign permissions in bulk,
so that I can complete permission updates in minutes instead of 20+
and avoid errors from manual one-by-one assignment.

Acceptance Criteria:
- Given I am on the team management page with 50+ members,
  when I select multiple members using checkboxes,
  then I can apply a permission template to all selected members at once.
- Given I have applied bulk permissions,
  when the operation completes,
  then I see a confirmation showing exactly which members were updated
  and which (if any) failed with the reason.

Research Source: Enterprise Admin Interviews, Q1 2026, participants P03, P07, P11
```

**Step 3 — Prioritize using research severity**
- **Critical** — users cannot complete the task at all; observed in 4+ participants
- **Major** — users complete the task but with significant frustration or errors; observed in 3+ participants
- **Minor** — users notice the issue but work around it; observed in 1-2 participants
- **Enhancement** — users did not report it, but research suggests an opportunity

### 6.2 Acceptance Criteria from User Needs

Research data transforms into acceptance criteria by mapping observed user behavior and expectations to testable conditions:

**Research observation:** "Users expect the system to remember their last-used settings because they perform the same report configuration 90% of the time."

**Acceptance criteria:**
```
Given a user has previously configured and run a report,
when they return to the report builder,
then their last-used configuration is pre-populated as the default,
and they can modify it or run it immediately without re-entering settings.
```

**Research observation:** "Users become anxious when a long-running operation shows no progress indicator — 4 of 6 participants refreshed the page, causing data loss."

**Acceptance criteria:**
```
Given a user initiates an operation expected to take more than 3 seconds,
when the operation is processing,
then a progress indicator is displayed showing estimated time remaining,
and the user is warned if they attempt to navigate away that data may be lost.
```

### 6.3 Analytics-Driven Iteration

Post-launch, research shifts from generative to evaluative, using quantitative signals to identify where qualitative investigation is needed:

**The analytics-to-insight loop:**

1. **Instrument** — define key events aligned with user goals (not just page views): task started, task completed, error encountered, feature adopted, feature abandoned
2. **Monitor** — set up dashboards tracking funnel conversion, feature adoption, error rates, and session duration trends
3. **Detect** — identify anomalies: drop-offs in funnels, declining retention cohorts, features with high abandonment, rage-click concentrations
4. **Investigate** — use qualitative methods (session replay review, targeted interviews, usability testing) to understand *why* the quantitative signal exists
5. **Intervene** — implement design changes, feature flags, or A/B tests based on qualitative findings
6. **Measure** — track the quantitative impact of the intervention; close the loop

**Example workflow:**
- Amplitude shows a 40% drop-off at step 3 of the onboarding flow
- PostHog session replays reveal users are confused by a form field label
- 5 quick usability tests confirm the label is ambiguous
- Design team revises the label and adds helper text
- A/B test shows the revision improves step 3 completion by 22%
- The finding is documented as an insight nugget in Dovetail for future reference

### 6.4 Research in Agile Ceremonies

**Sprint Planning:**
- Researchers present relevant insights when backlog items are discussed
- Acceptance criteria reference specific research findings
- Research-sourced stories carry an evidence tag that influences priority

**Sprint Review / Demo:**
- Compare implemented features against research-based expectations
- Highlight any deviations from researched user mental models
- Queue items for post-sprint usability validation

**Retrospective:**
- Review whether shipped features addressed the identified user needs
- Assess whether research recommendations were adopted or deferred (and why)
- Identify knowledge gaps that require new research

**Continuous Discovery (Teresa Torres model):**
- Weekly touchpoint with users (interview, test, or observation)
- Opportunity solution tree maintained alongside the product backlog
- Research is not a project — it is a continuous team habit

---

## 7. Method Selection Guide

Use this decision tree to select the right research method for your question:

```
What type of question are you answering?
|
+-- "What do users need?" (Discovery)
|   +-- Early stage, unknown problem space --> Contextual Inquiry
|   +-- Known domain, need to understand goals --> User Interviews
|   +-- Need to understand behavior over time --> Diary Study
|   +-- Need to understand the competitive landscape --> Competitive Analysis
|
+-- "Does this design work?" (Evaluation)
|   +-- Have a prototype, need qualitative feedback --> Usability Testing (moderated)
|   +-- Have a prototype, need speed and scale --> Usability Testing (unmoderated, Maze)
|   +-- Need to validate information architecture --> Card Sorting / Tree Testing
|   +-- Need to compare design options --> A/B Testing or Preference Testing
|
+-- "How many / how much?" (Measurement)
|   +-- Need to measure satisfaction or preference --> Survey
|   +-- Need to measure task performance --> Quantitative Usability Study (40+ users)
|   +-- Need to track behavior patterns --> Product Analytics (Mixpanel / Amplitude)
|   +-- Need to detect friction points --> Session Recording (FullStory / PostHog / Hotjar)
|
+-- "Why is this happening?" (Diagnosis)
|   +-- Analytics show a drop-off or anomaly --> Session Replay + Targeted Interviews
|   +-- Support tickets describe confusion --> Usability Testing on the affected flow
|   +-- Users request features that seem odd --> JTBD Interviews (what job are they hiring for?)
```

---

## 8. Quick Reference Checklist

### Before Starting Research

- [ ] Define the research question(s) — what specific decision will this inform?
- [ ] Confirm the question cannot be answered with existing data (analytics, support logs, prior studies)
- [ ] Select the appropriate method based on question type (see Method Selection Guide)
- [ ] Determine sample size based on method type (qual: 5 per segment; quant: 40+)
- [ ] Write a discussion guide or test script and pilot it with a colleague
- [ ] Review all questions for leading language, double-barreling, and hypotheticals
- [ ] Recruit participants who match the target user profile (not colleagues, not power users only)
- [ ] Schedule stakeholder observation for live sessions
- [ ] Prepare consent forms and recording permissions
- [ ] Set up tools (recording software, note-taking template, analysis framework)

### During Research

- [ ] Follow the discussion guide but remain flexible for unexpected insights
- [ ] Ask open-ended questions; probe with "tell me more," "why," "what happened next"
- [ ] Do not lead, validate, or react to participant responses
- [ ] Control body language — neutral expression, no nodding at "good" answers
- [ ] Take timestamped notes with participant quotes (not interpretations)
- [ ] Note environmental context (device, location, interruptions, workarounds)
- [ ] If moderating remotely, ask participants to share their screen and think aloud
- [ ] Capture unexpected behaviors and off-script moments — these are often the richest data

### After Research

- [ ] Debrief with observers within 24 hours while memory is fresh
- [ ] Transcribe sessions (automated tools: Otter.ai, Dovetail, Rev)
- [ ] Conduct affinity mapping — group observations into themes
- [ ] Distinguish findings (what you observed) from interpretations (what you think it means)
- [ ] Write insight statements: observation + impact + recommendation
- [ ] Prioritize findings by severity (critical / major / minor / enhancement)
- [ ] Present findings in the decision-making forum, not a separate meeting
- [ ] Include specific, actionable recommendations — not just observations
- [ ] Track which recommendations are adopted and measure their impact
- [ ] Archive raw data and insights in the research repository for future reference
- [ ] Update personas and journey maps if findings warrant revision

### Research Ethics Checklist

- [ ] Informed consent obtained before every session
- [ ] Participants can withdraw at any time without consequence
- [ ] Personal data is anonymized in all reports and shared artifacts
- [ ] Recordings are stored securely and deleted after the agreed retention period
- [ ] Compensation is fair and does not create undue incentive to please the researcher
- [ ] Vulnerable populations (minors, people with disabilities) receive additional protections
- [ ] Research does not deceive participants about the purpose of the study

### Bias Mitigation Checklist

- [ ] Hypotheses stated before research, not after
- [ ] Discussion guide reviewed by someone outside the project team
- [ ] Participant sample includes users who may disagree with the team's direction
- [ ] Analysis conducted by at least two people independently before comparing notes
- [ ] Contradictory findings given equal weight in the report
- [ ] Confidence level stated for each finding (high / medium / low)
- [ ] Findings distinguished from recommendations — let the data speak before proposing solutions
- [ ] Video clips selected to represent the range of responses, not just the dramatic ones

---

## 9. Key References

### Books
- **"Don't Make Me Think"** — Steve Krug. The foundational text on pragmatic usability. Emphasizes simplicity, common sense, and testing with real users over debates about best practices.
- **"Rocket Surgery Made Easy"** — Steve Krug. Step-by-step guide to DIY usability testing: recruit 3 users, test one morning a month, fix the most serious problems, repeat.
- **"Interviewing Users"** — Steve Portigal. Deep guide to conducting effective user interviews, including rapport-building, question design, and handling difficult participants.
- **"Just Enough Research"** — Erika Hall. Argues for right-sized research that is fast, focused, and tied to decisions. Strong antidote to analysis paralysis.
- **"The Innovator's Solution"** — Clayton Christensen. Introduces the Jobs-to-Be-Done framework in the context of disruptive innovation.
- **"Competing Against Luck"** — Clayton Christensen, Taddy Hall, Karen Dillon, David Duncan. Full treatment of JTBD with practical application guidance.
- **"Observing the User Experience"** — Elizabeth Goodman, Mike Kuniavsky, Andrea Moed. Comprehensive practitioner's guide covering the full spectrum of UX research methods.
- **"The Field Guide to Human-Centered Design"** — IDEO.org. 57 design methods organized by Inspiration, Ideation, and Implementation phases.

### Online Resources
- **Nielsen Norman Group (nngroup.com)** — "When to Use Which User-Experience Research Methods" article and the UX research methods landscape chart. The most widely referenced framework for method selection.
- **IDEO Design Kit (designkit.org)** — Open-source collection of human-centered design methods with step-by-step guidance.
- **User Interviews Field Guide (userinterviews.com/ux-research-field-guide)** — Comprehensive guide to UX research methods with practical templates.

### Validated Measurement Instruments
- **System Usability Scale (SUS)** — 10-item questionnaire producing a 0-100 usability score. Industry benchmark: 68 is average. Quick, reliable, and free.
- **Net Promoter Score (NPS)** — single-question loyalty metric ("How likely are you to recommend..."). Useful for tracking trends, not for diagnosing problems.
- **Customer Satisfaction Score (CSAT)** — single-question satisfaction metric. Best used immediately after an interaction.
- **SUPR-Q** — standardized questionnaire for website user experience covering usability, trust, loyalty, and appearance.

---

*This module provides the conceptual foundation and practical toolkit for conducting user research that informs product decisions. It should be used alongside the Usability Testing expertise module for evaluation-specific guidance and the Information Architecture module for navigation and structure research methods.*
