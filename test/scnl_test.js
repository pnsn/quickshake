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

var fixtures = require('pow-mongodb-fixtures').connect('waveforms', {
  host: "db", 
  port: '27017'  
});

var MONGO_URI = serverconf.testing.mongo.uri;

var scnl;
before(function(){


  fixtures.load("./fixtures/waveforms.js", function(err){
    if(err) console.log("ERRR = " + err);
  });
  fixtures.load("./fixtures/scnls.js", function(err){
    if(err) console.log("ERRR = " + err);
  });
  scnl = Scnl;
});

after(function(){
  fixtures.clear(function(err) {
    //Drops the database
  });
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
    MongoClient.connect(MONGO_URI, {useUnifiedTopology: true }, function(err, client) {
      if(err) throw err;
      var db = client.db('waveforms');
      scnl.getCwaveCollections(db, function(err, scnls){
        expect(scnls.length).to.equal(2);
        done();
      }); 
    }); 
  });
  it('should return all scnls', function(done){
    MongoClient.connect(MONGO_URI, {useUnifiedTopology: true }, function(err, client) {
      if(err) throw err;   
      var db = client.db('waveforms');  
      scnl.getScnls(db, {}, function(err, scnls){
        expect(scnls.length).to.equal(1);
        done();
      }); 
    }); 
  });
  it('should insert bulk scnls', function(done){
    MongoClient.connect(MONGO_URI, {useUnifiedTopology: true }, function(err, client) {

      if(err) throw err;
      var db = client.db('waveforms');
      var scnls=[new MockScnl("STA1", "UW"),new MockScnl("STA2", "UW")]; 
      scnl.insertScnls(db, scnls, function(err, result){
        expect(result.insertedCount).to.equal(2);
        done();
      }); 
    }); 
  });

});