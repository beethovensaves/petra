#!/bin/zsh
set -euo pipefail

backend_root=${0:A:h}
pinned_node=/opt/homebrew/opt/node@24/bin/node

export PATH=/opt/homebrew/opt/node@24/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin
cd "$backend_root"
exec "$pinned_node" scripts/wave-handoff.mjs worker --role backend --wave 4
