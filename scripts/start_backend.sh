#!/bin/bash

rm -f $1/tmp/.backend.id

CONTAINERS=$(docker ps | awk '/ / { print $1 , $2 }' | grep -G "backend" | awk '/ / { print $1 }')
if [ ! -z "$CONTAINERS" ]; then
    echo "have already running containers $CONTAINERS, stopping them"
    echo "$CONTAINERS" | xargs docker stop
fi

echo "starting backend"
docker run -dit -p 5000:5000 -v $1:/chalkboard --rm backend

