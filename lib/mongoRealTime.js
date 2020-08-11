/*connect to mongo ring collection and tail. Writes new tracebuffs to ring buffer 
keyed on channel name
The ringBuffer created by this class  is used to serve clients realtime buffs
The realtime client never querries mongo


##common mongo things
get counts 
db.ring.aggregate([{$group: {_id: "$key", count:{$sum:1}}}])
get all counts
db.ring.find().count()
# greater than starttime
db.ring.find({starttime:  {$gt:1474585786140}}).count()
find newest in collection
db.ring.find().sort({starttime: -1}).limit(1)
find oldest
db.ring.find().sort({starttime: 1}).limit(1)

to only return the startime:
db.yach_hnz_uw___.find({}, {starttime: 1}).sort({starttime: -1}).limit(1)
to delete all scnl collections, write regex then test with print
db.getCollectionNames().forEach(function(c){if(c.match("regex")){print(c)}});
db.getCollectionNames().forEach(function(c) {if(c.match("regex" )){db.getCollection(c).drop()}});
#move waveforms from to
 db["fmw_ehz_uw___"].find({"starttime": 
    {$gte: start, $lte: end}}).forEach(function(d){db["FMW.EHZ.UW.--CWAVE"].insert(d)});

*/

/*jslint node:true */
"use strict()";

var  EventEmitter = require('events').EventEmitter;
    
function MongoRealTime(collection, ringBuff, logger){
  this.rtCol = collection;
  this.ring = ringBuff; 
  this.logger= logger;
  this.db;
  EventEmitter.call(this);
}
 

MongoRealTime.prototype = Object.create(EventEmitter.prototype);

//tail mongo server for the good stuff
MongoRealTime.prototype.tail=function(){
  var d = new Date();
  var startquery = Date.now();
  // set MongoDB cursor options
  var cursorOptions = {
    tailable: true,
    awaitdata: true,
    numberOfRetries: -1
  };

  // create stream and listen
  var coll = this.db.collection(this.rtCol);
  var stream = coll.find({"starttime": {$gt: startquery}}, cursorOptions).stream();
  stream.on('data',(doc)=>{
    this.ring.update(doc);
    this.emit("message", doc);
  });
  
  stream.on('close',()=>{
    this.logger.info("closing stream");
    this.emit("close");
  });

  stream.on('error', (err)=>{
    this.emit("error", err);
  });
  
};
//this can't be set on initialization
MongoRealTime.prototype.database=function(db){
  this.db=db;
};

module.exports = MongoRealTime;