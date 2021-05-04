#!/bin/bash

MAX=0
for i in $(seq 1 $2)
do
  kolibri start --port=$3 --zip-port=$4 > /dev/null 2>&1
  START_TIME=$SECONDS
  kolibri stop > /dev/null 2>&1
  ELAPSED_TIME=$(($SECONDS - $START_TIME))
  MAX=$(( MAX > ELAPSED_TIME ? MAX : ELAPSED_TIME ))
  echo "Kolibri stopped in $ELAPSED_TIME seconds"
done
echo "Kolibri stopped in a maximum of $MAX seconds"
if [ "$MAX" -gt "$1" ]; then
  echo "Kolibri took longer than $1 seconds to shutdown!"
  exit 1
else
  exit 0
fi
