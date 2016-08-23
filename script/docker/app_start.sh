#!/bin/bash
#start the app
echo $PWD
docker run -it --rm  -p 8888:8888 -v "$PWD":/quickshake node:5.5 /bin/bash
