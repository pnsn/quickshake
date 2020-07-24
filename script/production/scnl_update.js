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
          scnl.upsert(db,iris_scnls[scnls[i]], function(err, results){
            if(err) throw err;
          });
        }
      }
      client.close();
    });
  });
});
