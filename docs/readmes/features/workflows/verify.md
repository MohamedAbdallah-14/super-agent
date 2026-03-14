# verify

**Phase 11 — No completion claim without deterministic proof.**

![Phase](https://img.shields.io/badge/phase-11%20of%2014-blue)
![Role](https://img.shields.io/badge/role-verifier-orange)
![Gate](https://img.shields.io/badge/gate-hard%20%E2%98%85-red)
![Status](https://img.shields.io/badge/status-stable-green)

---

## One-Line Purpose

Produce a deterministic, artifact-backed proof that every acceptance criterion claimed to be satisfied by execution is actually satisfied — because "it works" is not evidence.

---

## Pipeline Position

```
  EXECUTE
    │
    ▼
┌────────┐
│ VERIFY │  ◄── YOU ARE HERE
└────────┘
    │
    ▼
  REVIEW  ★ gate
    │
    ▼
  LEARN ...
```

---

## Role Responsible

`verifier`

The verifier does not review code quality, architecture choices, or style. It confirms one thing: did execution produce outcomes that satisfy the acceptance criteria? This requires running real commands and capturing real output — not reading code and reasoning about whether it would work.

---

## Trigger

One or more execution batches are complete. The execution notes artifact exists with task completion statuses.

---

## Steps

1. **Load the acceptance criteria from the spec.** This is the verification target. Every AC in scope must be verified.

2. **Load the execution notes.** The notes list what was changed and what per-task verification was run. The verifier confirms these verification steps were valid and ran to completion.

3. **Run verification for each acceptance criterion.** For each AC:
   - Identify the relevant changed files
   - Run the relevant test command(s), lint command(s), or visual check
   - Capture the output

4. **Map test output to acceptance criteria.** Each AC must map to at least one piece of captured output (test result, command output, screenshot). ACs without mapped output are unverified.

5. **Run the full test suite.** Even if per-AC verification passes, the full suite must run clean. Regressions in adjacent functionality are execution failures.

6. **Produce the verification proof artifact.** For each AC: verdict (pass/fail), the command run, and the captured output. A proof artifact must be reproducible — another verifier following the same steps should produce the same result.

---

## Input Artifacts

| Artifact | Location | Required |
|----------|----------|----------|
| Changed files | Repo (working branch) | Yes |
| Claimed outcomes / execution notes | Run state | Yes |
| Acceptance criteria (from spec) | Run state | Yes |

---

## Output Artifacts

| Artifact | Description |
|----------|-------------|
| Verification proof artifact | Per-AC: verdict, command run, captured output |

---

## Approval Gate

> [!IMPORTANT]
> **No completion claim can be made without a fresh verification proof artifact.** Stale proof (proof from a prior run before the most recent code changes) is not valid. The proof artifact must be produced against the current working branch state.

A partial proof — where some ACs are verified and others are labelled "assumed passing" — is a verification failure. Every AC in scope must have explicit proof.

---

## Example Run

**Acceptance criteria (abbreviated):**
```
AC-1: Toggle visible at all viewport widths.
AC-2: Toggle switches scheme within one render cycle.
AC-3: Preference persists in localStorage across sessions and new tabs.
AC-4: Correct rendering at 768px breakpoint.
AC-5: Toggle back to light restores original scheme.
AC-6: No existing light mode styles broken.
```

**Verification proof artifact:**

```
## AC-1 — Toggle visibility
Command: `npm test src/layouts/DashboardLayout.integration.test.tsx`
Output:
  ✓ toggle renders at 320px viewport (12ms)
  ✓ toggle renders at 1280px viewport (8ms)
  2 tests passed
Verdict: PASS

## AC-2 — Scheme switches within one render cycle
Command: `npm test src/components/DarkModeToggle.test.tsx`
Output:
  ✓ clicking toggle applies data-theme="dark" without page reload (15ms)
  1 test passed
Verdict: PASS

## AC-3 — localStorage persistence
Command: `npm test src/hooks/useDarkMode.test.ts`
Output:
  ✓ theme value persists after localStorage clear/re-read simulation (9ms)
  ✓ new tab simulation reads stored theme on mount (11ms)
  2 of 6 relevant tests; full suite: 6/6 passed
Verdict: PASS

## AC-4 — 768px rendering
Command: `npm test DarkModeToggle -- --viewport=768`
Output:
  ✓ touch target ≥ 44px at 768px (snapshot match) (18ms)
  ✓ focus ring visible at 768px (snapshot match) (14ms)
  2 tests passed
Verdict: PASS

## AC-5 — Toggle back to light
Command: `npm test src/hooks/useDarkMode.test.ts`
Output:
  ✓ toggling from dark to light removes data-theme attribute (8ms)
  1 test passed
Verdict: PASS

## AC-6 — No regressions
Command: `npm test`
Output: 147 tests, 147 passed, 0 failed, 0 skipped
Verdict: PASS

## Overall: ALL ACs PASS — proof is fresh against branch dark-mode-feature
```

---

## Common Mistakes

| Mistake | Impact | Prevention |
|---------|--------|------------|
| Running verification against the wrong branch | Proof is valid for a different state than what ships | Always confirm branch before running verify |
| Mapping test names to ACs without running the tests | Proof is fabricated; review will be based on false evidence | Run every command and capture actual output — never assume |
| Marking an AC as "implicitly covered" | The AC has no proof; review cannot confirm it | Every AC needs explicit proof; no implicit coverage |
| Using stale proof from before the last code change | The proof does not reflect current branch state | Re-run verification after every code change |
| Stopping at per-task verification without running the full suite | Regressions go undetected until review or production | Full suite is always the final step |

---

## Related

- [Overview — All Workflows](README.md)
- [Previous: execute](execute.md)
- [Next: review](review.md)
- [Roles and Workflows](../../../concepts/roles-and-workflows.md)
