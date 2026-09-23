#!/bin/zsh

set -euo pipefail

readonly PETRA_ROOT="${0:A:h}"
readonly PETRA_NODE_BIN="/opt/homebrew/opt/node@24/bin"
readonly PETRA_NODE="${PETRA_NODE_BIN}/node"
readonly PETRA_NPM="${PETRA_NODE_BIN}/npm"

if [[ ! -x "${PETRA_NODE}" || ! -x "${PETRA_NPM}" ]]; then
  print -u2 "PETRA requires Homebrew Node 24 at ${PETRA_NODE_BIN}."
  exit 1
fi

cd "${PETRA_ROOT}"

export PATH="${PETRA_NODE_BIN}:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin"
export npm_config_script_shell="/bin/zsh"

typeset -i PETRA_PORTS_AVAILABLE=1
for PETRA_PORT in 4310 4311; do
  PETRA_LISTENERS="$(/usr/sbin/lsof -nP -iTCP:${PETRA_PORT} -sTCP:LISTEN -t 2>/dev/null || true)"
  if [[ -n "${PETRA_LISTENERS}" ]]; then
    print -u2 "Port ${PETRA_PORT} is already used by PID(s): ${PETRA_LISTENERS//$'\n'/, }."
    PETRA_PORTS_AVAILABLE=0
  fi
done

if (( PETRA_PORTS_AVAILABLE == 0 )); then
  print -u2 "Stop the listed process before starting PETRA in this window."
  exit 1
fi

print "Starting PETRA from ${PETRA_ROOT}"
print "Workbench: http://localhost:4311/"
print "Server:    http://127.0.0.1:4310/"
print "Press Control-C once to stop both processes."

exec "${PETRA_NPM}" run dev --script-shell=/bin/zsh
