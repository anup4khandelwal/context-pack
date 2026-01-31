# Codex CLI workflows

This repo ships `context-pack` and can be used with Codex CLI in two modes.

## Interactive workflow

1) Generate a bundle

```bash
context-pack bundle --task "<task>" --budget 14000
```

2) Point Codex at the bundle

```bash
codex
```

Then in the Codex prompt:

```
Please read .context-pack/bundle.md and proceed.
```

## Non-interactive (codex exec)

Use the bundle as context for a single command:

```bash
codex exec --model gpt-4.1 --input .context-pack/bundle.md -- "<your command>"
```

Example:

```bash
context-pack bundle --task "Add Reddit OAuth + ingest pipeline" --budget 14000
codex exec --model gpt-4.1 --input .context-pack/bundle.md -- "Outline required code changes"
```
