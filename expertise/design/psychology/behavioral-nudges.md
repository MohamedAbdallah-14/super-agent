# Behavioral Nudges — Expertise Module

> Behavioral nudges are subtle design interventions that guide users toward beneficial actions without restricting choice. This module covers cognitive load reduction, smart defaults, ADHD-friendly interfaces, motivation scaffolding, time-boxing UX, opt-out completion, and ethical notification design — with implementation-level code patterns. Theory lives in `persuasive-design.md` and `cognitive-load.md`.

---

## 1. Theoretical Foundations

**Thaler & Sunstein — Nudge (2008).** Richard Thaler (Nobel Prize in Economics, 2017) demonstrated that choice architecture — how options are presented — shapes decisions more than the options themselves. Designers who control the choice environment have an ethical obligation to nudge toward outcomes that benefit the user, not the business.

**BJ Fogg — Behavior Model (B=MAP).** Behavior occurs when Motivation, Ability, and Prompt converge simultaneously. If users are not taking an action, diagnose which component is missing before adding more prompts.

| Component | Low | High |
|-----------|-----|------|
| Motivation | User does not care about the outcome | User urgently wants the outcome |
| Ability | Task requires 15 steps and expert knowledge | Task requires 1 tap |
| Prompt | No visible trigger; user must remember | Clear, timely, contextual cue |

**Kahneman — Thinking, Fast and Slow (2011).** System 1 (fast, automatic) handles most interface interactions. System 2 (slow, deliberate) activates for complex decisions. Nudges work because they target System 1. When a nudge requires System 2 processing, it becomes a demand, not a nudge.

**Nir Eyal — Hooked (2014).** The Hook Model (Trigger > Action > Variable Reward > Investment) explains habit formation. Duolingo exemplifies this at scale: 300M+ users, 80% of revenue from free users nudged to premium via ethical retention mechanics.

**Google Material Design Accessibility.** ADHD-friendly interface guidelines: reduce visual clutter, minimize decisions per screen, provide persistent external memory (visible state), and support micro-task completion. These principles benefit all users under cognitive load.

---

## 2. Cognitive Load Reduction

Show the right thing at the right time. Hide everything else behind progressive disclosure.

### 2.1 Hick's Law in Practice

Decision time increases logarithmically with options. Showing 50 tasks on login is paralyzing — show 1 actionable item.

```typescript
// Progressive task list — show next action, not entire backlog
function getNextAction(tasks: Task[]): Task | null {
  const inProgress = tasks.find(t => t.status === 'in_progress');
  if (inProgress) return inProgress;

  const highest = tasks
    .filter(t => t.status === 'pending')
    .sort((a, b) => b.priority - a.priority)[0];
  return highest ?? null;
}
```

### 2.2 Chunking and Grouping

Target 3-5 items per visible group. Beyond 5, the group needs subgroups or progressive disclosure.

```typescript
function chunkByCategory<T extends { category: string }>(
  items: T[],
  visiblePerChunk: number = 5,
): { label: string; items: T[]; hasMore: boolean; totalCount: number }[] {
  const grouped = Map.groupBy(items, (item) => item.category);
  return Array.from(grouped.entries()).map(([label, group]) => ({
    label,
    items: group.slice(0, visiblePerChunk),
    hasMore: group.length > visiblePerChunk,
    totalCount: group.length,
  }));
}
```

### 2.3 Progressive Loading

Prefer infinite scroll with progress indication over pagination. Pagination forces a decision ("which page?"). Always show a position indicator — "Showing 15 of 47" — so users retain spatial awareness.

### 2.4 Collapsible Sections

Expand the most recently interacted section. Collapse everything else. Persist expanded state in local preferences across sessions.

```typescript
function getDefaultExpandedSections(
  sections: string[],
  recentActivity: { sectionId: string; timestamp: number }[],
): Set<string> {
  if (recentActivity.length === 0) return new Set(sections.slice(0, 1));
  const sorted = [...recentActivity].sort((a, b) => b.timestamp - a.timestamp);
  return new Set([sorted[0].sectionId]);
}
```

---

## 3. Default Bias

Defaults are the most powerful nudge. 70-90% of users never change default settings — default selection is an ethical act.

### 3.1 Principles

- Pre-fill forms with the most common correct value (not the most profitable one)
- Highlight recommended options visually, but never pre-select consent-sensitive choices
- Use user history as the default when available ("Last time you chose Express Shipping")

### 3.2 Ethical Framework

