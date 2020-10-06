/*
*script to populate scnl table with IRIS webservice data.
* envoke with
* node script/production/scnl_update.js
*/

'use strict';
/*jslint node: true */
const scnlConf = require("../../config/scnlConf.js");
const serverConf = require("../../config/serverConf.js");
const scnlconf = new scnlConf();
const serverconf= new serverConf();
const MongoClient  = require('mongodb').MongoClient;
const Scnl = require("../../lib/scnl.js");
var env=process.env.NODE_ENV || "development"; //get this from env
var MONGO_URI = serverconf[env].mongo.uri;
var DB_NAME = serverconf[env].mongo.dbName;

var scnl =Scnl;
var collName= "scnl"; // mongo collection

MongoClient.connect(MONGO_URI, function(err, client) {
  if(err) throw err;
  const db = client.db(DB_NAME);

  scnl.parseIrisScnls(scnlconf.nets, function(err, iris_scnls, response){
    scnl.getCwaveCollections(db, function(err, scnls){
      for(var i=0; i<scnls.length; i++){
        if(iris_scnls.hasOwnProperty(scnls[i])){
          // var chan = iris_scnls[scnls[i]];
          var coll=db.collection(collName);
          coll.update({"key": scnl.key}, {$set: {
            'net': iris_scnls.net,
            'sta': iris_scnls.sta,
            'loc': iris_scnls.loc,
            'chan': iris_scnls.chan,
            'key': scnl.makeKey,
            'lat': iris_scnls.lat,
            'lon': iris_scnls.lon,
            'elevation': iris_scnls.elevation,
            'depth': iris_scnls.depth,
            'azimuth': iris_scnls.azimuth,
            'dip': iris_scnls.dip,
            'sensorDescription': iris_scnls.sensorDescription,
            'scale': iris_scnls.scale,
            'scaleFreq': iris_scnls.scaleFreq,
            'scaleUnits': iris_scnls.scaleUnits,
            'sampRate': iris_scnls.sampleRate,
            'startime': iris_scnls.starttime,
            'endtime': iris_scnls.endtime
            }
          },
          {upsert: true}, 
          function(err, result){
            if(err) throw err;
          });

        }
      }
      client.close();
    });
  });
});
