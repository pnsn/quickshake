function Conf(){
  this.mongo= {
    host: process.env.MONGO_HOST,
    port: process.env.MONGO_PORT,
    dbname: "waveforms",
    user: process.env.MONGO_USER,
    passwd: process.env.MONGO_PASSWD,
    authMech: "DEFAULT",
    authSource: "admin",
    rtCollection: "cwaves"
  };
  this.http ={
    port: 8888
  };
//the number of tracebuffs to keep in the buffer for each scnl
  this.ringBuffer={
    max: 800 
  };
};


module.exports = Conf;