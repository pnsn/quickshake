//connect to mongo and create a ring buffer for each channel
//using tailed cursor

/*
get counts 
db.cwaves.aggregate([{$group: {_id: "$key", count:{$sum:1}}}])
get all counts
db.cwaves.find().count()
# greater than starttime
db.cwaves.find({starttime:  {$gt:1474585786140}}).count()
find newest in collection
db.cwaves.find().sort({starttime: -1}).limit(1)
find oldest
db.cwaves.find().sort({starttime: 1}).limit(1)
*/

var  EventEmitter = require('events').EventEmitter;

    
function MongoRealTime(mongodb, url, collection, ringBuff){
  this.url = url;
  this.ring = ringBuff; 
  this.mongodb=mongodb;
  this.rtCol = collection;
  EventEmitter.call(this);
}


MongoRealTime.prototype = Object.create(EventEmitter.prototype);

//tail mongo server for the good stuff
MongoRealTime.prototype.tail=function(){
  var d = new Date();
  var startquery = Date.now();
  var conditions = {"starttime": {$gt: startquery}};
  // set MongoDB cursor options
  var cursorOptions = {
    tailable: true,
    awaitdata: true,
    numberOfRetries: -1
  };

  // create stream and listen
  var _this =this;
  this.mongodb.connect(this.url, function(err, db){
    if(err) throw err;
    var coll = db.collection(_this.rtCol);
      var stream = coll.find(conditions, cursorOptions).stream();
       stream.on('data', function(doc){
        _this.ring.update(doc);
        _this.emit("message", doc);
      });
  
    stream.on('close', function() {
         console.log("let's shut this down.....");
        _this.emit("close");
      });
  // });

  //   stream.on('error', function(err) {
  //     console.log("You got an error brah: " + err);
  //     _this.emit("error", err);
  //   });
  });
};

module.exports = MongoRealTime;