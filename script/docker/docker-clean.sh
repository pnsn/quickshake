#/bin/bash

docker ps -a | grep $1 | awk '{print $1}' | xargs docker rm