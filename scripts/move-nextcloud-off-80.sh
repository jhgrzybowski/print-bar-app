#!/usr/bin/env bash
set -euo pipefail

HTTP_PORT="${NEXTCLOUD_HTTP_PORT:-8081}"
HTTPS_PORT="${NEXTCLOUD_HTTPS_PORT:-}"

usage() {
  cat <<'USAGE'
Usage:
  scripts/move-nextcloud-off-80.sh
  scripts/move-nextcloud-off-80.sh --rollback

Environment:
  NEXTCLOUD_HTTP_PORT   HTTP port to move Nextcloud to. Defaults to 8081.
  NEXTCLOUD_HTTPS_PORT  Optional HTTPS port to set, for example 8443.
USAGE
}

port_in_use() {
  ss -ltn "sport = :$1" | awk 'NR > 1 { found = 1 } END { exit found ? 0 : 1 }'
}

require_nextcloud_snap() {
  command -v snap >/dev/null || {
    echo "snap command is not available" >&2
    exit 1
  }
  snap list nextcloud >/dev/null 2>&1 || {
    echo "nextcloud snap is not installed" >&2
    exit 1
  }
}

move_nextcloud() {
  require_nextcloud_snap
  if port_in_use "$HTTP_PORT"; then
    echo "Port $HTTP_PORT is already in use. Set NEXTCLOUD_HTTP_PORT to a free port." >&2
    exit 1
  fi

  echo "Current Nextcloud ports:"
  sudo snap get nextcloud ports || true

  if [[ -n "$HTTPS_PORT" ]]; then
    sudo snap set nextcloud "ports.http=$HTTP_PORT" "ports.https=$HTTPS_PORT"
  else
    sudo snap set nextcloud "ports.http=$HTTP_PORT"
  fi
  sudo snap restart nextcloud

  echo "Updated Nextcloud ports:"
  sudo snap get nextcloud ports
}

rollback_nextcloud() {
  require_nextcloud_snap
  sudo snap set nextcloud ports.http=80 ports.https=443
  sudo snap restart nextcloud
  sudo snap get nextcloud ports
}

case "${1:-}" in
  "")
    move_nextcloud
    ;;
  "--rollback")
    rollback_nextcloud
    ;;
  "-h" | "--help")
    usage
    ;;
  *)
    usage >&2
    exit 2
    ;;
esac
