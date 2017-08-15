#!/bin/bash
# Startup script for running kolibri all-in-one `pex` file

set -eo pipefail

export KOLIBRI_LANG=en
export KOLIBRI_HOME=/kolibrihome
export KOLIBRI_PORT=8009
export KOLIBRI_CMD=/usr/local/bin/kolibri

$KOLIBRI_CMD language setdefault $KOLIBRI_LANG

# simple mode
# exec $KOLIBRI_CMD start --foreground --port=$KOLIBRI_PORT

# dev mode
cd /kolibri
$KOLIBRI_CMD manage devserver --debug  --  0.0.0.0:$KOLIBRI_PORT --webpack