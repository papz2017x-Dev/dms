#!/usr/bin/env bash
# Usage:
# 1) Copy this script to your cloud server or run via SSH: 
#    ssh user@host 'bash -s' < scripts/create_uploads_dir.sh /path/to/app
# 2) Or run on the server: ./create_uploads_dir.sh /path/to/app

set -euo pipefail

APP_DIR="${1:-.}"
UPLOADS_DIR="$APP_DIR/uploads"

echo "Creating uploads directory: $UPLOADS_DIR"
mkdir -p "$UPLOADS_DIR"

# Set ownership to current user and group (use sudo if needed)
if [ "$(id -u)" -eq 0 ]; then
  echo "Running as root — leaving ownership to root. To change ownership, run: chown -R <user>:<group> $UPLOADS_DIR"
else
  OWNER_USER=$(id -un)
  OWNER_GROUP=$(id -gn)
  echo "Setting owner to $OWNER_USER:$OWNER_GROUP"
  chown -R "$OWNER_USER:$OWNER_GROUP" "$UPLOADS_DIR" || true
fi

# Permissions: owner read/write/execute, group and others read/execute
chmod 755 "$UPLOADS_DIR"

echo "Done. $UPLOADS_DIR is ready (mode: $(stat -c %A "$UPLOADS_DIR" 2>/dev/null || stat -f %Sp "$UPLOADS_DIR"))"
