//test cases for mongoserver prototype
// var assert = require('assert')
var expect  = require("chai").expect
  ,RingBuffer = require("../lib/ringBuffer.js")
  ,MockTrace =  require("./mockTrace.js");


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

// describe("Should translate keys correctly", function(){
//   it("takes EW key and makes mongo key", function(){
//     var valid_m_key="sta_chn_nt";
//     var valid_ew_key="STA.CHN.NT.--";
//     var valid_m_key_w_loc="sta_chn_nt_lc";
//     var valid_ew_key_w_loc="STA.CHN.NT.LC";
//     expect(ringbuff.ewKey2Mongo(valid_ew_key)).to.equal(valid_m_key);
//     expect(ringbuff.ewKey2Mongo(valid_ew_key_w_loc)).to.equal(valid_m_key_w_loc);
//
//   });
//
// });