/* 
Archiver reads buffs off of ringBuff and archives into scnl mongodb collection


*/
var  EventEmitter = require('events').EventEmitter;
  
function MongoArchive(ringBuff, interval, logger){
  this.ring = ringBuff; 
  this.interval=interval;
  this.collections={};
  this.collectionSize=100000000; //100mb
  this.logger=logger;
  this.db;
  EventEmitter.call(this);
}

MongoArchive.prototype = Object.create(EventEmitter.prototype);


//start here. It's callbacks all the way down
MongoArchive.prototype.start=function(){
  this.logger.info("starting archiver");
  this.getCollectionNames();
  setInterval(()=>{
    for(var key in this.ring.ring){
      this.readCollection(key);
    }
  },this.interval);
};

//on start find existing collections and create collections obj for lookup
MongoArchive.prototype.getCollectionNames=(function(){
  this.db.listCollections().toArray((err, names)=>{
    if(err) throw err;
    for(var obj in names){
      this.collections[obj['name']] = {};
    }
  });
});

//create collection--if needed-- and read ring and write to collection
MongoArchive.prototype.readCollection=function(key){
      if(!this.db.collections.hasOwnProperty(key)){
        this.logger.info("Ringbuff: adding key  " + key);
        this.collections[key] = {};
        this.createCollection(key)
      }else{
        this.addDocuments(key)
      }
};

//create a collection then add pending buffs
MongoArchive.prototype.createCollection =function(key){
  this.db.createCollection(key, { capped: true, size: this.collectionSize},(err, coll)=>{
    if(err) throw err;
    coll.createIndex({starttime: 1},()=>{
      this.addDocuments(key);
    });
  });
};

//add all pending documents from
//keeping the same id for now. Not sure if we should
//create new one yet, stay tuned....
MongoArchive.prototype.addDocuments=function(key){
  var collection = this.db.collection(key);
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
    collection.insertMany(buffs,(err, result)=>{
      if(err) throw err;
    });
  }
};
MongoArchive.prototype.errorMsg=function(err){
  this.logger.error("From mongArchive: \n" + err + "\n");
};

//this can't be set on initialization
MongoArchive.prototype.database=function(db){
  this.db=db;
};


module.exports = MongoArchive;
