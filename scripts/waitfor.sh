#!/bin/bash

echo -n "waiting for $1:"
COUNTER=${2:-10}
while [ ! -f "$1" ] | [ ! -s "$1" ]; do
    COUNTER=$((COUNTER-1))
    echo -n "."
    sleep 1
    if [[ "$COUNTER" == "0" ]]; then
	echo "timeout"
	exit 1
    fi
done
echo "+ : $(cat $1)"
exit 0
