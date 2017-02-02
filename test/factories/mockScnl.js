/*
trace mock for testing
*/
function MockScnl(sta,chan){
  this.net = sta;
  this.sta = chan;
  this.loc = "";
  this.chan= "CHN";
  this.lat = 45;
  this.lon=  -122;
  this.elevation=122;
  this.depth = 0;
  this.azimuth= 0;
  this.dip = 4;
  this.sensorDescription= "awesome";
  this.scale= 2;
  this.scaleFreq= 3;
  this.scaleUnits= "M/S**2";
  this.sampleRate= 200;
  this.starttime= 10;
  this.endtime = 20;
}
//mock the arrray type
MockScnl.prototype.makeArray=function(){
  return[  
  this.net,
  this.sta,
  this.loc,
  this.chan,
  this.lat,
  this.lon,
  this.elevation,
  this.depth,
  this.azimuth,
  this.dip,
  this.sensorDescription,
  this.scale,
  this.scaleFreq,
  this.scaleUnits,
  this.sampleRate,
  this.starttime,
  this.endtime
  ];
};


module.exports = MockScnl;