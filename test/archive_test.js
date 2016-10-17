//test cases for mongoserver prototype
// var assert = require('assert')
var Conf = require("../config.js")
  ,expect  = require("chai").expect
  ,RingBuffer=require("../lib/ringBuffer.js")
  ,MongoClient  = require('mongodb').MongoClient
  ,MongoArchive=require("../lib/mongoArchive")
  ,MockTrace =  require("./mockTrace.js");
  


var conf = new Conf();
var _db;
var env="testing";
var MONGO_URI= conf[env].mongo.uri;
    
var conf = new Conf();
var buffMax=6;
var RING_BUFF;
var sta="SHIT";
var chan="EHZ";
var net="UW";
var loc="--";
var mongoArchive;


var collection=new MockTrace(sta,chan,net,loc).makeEwKey();

describe("Update archive from ringbuffer", function(){
  beforeEach(function(){
    MongoClient.connect(MONGO_URI, function(err, db) {
      if(err) throw err;
      _db=db;
      db.drop(collection);
    });
    ringbuff= new RingBuffer(buffMax);
    mongoArchive= new MongoArchive(ringbuff, 100000, null);
    for(var i=0; i< buffMax; i++){
      ringbuff.update(new MockTrace(sta,chan,net,loc));
    }
    
  }); 
  

  it("should create collection", function(){
    
    // expect(ringbuff['ring'][validKey].traces.length).to.equal(buffMax);
    // expect(ringbuff['ring'][validKey].currentIndex).to.equal(buffMax-1);
    // ringbuff.update(new MockTrace(sta,chan,net,loc));
    // expect(ringbuff['ring'][validKey].currentIndex).to.equal(0);
  });
  
  
});
 
//add some tests here
//should create collection when it doesn't exist
//should add pending buffs
//should get off your ass and actually write these tests
    
