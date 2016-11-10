/*create an buffer object keyed on scnl
with ring ring and current pointer
time stamp to prevent stale buffer
  buffer ={
          'scnl1': {
            traces: [trace1, trace2...buffMax],
            currentIndex: i,
            lastArchivedIndex: i,
            lastUpdate: time;
          
            },
          'scnl2': {
            traces: [trace1, trace2...buffMax],
            currentIndex: i,
            lastUpdate: time;
            }
            .
            .
            .
            
  }

*/
/*jslint node:true */
"use strict";

function RingBuffer(buffMax){
  this.ring={};
  this.buffMax=buffMax;
  
}

RingBuffer.prototype.clear=function(){
  this.ring={};
};


//ring will not grow larger than buffMax
RingBuffer.prototype.update=function(msg){
  var key = this.ewKey2Mongo(msg.key);
  var ring= this.ring;
  if(!ring.hasOwnProperty(key)){
    ring[key]={
      traces: [],
      currentIndex: -1,
      lastArchivedIndex: -1,
      lastUpdate: null
    };
  }
    
  ring[key]["currentIndex"]+=1;
  ring[key]["currentIndex"]= ring[key]["currentIndex"]%this.buffMax;
  ring[key]["traces"][ring[key]['currentIndex']] = msg;
  ring[key]["lastUpdate"]= Date.now();
};

//keys need to be lowercased, and use substitute underscores for dashes and periods.
//sta_chan_net___
RingBuffer.prototype.ewKey2Mongo=function(key){
  return key.replace(/--|\./g, "_").toLowerCase();
  
};
//STA.CHAN.NET.--
//reverse, make mongo key look like EW key
RingBuffer.prototype.mongoKey2Ew=function(key){
  return key.replace(/__$/,".--").replace(/_/g, ".").toUpperCase();
};


module.exports = RingBuffer;