# context-pack

![CI](https://github.com/anup4khandelwal/context-pack/actions/workflows/ci.yml/badge.svg)
![npm](https://img.shields.io/npm/v/context-pack)

Prepare an optimal, task-specific context bundle from a repository for Claude Code and OpenAI Codex.

## Install

```bash
npm install -g context-pack
```

## Quickstart

Global install:

```bash
npm install -g context-pack
context-pack bundle --task "Add Reddit OAuth + ingest pipeline" --budget 14000
```

npx:

```bash
npx -y context-pack bundle --task "Add Reddit OAuth + ingest pipeline" --budget 14000
```

## Output

Generates `.context-pack/` in the repo:

- `bundle.md`   → copy/paste friendly context for LLMs
- `bundle.json` → structured representation
- `explain.md`  → why each file was included

## Why it exists

LLMs perform poorly when given too many files, irrelevant files, missing entrypoints, or noisy diffs.
`context-pack` deterministically selects, ranks, and packages the most relevant files within a strict token budget.

## How it works (minimal)

Heuristics (v1):
- Git relevance: recently changed, co-changed files
- Semantic relevance: filename/path/symbol matches to task text
- Dependency proximity: import relationships
- Structural importance: entrypoints, config, manifests
- Noise elimination: .gitignore, build outputs, node_modules, tests excluded by default

Token budgeting:
- Estimate tokens per file
- Stop when budget is reached
- Degrade gracefully: full → trimmed → signature-only

## Commands

- `context-pack bundle --task "<task>" [--budget N]`
- `context-pack scan --task "<task>"`
- `context-pack explain`

## Examples

```bash
context-pack bundle --task "Add Reddit OAuth + ingest pipeline" --budget 1000
context-pack scan --task "Refactor config loader" --limit 25
context-pack explain
```

See `docs/examples/` for sample outputs.

## Troubleshooting

- Ensure you ran `npm run build` before invoking the CLI from `dist/`.
- If the bundle is empty, try increasing `--budget` or refining the task description.

## How to release

See `RELEASE.md` for the full checklist.

## Docs

- Codex workflows: `docs/codex.md`
- Claude Code plugin wrapper: `docs/claude-plugin.md`
- Release checklist: `RELEASE.md`

## Integrations

- MCP server: `integrations/mcp/README.md`
- GitHub Action (PR comment): `integrations/github-action/README.md`
- VS Code extension: `integrations/vscode/README.md`
