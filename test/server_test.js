//test cases for mongoserver prototype
// var assert = require('assert')
'use strict';

const expect  = require("chai").expect;
const MockTrace =  require("./mockTrace.js");
const chai = require('chai');
const chaiHttp = require('chai-http');
const server = require('../server');
const should = chai.should();

var fixtures = require('pow-mongodb-fixtures').connect('waveforms', {
  host: process.env.QUICKMONGO_PORT_27017_TCP_ADDR, 
  port: process.env.QUICKMONGO_PORT_27017_TCP_PORT
});

chai.use(chaiHttp);

//create a connection pool
before(function(){
  fixtures.clearAllAndLoad("./fixtures/waveforms.js", function(err){
    if(err) console.log("ERRR = " + err);
  });
});


     
describe('/GET groups', function(){
    it('it should GET all groups', function(done){
      chai.request(server.app)
          .get('/groups')
          .end(function(err, res){
              res.should.have.status(200);
              res.body.should.be.a('object');
              Object.keys(res.body).length.should.be.eql(8);
            done();
          });
    });
});

    describe('/GET achrive', function(){
      it('it should GET return 400 when no params', function(done){
        chai.request(server.app)
            .get('/archive')
            .end(function(err, res){
                res.should.have.status(400);
        });
      chai.request(server.app)
          .get('/archive?scnls=YACH.HNZ.UW.--')
          .end(function(err, res){
              res.should.have.status(400);
      });
      chai.request(server.app)
          .get('/archive?starttime=1000')
          .end(function(err, res){
              res.should.have.status(400);
              done();
      });
      
      });
    it('it should GET return 200 on hit', function(done){
      chai.request(server.app)
          .get('/archive?scnls=YACH.HNZ.UW.--&starttime=1000')
          .end(function(err, res){
            res.should.have.status(200);
      });
      chai.request(server.app)
          .get('/archive?scnls=YACH.HNZ.UW.--&starttime=900')
          .end(function(err, res){
            res.should.have.status(200);
            done();
      });
    });
    
    it('it should GET return 404 on miss', function(done){
      chai.request(server.app)
          .get('/archive?scnls=YACH.HNZ.UW.--&starttime=6001')
          .end(function(err, res){
            res.should.have.status(404);
            done();
      });
    });
  
});