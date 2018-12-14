//FIXME this should be combined with the scnl class
//simple scnl object
function ScnlRequest(sta, chan, net, loc){
  this.sta = sta;
  this.chan = chan;
  this.net = net;
  this.loc = loc;
  this.lastBufStart = null;
}

module.exports = ScnlRequest;
