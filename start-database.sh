#!/usr/bin/env bash
# Starts the MySQL database container with Podman (Bazzite equivalent of StartDatabase.bat).
# Only brings up the database - use start.sh to run the whole stack.
# Usage:
#   ./start-database.sh              # start the DB container (create it if missing)
#   ./start-database.sh --restart   # remove and recreate the DB container (data is kept in the volume)
set -euo pipefail
cd "$(dirname "$0")"

MYSQL_NAME=aifishsort_mysql
DB_PASSWORD=K4l4L4j1ttelu0nK1v44

# --- MySQL ---
if [ "${1:-}" = "--restart" ]; then
  podman rm -f "$MYSQL_NAME" 2>/dev/null || true
fi

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
ready=0
for _ in $(seq 1 60); do
  if podman exec "$MYSQL_NAME" mysqladmin ping -uroot -p"$DB_PASSWORD" --silent 2>/dev/null; then
    ready=1
    echo "MySQL ready."
    break
  fi
  sleep 2
done

if [ "$ready" -ne 1 ]; then
  echo "ERROR: MySQL did not become ready. Check logs: podman logs $MYSQL_NAME" >&2
  exit 1
fi

podman ps --filter name="$MYSQL_NAME" --format '{{.Names}}: {{.Status}}'
echo "MySQL: port 3306 (logs: podman logs -f $MYSQL_NAME)"
