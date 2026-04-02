#!/bin/bash
set -e

if [[ -z "$KOLIBRI_HOME" ]]; then
  # Defined in the Dockerfile, but enforce it's existence
  export KOLIBRI_HOME=/kolibri
fi

# Validate /kolibri is a mount point
if ! mountpoint -q "$KOLIBRI_HOME"; then
  echo "ERROR: $KOLIBRI_HOME must be a mounted volume" >&2
  echo "Please mount a volume to $KOLIBRI_HOME when running this container" >&2
  echo "Example: docker run -v /path/to/data:$KOLIBRI_HOME ..." >&2
  exit 1
fi

# Generate or read node ID for Morango sync
NODE_ID_FILE="$KOLIBRI_HOME/.node_id"
if [ ! -f "$NODE_ID_FILE" ]; then
  NODE_ID=$(cat /proc/sys/kernel/random/uuid)
  echo "$NODE_ID" > "$NODE_ID_FILE"
  echo "Generated new node ID: $NODE_ID"
else
  NODE_ID=$(cat "$NODE_ID_FILE")
  echo "Using existing node ID: $NODE_ID"
fi

# Export Morango environment variables
export MORANGO_SYSTEM_ID="$NODE_ID"
export MORANGO_NODE_ID="$NODE_ID"

# if the user mapping is `0 0`, then host and container users are likely in-sync-- both root
if grep -qE "\s+0\s+0\s+" /proc/self/uid_map; then
  echo "Starting Kolibri as user 'kolibri'..."
  # Ensure files are owned by kolibri user
  find "$KOLIBRI_HOME" ! -user kolibri -print0 | xargs -0 -I {} chown kolibri:kolibri "{}"
  # Drop to unprivileged user
  exec setpriv --reuid=kolibri --regid=kolibri --init-groups "$@"
else
  echo "Starting Kolibri..."
  exec "$@"
fi
