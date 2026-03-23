#!/bin/bash
# Run daily summary for Oracle/server deployment.
# Cron: 5 21 * * * /path/to/mama_whatsapp/deploy/run-summary.sh

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

export PATH="${PATH:-/usr/bin:/bin}"
export HEADLESS=true
export NODE_ENV=production
export NODE_OPTIONS="${NODE_OPTIONS:---max-old-space-size=256}"

exec node node_modules/tsx/dist/cli.mjs src/index.ts summary
