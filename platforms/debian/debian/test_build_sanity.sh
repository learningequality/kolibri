#!/bin/bash


# Check that the executable bit is set on *install.
# This mistake has cost tonnes of hours of debugging
# so let's be safe in the future.
for file in debian/*.install
do
        if ! [[ -x "$file" ]]
        then
		[ -e "$file" ] || continue
                echo "$file should be executable"
                exit 1
        fi
done

