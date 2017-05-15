# quickshake
A realtime Node WS/HTTP MongoDB waveserver

# Node Version
Quickshake has been tested on Node 6.8.0. You can install this verision by
* npm cache clean -f
* npm install -g node -v 6.8.0



# Design
Wavform data are added to collection 'ring' by Earthworm library ring2mongo https://github.com/pnsn/ring2mongo , which is independent of this repo

QuickShake has two processes Archiver and Server
## Archiver
The archiver reads the tracebuffs from the 'ring' collection and archives  into a SCNL unique collection with the following naming convention
 STA.CHN.NET.LOC--CWAVE
Each archived collections is capped and act as a longer term ring. The depth of this ring is given by size and is configured using in the archiveCollSize param in ./config/serverConifg.js 
## Server
The server has two protocols HTTP and Websockets 
### HTTP
HTTP is managed via express and has the following routes
 
`GET /` initial request

`GET /scnls` Returns JSON of available scnls 

`GET /groups` Returns JSON of available groups of scnls

### Websockets
 The WS requests are managed with the standard ws library and uses group or scnls query params in / HTTP request.

#Production
See wiki 