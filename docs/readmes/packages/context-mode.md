# context-mode

> An optional Claude Code plugin that provides context compression and sandboxed code execution tools for managing large conversation windows.

[![Claude Code Plugin](https://img.shields.io/badge/claude--code-plugin-blue)]()
[![Install mode](https://img.shields.io/badge/install-external-orange)]()
[![Status](https://img.shields.io/badge/adapter-optional-lightgrey)]()

## What is context-mode?

context-mode is a Claude Code plugin that addresses one of the fundamental constraints of LLM-based coding agents: context window exhaustion. As a conversation grows — through tool outputs, file reads, test results, and back-and-forth clarification — the context window fills up, forcing the agent to either compact (summarize and lose detail) or stop.

context-mode provides tools that let the agent process files and run code in a sandboxed environment where only the relevant output enters the main context window. Instead of reading a 500-line file verbatim (consuming 500 lines of context), the agent can execute a targeted extraction script against the file and receive only the 10 lines it actually needed. This is the core trade: spend a tool call to save context space.

The plugin also provides an indexing and search surface for large codebases, allowing the agent to find relevant content by semantic or keyword search rather than reading files speculatively.

## Why SuperAgent References context-mode

SuperAgent's manifest declares context-mode as an optional external adapter:

```yaml
adapters:
  context_mode:
    enabled_by_default: false
    required: false
    install_mode: external
    package_presence: optional
```

This declaration is intentional and conservative. SuperAgent does not depend on context-mode for any of its core operations. The built-in indexing (`superagent index`), recall (`superagent recall`), and capture surfaces are designed to stand on their own without this adapter. The adapter entry in the manifest exists to:

1. **Document the integration point**: Operators who already use context-mode can layer it on top of SuperAgent without conflict.
2. **Track the dependency surface**: The manifest schema validates that only known adapters are declared, preventing undocumented external dependencies from accumulating silently.
3. **Signal opt-in semantics**: `enabled_by_default: false` and `package_presence: optional` tell the tooling that context-mode must never be assumed to be present and must never be required for the core workflow to function.

The SuperAgent docs explicitly state: "Use the built-in SuperAgent context reduction path first. Treat context-mode as an optional host-specific enhancement, not a required dependency or product center."

## How SuperAgent Relates to It

context-mode surfaces appear in the SuperAgent codebase in two ways:

**1. Manifest adapter registration**

The adapter is declared in `superagent.manifest.yaml` and validated against the adapter schema in `schemas/superagent-manifest.schema.json`. The schema defines the allowed adapter shape:

```json
"adapter": {
  "type": "object",
  "required": ["enabled_by_default", "required", "install_mode", "package_presence"],
  "properties": {
    "enabled_by_default": { "type": "boolean" },
    "required": { "type": "boolean" },
    "install_mode": { "enum": ["external"] },
    "package_presence": { "enum": ["optional"] }
  }
}
```

Both `install_mode` and `package_presence` are constrained to `"external"` and `"optional"` respectively — the schema enforces that no adapter can be declared as required or bundled.

**2. Test fixture declarations**

Every test fixture that constructs a synthetic manifest includes the context-mode adapter declaration to match the schema requirements:

```js
adapters: {
  context_mode: {
    enabled_by_default: false,
    required: false,
    install_mode: 'external',
    package_presence: 'optional',
  },
},
```

This appears in both `tooling/test/validate.test.js` and `tooling/test/export.test.js`.

**3. Hook hints in this conversation**

The `PreToolUse:Read` hook in this session adds a context tip pointing toward context-mode's `execute_file` tool as a way to process large files without loading their full content into context. This is context-mode working as designed — the hook system informing the agent of available optimization tools.

## Key Concepts

**Sandboxed execution**: context-mode's `execute_file` and `execute` tools run code in a restricted sandbox. Only stdout is returned to the main context. This prevents accidental side effects while enabling targeted data extraction.

**Context budget management**: The guiding principle of context-mode is that context window space is a finite resource. Every file read, tool output, and conversation turn consumes it. context-mode provides alternatives to full-verbatim reads.

**Opt-in only**: SuperAgent enforces this at the manifest schema level. No adapter can be declared as required. The system must be fully functional without any adapter installed.

**Lazy integration**: If context-mode is present, the agent can use its tools. If it is absent, the agent falls back to standard file reading and native indexing. No code paths in SuperAgent's tooling check for or depend on context-mode being available.

## Integration Pattern

When context-mode is installed alongside SuperAgent, the recommended usage pattern is:

- Use `execute_file` for large files (>50 lines) where only a subset of content is needed — the `PreToolUse:Read` hook tip surfaces this heuristic automatically.
- Use `search` for finding relevant files across a large codebase before reading them.
- Use `index` to pre-process a project root so that recall queries return targeted results.
- Continue using SuperAgent's built-in `superagent recall` for artifact-specific retrieval.

The two systems are complementary: context-mode handles general context compression; SuperAgent's built-in indexing handles structured artifact and role/workflow retrieval specific to the SuperAgent operating model.

## Adapter Validation

Every `superagent validate manifest` run confirms the adapter declaration:

```
$ superagent validate manifest
Manifest is valid.
```

If the `context_mode` adapter block is removed from the manifest, the schema validation fails because `context_mode` is declared as a required key in the `adapters` object in `schemas/superagent-manifest.schema.json`. This ensures the operator cannot accidentally delete the adapter declaration and lose the documented integration surface.

## Resources

- [SuperAgent adapter documentation](../../adapters/context-mode.md)
- [SuperAgent manifest schema](../../../schemas/superagent-manifest.schema.json)
- [context-mode adapter entry in manifest](../../../superagent.manifest.yaml)
