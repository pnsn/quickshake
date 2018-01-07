/*
*script to populate scnl table. --src=iris will get data from iris
* src=path/to/jsonfile will get obj from json
*/

'use strict';
/*jslint node: true */
const scnlConf = require("../../config/scnlConf.js");
const serverConf = require("../../config/serverConf.js");
const scnlconf = new scnlConf();
const serverconf= new serverConf();
const logger = require('winston');
const MongoClient  = require('mongodb').MongoClient;
const Scnl = require("../../lib/scnl.js");
var env=process.env.NODE_ENV || "development"; //get this from env
var MONGO_URI = serverconf[env].mongo.uri;
var fs = require("fs");
const args = require('yargs').argv;
var usage="must specify src=iris or filepath"

var scnl =Scnl;
var collName= "scnl";
if(!args.src){
  console.log(usage);
  process.exit()
}

MongoClient.connect(MONGO_URI, function(err, db) {
  if(err) throw err;
  if(args.src==="iris"){
    scnl.parseIrisScnls(scnlconf.nets, function(err, iris_scnls, response){
      scnl.getCollections(db, function(err, scnls){
        for(var i=0; i<scnls.length; i++){
          if(iris_scnls.hasOwnProperty(scnls[i])){
            scnl.upsert(db,iris_scnls[scnls[i]], function(err, results){
              if(err) throw err;
            });
          }
        }
      });
    });
  }else{ //read from file
    var content = fs.readFileSync(args.src);
    var json = JSON.parse(content);
    for(var i=0; i<json.collection.length; i++){
      scnl.upsert(db, json.collection[i], function(err, results){
        if(err) throw err;
      });
    }
  }
  db.close();
});
