# Claude Code plugin wrapper

This repo includes a thin Claude Code plugin wrapper that runs `context-pack` and
emits `.context-pack/bundle.md`, `.context-pack/bundle.json`, and `.context-pack/explain.md`.

## Install

Copy the `claude-plugin/` folder to your Claude Code plugins directory and enable it:

```bash
cp -R claude-plugin ~/.claude/plugins/context-pack
```

## Usage

From Claude Code, run the skill:

```
Use the context-pack skill to generate a bundle for task: <task>
```

The plugin script calls `context-pack` if installed, otherwise falls back to `npx -y context-pack`.

## Notes

- Output goes to `.context-pack/` in the target repo.
- The plugin only generates the bundle; Claude Code should read `bundle.md`.
