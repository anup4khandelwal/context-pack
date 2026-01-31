# context-pack

Generate a context bundle for Claude Code.

## Usage

```
pack.sh "<task>" [repo] [budget]
```

Examples:

```
pack.sh "Add Reddit OAuth + ingest pipeline"
pack.sh "Refactor config loader" /path/to/repo 14000
```

## Output

- `.context-pack/bundle.md`
- `.context-pack/bundle.json`
- `.context-pack/explain.md`

After running, instruct Claude Code to read `.context-pack/bundle.md`.
