# context-pack

Prepare an optimal, task-specific context bundle from a repository for Claude Code and OpenAI Codex.

## Quickstart

```bash
npm install -g context-pack
context-pack bundle --task "Add Reddit OAuth + ingest pipeline" --budget 14000
```

or

```bash
npx -y context-pack bundle --task "Add Reddit OAuth + ingest pipeline" --budget 14000
```

## Output

Outputs `.context-pack/` in the repo:

- `bundle.md`
- `bundle.json`
- `explain.md`

## Why it exists

LLMs degrade when given too much or irrelevant code. `context-pack` deterministically selects relevant files within a strict token budget.

## How it works

- Git relevance
- Semantic relevance (filename/path/symbols)
- Dependency proximity
- Structural importance (entrypoints/config/manifests)
- Noise elimination (.gitignore, build outputs, tests excluded by default)

## Commands

- `context-pack bundle --task "<task>" [--budget N]`
- `context-pack scan --task "<task>"`
- `context-pack explain`

## Integrations

- MCP server: `integrations/mcp/README.md`
- GitHub Action (PR comment): `integrations/github-action/README.md`
- VS Code extension: `integrations/vscode/README.md`
