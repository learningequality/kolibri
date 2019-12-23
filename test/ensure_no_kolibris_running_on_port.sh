#!/bin/bash

echo "Checking for processes running on $1/tcp..."
running_kolibris=`lsof -i -P -U | grep $1 | grep kolibri`
echo $running_kolibris

if [ `lsof -i -P -U | grep $1 | grep kolibri | grep LISTEN | grep -c '^'` -gt "0" ]; then
    # looks like kolibri is running!
    exit 1
else
    exit 0
fi
