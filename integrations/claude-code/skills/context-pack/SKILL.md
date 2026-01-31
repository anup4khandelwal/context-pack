# context-pack

Generate a context bundle for a task using the context-pack CLI.

## Usage

```
pack.sh "<task>" [budget]
```

Examples:

```
pack.sh "Add Reddit OAuth + ingest pipeline" 14000
pack.sh "Refactor config loader"
```

## Output

- `.context-pack/bundle.md`
- `.context-pack/bundle.json`
- `.context-pack/explain.md`

After generating, ask Claude to read `.context-pack/bundle.md`.
