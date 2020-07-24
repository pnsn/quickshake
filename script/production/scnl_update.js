/*
*script to populate scnl table. --src=iris will get data from iris
* --src=path/to/jsonfile will get obj from json
* envoke with
* node script/production/scnl_update.js --src[iris|path/to/jsonfile]
*/

'use strict';
/*jslint node: true */
const scnlConf = require("../../config/scnlConf.js");
const serverConf = require("../../config/serverConf.js");
const scnlconf = new scnlConf();
const serverconf= new serverConf();
// const logger = require('winston');
const MongoClient  = require('mongodb').MongoClient;
const Scnl = require("../../lib/scnl.js");
var env=process.env.NODE_ENV || "development"; //get this from env
var MONGO_URI = serverconf[env].mongo.uri;
var DB_NAME = serverconf[env].mongo.dbName;
var fs = require("fs");
const args = require('yargs').argv;
var usage="must specify src=iris or filepath";

var scnl =Scnl;
var collName= "scnl";
MongoClient.connect(MONGO_URI, function(err, client) {
  if(err) throw err;
  const db = client.db(DB_NAME);

  scnl.parseIrisScnls(scnlconf.nets, function(err, iris_scnls, response){
    scnl.getCollections(db, function(err, scnls){
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
