# Marketplace Listings Guide

This guide covers every distribution channel for SuperAgent.

---

## Install Methods

### npm (primary)

```bash
npx @superagent-os/cli --help          # run directly
npm install -g @superagent-os/cli      # or install globally
```

- **Package:** [`@superagent-os/cli`](https://www.npmjs.com/package/@superagent-os/cli)

### Homebrew (macOS)

```bash
brew tap MohamedAbdallah-14/superagent
brew install superagent
```

- **Tap repo:** [`homebrew-superagent`](https://github.com/MohamedAbdallah-14/homebrew-superagent)
- **Formula source:** `homebrew/superagent.rb` in this repo

### Claude Code Plugin

SuperAgent ships as a Claude Code plugin. Users install in two steps:

```bash
# In Claude Code:
/plugin marketplace add MohamedAbdallah-14/super-agent
/plugin install superagent
```

- **Marketplace config:** `.claude-plugin/marketplace.json`
- **Plugin manifest:** `.claude-plugin/plugin.json`
- **Docs:** [Claude Code plugin marketplaces](https://code.claude.com/docs/en/plugin-marketplaces)

---

## Host Exports

SuperAgent generates host-native packages for each AI coding agent. After cloning and running `npx superagent export build`, deploy to your project:

| Host | Deploy command |
|------|---------------|
| **Claude** | `cp -r exports/hosts/claude/.claude ~/your-project/ && cp exports/hosts/claude/CLAUDE.md ~/your-project/` |
| **Codex** | `cp exports/hosts/codex/AGENTS.md ~/your-project/` |
| **Gemini** | `cp exports/hosts/gemini/GEMINI.md ~/your-project/` |
| **Cursor** | `cp -r exports/hosts/cursor/.cursor ~/your-project/` |

---

## MCP Registry

SuperAgent is listed in the MCP Registry as a metadata entry.

- **Config file:** `server.json` (repo root)
- **Schema:** `https://registry.modelcontextprotocol.io/schema/server.json`

---

## Post-Publish Checklist

Run through this checklist after every `npm publish`:

- [ ] **npm:** Confirm package is live at `https://www.npmjs.com/package/@superagent-os/cli`
- [ ] **npx smoke test:** Run `npx @superagent-os/cli --help` from a clean environment
- [ ] **Claude Code Plugin:** Run `/plugin marketplace add MohamedAbdallah-14/super-agent` then `/plugin install superagent`
- [ ] **GitHub Release:** Ensure a GitHub Release exists with tag matching the npm version
- [ ] **Homebrew:** Update SHA256 in `homebrew/superagent.rb` and push to `homebrew-superagent` tap repo
- [ ] **Host exports:** Run `npx superagent export --check` to verify no drift
- [ ] **CHANGELOG:** Verify `CHANGELOG.md` is updated with the new version entry
