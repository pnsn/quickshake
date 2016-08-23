//test cases for mongoserver prototype
var assert = require('assert')
    , Conf = require("../config.js")
    , RingBuffer = require(__dirname + '/../lib/ringBuffer');



var conf = new Conf();
var buffMax=6;
var ringbuff = new RingBuffer(buffMax)


// //create mock data
function mockTraceJson(scnl){
  return {
    "key": scnl,
    "starttime":  Date.now() -2000,
    "endtime":    Date.now(),
    "samprate":   200,
    "sta":        sta,
    'chan':       "EHZ",
    'net':        "UW",
    'loc':        "--",
    'data':       [1,3, 100000,-200]
  };
}





var sta="SHIT";
var scnl = sta + "_" + "EHZ" + "_" + "UW" + "--";

//set bufferMax to small number, fill then check length
for(var i=0; i< buffMax; i++){
  ringbuff.update(new mockTraceJson(scnl));
}
console.log(ringbuff);
assert(ringbuff['ring'][scnl].traces.length ===buffMax);
assert(ringbuff['ring'][scnl].currentIndex ===buffMax -1);
ringbuff.update(new mockTraceJson(scnl));
assert(ringbuff['ring'][scnl].currentIndex ===0);



