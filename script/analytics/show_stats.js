'use strict';
/*
  To start with pm2
  pm2 start server.js -i 0 --name quickshake --log-date-format="YYYY-MM-DD HH:mm Z"
*/
/*jslint node: true */
// const compression = require('compression');
const Conf = require("./../../config/serverConf.js");
const MongoClient  = require('mongodb').MongoClient;
const conf = new Conf();
var env=process.env.NODE_ENV || "development"; //get this from env
  
var MONGO_URI = conf[env].mongo.uri;
// app.use(compression());
const Scnl = require(__dirname + './../../lib/scnl.js');

MongoClient.connect(MONGO_URI, function(err, db) {
  if(err) throw err;
  Scnl.getCollections(db, function(err, scnls){
    if(err) throw err;
    for(var i=0; i< scnls.length; i++){
      var collection= scnls[i] + "CWAVE";
      Scnl.avePacketSize(db,collection);//{
      //    if(err) console.log(err);
      //   // console.log(collection + ": " + ave );
      // });
    }
  });
});