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

function RingBuffer(buffMax, logger){
  this.ring={};
  this.buffMax=buffMax;
  this.logger=logger;
  
}

RingBuffer.prototype.clear=function(){
  this.ring={};
};


//ring will not grow larger than buffMax
RingBuffer.prototype.update=function(msg){
  var key =msg.key;
  var ring= this.ring;
  if(!ring.hasOwnProperty(key)){
    ring[key]={
      traces: [],
      currentIndex: -1,
      lastArchivedIndex: -1,
      lastUpdate: null
    };
  }
  //debugger code to determine if it's hanging here
  if(ring[key]["currentIndex"]===this.buffMax){
    this.logger.info("End of the buffer for scnl " + key);
  }
  ring[key]["currentIndex"]=(ring[key]["currentIndex"] +1)%this.buffMax;
  ring[key]["traces"][ring[key]['currentIndex']] = msg;
  ring[key]["lastUpdate"]= Date.now();
};




module.exports = RingBuffer;