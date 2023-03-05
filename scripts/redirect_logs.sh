#!/bin/bash

echo "capturing logs from backend container id: $(cat $1/tmp/.backend.id)"
docker logs -f $(cat $1/tmp/.backend.id) &> $1/tmp/.backend.output.log 2> $1/tmp/.backend.error.log &
