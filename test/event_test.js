'use strict';

const Conf = require("../config/eventConf.js");
const expect  = require("chai").expect;
const mockTrace =  require("./factories/mockTrace.js");
const chai = require('chai');
const should = chai.should();
const conf = new Conf();
const logger = require('winston');
const MongoClient  = require('mongodb').MongoClient;
const Event = require("../lib/event.js");
const request = require('request');



var event;




before(function(){
  event = new Event();
});


//test for no collection, test for collection, test for adding document
describe('request event data from NEIC', function(){
  it('should get something from eq all list', function(done){
    var uri=  event.getLocalUrl(conf.boundaries);
    request(uri, function (error, response, body){
      var json = JSON.parse(body);
      expect(response.statusCode).to.equal(200);
      expect(json.features.length).to.not.equal(0);
      done();
    });    
    
  }); 
  it('should get something from sig list', function(done){
    var uri=  event.getSigUrl();
    request(uri, function (error, response, body){
      var json = JSON.parse(body);
      expect(response.statusCode).to.equal(200);
      expect(json.features.length).to.not.equal(0);
      done();
    });    
    
  }); 
  
});
    
