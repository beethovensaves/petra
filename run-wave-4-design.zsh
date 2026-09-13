#!/bin/zsh
set -euo pipefail

design_root=${0:A:h}
backend_root=${design_root%-design}
pinned_node=/opt/homebrew/opt/node@24/bin/node

export PATH=/opt/homebrew/opt/node@24/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin
cd "$design_root"
exec "$pinned_node" "$backend_root/scripts/wave-handoff.mjs" worker --role design --wave 4
