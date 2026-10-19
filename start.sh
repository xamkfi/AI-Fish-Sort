#!/usr/bin/env bash
# Starts MySQL and the AI Fish Sort app with Podman (Bazzite equivalent of the .bat scripts).
# Usage:
#   ./start.sh            # start existing containers (or create them if missing)
#   ./start.sh --rebuild  # rebuild the app image from current code and restart it
set -euo pipefail
cd "$(dirname "$0")"

MYSQL_NAME=aifishsort_mysql
APP_NAME=ai-fish-sort-api
APP_IMAGE=ai-fish-sort-api
DB_PASSWORD=K4l4L4j1ttelu0nK1v44

# --- MySQL ---
if podman container exists "$MYSQL_NAME"; then
  podman start "$MYSQL_NAME" >/dev/null
else
  podman run -d --name "$MYSQL_NAME" --restart unless-stopped \
    -e MYSQL_ROOT_PASSWORD="$DB_PASSWORD" \
    -e MYSQL_DATABASE=aifishsortdb \
    -p 3306:3306 \
    -v aifishsort_mysql_data:/var/lib/mysql \
    docker.io/library/mysql:8.0 >/dev/null
fi

echo "Waiting for MySQL to accept connections..."
for _ in $(seq 1 60); do
  if podman exec "$MYSQL_NAME" mysqladmin ping -uroot -p"$DB_PASSWORD" --silent 2>/dev/null; then
    echo "MySQL ready."
    break
  fi
  sleep 2
done

# --- App ---
if [ "${1:-}" = "--rebuild" ]; then
  podman rm -f "$APP_NAME" 2>/dev/null || true
  podman build -t "$APP_IMAGE" .
  podman run -d --name "$APP_NAME" --restart unless-stopped \
    -p 3000:3000 --env-file .env -e NODE_ENV=production \
    -e DB_HOST="${FISH_DB_HOST:-host.containers.internal}" localhost/"$APP_IMAGE":latest >/dev/null
elif podman container exists "$APP_NAME"; then
  podman start "$APP_NAME" >/dev/null
else
  podman run -d --name "$APP_NAME" --restart unless-stopped \
    -p 3000:3000 --env-file .env -e NODE_ENV=production \
    -e DB_HOST="${FISH_DB_HOST:-host.containers.internal}" localhost/"$APP_IMAGE":latest >/dev/null
fi

podman ps --filter name="$MYSQL_NAME" --filter name="$APP_NAME" \
  --format '{{.Names}}: {{.Status}}'
echo "UI: http://localhost:3000 (login: admin / admin123)"
