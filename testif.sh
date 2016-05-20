#!/bin/bash

# This script is invoked by Travis testing and inspects
# the changeset that's being built.
#
# Usage:
#
#    testif.sh <label> && something_else
#
# The intention is to be able to ONLY test certain aspects
# when special conditions are satisfied.
#
# Notes:
#    JS tests are expected to be very fast
#    We shouldn't skip tests when it affects Coverage negatively
#    We can possibly do tests based on which branch is pushed to
#
# https://github.com/learningequality/kolibri/issues/27
#
# What changes are analyzed?
#
# For this script, we should mainly use Travis' env
# $TRAVIS_COMMIT_RANGE. The reason is simple: You cannot tell what
# changes have been implemented since last test, thus if your
# condtion should fire or not.
#
# Definition:
# TRAVIS_COMMIT_RANGE: The range of commits that were included in
# the push or pull request.
#
# https://docs.travis-ci.com/user/environment-variables/


set -e

LABEL="$1"

commit="$TRAVIS_COMMIT"
commits="$TRAVIS_COMMIT_RANGE"
git_changeset=`git show --name-only --no-notes --oneline $commits`


# If something changes that's related to our sdist packaging
# or installation mechanism, then we build and install.
if [[ "$LABEL" == "setup_changed" ]]
then

    # Match with commit messages containing "[ setup ]"
    # Match commits changing requirements.txt
    # Match commits changing setup.py
    if echo "$git_changeset" | grep -q "\[\s*setup\s*\]" || \
       echo "$git_changeset" | grep -q "^setup\.py" || \
       echo "$git_changeset" | grep -q "^requirements"
       echo "$git_changeset" | grep -q "^Makefile"
       echo "$git_changeset" | grep -q "^MANIFEST*"
    then

        # Install build deps
        pip install -r requirements/build.txt

        # Build .whl
        make sdist
        pip install dist/kolibri-*.whl
        exit 0

    fi

fi

# No matches
echo "[OK] - Skipping conditional test '$LABEL'"
exit 0
