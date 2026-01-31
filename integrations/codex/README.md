# Codex workflows

## Interactive workflow

1) Generate a bundle:

```bash
context-pack bundle --task "<task>" --budget 14000 --out .context-pack
```

2) Run Codex:

```bash
codex
```

Prompt:

```
Read .context-pack/bundle.md and proceed with the task.
```

## Non-interactive workflow (codex exec)

```bash
context-pack bundle --task "<task>" --budget 14000 --out .context-pack
codex exec --model gpt-4.1 --input .context-pack/bundle.md -- "Outline required code changes"
```

## MCP-enabled workflow

Register the MCP server:

```bash
codex mcp add context-pack --command "node /absolute/path/to/integrations/mcp/dist/server.js"
```

Prompt:

```
Call context_pack_bundle with task="..." budget=14000 format="both". Then proceed.
```
