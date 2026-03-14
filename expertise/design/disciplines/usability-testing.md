# Usability Testing

> **Discipline Module** -- Evaluating products by testing them with representative
> users to uncover interaction problems before they reach production.

Usability testing is the practice of observing real or representative users as they
attempt realistic tasks with a product, prototype, or interface. The purpose is not
to gather opinions but to reveal observable behavior: where people hesitate, where
they fail, what they misunderstand, and what works without friction.

Steve Krug captured the ethos in "Don't Make Me Think" (2000, revised 2013): a
well-designed product should let users accomplish their intended tasks as easily and
directly as possible. The average user is busy, distracted, and in a hurry; interfaces
should be self-evident and self-explanatory. Krug argued in "Rocket Surgery Made Easy"
(2010) that frequent, imperfect testing with a small number of users beats waiting for
the perfect study -- recommending monthly testing sessions with as few as three users.

Jakob Nielsen's research at the Nielsen Norman Group (NNG) established the quantitative
backing: five users typically uncover roughly 85 percent of usability problems. This
finding -- combined with NNG's heuristic evaluation framework -- remains the bedrock of
modern usability practice.

---

## 1. What This Discipline Covers

Usability testing systematically evaluates a product's ease of use by observing target
users performing defined tasks. It answers questions no amount of internal review can:

- **Can users complete core tasks?** Task success rate is the most fundamental metric.
- **How efficiently?** Time-on-task, error rate, click count, and path deviations.
- **What causes confusion or failure?** Qualitative observation reveals the "why."
- **How satisfied are users?** Post-task/post-test questionnaires (e.g., SUS) quantify
  subjective satisfaction.
- **Does the design match mental models?** Testing reveals whether IA, labeling, and
  interaction patterns align with how users think about the domain.

### Scope Boundaries

Usability testing is evaluative, not generative. It tells you what is broken, not what
to build. It complements but does not replace user interviews (needs), card sorting
(structure), analytics (scale), or accessibility audits (compliance).

---

## 2. Core Methods & Frameworks

### 2.1 Moderated vs. Unmoderated Testing

**Moderated:** A facilitator guides the session in real time. Can probe unexpected
behavior and adapt dynamically. Stronger qualitative insight but higher cost, limited
scale, and risk of moderator bias / Hawthorne effect.

**Unmoderated:** Participants complete tasks independently via a platform. Lower cost,
larger samples, reduced observer bias, but no follow-up probing and higher task
abandonment risk.

**Recommended approach:** Moderated for early formative testing (low-fidelity, complex
flows). Unmoderated for scaled validation of refined designs.

### 2.2 Remote vs. In-Person

