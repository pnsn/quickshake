//Connect to Earthworm waveserver to retrieve traceBuf2 packages for a given SCNL and time window
//Waveserver uses seconds, quakeShake expects miliseconds
//so all Times must be passed in as milliseconds
var net = require('net');
const BufferList = require('bl');
var TraceBuf2 = require(__dirname + '/traceBuf2');
var getScnlRawHeader = require(__dirname + '/getScnlRawHeader');
var EventEmitter = require('events').EventEmitter;



function Waveserver(host,port,scnl){
  this.host= host;
  this.port= port;
  this.scnl = scnl;
  this.bufferList  = new BufferList();
  this.rawResponse;
  this.socket;
  this.requestedBytes;
  EventEmitter.call(this);
}

Waveserver.prototype = Object.create(EventEmitter.prototype);

Waveserver.prototype.requestStr = function(start, stop){
  return "GETSCNLRAW: getRaw " + this.scnl.sta + " " + this.scnl.chan + " " + this.scnl.net + " " + this.scnl.loc  +   " " + start + " " + stop +  " \n";
};

Waveserver.prototype.returnFlagKey= function(){
    return {
        'F':'success',
        'FR':'requested data right (later) than tank contents',
        'FL':'requested data left (earlier) than tank contents',
        'FG':'requested data lie in tank gap',
        'FB':'syntax error in request',
        'FC':'data tank corrupt',
        'FN':'requested tank not found',
        'FU':'unknown error',
        '--':'unknown Winston error'
        };
  };

//expects time in milliseconds
//method converts to seconds
Waveserver.prototype.connect = function(start,stop){
  //connect to socket
  //waveserver expects seconds
  start /=1000;
  stop /=1000;
  var _this = this;
  var client = new net.Socket();
  // var _bufferList = this.bufferList;

  //ensure we don't have any stragglers
  client.setTimeout(20*1000);
    _this.socket  = client.connect(_this.port, _this.host, function() {
    console.log(_this.requestStr(start, stop));
    client.write(_this.requestStr(start, stop));
  });


  // listen for incoming data
  _this.socket.on("data", function(data){

    if(!_this.rawResponse){ //getSnclRaw Header
        _this.requestedBytes =0;
        var  responseString = String.fromCharCode.apply(null, data);
        var index = responseString.indexOf("\n");
        responseString = responseString.slice(0, index);
        data = data.slice(index + 1, data.length);
        _this.rawResponse = new getScnlRawHeader(responseString.split(" "));
        _this.emit("header", _this.rawResponse);
    }
    if(data.length > 0){
      _this.bufferList.append(data);
      _this.makeTraceBuf2();
    }
  });

  //called by setting timeout in connect
  _this.socket.on('timeout', function(){
    console.log("timeout yo");
    _this.socket.destroy();
  });

  _this.socket.on('close', function() {
    console.log("closing this shit down");
    _this.emit("close");
  });


  _this.socket.on('error', function(err) {
    console.log("You got an error brah: " + err);
    _this.emit("error", err);
  });


};

Waveserver.prototype.makeTraceBuf2 = function(){
    //there needs to be at least enough for header
    while(this.bufferList.length >= 64){
      var tb = new TraceBuf2(this.bufferList, this.rawResponse.datatype);
      var traceBufSize = tb.nsamp * tb.intByteLength() + 64;
      if(this.bufferList.length >= traceBufSize){
        this.emit('data', tb.toJSON());
        this.bufferList.consume(traceBufSize);
        this.requestedBytes += traceBufSize;
      }else{
        break;
      }

  }
  //close connection when all bytes have been received
   if(this.requestedBytes >= this.rawResponse.numBytes){
     this.socket.destroy();
   }

};

Waveserver.prototype.disconnect = function(){
  this.socket.destroy();
};

module.exports = Waveserver;
