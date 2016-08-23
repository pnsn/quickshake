//connect to mongo and create a ring buffer for each channel
//using tailed cursor

var  MongoClient  = require('mongodb').MongoClient
    ,Conf = require("../config.js")
    // ,RingBuffer= require("ringbuffer.js")
    ,EventEmitter = require('events').EventEmitter;

    
function MongoServer(ringBuff){
  var conf = new Conf();
  this.url = "mongodb://" + conf.mongo.user + ":" + conf.mongo.passwd + "@" 
        + conf.mongo.host + ":" + conf.mongo.port + "/" + conf.mongo.dbname 
        + "?authMechanism=" + conf.mongo.authMech + "&authSource=" + conf.mongo.authSource;
  this.ring = ringBuff; 
  this.rtCol = conf.mongo.rtCollection;
  EventEmitter.call(this);
}


MongoServer.prototype = Object.create(EventEmitter.prototype);


//tail mongo server for the good stuff
MongoServer.prototype.tail=function(){
  var filter = {};

  // set MongoDB cursor options
  var cursorOptions = {
    tailable: true,
    awaitdata: true,
    numberOfRetries: -1
  };

  // create stream and listen
  var _this =this;
  MongoClient.connect(this.url, function(err, db) {
    if(err) throw err;
    var coll = db.collection(_this.rtCol);
    var stream = coll.find(filter, cursorOptions).stream();
        
    // call the callback
    stream.on('data', function(document) {
      _this.ring.update(document);
      _this.emit("data", document);
    });
    
    // //called by setting timeout in connect
   //  stream.on('timeout', function(){
   //    console.log("timeout yo");
   //    _this.emit.timeout();
   //  });

    stream.on('close', function() {
       console.log("let's shut this down.....");
      _this.emit("close");
    });

  //   stream.on('error', function(err) {
  //     console.log("You got an error brah: " + err);
  //     _this.emit("error", err);
  //   });
});
};

// //todo make this work and stuff
// //get distinct scnls
// MongoServer.prototype.getScnls = function(callback){
//   var _this = this;
//   MongoClient.connect(_this.url, function(err, db) {
//     if(err) throw err;
//     var collection = db.collection('cwaves');
//     collection.distinct('key', function(err, results) {
//       callback(results);
//       db.close();
//     });
//   });
// }



module.exports = MongoServer;