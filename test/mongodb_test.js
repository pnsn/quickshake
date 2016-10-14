// //test cases for mongoserver prototype
// var assert = require('assert')
//     , Conf = require("../config.js")
//     , RingBuffer = require(__dirname + '/../lib/ringBuffer')
//     , MongoServer = require(__dirname + '/../lib/mongoServer');
//
//
//
// var conf = new Conf();
// var buffMax=6;
// var ringbuff = new RingBuffer(buffMax);
// var ms = new MongoServer(ringbuff);
//
// ms.tail();
//
// //set bufferMax to small number, allow to fill then check length
// var count =10;
// var si = setInterval(function(){
//   for(var scnl in ringbuff['ring']){
//     assert(ringbuff['ring'][scnl].traces.length <= buffMax)
//   }
//   count --;
//   if(count<=0){
//     clearInterval(si);
//     console.log("clearing");
//     process.exit();
//   }
// },1000);





