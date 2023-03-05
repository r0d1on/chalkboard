#!/bin/bash

echo "stopping backend"
docker stop $(cat $1/tmp/.backend.id)
