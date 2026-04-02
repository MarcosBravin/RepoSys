#!/usr/bin/env sh
set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
cd "$SCRIPT_DIR"

if [ ! -d "node_modules" ] || [ ! -d "server/node_modules" ]; then
  npm run install:all
fi

npm run dev
