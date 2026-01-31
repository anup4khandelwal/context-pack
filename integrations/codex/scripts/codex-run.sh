#!/usr/bin/env bash
set -euo pipefail

TASK=${1:-}
BUDGET=${2:-14000}

if [[ -z "$TASK" ]]; then
  echo "Usage: codex-run.sh \"<task>\" [budget]" >&2
  exit 1
fi

context-pack bundle --task "$TASK" --budget "$BUDGET" --out .context-pack
codex exec --model gpt-4.1 --input .context-pack/bundle.md -- "Read the bundle and propose the next steps."
