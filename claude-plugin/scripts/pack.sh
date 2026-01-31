#!/usr/bin/env bash
set -euo pipefail

TASK=${1:-}
REPO=${2:-$(pwd)}
BUDGET=${3:-}

if [[ -z "$TASK" ]]; then
  echo "Usage: pack.sh \"<task>\" [repo] [budget]" >&2
  exit 1
fi

if command -v context-pack >/dev/null 2>&1; then
  if [[ -n "$BUDGET" ]]; then
    context-pack bundle --task "$TASK" --repo "$REPO" --budget "$BUDGET"
  else
    context-pack bundle --task "$TASK" --repo "$REPO"
  fi
else
  if [[ -n "$BUDGET" ]]; then
    npx -y context-pack bundle --task "$TASK" --repo "$REPO" --budget "$BUDGET"
  else
    npx -y context-pack bundle --task "$TASK" --repo "$REPO"
  fi
fi

echo "Bundle ready. Please read .context-pack/bundle.md" >&2
