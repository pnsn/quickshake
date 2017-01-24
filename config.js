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
      max: 1024
    }
  };
  this.testing= {
    mongo:{
      uri: "mongodb://" + process.env.QUICKMONGO_PORT_27017_TCP_ADDR + ":" + process.env.QUICKMONGO_PORT_27017_TCP_PORT + "/waveforms",
      rtCollection: "ring"
    },
    
    http:{
      port: 8888
    },
  //the number of tracebuffs to keep in the buffer for each scnl
    ringBuffer: {
      max: 1024 
    }
  };
  
  this.development= {
    mongo:{
        uri: "mongodb://" + process.env.QUICKMONGO_PORT_27017_TCP_ADDR + ":" + process.env.QUICKMONGO_PORT_27017_TCP_PORT + "/waveforms",
      //uri: "mongodb://" + process.env.MONGO_USER + ":" + process.env.MONGO_PASSWD + "@" 
        //      + process.env.MONGO_HOST + ":" + process.env.MONGO_PORT + "/" + "waveforms"
        //      + "?authMechanism=DEFAULT" + "&authSource=admin",
      rtCollection: "ring"
    },
    
    http:{
      port: 8888
    },
  //the number of tracebuffs to keep in the buffer for each scnl
    ringBuffer: {
      max: 1024 
    }
  };
  
  //temporary till we create ui to manage groups
  this.groups={
    "Short_Period":{
      "default":1,
      "scnls": ["fmw_ehz_uw", "slf_ehz_uw", "hdw_ehz_uw", "bbo_ehz_uw", "hbo_ehz_uw", "elk_ehz_uw"]
    },
    "Inland_Washington":{
      "default":0,
      "scnls":["jcw_ehz_uw", "cbs_ehz_uw","slf_ehz_uw","fmw_ehz_uw","rvc_ehz_uw","elk_ehz_uw"]
    },
    "Inland_Oregon":{
      "default":0,
      "scnls":["tdh_ehz_uw","hbo_ehz_uw","bbo_ehz_uw","bro_ehz_uw"]
    },
    "Coastal":{
      "default":0,
      "scnls":["oow2_hnz_uw","core_hnz_uw","rslg_hnz_uw","yach_hnz_uw","cabl_hnz_uw","brok_hnz_uw"]
    },
    "Coastal_Washington":{
      "default":0,
      "scnls":["mkah_hnz_uw","fork_enz_uw","bils_hnz_uw","ocen_hnz_uw","radr_hnz_uw","lwck_hnz_uw"]
    },
    "Coastal_Oregon":{
      "default":0,
      "scnls":["cnnb_hnz_uw","chzz_hnz_uw","onab_hnz_uw","flre_hnz_uw","coos_hnz_uw","wedr_hnz_uw"]
    }
  };
};


module.exports = Conf;