| Dimension | Remote | In-Person |
|---|---|---|
| Setup cost | Lower (participant's own device) | Higher (lab, equipment, travel) |
| Ecological validity | Higher (natural environment) | Lower (lab setting) |
| Observation fidelity | Screen + webcam only | Full body language visible |
| Eye tracking | Requires specialized remote tools | Hardware-based, higher accuracy |
| Recruitment reach | Global | Geographically constrained |

Remote is the default for most teams. In-person remains valuable for physical products,
kiosk interfaces, or when hardware eye tracking is required.

### 2.3 Think-Aloud Protocol

Participants verbalize thoughts while interacting with the interface. Two variants:

**Concurrent Think-Aloud (CTA):** Verbalize during the task. Prompt with neutral cues:
"Keep talking," "What are you thinking?" Does not significantly affect task performance.
Stronger at detecting problems through observation -- navigation confusion, error
message failures, IA issues.

**Retrospective Think-Aloud (RTA):** Complete tasks silently, then review a recording
and narrate. Detects more problems through verbalization -- terminology mismatches,
conceptual misunderstandings. Use when timing accuracy matters or when reflection is
more valuable than in-the-moment narration.

### 2.4 Task-Based Testing

The core of usability testing: asking participants to complete realistic tasks.

- **Scenario framing:** Provide context, not instructions. "You bought a jacket that
  doesn't fit. Find out how to return it." -- not "Find the return policy."
- **Goal-oriented:** Define what to accomplish, not how. The path chosen is the data.
- **Prioritized:** Test high-frequency and high-consequence tasks first.
- **Independent:** Each task completable without knowledge from previous tasks.
- **Clear success criteria:** Define "done" before sessions begin.
- **5-8 tasks per session:** Diminishing returns beyond this.

### 2.5 A/B Testing

Presents two or more design variants to different user groups and measures which
performs better on a defined metric.

- **Statistical significance:** p < 0.05 standard (< 5% chance result is random).
- **Sample size:** Calculate before testing. A 20% MDE at 95% significance may need
  13,000 users per variant.
- **Practical vs. statistical significance:** A statistically significant result with a
  tiny effect size may not justify implementation cost.
- **Run duration:** Must reach predetermined sample size. Stopping early inflates false
  positive rates.

A/B testing tells you which variant wins, not why. Combine with qualitative testing.

### 2.6 Heuristic Evaluation -- Nielsen's 10 Heuristics

Expert inspection, not user testing. Evaluators examine an interface against established
principles. Often conducted before user testing to identify areas to target.

Developed by Jakob Nielsen and Rolf Molich (1990), refined in 1994 via factor analysis
of 249 usability problems. Unchanged for three decades:

1. **Visibility of System Status** -- Keep users informed through timely feedback.
2. **Match Between System and Real World** -- Use users' language, not system jargon.
3. **User Control and Freedom** -- Clear "emergency exits," undo/redo support.
4. **Consistency and Standards** -- Follow platform and industry conventions.
5. **Error Prevention** -- Design to prevent problems, not just report them.
6. **Recognition Rather Than Recall** -- Make elements and options visible.
7. **Flexibility and Efficiency of Use** -- Accelerators for expert users.
8. **Aesthetic and Minimalist Design** -- Every extra element competes with relevance.
9. **Help Users Recognize, Diagnose, and Recover from Errors** -- Plain language, specific problem, constructive suggestion.
10. **Help and Documentation** -- Task-focused, searchable, concrete steps.

**Conducting:** 3-5 independent evaluators, each inspects alone, results aggregated,
each finding rated on Nielsen's 0-4 severity scale.

### 2.7 Cognitive Walkthrough

Evaluates learnability for new/infrequent users by walking through a task's action
sequence. At each step, the team asks four questions:

1. Will the user try to achieve the right effect?
2. Will the user notice the correct action is available?
3. Will the user associate the correct action with the desired effect?
4. Will the user see that progress is being made?

**Advantages:** Very early stage (even paper prototypes), low cost, no recruitment.
**Limitations:** Only evaluates learnability. Does not capture real user behavior.

### 2.8 First-Click Testing

Measures where users click first when attempting a task. Research shows correct first
clicks strongly predict task completion success. Use for navigation evaluation, IA
findability, and call-to-action prominence testing.

### 2.9 Five-Second Test

Shows a design for five seconds, then asks what users recall. Tests whether a design
communicates its message at a glance. Best for landing pages, homepages, and visual
hierarchy validation. Only measures initial impression -- one data point among many.

### 2.10 System Usability Scale (SUS)

Created by John Brooke (1986). A 10-item questionnaire providing a standardized
usability score. Items alternate between positive and negative wording, rated 1-5.

**Scoring:** For odd items: contribution = position - 1. For even items: contribution =
5 - position. Sum all contributions, multiply by 2.5. Result: 0-100.

**Benchmarks (500+ studies):**

| Score | Grade | Interpretation |
|---|---|---|
| 90-100 | A+ | Exceptional |
| 80-89 | A | Excellent, minimal friction |
| 68-79 | B-C | Average; room for improvement |
| 51-67 | D | Notable friction |
| 0-50 | F | Major problems |

**Critical:** Scores are not percentages. Average is 68. A score of 70 is near the 50th
percentile, not the 70th. Minimum 12-15 responses; aim for 20-30.

---

## 3. Deliverables

### 3.1 Test Plan

Written and approved before any sessions begin.

**Required components:** Objectives and dependent decisions. Scope (features in/out).
Methodology (moderated/unmoderated, remote/in-person, think-aloud variant, tools).
Participant criteria and screener. Task scenarios with success criteria. Metrics
(quantitative and qualitative). Environment/equipment. Schedule. Roles (moderator,
note-taker, observers).

### 3.2 Task Scenarios

```
Task ID: T-03
Feature: Checkout
Scenario: "You've added running shoes and a water bottle to your cart.
You have a 15% discount code: SPRING15. Complete your purchase with the
discount and choose standard shipping."
Success: Order confirmation page with discount applied.
Max Time: 4 minutes
Priority: Critical path
```

Rules: user vocabulary (not UI labels), motivation and context, no navigation hints,
include at least one error-handling task.

### 3.3 Observation Notes

A dedicated note-taker (not the moderator) captures: timestamped observations, task
outcomes (success/failure/partial/assisted), verbatim quotes, behavioral indicators
(hesitation, backtracking, sighing), and errors with recovery status.

### 3.4 Findings Report

1. **Executive summary:** Overall state, critical findings, top recommendations.
2. **Methodology:** Approach, participant count, tools.
3. **Participant summary:** Demographics and experience levels.
4. **Quantitative results:** Success rates, time-on-task, SUS, benchmarks.
5. **Findings by severity:** Problem, affected tasks, participant count, severity,
   evidence (quotes, screenshots, timestamps), recommendation.
6. **Positive findings:** What worked well -- prevents redesigning effective elements.
7. **Prioritized recommendations:** Ordered by impact, with effort estimates.

### 3.5 Severity Ratings

Nielsen's 0-4 scale, the industry standard. Based on frequency, impact, and
persistence:

| Rating | Label | Description | Action |
|---|---|---|---|
| 0 | Not a problem | Disagreement that this is an issue | No action |
| 1 | Cosmetic | Superficial; fix if time permits | Backlog |
| 2 | Minor | Users slowed but can complete task | Next cycle |
| 3 | Major | Significant delay/frustration; some users fail | Fix before release |
| 4 | Catastrophe | Users cannot complete core task | Blocks release |

Have multiple evaluators rate independently, then converge through discussion.

### 3.6 Recommendations

Each finding includes a recommendation that is specific ("Add progress indicator
showing step 2 of 4"), justified (tied to evidence and severity), feasible
(accounts for implementation effort), and prioritized (severity x frequency).

---

## 4. Tools & Techniques

### 4.1 Testing Platforms

**Maze** -- AI-first unmoderated testing. Prototype testing (Figma/Sketch/XD), card
sorting, tree testing, surveys, first-click tests, live site testing. 3M+ participant
panel. Strongest for small teams and continuous testing. Accessible pricing.

**UserTesting** -- Enterprise moderated and unmoderated. See/hear/talk to participants
in real time. Robust recruitment. Video think-aloud, click-stream analysis, sentiment.
Median contracts ~$40K/year.

**Lookback** -- Moderated session specialist. Synchronized screen/camera/mic capture.
Native iOS/Android SDKs for in-app mobile testing. Live observation, timestamped notes,
highlight reels. $25-$344/month.

**Lyssna (formerly UsabilityHub)** -- Unmoderated tests: prototype testing, card
sorting, first-click, five-second, preference tests, surveys. 690K+ participants across
124 countries, 395+ demographic attributes. Figma integration with path analysis.

### 4.2 Behavioral Analytics

**Hotjar** -- Heatmaps (click, move, scroll), session recordings ranked by frustration
(rage clicks, u-turns, dead clicks), on-site surveys, feedback widgets. Reveals what
happens at scale but not why. Use to identify problem areas, then investigate with
targeted usability tests.

### 4.3 Screen Recording

Record screen, audio, and face simultaneously. Capture cursor position and clicks.
Obtain consent. Create timestamped highlight clips for stakeholder presentations --
few will watch full sessions. Tools: OBS Studio (free), Loom, platform-native
recording.

### 4.4 Eye Tracking

**Hardware** (Tobii, EyeLink): In-person lab sessions. Precise fixation data, saccade
paths, gaze plots. ~0.5-1 degree accuracy.

**AI-based predictive** (Attention Insight): Predicted attention heatmaps from static
designs. Rapid screening without participants. Less accurate.

**Visualizations:** Gaze plots (fixation sequence), attention heatmaps (aggregate
focus), Areas of Interest analysis (time-to-first-fixation, dwell time per region).

Use for: visual hierarchy validation, dashboard design, safety-critical interfaces,
novice vs. expert scan pattern comparison.

---

## 5. Common Failures

### 5.1 Testing with the Wrong Users

Recruiting non-representative participants -- testing enterprise software with students,
senior health apps with 25-year-olds. Happens from convenience sampling, missing
personas, or weak screeners. The entire investment is wasted: real problems go undetected
while phantom problems consume resources. Fix: define criteria from personas, write
disqualifying screener questions, verify before sessions.

### 5.2 Too Many Tasks

Cramming 15-20 tasks into 60 minutes. Participants fatigue, later tasks get less effort,
data quality degrades. Fix: limit to 5-8 tasks. Prioritize ruthlessly. Run additional
rounds for remaining tasks.

### 5.3 Leading Tasks

Task instructions that reveal the answer: "Use the search bar at the top to find running
shoes" names the element and method. "Click 'My Account' to update your profile" is an
instruction, not a task. Fix: frame as goals using user vocabulary. Have someone
unfamiliar with the design review task wording.

### 5.4 Not Testing Early Enough

Waiting until the design is built and polished. Late-discovered problems are
exponentially more expensive to fix. Structural IA issues require extensive rework.
Teams resist findings because they are already invested. Fix: test paper prototypes,
wireframes, low-fidelity clickables. "Testing one user early is better than testing 50
near the end" (Krug).

### 5.5 Testing Opinions Instead of Behavior

Asking "Would you use this feature?" or "Which design do you prefer?" People cannot
accurately predict their behavior. Preference does not correlate with performance.
Fix: design tasks that produce observable behavior. Measure what people do, not what
they say they would do.

### 5.6 Not Fixing Findings

Conducting tests, writing reports, then failing to act. Reports sit unread, backlogs
are full, findings are "nice to haves." Testing becomes organizational theater. Fix:
present within 48 hours, tie to severity ratings, identify sprint-ready quick wins, file
as tracked tickets, follow up to verify fixes.

### 5.7 Moderator Bias

Unconsciously influencing participants through leading questions, nodding, verbal
affirmations ("good"), or premature hints. Fix: standardized script, echo technique
(repeat participant's words), session review for moderator behavior, second observer.

---

## 6. Integration with Development

### 6.1 Release-Blocking Classification

**Severity 4 (Blocks release):** Cannot complete core tasks. Data loss without warning.
Critical information invisible or misleading. Inaccessible to target population.

**Severity 3 (Fix before release):** Completable with significant frustration. Multiple
participants failed. Workarounds non-obvious. Affects high-frequency tasks.

**Severity 2 (Post-release):** Users slowed but succeed. Edge cases or low-frequency
tasks. Visual/labeling improvements.

**Severity 1 (Backlog):** Aesthetic inconsistencies. Minor copy. Nice-to-haves.

### 6.2 Severity x Frequency Prioritization

```
                    High Frequency          Low Frequency
                 +---------------------+---------------------+
  High Severity  |  FIX IMMEDIATELY    |  FIX BEFORE RELEASE |
  (3-4)          |  Sprint priority #1 |  Schedule this cycle |
                 +---------------------+---------------------+
  Low Severity   |  FIX SOON           |  BACKLOG            |
  (1-2)          |  Next sprint        |  Lowest priority    |
                 +---------------------+---------------------+
```

Additional factors: ease of fix (30-minute severity-2 fix before 2-week severity-3
rework), user segment impact (power users driving revenue), brand/trust impact
(broken images, critical typos).

### 6.3 Quick Wins vs. Structural Changes

**Quick wins** (implement this sprint): button label changes, confirmation dialogs,
error message improvements, contrast fixes, loading indicators, link text fixes.
Demonstrate testing produces results. Build organizational trust.

**Structural changes** (separate project): IA reorganization, navigation redesign,
interaction model changes, missing features, onboarding rework. Require their own
design-test-iterate cycle with separate timelines.

### 6.4 Communicating to Engineering

File usability issues as tickets with severity labels and affected flows. Include 15-30
second video clips. Specify the problem, not the solution. Link to the full report but
do not require reading it. Track resolution -- mark resolved only after follow-up
confirms the fix works.

### 6.5 Testing Cadence

- **Monthly lightweight:** 3-5 participants on recent changes (Krug's cadence).
- **Pre-release:** 5-8 participants, full task suite before major releases.
- **Post-launch:** Analytics/Hotjar review for 2 weeks after launch.
- **Quarterly benchmarking:** SUS and task metrics for trend tracking.

---

## 7. Key References

- Krug, Steve. "Don't Make Me Think, Revisited." 3rd ed., 2013. 700K+ copies sold.
- Krug, Steve. "Rocket Surgery Made Easy." 2010. DIY usability testing guide.
- Nielsen, Jakob. "Usability Engineering." 1993. Foundational discipline text.
- Nielsen, Jakob. "10 Usability Heuristics for User Interface Design." NNG, 1994/2020.
- Nielsen, Jakob. "Severity Ratings for Usability Problems." NNG.
- Nielsen, Jakob. "Why You Only Need to Test with 5 Users." NNG, 2000.
- Brooke, John. "SUS: A Quick and Dirty Usability Scale." 1986.
- Rubin & Chisnell. "Handbook of Usability Testing." 2nd ed., 2008.

---

## Quick Reference Checklist

### Before Testing

```
[ ] Objectives defined -- what decisions depend on results?
[ ] Test plan written and stakeholder-approved
[ ] Participant criteria defined from user personas
[ ] Screener questionnaire written and tested
[ ] 5-8 participants recruited matching target profile
[ ] 5-8 task scenarios with neutral language and success criteria
[ ] Pilot session completed (test the test)
[ ] Recording setup verified (screen + audio + face)
[ ] Consent forms prepared
[ ] Observation template ready for note-taker
```

### During Testing

```
[ ] Consent obtained and recorded
[ ] Pre-test questions asked (demographics, experience)
[ ] Think-aloud explained with practice task
[ ] Tasks presented one at a time, consistent order
[ ] Moderator neutral -- no leading, hinting, or affirming
[ ] Note-taker records timestamped observations
[ ] Post-task ratings collected after each task
[ ] Post-test questionnaire administered (SUS)
[ ] Debrief: "What was most difficult?" "Anything else?"
[ ] Participant thanked and compensated
```

### After Testing

```
[ ] Session recordings reviewed within 48 hours
[ ] Observations compiled across participants by task
[ ] Patterns identified (problems seen by 2+ participants)
[ ] Severity ratings assigned (0-4) to each finding
[ ] Quantitative metrics calculated (success rate, time, SUS)
[ ] Findings report written with evidence and recommendations
[ ] Findings classified: release-blocking vs. schedule vs. backlog
[ ] Top findings presented to team within 1 week
[ ] Actionable findings filed as issue tracker tickets
[ ] Quick wins identified for current sprint
[ ] Follow-up testing scheduled to verify fixes
```

### Red Flags -- Stop and Reassess

```
[!] Testing with colleagues instead of target users
[!] Task scenarios name UI elements or reveal the path
[!] Moderator helps participants when they struggle
[!] More than 10 tasks in a single session
[!] No success criteria defined before sessions
[!] Testing only at end of development cycle
[!] No severity ratings in findings report
[!] No mechanism to route findings to development
[!] Previous findings were never addressed
[!] Testing opinions ("Do you like it?") not behavior
```

### Method Selection Guide

| Situation | Recommended Method |
|---|---|
| Early concept, no prototype | Cognitive walkthrough, paper prototype test |
| Low-fidelity wireframes | Moderated think-aloud, first-click test |
| Interactive prototype | Moderated or unmoderated task-based testing |
| Evaluating navigation/IA | First-click testing, tree testing |
| Testing first impressions | Five-second test |
| Pre-launch validation | Full moderated suite + SUS |
| Live product optimization | A/B testing + Hotjar analytics |
| No users available | Heuristic evaluation (3-5 evaluators) |
| Benchmarking over time | SUS + task metrics quarterly |
| Comparing two designs | A/B test or preference test |
| Validating a specific fix | Targeted test, 3-5 users |
| Large-scale validation | Unmoderated via Maze or Lyssna |

### Metrics Reference

| Metric | Measures | Target |
|---|---|---|
| Task success rate | Can users complete it? | >85% critical tasks |
| Time on task | Efficiency | Compare to expert baseline |
| Error rate | Mistake frequency | <10% critical paths |
| SUS score | Perceived usability | Above 68 = above average |
| First-click success | Starting in right place | >70% correct |
| Completion rate | End-to-end flow finish | Track across rounds |
