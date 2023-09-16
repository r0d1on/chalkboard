docker images purge
docker rm -vf $(docker ps -aq)
docker rmi -f $(docker images -aq)
docker system prune -a --volumes