| Pattern | When Ethical | When Dark Pattern |
|---------|-------------|-------------------|
| Pre-selected checkbox | Newsletter toggle in account settings | Hidden consent in purchase flow |
| Recommended option | Plan comparison with clear labeling | Bundled upsells disguised as features |
| Auto-enrollment | Security features (2FA, backup) | Paid subscriptions, recurring charges |
| Pre-filled quantity | "1" in e-commerce cart | "3" to inflate order value |
| Default sort order | Most relevant to user query | Most profitable for business |

### 3.3 Implementation

```typescript
interface DefaultConfig<T> {
  value: T;
  source: 'user_history' | 'most_common' | 'safest' | 'system';
  overridable: boolean;
  requiresExplicitConsent: boolean;
}

function resolveDefault<T>(
  userHistory: T | undefined,
  safest: T,
): DefaultConfig<T> {
  if (userHistory !== undefined) {
    return { value: userHistory, source: 'user_history', overridable: true, requiresExplicitConsent: false };
  }
  return { value: safest, source: 'safest', overridable: true, requiresExplicitConsent: false };
}
```

When user history is absent, prefer the safest default over the most common. Safety protects the user; convenience optimizes for speed. When they conflict, safety wins.

---

## 4. ADHD-Friendly Patterns

These patterns benefit all users but are essential for the estimated 5-8% of adults with ADHD. Core challenges: sustained attention difficulty, executive function deficits, and working memory limitations.

### 4.1 Micro-Sprints

Break work into 5-10-15 minute blocks. Never suggest an initial block longer than 15 minutes — activation energy for "work for an hour" is dramatically higher than "just 5 minutes."

```typescript
interface MicroSprint {
  taskId: string;
  durationMinutes: 5 | 10 | 15;
  breakMinutes: 2 | 5;
  completedSprints: number;
  streak: number;
}

function generateNudge(sprint: MicroSprint): string {
  if (sprint.completedSprints === 0) return "Just 5 minutes. Ready?";
  if (sprint.completedSprints === 1) return "One done! Keep going?";
  if (sprint.streak >= 3) return `${sprint.streak}-sprint streak! Take a break?`;
  return `${sprint.completedSprints} done. Another round?`;
}
```

Design rationale: initial prompt uses shortest duration; post-first celebrates before asking for more; at 3+ consecutive sprints, suggest a break to prevent hyperfocus burnout.

### 4.2 Momentum Building (Small Wins Chain)

Order tasks so the first completable item takes under 2 minutes. Completion generates dopamine and reduces perceived weight of remaining tasks.

```typescript
function sortForMomentum(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    const aQuick = (a.estimatedMinutes ?? Infinity) <= 2 ? 0 : 1;
    const bQuick = (b.estimatedMinutes ?? Infinity) <= 2 ? 0 : 1;
    if (aQuick !== bQuick) return aQuick - bQuick;
    return b.priority - a.priority;
  });
}
```

### 4.3 External Working Memory

Never rely on the user remembering where they left off — show them:
- Always display current task context (what am I working on?)
- Show breadcrumb trails (how did I get here?)
- Persist draft state automatically (what was I typing?)
- Surface recent items prominently (what did I do last?)

### 4.4 Reducing Context-Switching Costs

Every interruption costs 15-25 minutes of refocus time (Gloria Mark, UC Irvine). Design for deep work:
- "Focus mode" suppressing non-critical notifications
- Deferred notification queue delivering at natural break points
- Single-task views hiding navigation during active work
- Re-entry summaries after breaks ("You were editing Section 3, paragraph 2")

---

## 5. Motivation Scaffolding

Motivation is a design variable, not a personality trait. Build it through environmental cues.

### 5.1 Progress Bars

Always show progress >0%. An empty bar feels hopeless. The "endowed progress effect" (Nunes & Dreze, 2006) increases completion rates by 15-20%.

```typescript
function calculateDisplayProgress(completed: number, total: number): number {
  return Math.min(Math.max(completed / total, 0.05), 1.0);
}
```

```css
.progress-bar {
  transition: width 0.6s cubic-bezier(0.22, 1, 0.36, 1);
  min-width: 5%;
}
.progress-bar[data-complete="true"] {
  animation: celebrate 0.8s ease-out;
}
@keyframes celebrate {
  0%, 100% { transform: scaleX(1); }
  50% { transform: scaleX(1.02); }
}
```

### 5.2 Streak Counters with Grace Periods

Losing a streak causes permanent churn. Always include a grace period — at minimum, 1 missed day without breaking the streak.

