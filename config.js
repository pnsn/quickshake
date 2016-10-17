function Conf(){
  this.production= {
    mongo:{
      uri: "mongodb://" + process.env.MONGO_USER + ":" + process.env.MONGO_PASSWD + "@" 
              + process.env.MONGO_HOST + ":" + process.env.MONGO_PORT + "/" + "waveforms"
              + "?authMechanism=DEFAULT" + "&authSource=admin",
      rtCollection: "ring"
    },
    
    http:{
      port: 8888
    },
  //the number of tracebuffs to keep in the buffer for each scnl
    ringBuffer: {
      max: 800 
    }
  };
  this.testing= {
    mongo:{
      uri: "mongodb://mongo:27017",
      rtCollection: "ring"
    },
    
    http:{
      port: 8888
    },
  //the number of tracebuffs to keep in the buffer for each scnl
    ringBuffer: {
      max: 800 
    }
  };
  
 
};


module.exports = Conf;