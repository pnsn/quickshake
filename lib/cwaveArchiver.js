/* 
Archiver attaches to ring collection (tail) writes buffs to ringBuff 
and writes tracebuffs to respective collection ~every 5 seconds
nameing convetnion
sta_chan_net_loc_cwave (with loc)
sta_chan_net_cwave (no loc)
*/
/*jslint node:true */
'use strict';


function CwaveArchiver(ringBuff, interval, collection, logger) {
    this.ring = ringBuff;
    this.interval = interval;
    this.rtCol = collection;
    this.collectionRef = {}; //keep a key collection so we don't have to always lookup the colletions on mongo
    this.collectionSize = 10000000000;
    this.logger = logger;
    this.db = null;
    // EventEmitter.call(this);
}


//tail mongo server for the good stuff
CwaveArchiver.prototype.tail=function(){
  this.logger.info("starting archiver");
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
    // this.emit("message", doc);
  });
  
  stream.on('close',()=>{
    this.logger.info("closing stream");
    // this.emit("close");
  });

  stream.on('error', (err)=>{
    // this.emit("error", err);
  });
  
};


//start here. It's callbacks all the way down
CwaveArchiver.prototype.start = function () {
    this.getCollectionNames();
    var _this=this;
    setInterval(function() {
      for (var key in _this.ring.ring) {
        _this.archiveScnl(key);
      }
    },this.interval);
};

//on start find existing collections and create collections obj for lookup
CwaveArchiver.prototype.getCollectionNames = (function () {
  var _this =this;
    this.db.listCollections().toArray(function(err, names){
      if(err) throw err;
      _this.logger.info("Found these existing collections in mongo:");
      for(var i=0; i< names.length; i++){
        var key=names[i]['name'].split("CWAVE")[0];
        _this.logger.info(key);
        _this.collectionRef[key] = {};
      }
      _this.logger.info("That is all the collections for now. Thanks for asking!");
  });
});

//create collection--if needed-- and read ring and write to collection
CwaveArchiver.prototype.archiveScnl=function(key){
      if(!this.collectionRef.hasOwnProperty(key)){
        this.logger.info("Adding key: " + key + "to collectionRef");
        this.collectionRef[key] = {};
        this.createMongoCollection(key+"CWAVE");
      }else{
        this.addDocuments(key);
      }
};

//create a collection then add pending buffs
CwaveArchiver.prototype.createMongoCollection =function(colname){
  var _this=this;
  _this.db.createCollection(colname, { capped: true, size: _this.collectionSize},function(err, coll){
    if(err) throw err;
    _this.logger.info("creating mongodb collection wavforms." + colname);
    coll.createIndex({starttime: 1},function(){
      _this.addDocuments(colname);
    });
  });
};

//add all pending documents from ring
//keeping the same id for now. Not sure if we should
//create new one yet, stay tuned....
CwaveArchiver.prototype.addDocuments=function(key){
  var collection = this.db.collection(key+"CWAVE");
  var buffs=[];
  var traces=this.ring.ring[key]['traces'];
  var size =traces.length;
  var index = this.ring.ring[key]['lastArchivedIndex'];
  var stopIndex = this.ring.ring[key]['currentIndex'];
  while(index != stopIndex){
    index=(index+1)%size;
    buffs.push(traces[index]);
  }
  this.ring.ring[key]['lastArchivedIndex']=index;
  if(buffs.length > 0){
    collection.insertMany(buffs,function(err, result){
      if(err) throw err;
    });
  }
};
CwaveArchiver.prototype.errorMsg=function(err){
  this.logger.error("From mongArchive: \n" + err + "\n");
};

//this can't always be set on initialization
CwaveArchiver.prototype.database=function(db){
  this.db=db;
};


module.exports = CwaveArchiver;
