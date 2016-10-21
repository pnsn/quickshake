/*connect to mongo and create a ring buffer for each channel
using tailed cursor
This ringBuffer is used to serve clients realtime buffs
and to archive buffs into scnl collection

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
to delete all scnl collections
db.getCollectionNames().forEach(function(c) {if(c.match("_uw__" )){db.getCollection(c).drop()}});
*/

/*jslint node:true */
"use strict";

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