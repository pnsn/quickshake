//test cases for mongoserver prototype
// var assert = require('assert')
var expect  = require("chai").expect
  ,RingBuffer = require("../lib/ringBuffer.js")
  ,MockTrace =  require("./factories/mockTrace.js");


var buffMax=6;
var ringbuff;
var sta="SHIT";
var chan="EHZ";
var net="UW";
var loc="--";


before(function(){
   ringbuff= new RingBuffer(buffMax);
  for(var i=0; i< buffMax; i++){
    ringbuff.update(new MockTrace(sta,chan,net,loc));
  }
});


describe("Ringbuffer update", function(){

  it("has valid index", function(){
    validKey=sta + "." + chan + "."  + net + "." + loc;
    expect(ringbuff['ring'][validKey].traces.length).to.equal(buffMax);
    expect(ringbuff['ring'][validKey].currentIndex).to.equal(buffMax-1);
    ringbuff.update(new MockTrace(sta,chan,net,loc));
    expect(ringbuff['ring'][validKey].currentIndex).to.equal(0);
  });

});
