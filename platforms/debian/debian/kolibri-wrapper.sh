#!/bin/sh
# Wrapper for the kolibri command that uses the correct Python interpreter.

set -e

# Read the resolved interpreter out of the service environment without importing
# the rest of it: /etc/default/kolibri derives KOLIBRI_HOME from the service
# user's passwd entry, which must not apply to interactive invocations.
if [ -f /etc/default/kolibri ]; then
    kolibri_env=$(
        # Admin config under /etc/kolibri is sourced from there; a nonzero
        # command in it must not take the interpreter lookup down with it.
        set +e
        . /etc/default/kolibri >/dev/null 2>&1
        printf '%s\n%s\n' "$KOLIBRI_PYTHON" "$PYTHONPATH"
    )
    KOLIBRI_PYTHON=$(printf '%s\n' "$kolibri_env" | sed -n 1p)
    kolibri_pythonpath=$(printf '%s\n' "$kolibri_env" | sed -n 2p)
    if [ -n "$kolibri_pythonpath" ]; then
        PYTHONPATH="$kolibri_pythonpath"
        export PYTHONPATH
    fi
fi

# /etc/default/kolibri is a conffile, so an admin who keeps their own copy on
# upgrade never receives the resolution block: repeat it rather than silently
# running a system interpreter that is too old for Kolibri.
if [ -z "$KOLIBRI_PYTHON" ]; then
    if [ -x /opt/kolibri/python/bin/python3 ]; then
        KOLIBRI_PYTHON="/opt/kolibri/python/bin/python3"
        PYTHONPATH="/usr/lib/python3/dist-packages${PYTHONPATH:+:$PYTHONPATH}"
        export PYTHONPATH
    else
        KOLIBRI_PYTHON="/usr/bin/python3"
    fi
fi

# The setuptools entry point, not `-m kolibri`: -m puts the caller's working
# directory on sys.path ahead of everything else.
exec "$KOLIBRI_PYTHON" /usr/lib/kolibri/kolibri "$@"
