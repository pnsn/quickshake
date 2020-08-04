'use strict()';

const scnlConf = require("../config/scnlConf.js");
const serverConf = require("../config/serverConf.js");
const expect  = require("chai").expect;
const chai = require('chai');
const should = chai.should();
const scnlconf = new scnlConf();
const serverconf= new serverConf();
const MongoClient  = require('mongodb').MongoClient;
const Scnl = require("../lib/scnl.js");
const MockScnl =  require("./factories/mockScnl.js");

const mongo_addr=process.env.QUICKMONGO_PORT_27017_TCP_ADDR;
const mongo_port= process.env.QUICKMONGO_PORT_27017_TCP_PORT;
var fixtures = require('pow-mongodb-fixtures').connect('waveforms', {
  host: mongo_addr, 
  port: mongo_port
});
var env=process.env.NODE_ENV || "development";
var MONGO_URI = serverconf[env].mongo.uri;

var scnl;
before(function(){
  fixtures.clearAllAndLoad("./fixtures", function(err){
    if(err) console.log("ERRR = " + err);
  });  
  scnl = Scnl;
});


//test for no collection, test for collection, test for adding document
describe('should be good', function(){
  it('should get something from iris', function(done){
    //mocha times out at 2 seconds
    this.timeout(15000);
     scnl.parseIrisScnls(scnlconf.nets, function(err, scnls, response){
       expect(response.statusCode).to.equal(200); 
       expect(scnls.length).to.not.equal(0);
       done();
     });
  });
  it('should get a list of collections', function(done){
    MongoClient.connect(MONGO_URI, function(err, db) {
      if(err) throw err;     
      scnl.getCwaveCollections(db, function(err, scnls){
        expect(scnls.length).to.equal(2);
        done();
      }); 
    }); 
  });
  it('should return all scnls', function(done){
    MongoClient.connect(MONGO_URI, function(err, db) {
      if(err) throw err;     
      scnl.getScnls(db, {}, function(err, scnls){
        expect(scnls.length).to.equal(1);
        done();
      }); 
    }); 
  });
  it('should insert bulk scnls', function(done){
    MongoClient.connect(MONGO_URI, function(err, db) {

      if(err) throw err;
      var scnls=[new MockScnl("STA1", "UW"),new MockScnl("STA2", "UW")]; 
      scnl.insertScnls(db, scnls, function(err, result){
        expect(result.insertedCount).to.equal(2);
        done();
      }); 
    }); 
  });
  
  
});