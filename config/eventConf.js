/*
config only used for unit test @ test/event_test.js
It is not needed for production

*/


function EventConf(){
  this.boundaries= {
    lat_min: 40.5,
    lat_max: 52,
    lon_min: -130,
    lon_max: -115,
    mag_min: 2.5
  };

}

module.exports = EventConf;
