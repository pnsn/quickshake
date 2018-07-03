/*
Used for archive script script/scnl_update.js
which updates the scnls collection in mongo by comparing collections with
fdsn to retrieve lat/lon data for plotting on client map
*/
function ScnlConf(){
  this.nets= ["UW","CC"];

}

module.exports = ScnlConf;
