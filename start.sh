#!/bin/bash
echo $(hostname -i) > tmp/.backend.ip
echo $(hostname) > tmp/.backend.id
exec python board.py $1 $2 $3 $4 $5 $6 $7 $8 $9
