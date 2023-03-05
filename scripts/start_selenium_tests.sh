#!/bin/bash

echo "running selenium tests"
docker run -it -v $1:/chalkboard --rm selenium tests.py $(id -u ${USER}):$(id -g ${USER}) $(cat $1/tmp/.backend.ip) 0 0
