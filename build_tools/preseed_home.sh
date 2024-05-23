#!/bin/bash

set -eux -o pipefail

# Assumes this script is run from the project root
PROJECT_ROOT="$(pwd)"
KOLIBRI_HOME="$(mktemp -d)"
PYTHONPATH="${PYTHONPATH:-}"

# Prepend project root to python path
if [ -n "$PYTHONPATH" ]; then
  PYTHONPATH="${PROJECT_ROOT}:${PYTHONPATH}"
else
  PYTHONPATH="${PROJECT_ROOT}"
fi

export KOLIBRI_HOME
export PYTHONPATH

# Clean existing DBs and generate fresh DBs
rm -rf kolibri/dist/home
(cd kolibri && python -m kolibri manage deprovision --destroy-all-user-data --permanent-irrevocable-data-loss)
mkdir -p kolibri/dist/home
cp $KOLIBRI_HOME/*.sqlite3 kolibri/dist/home/
rm -rf $KOLIBRI_HOME

# disable command echoing
set +x

# Verify DBs
declare -A QUERY_MATRIX
QUERY_MATRIX["select count(*) from morango_databaseidmodel;"]="db.sqlite3"
QUERY_MATRIX["select count(*) from morango_instanceidmodel;"]="db.sqlite3"
QUERY_MATRIX["select count(*) from discovery_networklocation;"]="networklocation.sqlite3"
QUERY_MATRIX["select count(*) from jobs;"]="job_storage.sqlite3"

echo "Verifying databases..."

for QUERY in "${!QUERY_MATRIX[@]}"; do
  DB=${QUERY_MATRIX[$QUERY]}
  ROW_COUNT=$(sqlite3 -cmd ".headers off" kolibri/dist/home/$DB "$QUERY")
  if [ "$ROW_COUNT" -ne 0 ]; then
    echo "Preseeded DBs have existing data | $ROW_COUNT = $QUERY"
    exit 1
  fi
done

echo "Done! Preseeded databases generated"
