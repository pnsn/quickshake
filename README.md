# quickshake
A realtime Node WS/HTTP MongoDB waveserver

# Node Version
QuickShake has been tested on Node 13.1.0 Use Docker files included in app root for development



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

`GET /scnls` Returns JSON of available scnls, used to plot stations on map

`GET /groups` Returns JSON of available groups of scnls. Groups are configured in config/serverConf.js

### Websockets
 The WS requests are managed with the standard ws library and uses group or scnls query params in / HTTP request.

## Backfilling
You can manually backfill a single or all continuous collections from wavetank data. The configuration file is found in config/waveserver.conf.js

Processes will start from lowest port and increment by one on each miss.

To update one collection:

`node readWaveServer starttime=123544545 [endtime=1232323212] sta=RCM chan=HHZ net=UW loc=--`

To update all collections that end in 'CWAVE':

`node script/production/update_all_collections.js starttime=123544545 [endtime=1232323212]`

Endtime default is 10 minutes

## Scnl updates
The scnls collection is updated using FDSN data with

script/production/scnl_update.js

This looks up each collection and updates the metadata. This should be run via cron
