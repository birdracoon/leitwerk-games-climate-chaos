#!/usr/bin/env bash
# Runs on the VPS. Checks GitHub, builds a Podman image and switches the
# container only after the new image answers its HTTP health check.

set -Eeuo pipefail

CONFIG_FILE="${CLIMATE_CHAOS_CONFIG:-/etc/climate-chaos.env}"
FORCE_UPDATE=0

if [[ "${1:-}" == "--force" ]]; then
    FORCE_UPDATE=1
elif [[ $# -gt 0 ]]; then
    echo "Usage: $0 [--force]" >&2
    exit 2
fi

[[ -r "$CONFIG_FILE" ]] || { echo "Missing configuration: $CONFIG_FILE" >&2; exit 1; }
# shellcheck disable=SC1090
source "$CONFIG_FILE"

: "${REPO_URL:?REPO_URL is required}"
: "${REPO_BRANCH:=main}"
: "${APP_DIR:=/opt/climate-chaos}"
: "${CONTAINER_NAME:=climate-chaos}"
: "${IMAGE_NAME:=localhost/climate-chaos}"
: "${APP_PORT:=4300}"
: "${PROXY_NETWORK:=npm_default}"
: "${NEXT_PUBLIC_STORAGE_MODE:=local}"
: "${NEXT_PUBLIC_API_URL:=}"

[[ "$APP_DIR" == /* && "$APP_DIR" != "/" ]] \
    || { echo "APP_DIR must be an absolute, non-root path." >&2; exit 1; }
[[ "$APP_PORT" =~ ^[0-9]+$ ]] && (( APP_PORT >= 1 && APP_PORT <= 65535 )) \
    || { echo "APP_PORT is invalid: $APP_PORT" >&2; exit 1; }
[[ "$PROXY_NETWORK" =~ ^[a-zA-Z0-9_.-]+$ ]] \
    || { echo "PROXY_NETWORK is invalid: $PROXY_NETWORK" >&2; exit 1; }

REPOSITORY_DIR="$APP_DIR/repository"
STATE_DIR="$APP_DIR/state"
CURRENT_COMMIT_FILE="$STATE_DIR/current-commit"
LOCK_FILE="/run/lock/climate-chaos-update.lock"
log() { printf '[climate-chaos] %s\n' "$*"; }
die() { log "ERROR: $*" >&2; exit 1; }

for command_name in git podman curl flock; do
    command -v "$command_name" >/dev/null 2>&1 || die "Required command not found: $command_name"
done

mkdir -p "$APP_DIR" "$STATE_DIR"
if [[ "${CLIMATE_CHAOS_UPDATE_LOCKED:-0}" != "1" ]]; then
    lock_status=0
    flock --exclusive --nonblock --close --conflict-exit-code 75 \
        "$LOCK_FILE" env \
        CLIMATE_CHAOS_UPDATE_LOCKED=1 \
        CLIMATE_CHAOS_CONFIG="$CONFIG_FILE" \
        "$0" "$@" || lock_status=$?

    if [[ "$lock_status" -eq 75 ]]; then
        if [[ "$FORCE_UPDATE" -eq 1 ]]; then
            die "Another update is already running."
        fi
        log "Another update is already running; skipping."
        exit 0
    fi
    exit "$lock_status"
fi

remote_commit="$(git ls-remote "$REPO_URL" "refs/heads/$REPO_BRANCH" | awk 'NR == 1 { print $1 }')"
[[ "$remote_commit" =~ ^[0-9a-f]{40}$ ]] || die "Could not resolve branch '$REPO_BRANCH' from GitHub."

current_commit=""
[[ -f "$CURRENT_COMMIT_FILE" ]] && current_commit="$(<"$CURRENT_COMMIT_FILE")"

if [[ "$FORCE_UPDATE" -eq 0 && "$remote_commit" == "$current_commit" ]] \
    && podman container exists "$CONTAINER_NAME" \
    && [[ "$(podman inspect --format '{{.State.Running}}' "$CONTAINER_NAME")" == "true" ]]; then
    log "Already current at ${remote_commit:0:12}."
    exit 0
fi

log "Preparing commit ${remote_commit:0:12} from $REPO_BRANCH."
if [[ ! -d "$REPOSITORY_DIR/.git" ]]; then
    rm -rf "$REPOSITORY_DIR"
    git clone --no-checkout --filter=blob:none "$REPO_URL" "$REPOSITORY_DIR"
fi

git -C "$REPOSITORY_DIR" remote set-url origin "$REPO_URL"
git -C "$REPOSITORY_DIR" fetch --depth=1 origin "$remote_commit"
git -C "$REPOSITORY_DIR" checkout --detach --force "$remote_commit"
git -C "$REPOSITORY_DIR" clean -fdx

image_tag="$IMAGE_NAME:${remote_commit:0:12}"
log "Building $image_tag."
podman build \
    --network=host \
    --pull=always \
    --build-arg "NEXT_PUBLIC_STORAGE_MODE=$NEXT_PUBLIC_STORAGE_MODE" \
    --build-arg "NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL" \
    --tag "$image_tag" \
    --file "$REPOSITORY_DIR/Containerfile" \
    "$REPOSITORY_DIR"

previous_name="${CONTAINER_NAME}-previous"
previous_image=""
podman network exists "$PROXY_NETWORK" \
    || die "Podman network '$PROXY_NETWORK' does not exist. Start Nginx Proxy Manager first."
podman rm --force --ignore "$previous_name"
if podman container exists "$CONTAINER_NAME"; then
    previous_image="$(podman inspect --format '{{.ImageName}}' "$CONTAINER_NAME")"
    podman stop --time 20 "$CONTAINER_NAME"
    podman rename "$CONTAINER_NAME" "$previous_name"
fi

rollback() {
    log "New container failed its health check; rolling back."
    podman rm --force --ignore "$CONTAINER_NAME"
    if podman container exists "$previous_name"; then
        podman rename "$previous_name" "$CONTAINER_NAME"
        podman start "$CONTAINER_NAME"
    fi
}

if ! podman run --detach \
    --name "$CONTAINER_NAME" \
    --restart=unless-stopped \
    --env "PORT=$APP_PORT" \
    --publish "0.0.0.0:${APP_PORT}:${APP_PORT}" \
    --network "$PROXY_NETWORK" \
    --network-alias "$CONTAINER_NAME" \
    --label "org.opencontainers.image.revision=$remote_commit" \
    "$image_tag"; then
    rollback
    die "Could not start the new container."
fi

healthy=0
for _ in {1..30}; do
    if podman exec "$CONTAINER_NAME" node -e \
        "fetch('http://127.0.0.1:${APP_PORT}/climate-chaos/').then((response) => { if (!response.ok) process.exit(1); }).catch(() => process.exit(1));"; then
        healthy=1
        break
    fi
    sleep 2
done

if [[ "$healthy" -ne 1 ]]; then
    podman logs --tail 100 "$CONTAINER_NAME" >&2 || true
    rollback
    die "Health check failed inside container on port $APP_PORT"
fi

printf '%s\n' "$remote_commit" > "$CURRENT_COMMIT_FILE"
podman rm --force --ignore "$previous_name"
if [[ -n "$previous_image" && "$previous_image" != "$image_tag" ]]; then
    podman image rm "$previous_image" >/dev/null 2>&1 || true
fi
podman image prune --force >/dev/null
log "Deployment of ${remote_commit:0:12} completed successfully."