```typescript
interface StreakState {
  currentStreak: number;
  longestStreak: number;
  lastActivityDate: string;  // ISO date
  gracePeriodUsed: boolean;
}

function updateStreak(state: StreakState, today: string): StreakState {
  const daysDiff = Math.floor(
    (new Date(today).getTime() - new Date(state.lastActivityDate).getTime()) / 86_400_000,
  );

  if (daysDiff <= 1) {
    const newStreak = daysDiff === 0 ? state.currentStreak : state.currentStreak + 1;
    return { currentStreak: newStreak, longestStreak: Math.max(state.longestStreak, newStreak), lastActivityDate: today, gracePeriodUsed: false };
  }
  if (daysDiff === 2 && !state.gracePeriodUsed) {
    const newStreak = state.currentStreak + 1;
    return { currentStreak: newStreak, longestStreak: Math.max(state.longestStreak, newStreak), lastActivityDate: today, gracePeriodUsed: true };
  }
  return { currentStreak: 1, longestStreak: state.longestStreak, lastActivityDate: today, gracePeriodUsed: false };
}
```

### 5.3 Celebration Moments

Deploy animations at milestones only — first task completed, streak milestones (7, 30, 100 days), level-ups, project completions. Overuse causes celebration fatigue.

### 5.4 Social Proof

"3 teammates completed this today" motivates more than "1,000 users completed this." Proximity amplifies social proof. Use the closest reference group: team > department > company > all users.

### 5.5 Variable Reward Schedules

Unexpected positive feedback activates dopamine more strongly than predictable rewards. Schedule at random intervals (~1 in 5-7 eligible interactions, max 1 per session). Optimize for task completion, not time-in-app.

---

## 6. Time-Boxing UX

Time-boxing transforms open-ended work into bounded sprints. The constraint reduces anxiety and increases output.

### 6.1 Pomodoro Integration

```typescript
interface TimeBox {
  taskId: string;
  workMinutes: number;
  breakMinutes: number;
  startedAt: number;
  state: 'working' | 'break' | 'paused' | 'complete';
}

function getTimeRemaining(box: TimeBox, now: number): number {
  const elapsed = (now - box.startedAt) / 60_000;
  const duration = box.state === 'break' ? box.breakMinutes : box.workMinutes;
  return Math.max(duration - elapsed, 0);
}
```

Support standard Pomodoro (25/5) with customization. Starting a timer should be as easy as starting the task.

### 6.2 Deadline-Aware Interfaces

Gentle urgency, not panic. Color-code by proximity: green (>3 days), amber (1-3 days), red (<1 day). Never use countdown timers for deadlines unless the user explicitly opted in.

### 6.3 Time Estimates

Display estimated time on every task. Reduces planning anxiety and enables matching tasks to available time slots.

### 6.4 Quick-Win Sorting

Sort by estimated duration ascending. Users who are stuck often have motivation but cannot find a starting point.

---

## 7. Opt-Out Completion

The moment a flow feels coercive, trust evaporates. Design every multi-step process with exits.

- **"Save and finish later" always visible** — a styled button, not a hidden link
- **No countdown pressure** unless user explicitly opted in
- **Graceful degradation** — auto-save partial state; resume exactly where the user left off
- **Exit surveys: 1 question max**, never blocking, "Skip" as the most prominent option
- **No guilt language** — never "Are you sure?" or "You'll lose your progress!" Instead: "Your progress is saved. Come back anytime."

```html
<div class="flow-footer">
  <button class="btn-primary" type="submit">Continue</button>
  <button class="btn-secondary" type="button" data-action="save-and-exit">
    Save and finish later
  </button>
</div>

<dialog class="exit-dialog">
  <p>Your progress is saved. You can pick up right where you left off.</p>
  <button class="btn-primary" data-action="leave">Leave</button>
  <button class="btn-ghost" data-action="stay">Keep working</button>
</dialog>
```

### 7.1 Partial State Persistence

```typescript
interface PartialFlowState {
  flowId: string;
  currentStep: number;
  totalSteps: number;
  data: Record<string, unknown>;
  savedAt: number;
}

function resumeOrStart(flowId: string, totalSteps: number): PartialFlowState {
  const saved = localStorage.getItem(`flow_state_${flowId}`);
  if (saved) {
    const parsed: PartialFlowState = JSON.parse(saved);
    const thirtyDays = 30 * 24 * 60 * 60 * 1000;
    if (Date.now() - parsed.savedAt < thirtyDays) return parsed;
  }
  return { flowId, currentStep: 0, totalSteps, data: {}, savedAt: Date.now() };
}
```

