# Discovery and Launch Checklist

End-to-end checklist for launching a SuperAgent release into the wild.

---

## 1. Pre-Launch Verification

Complete these before any public announcement:

- [ ] **npx works:** Run `npx @superagent-os/cli --version` from a clean machine (no local clone).
- [ ] **GitHub Release exists:** A tagged release with release notes is published on the repo.
- [ ] **README polished:** README.md has clear install instructions, feature summary, and badges (npm version, license, CI status).
- [ ] **CHANGELOG updated:** Latest version entry is present with all notable changes.
- [ ] **CI green:** All tests and linting pass on the main branch.
- [ ] **Marketplace configs published:** All automated channels from the marketplace listings guide are live (MCP Registry, Smithery, Claude Code Plugin).
- [ ] **Host exports current:** `exports/hosts/` directories contain the latest generated configs for all supported hosts.
- [ ] **License file present:** `LICENSE` matches the declared license in `package.json`.

---

## 2. Awesome List Submissions

Submit pull requests to these curated lists (one PR per list, follow each repo's contributing guidelines):

### awesome-claude-code
- **Repo:** `github.com/anthropics/awesome-claude-code` (or the most-starred community fork)
- **Section:** Tools / Plugins / Extensions
- **Entry format:** `[SuperAgent](https://github.com/MohamedAbdallah-14/super-agent) - Host-native engineering OS kit with 10 roles, 14 phases, and 255 expertise modules.`
- **Tips:** Keep the description under 120 characters. Link directly to the repo.

### awesome-ai-agents
- **Repo:** `github.com/e2b-dev/awesome-ai-agents`
- **Section:** Developer Tools / Coding Agents
- **Entry format:** Follow the existing table format in the README.

### awesome-llm-apps
- **Repo:** `github.com/Shubhamsaboo/awesome-llm-apps`
- **Section:** Developer Tools
- **Entry format:** Follow the existing list format.

---

## 3. Hacker News "Show HN"

### Timing
- **Best days:** Tuesday through Thursday
- **Best time:** 8:00-9:00 AM ET (when the US East Coast audience is waking up)
- **Avoid:** Weekends, holidays, and days with major tech news

### Title format
```
Show HN: SuperAgent – Engineering OS kit for AI coding agents (Claude, Codex, Gemini, Cursor)
```

### First comment
Post a comment immediately after submission explaining:
1. What problem SuperAgent solves (AI agents lack structured engineering workflows)
2. How it works (10 canonical roles, 14-phase pipeline, 255 expertise modules)
3. What makes it different (host-native, works across Claude/Codex/Gemini/Cursor)
4. Quick install: `npx @superagent-os/cli init`
5. Invite feedback -- HN readers appreciate genuine requests for input

### Guidelines
- Do not ask for upvotes (against HN rules).
- Respond to every comment within the first 2 hours.
- Be honest about limitations and what is not yet built.

---

## 4. Dev.to Technical Post

### Suggested outline

**Title:** "How I Built an Engineering OS for AI Coding Agents"

1. **Hook** -- The problem: AI agents write code but lack engineering discipline.
2. **Architecture overview** -- 10 roles, 14 phases, expertise modules, quality gates.
3. **Code walkthrough** -- Show a real workflow: how a feature moves from requirements through TDD to deployment.
4. **Host-native approach** -- Explain why one kit works across Claude, Codex, Gemini, and Cursor.
5. **Results** -- Concrete metrics or before/after comparisons.
6. **Getting started** -- `npx @superagent-os/cli init` with a 3-step quickstart.
7. **Call to action** -- Star the repo, try it, file issues.

### Tags
`ai`, `productivity`, `devtools`, `opensource`

### Tips
- Include at least one diagram or screenshot.
- Cross-post to your blog if you have one (Dev.to supports canonical URLs).
- Respond to all comments within 24 hours.

---

## 5. Social Media

### Twitter / X Thread

Structure as a 5-7 tweet thread:

1. **Hook tweet:** One-liner about the problem + link to repo.
2. **What it is:** Brief description of SuperAgent.
3. **Architecture:** 10 roles, 14 phases, 255 modules (include a diagram image).
4. **Demo:** Short GIF or screenshot of a workflow in action.
5. **Multi-host:** Works with Claude, Codex, Gemini, and Cursor.
6. **Install:** `npx @superagent-os/cli init`
7. **Ask:** "What workflows would you add?" -- invite engagement.

**Timing:** Post between 9-11 AM ET on weekdays.

### LinkedIn

- Write a single long-form post (not a thread).
- Lead with the problem, not the product.
- Include 3-5 bullet points on key features.
- End with the install command and repo link.
- Tag relevant people and companies (Anthropic, OpenAI, Google DeepMind).

### Reddit

Submit to these subreddits (read each sub's rules first):

| Subreddit | Post type | Notes |
|-----------|-----------|-------|
| r/ClaudeAI | Link post | Flair as "Tool/Resource" if available |
| r/LocalLLaMA | Text post | Emphasize the open-source, host-agnostic angle |
| r/programming | Link post | Focus on engineering discipline, not AI hype |
| r/devtools | Link post | Emphasize developer productivity |

**Reddit guidelines:**
- Do not post to multiple subreddits on the same day (looks spammy).
- Space posts 1-2 days apart.
- Engage genuinely with all comments.
- Do not use marketing language -- be technical and direct.

---

## 6. Metrics to Track

Monitor these metrics weekly for the first month, then monthly:

### GitHub
- **Stars:** Track weekly growth rate, not just total.
- **Forks:** Indicator of serious users exploring the code.
- **Issues opened:** Both bugs and feature requests signal engagement.
- **Pull requests:** External PRs indicate community adoption.
- **Clones and traffic:** Available in the repo Insights tab.

### npm
- **Weekly downloads:** Available at `npmjs.com/package/@superagent-os/cli`.
- **Download trend:** Use `npm-stat.com` for historical charts.
- **Dependent packages:** Other packages that list SuperAgent as a dependency.

### Marketplace
- **Claude Code Plugin installs:** Check plugin analytics if available.
- **MCP Registry page views:** Monitor via registry dashboard.
- **Smithery installs/views:** Check Smithery analytics dashboard.
- **Cursor Marketplace installs:** Available in the Cursor publisher dashboard.

### Content
- **HN points and comments:** Track within 24 hours of posting.
- **Dev.to views, reactions, and comments:** Track within 1 week.
- **Twitter impressions and engagement:** Track within 48 hours.
- **Reddit upvotes and comments:** Track within 48 hours per subreddit.

### Success benchmarks (first 30 days)
| Metric | Target |
|--------|--------|
| GitHub stars | 100+ |
| npm weekly downloads | 50+ |
| Issues opened (external) | 10+ |
| External PRs | 2+ |
| HN points | 50+ |
