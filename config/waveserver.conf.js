function WaveServerConf(){
  //Enter port range (inclusive) of waveservers. Process starts at lowest port and
  //iterates through till it finds a hit or runs out of port
  this.waveHost = "mazama.ess.washington.edu";
  this.wavePortStart = 16017;
  this.wavePortEnd = 16017;
}

module.exports = WaveServerConf;
