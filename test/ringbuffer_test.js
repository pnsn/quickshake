//test cases for mongoserver prototype
// var assert = require('assert')
    var Conf = require("../config.js")
    ,expect  = require("chai").expect
    ,RingBuffer = require("../lib/ringBuffer.js");



var conf = new Conf();
function mockTraceJson(sta,chan,net,loc){
  return {
    "key": makeEwKey(sta,chan,net,loc),
    "starttime":  Date.now() -2000,
    "endtime":    Date.now(),
    "samprate":   200,
    "sta":        sta,
    'chan':       chan,
    'net':        net,
    'loc':        loc,
    'traces':       [1,3, 100000,-200]
  };
}


//return a key as would be found in EW RING (all upcase with '-' deliminators)
function makeEwKey(sta,chan,net,loc){
  return sta + "-" + chan + "-" + net + "-" + loc;
}

describe("Ringbuffer update", function(){
  var buffMax=6;
  var ringbuff = new RingBuffer(buffMax);
  var sta="SHIT";
  var chan="EHZ";
  var net="UW";
  var loc="--";
  var ewKey=makeEwKey(sta,chan,net,loc);
  //set bufferMax to small number, fill then check length
  for(var i=0; i< buffMax; i++){
    ringbuff.update(new mockTraceJson(sta,chan,net,loc));
  }

  
  var validKey= ewKey.replace(/-|\./g, "_").toLowerCase();
  it("make valid scnl key", function(){
    expect(ringbuff.makeKey(ewKey)).to.equal(validKey);
  });

  it("has valid index", function(){
    expect(ringbuff['ring'][validKey].traces.length).to.equal(buffMax);
    expect(ringbuff['ring'][validKey].currentIndex).to.equal(buffMax-1);
    ringbuff.update(new mockTraceJson(sta,chan,net,loc));
    expect(ringbuff['ring'][validKey].currentIndex).to.equal(0);
  
  });
});
// // console.log(ringbuff);
// assert(ringbuff['ring'][scnl].traces.length ===buffMax);
// assert(ringbuff['ring'][scnl].currentIndex ===buffMax -1);
// ringbuff.update(new mockTraceJson(scnl));
// assert(ringbuff['ring'][scnl].currentIndex ===0);
//


