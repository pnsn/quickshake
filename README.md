#quickshake
A realtime Node.js waveserver

#Node Version
Quickshake has been tested on Node 6.8.0. You can install this verision by
* npm cache clean -f
* npm install -g node -v 6.8.0

#pm2
The app can be run in multiprocess mode with pm2. 

First time:
  pm2 start server.js -i 0 --name quickshake

Then pm2 [start|stop|restart|delete|] quickshake

