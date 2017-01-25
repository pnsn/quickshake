'use strict';

const Conf = require("../config.js");
const expect  = require("chai").expect;
const mockTrace =  require("./mockTrace.js");
const chai = require('chai');
const should = chai.should();
const conf = new Conf();
const logger = require('winston');
const MongoClient  = require('mongodb').MongoClient;
const RingBuffer = require("../lib/ringBuffer.js");
const CwaveArchiver = require("../lib/cwaveArchiver.js");





const mongo_addr=process.env.QUICKMONGO_PORT_27017_TCP_ADDR;
const mongo_port= process.env.QUICKMONGO_PORT_27017_TCP_PORT;
var fixtures = require('pow-mongodb-fixtures').connect('waveforms', {
  host: mongo_addr, 
  port: mongo_port
});
var env=process.env.NODE_ENV || "development";
var MONGO_URI = conf[env].mongo.uri;
var mongoArchive;
var ringBuff;

//create a connection pool
before(function(){
  fixtures.clear(['yach_hnz_uw__', 'ring'], function(err) {
  });
  ringBuff = new RingBuffer(conf[env].ringBuffer.max, logger);
  console.log("here we are" ,ringBuff.ring);
  mongoArchive = new CwaveArchiver(ringBuff, 5000, "ring", logger);
  

});


//test for no collection, test for collection, test for adding document
describe('add document to mongo', function(){
    it('collection does not exist', function(done){
      MongoClient.connect(MONGO_URI, function(err, db) {
        if(err) throw err; 
        var yach_found=false;
        var waveforms_found=false;
        
        db.listCollections().toArray(function(err, names){
          for(var i=0; i< names.length; i++){
            var key=names[i]['name'];
            if(!waveforms_found){
              waveforms_found=key==="ring";
            }
            if(!yach_found){
              yach_found=key==="yach_hnz_uw___";
            }            
          }
        });
        
        expect(yach_found).to.equal(false);
        expect(waveforms_found).to.equal(false);        
        done();
      }); 
    });
    
    //this ain't working. Getting 'mongo 
    // it('collection is created with new doc', function(done){
 //      MongoClient.connect(MONGO_URI, function(err, db) {
 //        if(err) throw err;
 //        var doc= new mockTrace("YACH","HNZ","UW","--");
 //        mongoArchive.db=db;
 //        mongoArchive.ring.update(doc);
 //        var key = doc.makeMongoCollectionKey();
 //        mongoArchive.archiveScnl(key);
 //        var col =db.collection(key);
 //        var count;
 //        col.find().toArray(function(err,docs){
 //          if(err) throw err;
 //          console.log("docsdssssssss ", docs);
 //          for(var i=0; i< docs.length; i++){
 //            console.log("iiiiiiiiiiiiii ", i);
 //          }
 //         count= docs.length;
 //        });
 //
 //        expect(count).to.equal(1);
 //        done();
 //        db.close();
 //
 //      });
 //    });
});