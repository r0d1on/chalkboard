if [[ "$2" == "-" ]]
then
    ENTRY=""
elif [[ "$2" == "." ]]
then
    ENTRY="--entrypoint=/bin/sh"
else
    ENTRY="--entrypoint=$2"
fi

if [[ "$3" == "-" ]]
then
    PORT=""
elif [[ "$3" == "" ]]
then
    PORT=""
else
    PORT="-p $3:$3"
fi

echo "Starting $ENTRY in image $1 ports: $PORT"

echo docker run -it $PORT -v $(pwd):/chalkboard --rm $ENTRY $1 $4 $5 $6 $7 $8 $9
docker run -it $PORT -v $(pwd):/chalkboard --rm $ENTRY $1 $4 $5 $6 $7 $8 $9
