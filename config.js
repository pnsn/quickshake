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
      uri: "mongodb://" + process.env.QUICKMONGO_PORT_27017_TCP_ADDR + ":" + process.env.QUICKMONGO_PORT_27017_TCP_PORT + "/waveforms",
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
  
  this.development= {
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
  
  //temporary till we create ui to manage groups
  this.groups={
    // "supergrouper": {
    //   "default": 0,
    //   "scnls": ["TAHO.HNZ.UW.--", "BABR.ENZ.UW.--", "JEDS.ENZ.UW.--"]
    // },
    // "groupaloopa": {
    //   "default": 0,
    //   "scnls": ["CORE.ENZ.UW.--", "BABR.ENZ.UW.--", "JEDS.ENZ.UW.--", "BROK.HNZ.UW.--"]
    // },
    // "grouptastic": {
    //   "default": 0,
    //   "scnls": ["TAHO.HNZ.UW.--", "CORE.ENZ.UW.--", "BROK.HNZ.UW.--"]
    // },
    // "groupy":{
    //   "default": 0,
    //   "scnls":["BABR.ENZ.UW.--","JEDS.ENZ.UW.--"]
    // },
    // "grouper":{
    //   "default": 0,
    //   "scnls":["CORE.ENZ.UW.--","BROK.HNZ.UW.--"]
    // },
    // "groupaloo":{
    //   "default": 0,
    //   "scnls":["TAHO.HNZ.UW.--","BROK.HNZ.UW.--"]
    // },
    // "theincrediblegroup":{
    //   "default": 0,
    //   "scnls": ["BILS.HNZ.UW.--","LWCK.HNZ.UW.--","CHZZ.HNZ.UW.--","YACH.HNZ.UW.--","BROK.HNZ.UW.--"]
    // },
    // "short_period":{
    //   "default":0,
    //   "scnls": ["FMW.EHZ.UW.--", "SLF.EHZ.UW.--", "HDW.EHZ.UW.--", "BBO.EHZ.UW.--", "HBO.EHZ.UW.--", "ELK.EHZ.UW.--"]
    // },
    "Z_Channels":{
      "default":1,
      "scnls": ["HWK1.HNZ.UW.--", "HWK2.HNZ.UW.--", "HWK3.HNZ.UW.--","HWK4.HNZ.UW.--", "HWK5.HNZ.UW.--", "HWK6.HNZ.UW.--"]
    },
    "E_Channels":{
      "default":0,
      "scnls": ["HWK1.HNE.UW.--", "HWK2.HNE.UW.--", "HWK3.HNE.UW.--","HWK4.HNZ.UW.--", "HWK5.HNZ.UW.--", "HWK6.HNZ.UW.--"]
    },
    "N_Channels":{
      "default":0,
      "scnls": ["HWK1.HNN.UW.--", "HWK2.HNN.UW.--", "HWK3.HNN.UW.--","HWK4.HNZ.UW.--", "HWK5.HNZ.UW.--", "HWK6.HNZ.UW.--"]
    },
    
  };
};


module.exports = Conf;