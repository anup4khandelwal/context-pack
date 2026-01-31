#!/usr/bin/env bash
set -euo pipefail

TASK=${1:-}
BUDGET=${2:-14000}

if [[ -z "$TASK" ]]; then
  echo "Usage: pack.sh \"<task>\" [budget]" >&2
  exit 1
fi

node "$(dirname "$0")/pack.mjs" "$TASK" "$BUDGET"
