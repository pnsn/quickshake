//creates a JS TraceBuf2 object
//include with
//var TraceBuf2 = require(__dirname + '/lib/traceBuf2');
//All times are in seconds but quakeShakeObj is in milliseconds to match native js date ob
function TraceBuf2(buf, datatype){
  this.datatype=buf.toString('utf-8', 57,59).replace(/\0/g, ''); //3
  this.pinno = this.readInt(buf, 0);
  this.nsamp = this.readInt(buf, 4);
  this.starttime= buf.readDoubleLE(8);
  this.endtime= buf.readDoubleLE(16);
  this.samprate= buf.readDoubleLE(24);
  this.sta =buf.toString('utf-8', 32, 38 ).replace(/\0/g, ''); //7
  this.net =buf.toString('utf-8', 39, 47).replace(/\0/g, '');  //9
  this.chan =buf.toString('utf-8', 48, 51).replace(/\0/g, ''); //4
  this.loc=buf.toString('utf-8', 52, 54).replace(/\0/g, '');  //3
  this.ver=buf.toString('utf-8', 55, 56).replace(/\0/g, ''); //2

  this.quality=buf.toString('utf-8', 60, 61).replace(/\0/g, '');
  // and two bytes of padding in a pear tree
  this.tdata= this.writeData(buf.slice(64, this.nsamp * this.intByteLength() + 64 ));

}


//parse buffer for trace data
TraceBuf2.prototype.writeData = function(buf){
  var _arr=[];
  var _i = 0;
  while(_i + this.intByteLength() < buf.length){
    _arr.push(this.readInt(buf, _i));
    _i += this.intByteLength();
  }
  return _arr;
};

//return number of int bytes for this datatype
TraceBuf2.prototype.intByteLength = function(){
  return parseInt(this.datatype.split("")[1],0);
};

//return an oject with only the relevent attrs for plotting
//convert time to milliseconds and round
TraceBuf2.prototype.toJSON = function(){
  return {
    'key': this.sta + "." + this.chan + "." + this.net + "." + this.loc,
    'nsamp': this.tdata.length,
    'starttime':  Math.round(this.starttime*1000),
    'endtime':    Math.round(this.endtime*1000),
    'samprate':   this.samprate,
    'datatype':   this.datatype,
    'data':       this.tdata
  };
};

//read int from buffer with correct endian and byte size
//datatype are the following:
// name     Endian     Bytes
//   s2       big       2
//   s4       big       4
//   i2       little    2
//   i4       little    4
TraceBuf2.prototype.readInt = function(buf, index){
  switch(this.datatype){
    case('s2'):
     return  buf.readInt16BE(index);
    case('s4'):
      return buf.readInt32BE(index);
    case('i2'):
      return buf.readInt16LE(index);
    default:
      return buf.readInt32LE(index);
  }


};

module.exports = TraceBuf2;
