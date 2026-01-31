# Integrations

## MCP server

- Tool name: `context_pack_bundle`
- Run: `node integrations/mcp/server.mjs`
- Register:

```bash
codex mcp add context-pack --command "node /absolute/path/to/integrations/mcp/server.mjs"
```

## GitHub Action (PR comment)

Comment on a PR:

```
/context-pack task="Add pagination" budget=12000
```

The workflow posts `bundle.md` and `explain.md` in a PR comment or links to artifacts.

## VS Code

Command: **Context Pack: Generate Bundle (Copy to Clipboard)**

```
cd integrations/vscode
npm install
npm run build
```
