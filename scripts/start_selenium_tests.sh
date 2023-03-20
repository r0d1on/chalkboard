#!/bin/bash

echo "running selenium tests. quick=${2:-0}"
docker run -it -v $1:/chalkboard --rm selenium tests.py $(id -u ${USER}):$(id -g ${USER}) $(cat $1/tmp/.backend.ip) ${2:-0} 0