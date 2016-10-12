var  EventEmitter = require('events').EventEmitter;
  
function MongoArchive(mongodb, url, ringBuff, interval, logger){
  this.url = url;
  this.mongodb=mongodb;
  this.ring = ringBuff; 
  this.interval=interval;
  this.collections={};
  this.collectionSize=100000000; //100mb
  this.logger=logger;
  EventEmitter.call(this);
}

MongoArchive.prototype = Object.create(EventEmitter.prototype);


//start here
MongoArchive.prototype.start=function(){
  this.logger.info("starting archiver");
  this.getCollectionNames();
  var _this=this;
  setInterval(function(){
    for(var key in _this.ring.ring){
      _this.readCollection(key);
    }      
  },_this.interval);
};

//on start find existing collections and create collections obj for lookup
MongoArchive.prototype.getCollectionNames=(function(){
  var _this = this;
  this.mongodb.connect(this.url, function(err, db) {
    _this.checkError(err);
    db.listCollections().toArray(function(err, names){
      _this.checkError(err);
      for(var obj in names){
        _this.collections[obj['name']] = {};
      }
      db.close();
    });
  });
  
});

//create collection--if needed-- and read ring and write to collection
MongoArchive.prototype.readCollection=function(key){
  var _this=this;
  _this.mongodb.connect(_this.url, function(err, db){
    _this.checkError(err);
    if(!_this.collections.hasOwnProperty(key)){
      console.log("adding key " + key);
      _this.collections[key] = {};
      _this.createCollection(db,key, function(){
        db.close();
      });
    }else{
      _this.addDocuments(db,key, function(){
        db.close();
        console.log('closing');
      });
    }
  });  
};

//create a collection then add pending buffs
MongoArchive.prototype.createCollection =function(db, key, callback){
  var _this=this;
  db.createCollection(key, { capped: true, size: this.collectionSize}, function(err, coll){
    _this.checkError(err);
    coll.createIndex({starttime: 1}, function(){
      _this.addDocuments(db, key, callback);
    });
  });
};

//add all pending documents from 
//keeping the same id for now. Not sure if we should
//create new one
MongoArchive.prototype.addDocuments=function(db, key, callback){
  var _this =this;
  var collection = db.collection(key);
  var buffs=[];
  var traces=this.ring.ring[key]['traces'];
  var size =traces.length;
  var index = this.ring.ring[key]['lastArchivedIndex'];
  var stopIndex = this.ring.ring[key]['currentIndex'];
  while(index != stopIndex){
    index=(index+1)%size;
    buffs.push(traces[index]);
  }
  _this.ring.ring[key]['lastArchivedIndex']=index;
  if(buffs.length > 0){
    collection.insertMany(buffs, function(err, result) {
      _this.checkError(err);
      callback(result);
    });
  }
};
MongoArchive.prototype.checkError=function(err){
  if(err){
    this.logger.error(err);
    throw err;
  }
};

module.exports = MongoArchive;
