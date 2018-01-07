#!/bin/bash
#create postgres container linked ot running pnsn_db container,  use psql. Remove container on exit
docker run -it --link quickShake:mongo --rm mongo sh -c 'exec mongo "$MONGO_PORT_27017_TCP_ADDR:$MONGO_PORT_27017_TCP_PORT/waveforms"'
