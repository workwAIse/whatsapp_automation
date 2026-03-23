#!/bin/bash
# Run hourly tick for Oracle/server deployment.
# Cron: 0 * * * * /path/to/mama_whatsapp/deploy/run-tick.sh

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

export PATH="${PATH:-/usr/bin:/bin}"
export HEADLESS=true
export NODE_ENV=production
export NODE_OPTIONS="${NODE_OPTIONS:---max-old-space-size=256}"

exec node node_modules/tsx/dist/cli.mjs src/index.ts tick
