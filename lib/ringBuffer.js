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
  var key = this.makeKey(msg.key);
  var ring= this.ring;
  if(!ring.hasOwnProperty(key)){
    console.log("in ringbuff adding key " + key);
    ring[key]={
      traces: [],
      currentIndex: -1,
      lastArchivedIndex: -1,
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

//keys need to be lowercased, and use substitute underscores for dashes and periods.
RingBuffer.prototype.makeKey=function(key){
  return key.replace(/-|\./g, "_").toLowerCase();
  
};

module.exports = RingBuffer;