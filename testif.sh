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

branches_to_always_test=( "master" "releases/*" )

PR="$TRAVIS_PULL_REQUEST"
commit="$TRAVIS_COMMIT"
commits="$TRAVIS_COMMIT_RANGE"
current_branch="$TRAVIS_BRANCH"
git_changeset=`git show --name-only --no-notes --oneline $commits`

# Some debug stuff, will be removed
echo "Current branch: $current_branch"
echo "Commit: $TRAVIS_COMMIT"
echo "Commit range: $TRAVIS_COMMIT_RANGE"
echo "PR: $PR"
echo "Git change set: $git_changeset"

function match_changes {
    # Usage: match_changes "match1" "match2"
    # if branch should always be tested
    if ! [ "$PR" == "false" ]
    then
        for branch in "${branches_to_always_test[@]}"
        do
            if echo "$current_branch" | grep -q "$branch"
            then
                echo "Always testing $branch, so not skipping $LABEL..."
                return 0
            fi
        done
    fi

    # Loop through all arguments
    for pattern_to_match
    do
        if echo "$git_changeset" | grep -q "$pattern_to_match"
        then
            return 0
        fi
    done

    # No matches
    return 1
}


# If something changes that's related to our sdist packaging
# or installation mechanism, then we build and install.
if [[ "$LABEL" == "setup_changed" ]]
then

    # Match with commit messages containing "[ setup ]"
    # Match commits changing requirements.txt
    # Match commits changing setup.py
    if match_changes "\[\s*setup\s*\]" \
                     "^setup\.py" \
                     "^requirements" \
                     "^Makefile" \
                     "^MANIFEST*"
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
