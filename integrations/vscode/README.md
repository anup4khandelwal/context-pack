# VS Code extension

Command: **Context Pack: Generate Bundle (Copy to Clipboard)**

## Quickstart

```bash
cd integrations/vscode
npm install
npm run build
```

Then press `F5` in VS Code to launch the Extension Development Host.

## Behavior

- Prompts for task + budget
- Runs `context-pack bundle --out .context-pack`
- Copies `.context-pack/bundle.md` to clipboard
- Shows a success notification

If `context-pack` is not installed globally, it falls back to `npx -y context-pack`.
