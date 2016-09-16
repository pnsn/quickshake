/*create an buffer object keyed on scnl
with ring ring and current pointer
time stamp to prevent stale buffer
  buffer ={
          'scnl1': {
            traces: [trace1, trace2...buffMax]
            currentIndex: i
            lastUpdate: time;
            },
          'scnl2': {
            traces: [trace1, trace2...buffMax]
            currentIndex: i
            lastUpdate: time;
            }
            .
            .
            .
            
  }

*/

function RingBuffer(buffMax){
  this.ring={};
  this.buffMax=buffMax;
  
}

RingBuffer.prototype.clear=function(){
  this.ring={};
};


//ring will not grow larger than buffMax
RingBuffer.prototype.update=function(msg){
  // console.log("buffMax:" + this.buffMax)
  var key = msg.key;
  var ring= this.ring;
  if(!ring.hasOwnProperty(key)){
    ring[key]={
      traces: [],
      currentIndex: -1,
      lastUpdate: null
    };
  }
    
  ring[key]["currentIndex"]+=1;
  if(ring[key]["currentIndex"]===this.buffMax){
    ring[key]["currentIndex"]=0;
  }
  //add trace at the curent index
  ring[key]["traces"][ring[key]['currentIndex']] = msg;
  ring[key]["lastUpdate"]= Date.now();
};

module.exports = RingBuffer;