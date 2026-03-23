#!/bin/zsh
export PATH="/opt/homebrew/bin:/opt/homebrew/sbin:/usr/local/bin:/usr/bin:/bin"
cd "/Users/alexbuchel/projects/mama_whatsapp"
exec /opt/homebrew/bin/node node_modules/tsx/dist/cli.mjs src/index.ts summary
