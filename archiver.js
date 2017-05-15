'use strict';
/*jslint node: true 
* script to archive waveforms into collections based on scnl 
* process tails ring collection and writes to ringBuff
* ringbuff is read every ~5 seconds and writes to respective collection
*/

const  url = require('url');
const logger = require('winston');
const Conf = require("./config/serverConf.js");
const MongoClient  = require('mongodb').MongoClient;
const RingBuffer = require(__dirname + '/lib/ringBuffer');
const CwaveArchiver = require(__dirname + '/lib/cwaveArchiver');

var collsize= ((3*86400* 1500)/256) * 256


const conf = new Conf();

var env=process.env.NODE_ENV || "development"; //get this from env
var collsize= conf[env].archiveCollSize 
var MONGO_URI = conf[env].mongo.uri;
logger.level="debug";
logger.add(logger.transports.File, { filename: 'log/archiver.log' });

var ringBuff = new RingBuffer(conf[env].ringBuffer.max, logger);
var cwaveArchiver = new CwaveArchiver(ringBuff, 5000, "ring", collsize, logger);

MongoClient.connect(MONGO_URI, function(err, db) {
  if(err) throw err;  
  cwaveArchiver.database(db);
  cwaveArchiver.tail();
  cwaveArchiver.start();
}); 
