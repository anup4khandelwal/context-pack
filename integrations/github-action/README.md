# GitHub Action integration

This workflow responds to PR comments like:

```
/context-pack task="Add pagination to Orders API" budget=12000
```

## Setup

1) Ensure `context-pack` is in the repo and builds to `dist/`.
2) Add the workflow file (see `.github/workflows/context-pack-comment.yml`).
3) Configure `NPM_TOKEN` if you plan to publish; not required for this workflow.

## Permissions

The workflow:
- Only responds to PR comments
- Only runs for collaborators or the PR author
- Skips PRs from forks by default

## Notes

If bundle output is large, the workflow uploads `.context-pack/` as an artifact and links to the workflow run.