---

## 8. Notification Design

A notification that does not lead to an immediate, valuable action is not a nudge — it is an interruption.

### 8.1 Batch Over Individual

Batch non-urgent notifications into daily or weekly digests. Individual pings for non-urgent events cause fatigue.

### 8.2 Actionable Only

| Notification Type | Actionable? | Verdict |
|-------------------|-------------|---------|
| "Task assigned to you" | Yes — open task | Send |
| "You haven't logged in for 3 days" | No — guilt trip | Do not send |
| "Your report is ready" | Yes — download | Send |
| "Just checking in!" | No — no action | Do not send |
| "3 tasks due tomorrow" | Yes — review tasks | Send |
| "Someone liked your post" | Marginal | Batch into digest |

### 8.3 User-Controlled Frequency

Per-category toggles, not just global on/off. Default to the least intrusive channel (in-app badge, not push).

### 8.4 Smart Timing

Never send during focus hours. Infer quiet hours from usage patterns when not explicitly set.

```typescript
function shouldSendNow(
  quietStart: number, quietEnd: number, currentHour: number,
): boolean {
  if (quietStart < quietEnd) {
    return currentHour < quietStart || currentHour >= quietEnd;
  }
  // Wraps midnight (e.g., 22:00-07:00)
  return currentHour >= quietEnd && currentHour < quietStart;
}
```

---

## 9. Anti-Patterns

These patterns masquerade as nudges but violate user autonomy or cause psychological harm.

**9.1 Overwhelming Task Dumps.** Showing the entire backlog on login. Users cannot process 50 items — they process 0 and close the app.

**9.2 Guilt-Driven Notifications.** "You haven't logged in for 3 days!" weaponizes absence. Instead, on return: "Welcome back. Here's where you left off."

**9.3 Infinite Scroll Without Progress.** Without a position indicator ("30 of 120"), users lose spatial awareness.

**9.4 Forced Completion Flows.** No exit means the user is trapped, not nudged. Every step must offer "Save and finish later."

**9.5 Dark Patterns Disguised as Nudges.** Pre-checked upgrades, confirm-shaming ("No thanks, I don't want to save money"). Test: would the user thank you for this default?

**9.6 Gamification That Punishes.** Losing streaks, negative scoring, public shame leaderboards. Gamification should only add — never subtract from baseline.

**9.7 Social Pressure Notifications.** "Everyone else has finished!" creates anxiety. Social proof should inspire, not shame.

**9.8 Arbitrary Urgency.** "Only 2 left!" when there are 2,000. Fake scarcity permanently erodes trust.

**9.9 Dopamine Hijacking.** Variable rewards optimized for time-in-app rather than task completion. That is manipulation, not nudging.

**9.10 Asymmetric Friction.** Signup in one click, cancellation in seven steps. Opt-in and opt-out must require symmetric effort.

---

## 10. Implementation Checklist

- [ ] Each nudge targets exactly one behavior
- [ ] The nudge operates on System 1 (fast, automatic)
- [ ] Default values serve the user's interest, not the business's
- [ ] Users can override every default with minimal friction
- [ ] Consent-sensitive choices are never pre-selected
- [ ] Progress indicators show >0% from the start
- [ ] Streaks include a grace period of at least 1 missed day
- [ ] Notifications are actionable — "what should I do?" has a clear answer
- [ ] No guilt language in any user-facing copy
- [ ] Exit is always available, visible, and preserves partial state
- [ ] Time pressure is opt-in only
- [ ] Social proof uses proximate reference groups
- [ ] Variable rewards optimize for task completion, not time-in-app
- [ ] Opt-in and opt-out require symmetric effort
- [ ] The nudge passes the "would the user thank you?" test

---

## 11. Measuring Nudge Effectiveness

| Metric | What It Measures | Healthy Signal |
|--------|-----------------|----------------|
| Task completion rate | Did the nudge help finish? | Increase without time-in-app increase |
| Time to first action | Did it reduce activation energy? | Decrease |
| Return rate (7-day) | Did it build habit? | Increase |
| Opt-out rate | Did it feel coercive? | Below 5% |
| Feature discovery | Did it surface hidden value? | Feature adoption increase |
| Reported satisfaction | Did it feel helpful? | No decrease |

If a nudge increases engagement but decreases satisfaction, it is not a nudge — it is a manipulation. Remove it.
