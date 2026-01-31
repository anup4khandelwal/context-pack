# Claude Code plugin

Copy the plugin folder:

```bash
cp -R claude-plugin ~/.claude/plugins/context-pack
```

Run:

```
Use the context-pack skill to generate a bundle for task: <task>
```

## Notes

- The plugin calls the CLI and writes `.context-pack/` in the repo.
- It copies `bundle.md` for Claude Code to read.
