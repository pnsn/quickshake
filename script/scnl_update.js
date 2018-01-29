/* 
* script to archive waveforms into collections based on scnl 
* process tails ring collection and writes to ringBuff
* ringbuff is read every ~5 seconds and writes to respective collection
*/

'use strict';
/*jslint node: true */
const scnlConf = require("../config/scnlConf.js");
const serverConf = require("../config/serverConf.js");
const scnlconf = new scnlConf();
const serverconf= new serverConf();
const logger = require('winston');
const MongoClient  = require('mongodb').MongoClient;
const Scnl = require("../lib/scnl.js");
var env=process.env.NODE_ENV || "development"; //get this from env
var MONGO_URI = serverconf[env].mongo.uri;


var scnl =Scnl;
var collName= "scnl";

MongoClient.connect(MONGO_URI, function(err, db) {
  if(err) throw err; 
  scnl.parseIrisScnls(scnlconf.nets, function(err, iris_scnls, response){
    scnl.getCollections(db, function(err, scnls){
      for(var i=0; i<scnls.length; i++){
        if(iris_scnls.hasOwnProperty(scnls[i])){
          scnl.upsert(db,iris_scnls[scnls[i]], function(err, results){
            if(err) throw err;
          });
        }
      }
      db.close();
    }); 
  });
});