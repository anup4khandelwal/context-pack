# Codex workflows

```bash
context-pack bundle --task "<task>" --budget 14000
codex exec --model gpt-4.1 --input .context-pack/bundle.md -- "Outline required changes"
```

## MCP (via context-pack server)

Register the MCP server:

```bash
codex mcp add context-pack --command "node /absolute/path/to/integrations/mcp/server.mjs"
```

Then invoke the tool in Codex with:

```
Use the MCP tool context_pack_bundle with task "..."
```
