# MCP server integration

This folder exposes a stdio MCP server with the tool `context_pack_bundle`.

## Install

```bash
cd integrations/mcp
npm install
```

## Run locally

```bash
node server.mjs
```

## Tool

`context_pack_bundle` inputs:
- `repoPath` (string, optional; default cwd)
- `task` (string, required)
- `budget` (number, optional; default 14000)
- `format` ("md" | "json" | "both", optional; default both)

Returns:
- `bundleMd` (string, if requested)
- `bundleJson` (object, if requested)
- `explainMd` (string)
- `outputDir` (string)

## Codex CLI registration

Example:

```bash
codex mcp add context-pack --command "node /absolute/path/to/integrations/mcp/server.mjs"
```

List:

```bash
codex mcp list
```
