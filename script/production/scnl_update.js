/*
*script to populate scnl table with IRIS webservice data.
* envoke with
* node script/production/scnl_update.js
*/

'use strict';
/*jslint node: true */
var scnlConf = require("../../config/scnlConf.js");
var serverConf = require("../../config/serverConf.js");
var scnlconf = new scnlConf();
var serverconf= new serverConf();
var MongoClient  = require('mongodb').MongoClient;
var Scnl = require("../../lib/scnl.js");
var env=process.env.NODE_ENV || "development"; //get this from env
var MONGO_URI = serverconf[env].mongo.uri;
var DB_NAME = serverconf[env].mongo.dbName;

var scnl =Scnl;
var collName= "scnls"; // mongo collection

MongoClient.connect(MONGO_URI, function(err, client) {
  if(err) throw err;
  var db = client.db(DB_NAME);

  scnl.parseIrisScnls(scnlconf.nets, function(err, iris_scnls, response){
    scnl.getCwaveCollections(db, function(err, scnls){
      for(var i=0; i<scnls.length; i++){
        if(iris_scnls.hasOwnProperty(scnls[i])){
          var chan = iris_scnls[scnls[i]];
          var coll=db.collection(collName);
          coll.updateOne({"key": scnls[i]}, {$set: {
            'net': chan.net,
            'sta': chan.sta,
            'loc': chan.loc,
            'chan': chan.chan,
            'key': chan.makeKey(),
            'lat': chan.lat,
            'lon': chan.lon,
            'elevation': chan.elevation,
            'depth': chan.depth,
            'azimuth': chan.azimuth,
            'dip': chan.dip,
            'sensorDescription': chan.sensorDescription,
            'scale': chan.scale,
            'scaleFreq': chan.scaleFreq,
            'scaleUnits': chan.scaleUnits,
            'sampRate': chan.sampleRate,
            'startime': chan.starttime,
            'endtime': chan.endtime
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
