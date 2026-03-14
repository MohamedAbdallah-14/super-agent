# gray-matter

> Parse front-matter from a string or file. Fast, reliable, and lightweight, with zero dependencies.

[![npm version](https://img.shields.io/npm/v/gray-matter)](https://www.npmjs.com/package/gray-matter)
[![license](https://img.shields.io/npm/l/gray-matter)](https://github.com/jonschlinkert/gray-matter/blob/master/LICENSE)
[![downloads](https://img.shields.io/npm/dm/gray-matter)](https://www.npmjs.com/package/gray-matter)

## What is gray-matter?

gray-matter parses YAML, TOML, JSON, or custom front-matter from the top of Markdown and text files. Front-matter is the block of structured metadata between `---` delimiters at the start of a file, a convention popularized by static site generators like Jekyll and Hugo and now pervasive across developer tooling, documentation systems, and AI context files.

When you call `matter(string)`, it returns two things: the `data` object (the parsed front-matter block) and the `content` string (everything after the closing delimiter). This clean separation lets consumers treat the same file as both structured configuration and prose documentation without any ambiguity about where one ends and the other begins.

gray-matter handles edge cases that naive split-on-`---` approaches miss: files with no front-matter, files where the front-matter block contains literal `---` inside YAML block scalars, files starting with a BOM, and files using alternative delimiters like `+++` for TOML.

## Why SuperAgent Uses gray-matter

SuperAgent's skill files (`skills/*/SKILL.md`) are the canonical mechanism for delivering structured, in-context operating procedures to AI hosts. Each skill file combines two concerns in a single document:

1. A YAML front-matter block declaring the skill's `name` and `description` — structured fields consumed by the skills registry and the `Skill` tool dispatcher.
2. A Markdown body — the human- and AI-readable procedure that the agent follows when the skill is invoked.

Keeping both in one file is intentional: it eliminates drift between "the metadata that describes the skill" and "the instructions the skill contains." gray-matter is the only reliable way to split those two parts back out programmatically.

Every skill file in `skills/` follows this structure:

```markdown
---
name: sa:tdd
description: Enforces RED -> GREEN -> REFACTOR for implementation work
---

# TDD

...prose instructions...
```

gray-matter parses that file and returns `{ data: { name: 'sa:tdd', description: '...' }, content: '# TDD\n\n...' }`.

## How SuperAgent Uses It

gray-matter is consumed by the skill validation and registry tooling that reads `skills/*/SKILL.md` files. The `data` fields are what the tooling checks against the skills registry — confirming that every declared skill has a matching file with the correct `name` field. The `content` is what gets served to the AI host at invocation time.

A representative usage pattern from the SuperAgent tooling:

```js
import matter from 'gray-matter';
import fs from 'node:fs';

function loadSkill(skillPath) {
  const raw = fs.readFileSync(skillPath, 'utf8');
  const { data, content } = matter(raw);

  return {
    name: data.name,
    description: data.description,
    body: content.trim(),
  };
}
```

The `validate.test.js` test suite checks that skill files start with `---` (confirming front-matter presence) and that the `name` and `description` fields are present:

```js
test('design skill file exists and has frontmatter', () => {
  const content = fs.readFileSync(skillPath, 'utf8');
  assert.ok(content.startsWith('---'), 'missing YAML frontmatter');
  assert.ok(content.includes('name: design'), 'missing name in frontmatter');
  assert.ok(content.includes('description:'), 'missing description in frontmatter');
});
```

## Key Concepts

**Front-matter delimiters**: By default gray-matter expects `---` (YAML), but also supports `+++` (TOML) and `{` (JSON). SuperAgent uses YAML exclusively for skill front-matter.

**`data` vs `content`**: `data` is the parsed front-matter object; `content` is the raw Markdown body after the closing delimiter. Both are available on every parse result.

**`isEmpty`**: gray-matter returns `isEmpty: true` when no front-matter block is present. This is useful for validating that every skill file actually has metadata.

**`stringify`**: gray-matter can serialize back to a front-matter string with `matter.stringify(content, data)`. This is useful for programmatic generation of skill files.

**Custom engines**: gray-matter accepts a custom engine map so you can replace the default `js-yaml` parser with your own. SuperAgent does not use this — it relies on the default YAML engine.

## API Reference (SuperAgent-relevant subset)

| API | Usage in SuperAgent |
|-----|---------------------|
| `matter(string)` | Parse a raw skill file string into `{ data, content }` |
| `result.data` | The front-matter fields: `name`, `description` |
| `result.content` | The Markdown body delivered to the AI host |
| `result.isEmpty` | Check whether a skill file is missing its front-matter block |
| `matter.stringify(content, data)` | Serialize a skill body + metadata back to a single file |

## Common Patterns

**Single-file skill documents**: Store both skill metadata (for tooling) and skill instructions (for the AI host) in one `.md` file. Parse with gray-matter to separate them without duplicating content across files.

**Front-matter validation gate**: After parsing, immediately validate that `data.name` and `data.description` are present and non-empty before accepting the file as a valid skill. Fail loudly on malformed skills rather than silently serving incomplete ones.

**Round-trip generation**: When programmatically generating or updating skill files, use `matter.stringify` to ensure the front-matter block is always correctly formatted rather than manually constructing `---\nkey: value\n---`.

## Alternatives Considered

| Package | Why not chosen |
|---------|---------------|
| `front-matter` | Older, YAML-only, less actively maintained |
| Manual `split('---')` | Fragile — breaks on `---` inside YAML block scalars, BOMs, and empty files |
| `vfile` + `remark-frontmatter` | Full remark pipeline is overkill for reading a single structured field |
| `yaml` alone | Cannot split front-matter from body — requires manual parsing of delimiters |

## Resources

- [GitHub](https://github.com/jonschlinkert/gray-matter)
- [npm](https://www.npmjs.com/package/gray-matter)
