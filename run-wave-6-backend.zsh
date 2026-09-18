#!/bin/zsh
set -euo pipefail

backend_root=${0:A:h}
pinned_node=/opt/homebrew/opt/node@24/bin/node

export PATH=/opt/homebrew/opt/node@24/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin
cd "$backend_root"

branch=$(git rev-parse --abbrev-ref HEAD)
if [[ "$branch" != "main" ]]; then
  print -u2 "Wave 6 backend launcher must run from the main worktree; found $branch."
  exit 2
fi

printf '\033]0;Petra Wave 6 Backend\007'
"$pinned_node" scripts/wave-handoff.mjs doctor --wave 6 --max-slices 64
exec "$pinned_node" scripts/wave-handoff.mjs worker --role backend --wave 6 --max-slices 64
