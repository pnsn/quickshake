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
var usage="must specify src=iris or filepath"

var scnl =Scnl;
var collName= "scnl";
if(!args.src){
  console.log(usage);
  process.exit()
}

MongoClient.connect(MONGO_URI, function(err, client) {
  if(err) throw err;
  const db = client.db(DB_NAME);
  if(args.src==="iris"){
    scnl.parseIrisScnls(scnlconf.nets, function(err, iris_scnls, response){
      scnl.getCollections(db, function(err, scnls){
        console.log("or hererererer");
        for(var i=0; i<scnls.length; i++){
          if(iris_scnls.hasOwnProperty(scnls[i])){
            scnl.upsert(db,iris_scnls[scnls[i]], function(err, results){
              if(err) throw err;
            });
          }
        }
        client.close()
      });
    });
  }else{ //read from file
    var content = fs.readFileSync(args.src);
    var json = JSON.parse(content);
    var coll=db.collection('scnls');
    for(var i=0; i<json.collection.length; i++){

      var c=json.collection[i];
      coll.update({sta: c.sta, chan: c.chan, net: c.net, loc: c.loc},c,{upsert: true}, function(err, results){
        if(err) throw err;
      });
    }
    client.close()
  }

});
