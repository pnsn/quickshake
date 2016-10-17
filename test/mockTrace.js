/*
trace mock for testing
*/
function MockTrace(sta,chan,net,loc){
  this.starttime =Date.now() -2000;
  this.endtime=   Date.now();
  this.samprate=   200;
  this.sta=sta;
  this.chan= chan;
  this.net=net;
  this.loc=loc;
  this.key=this.makeEwKey(sta,chan,net,loc);
  this.traces=[1,3, 100000,-200];
}
  


//return a key as would be found in EW RING (all upcase with '-' deliminators)
MockTrace.prototype.makeEwKey=function(){
  return this.sta + "-" + this.chan + "-" + this.net + "-" + this.loc;
};

module.exports = MockTrace;