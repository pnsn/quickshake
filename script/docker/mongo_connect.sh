#/bin/bash
docker run -it --rm mongo sh -c "exec mongo mongodb://${MONGO_USER}:${MONGO_PASSWD}@${MONGO_HOST}:${MONGO_PORT}/admin"
