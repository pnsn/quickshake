'use strict';
/*jslint node: true */
/*script to archive waveforms into collections based on scnl */
const  url = require('url');
const logger = require('winston');
const Conf = require("./config.js");
const MongoClient  = require('mongodb').MongoClient;
const RingBuffer = require(__dirname + '/lib/ringBuffer');
const MongoArchive = require(__dirname + '/lib/mongoArchive');
    
// const debug = require('debug')('quickshake');


const conf = new Conf();

var env=process.env.NODE_ENV || "development"; //get this from env
  
var MONGO_URI = conf[env].mongo.uri;
logger.level="debug";
logger.add(logger.transports.File, { filename: 'log/archiver.log' });

var ringBuff = new RingBuffer(conf[env].ringBuffer.max, logger);
var mongoArchive = new MongoArchive(ringBuff, 5000, "ring", logger);

MongoClient.connect(MONGO_URI, function(err, db) {
  if(err) throw err;  
  mongoArchive.database(db);
  mongoArchive.tail();
  mongoArchive.start();
}); 
