#!/bin/zsh
set -euo pipefail

repository_root="${0:A:h}"
export PATH="/opt/homebrew/opt/node@24/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin"

cd "$repository_root"
exec npm run inspect:wave6
