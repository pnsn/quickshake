//simple scnl object
function Scnl(scnl){
  this.sta = scnl.sta;
  this.chan = scnl.chan;
  this.net = scnl.net;
  this.loc = scnl.loc;
  this.lastBufStart = null;
}

module.exports = Scnl;