# Marketplace Listings Guide

This guide covers every distribution channel for SuperAgent, split into automated (config-driven) and manual-submission channels.

---

## Automated (Config-Based) Channels

### Claude Code Plugin

SuperAgent ships as a first-class Claude Code plugin.

- **Config file:** `.claude-plugin/plugin.json`
- **Install command:** `/plugin install superagent`
- **Publishing:** Automatic on `npm publish` -- the Claude Code plugin registry reads from npm.
- **Verification:** After publishing, run `/plugin install superagent` in a fresh Claude Code session and confirm all skills load.

### MCP Registry

The MCP Registry is the canonical directory for Model Context Protocol servers.

- **Config file:** `server.json` (repo root)
- **Schema:** `https://registry.modelcontextprotocol.io/schema/server.json`
- **Publish command:**
  ```bash
  npx mcp-publisher publish
  ```
- **Verification:** Search for "superagent" at `https://registry.modelcontextprotocol.io` after publishing.

### Smithery.ai

Smithery is a marketplace for MCP-compatible tools and servers.

- **Config file:** `smithery.yaml` (repo root)
- **Publish command:**
  ```bash
  smithery mcp publish
  ```
- **Verification:** Confirm the listing appears at `https://smithery.ai` with correct metadata (name, description, tags, version).

---

## Manual Submission Channels

### Cursor Marketplace

- **Submission URL:** `https://cursor.com/marketplace/publish`
- **Package source:** `exports/hosts/cursor/`
- **Steps:**
  1. Ensure `exports/hosts/cursor/` contains the latest generated rules and settings.
  2. Navigate to the Cursor Marketplace publish page.
  3. Upload the packaged export and fill in metadata (name, description, version, screenshots).
  4. Submit for review.
- **Turnaround:** Typically 1-3 business days for initial review.

### Codex CLI Skills

- **Submission URL:** `https://developers.openai.com/codex/skills/`
- **Package source:** `exports/hosts/codex/`
- **Steps:**
  1. Ensure `exports/hosts/codex/` contains the latest generated instructions and configs.
  2. Log in to the OpenAI developer portal.
  3. Navigate to the Codex Skills section and create a new skill listing.
  4. Upload the package, provide metadata, and submit.
- **Notes:** Follow OpenAI's skill packaging guidelines for file structure requirements.

### Gemini CLI Extensions

- **Install mechanism:** `gemini extensions install <GitHub URL>`
- **Discovery:** Auto-discovered by GitHub stars and activity metrics.
- **Steps:**
  1. Ensure `exports/hosts/gemini/` is up to date.
  2. Verify the GitHub repo is public and the README clearly describes installation.
  3. Users install directly from the repo URL -- no separate submission portal.
- **Boosting discovery:** Star count, forks, and recent commit activity influence ranking.

### skills.sh

- **Discovery:** Auto-discovered from public GitHub repos.
- **Install command:**
  ```bash
  npx skills add MohamedAbdallah-14/super-agent
  ```
- **Steps:**
  1. Ensure the repo is public on GitHub.
  2. Verify the `package.json` has correct `name`, `description`, and `keywords` fields.
  3. No manual submission required -- skills.sh indexes public repos automatically.
- **Verification:** Run the install command above and confirm skills load correctly.

### Homebrew (macOS)

**Setup (one-time, after first npm publish):**

1. Create repo `homebrew-superagent` on GitHub
2. Get the SHA256 of the npm tarball:
   ```bash
   curl -sL https://registry.npmjs.org/@superagent-os/cli/-/cli-0.1.0.tgz | shasum -a 256
   ```
3. Update the SHA256 in `homebrew/superagent.rb`
4. Copy `homebrew/superagent.rb` to `homebrew-superagent/Formula/superagent.rb`
5. Push to GitHub

**Users install:**
```bash
brew tap MohamedAbdallah-14/superagent
brew install superagent
```

---

## Post-Publish Checklist

Run through this checklist after every `npm publish`:

- [ ] **npm:** Confirm package is live at `https://www.npmjs.com/package/@superagent-os/cli`
- [ ] **npx smoke test:** Run `npx @superagent-os/cli --version` from a clean environment
- [ ] **Claude Code Plugin:** Run `/plugin install superagent` and verify skills load
- [ ] **MCP Registry:** Run `npx mcp-publisher publish` and verify listing
- [ ] **Smithery:** Run `smithery mcp publish` and verify listing
- [ ] **GitHub Release:** Ensure a GitHub Release exists with tag matching the npm version
- [ ] **Cursor Marketplace:** If major release, re-submit updated package from `exports/hosts/cursor/`
- [ ] **Codex Skills:** If major release, re-submit updated package from `exports/hosts/codex/`
- [ ] **Gemini:** Verify `exports/hosts/gemini/` is current in the latest commit
- [ ] **skills.sh:** Run `npx skills add MohamedAbdallah-14/super-agent` to confirm discovery
- [ ] **Homebrew:** Update SHA256 in `homebrew/superagent.rb` and push to `homebrew-superagent` tap repo
- [ ] **CHANGELOG:** Verify `CHANGELOG.md` is updated with the new version entry
- [ ] **Social announcement:** Post release notes to relevant channels (see launch checklist)
