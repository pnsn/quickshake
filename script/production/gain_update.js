/*
  * script to query aqms simple_response endpoint
  * adds gain and gain_units to scnl collection
*/

'use strict';
/*jslint node: true */
var path= "/home/eworm/quickshake";
var scnlConf = require(path + "/config/scnlConf.js");
var serverConf = require(path + "/config/serverConf.js");
var scnlconf = new scnlConf();
var serverconf= new serverConf();
var MongoClient  = require('mongodb').MongoClient;
var Scnl = require(path + "/lib/scnl.js");
var env=process.env.NODE_ENV || "development"; //get this from env
var MONGO_URI = serverconf[env].mongo.uri;
var DB_NAME = serverconf[env].mongo.dbName;

var scnl =Scnl;
var collName= "scnl";
MongoClient.connect(MONGO_URI, function(err, client) {
  if(err) throw err;
  var db = client.db(DB_NAME);
    scnl.parseChannelResponse(function(err, chanRes, response){
      var coll = db.collection('scnls');
      scnl.getCwaveCollections(db, function(err, scnls){
      
        for(var i=0; i<scnls.length; i++){
          var key = scnls[i];
          if(chanRes.hasOwnProperty(key)){
            var res = chanRes[scnls[i]];
            if(res !== null && res.gain !==null){
              coll.updateOne(
                {'key': key},
                {$set: {'gain': res.gain, 'gain_units': res.gain_units}},
                {upsert: false}
              );
            }
          }
        }
        client.close();
      });
    });
});
