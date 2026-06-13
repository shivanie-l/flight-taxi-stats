#!/bin/bash
export PATH="$HOME/.local/opt/node/bin:$PATH"
cd "$(dirname "$0")"
exec npm run dev
