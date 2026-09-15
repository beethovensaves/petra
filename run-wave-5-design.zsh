#!/bin/zsh
set -euo pipefail

design_root=${0:A:h}
backend_root=${design_root%-design}
pinned_node=/opt/homebrew/opt/node@24/bin/node

export PATH=/opt/homebrew/opt/node@24/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin
cd "$design_root"

branch=$(git rev-parse --abbrev-ref HEAD)
if [[ "$branch" != "design/m1-ux" ]]; then
  print -u2 "Wave 5 design launcher must run from the design worktree; found $branch."
  exit 2
fi

printf '\033]0;Petra Wave 5 Design\007'
"$pinned_node" "$backend_root/scripts/wave-handoff.mjs" doctor --wave 5 --max-slices 32
exec "$pinned_node" "$backend_root/scripts/wave-handoff.mjs" worker --role design --wave 5 --max-slices 32
