#!/usr/bin/env bash
# Bootstraps or updates the Climate Chaos deployment on the Netcup VPS.
# Compatible with Bash and Zsh when invoked as an executable.

set -Eeuo pipefail

SSH_TARGET="netcup"
REPO_URL="https://github.com/birdracoon/leitwerk-games-climate-chaos.git"
REPO_BRANCH="main"
APP_PORT="4300"
PROXY_NETWORK="npm_default"
UPDATE_INTERVAL="15min"
STORAGE_MODE="local"
API_URL=""

usage() {
    cat <<'EOF'
Usage: ./scripts/deploy-netcup.sh [options]

  --ssh-target HOST       SSH config host (default: netcup)
  --repo-url URL          Git repository URL
  --branch NAME           Branch to deploy (default: main)
  --app-port PORT         Application port (default: 4300)
  --proxy-network NAME    Podman network used by NPM (default: npm_default)
  --update-interval TIME  systemd timer interval, e.g. 15min or 1h
  --storage-mode MODE     Next.js build setting: local or backend
  --api-url URL           Public backend URL for backend mode
  --help                  Show this help
EOF
}

while [[ $# -gt 0 ]]; do
    case "$1" in
        --ssh-target) SSH_TARGET="$2"; shift 2 ;;
        --repo-url) REPO_URL="$2"; shift 2 ;;
        --branch) REPO_BRANCH="$2"; shift 2 ;;
        --app-port) APP_PORT="$2"; shift 2 ;;
        --proxy-network) PROXY_NETWORK="$2"; shift 2 ;;
        --update-interval) UPDATE_INTERVAL="$2"; shift 2 ;;
        --storage-mode) STORAGE_MODE="$2"; shift 2 ;;
        --api-url) API_URL="$2"; shift 2 ;;
        --help) usage; exit 0 ;;
        *) echo "Unknown option: $1" >&2; usage >&2; exit 2 ;;
    esac
done

[[ "$APP_PORT" =~ ^[0-9]+$ ]] && (( APP_PORT >= 1 && APP_PORT <= 65535 )) \
    || { echo "Invalid port: $APP_PORT" >&2; exit 2; }
[[ "$PROXY_NETWORK" =~ ^[a-zA-Z0-9_.-]+$ ]] \
    || { echo "Invalid proxy network: $PROXY_NETWORK" >&2; exit 2; }
[[ "$STORAGE_MODE" == "local" || "$STORAGE_MODE" == "backend" ]] \
    || { echo "--storage-mode must be 'local' or 'backend'." >&2; exit 2; }
[[ "$UPDATE_INTERVAL" =~ ^[0-9]+(s|min|h|d|w)$ ]] \
    || { echo "Invalid update interval: $UPDATE_INTERVAL" >&2; exit 2; }

for command_name in ssh scp; do
    command -v "$command_name" >/dev/null 2>&1 \
        || { echo "Required command not found: $command_name" >&2; exit 1; }
done

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
REMOTE_UPDATER="/usr/local/sbin/climate-chaos-update"
TEMP_UPDATER="/tmp/climate-chaos-update.$$"
LOCAL_CONFIG="$(mktemp)"
TEMP_CONFIG="/tmp/climate-chaos.env.$$"

cleanup() {
    rm -f "$LOCAL_CONFIG"
    ssh "$SSH_TARGET" "rm -f '$TEMP_UPDATER' '$TEMP_CONFIG'" >/dev/null 2>&1 || true
}
trap cleanup EXIT

echo "[1/4] Checking SSH connection to $SSH_TARGET ..."
ssh "$SSH_TARGET" true

echo "[2/4] Uploading update script ..."
scp "$SCRIPT_DIR/update-netcup.sh" "$SSH_TARGET:$TEMP_UPDATER"

printf '%q\n' \
    "REPO_URL=$REPO_URL" \
    "REPO_BRANCH=$REPO_BRANCH" \
    "APP_DIR=/opt/climate-chaos" \
    "CONTAINER_NAME=climate-chaos" \
    "IMAGE_NAME=localhost/climate-chaos" \
    "APP_PORT=$APP_PORT" \
    "PROXY_NETWORK=$PROXY_NETWORK" \
    "NEXT_PUBLIC_STORAGE_MODE=$STORAGE_MODE" \
    "NEXT_PUBLIC_API_URL=$API_URL" > "$LOCAL_CONFIG"
scp "$LOCAL_CONFIG" "$SSH_TARGET:$TEMP_CONFIG"

echo "[3/4] Installing Podman deployment and update timer ..."
ssh "$SSH_TARGET" bash -s -- "$TEMP_UPDATER" "$TEMP_CONFIG" "$REMOTE_UPDATER" "$UPDATE_INTERVAL" <<'REMOTE_SCRIPT'
set -Eeuo pipefail
temp_updater="$1"
temp_config="$2"
remote_updater="$3"
update_interval="$4"

export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get install --yes podman git curl ca-certificates

install -o root -g root -m 0755 "$temp_updater" "$remote_updater"
rm -f "$temp_updater"
install -o root -g root -m 0600 "$temp_config" /etc/climate-chaos.env
rm -f "$temp_config"
chmod 0600 /etc/climate-chaos.env

# UFW can otherwise block queries to Podman's aardvark-dns even though both
# containers are attached to the same bridge network.
# shellcheck disable=SC1091
source /etc/climate-chaos.env
if command -v ufw >/dev/null 2>&1 \
    && ufw status | grep -q '^Status: active' \
    && podman network exists "$PROXY_NETWORK"; then
    proxy_interface="$(podman network inspect "$PROXY_NETWORK" --format '{{.NetworkInterface}}')"
    ufw allow in on "$proxy_interface" to any port 53 proto udp comment 'Podman container DNS'
    ufw allow in on "$proxy_interface" to any port 53 proto tcp comment 'Podman container DNS'
fi

cat > /etc/systemd/system/climate-chaos-update.service <<EOF
[Unit]
Description=Check and deploy Climate Chaos from GitHub
Wants=network-online.target
After=network-online.target

[Service]
Type=oneshot
TimeoutStartSec=infinity
ExecStart=$remote_updater
EOF

cat > /etc/systemd/system/climate-chaos-update.timer <<EOF
[Unit]
Description=Periodically update Climate Chaos

[Timer]
OnBootSec=5min
OnUnitActiveSec=$update_interval
RandomizedDelaySec=2min
Persistent=true
Unit=climate-chaos-update.service

[Install]
WantedBy=timers.target
EOF

systemctl daemon-reload
systemctl enable --now podman-restart.service
systemctl enable --now climate-chaos-update.timer
REMOTE_SCRIPT

echo "[4/4] Running initial deployment ..."
ssh "$SSH_TARGET" "$REMOTE_UPDATER --force"

echo "Deployment completed. Nginx Proxy Manager upstream: climate-chaos:$APP_PORT"
