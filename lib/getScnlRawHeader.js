//getscnlraw header will b of form:
//rwserv 362 RCM EHZ UW -- F i4 1.41602512E9 1.416025186E9 30624
function getScnlRawHeader(response){
  this.requestId    =response[0];
  this.someNumber   =parseInt(response[1], 0);
  this.sta          =response[2];
  this.chan         =response[3];
  this.net          =response[4];
  this.loc          =response[5];
  this.flag         =response[6];
  this.datatype     =response[7];
  this.starttime    =parseFloat(response[8]);
  this.endtime      =parseFloat(response[9]);
  this.numBytes     =parseInt(response[10], 0); 
};
module.exports = getScnlRawHeader;