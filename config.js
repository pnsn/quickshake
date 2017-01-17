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
  
  //temporary till we create ui to manage groups
  this.groups={
    "Short_Period":{
      "default":1,
      "scnls": ["FMW.EHZ.UW.--", "SLF.EHZ.UW.--", "HDW.EHZ.UW.--", "BBO.EHZ.UW.--", "HBO.EHZ.UW.--", "ELK.EHZ.UW.--"]
    },
    "Noise_Comparison":{
      "default":0,
      "scnls":["HWK6.HNZ.UW.--", "HWK1.HNZ.UW.--", "HWK3.HNZ.UW.--", "KDK.ENZ.UW.--", "COOS.HNZ.UW.--"]
    },
    "The_Lord_of_the_Groups": {
      "default": 0,
      "scnls": ["TAHO.HNZ.UW.--", "BABR.ENZ.UW.--", "JEDS.ENZ.UW.--"]
    },
    "The_Hitchhikers_Group_to_the_Galaxy": {
      "default": 0,
      "scnls": ["CORE.ENZ.UW.--", "BABR.ENZ.UW.--", "JEDS.ENZ.UW.--", "BROK.HNZ.UW.--"]
    },
    "A_Group_of_Thrones": {
      "default": 0,
      "scnls": ["TAHO.HNZ.UW.--", "CORE.ENZ.UW.--", "BROK.HNZ.UW.--"]
    },
    "Groupy_Potter":{
      "default": 0,
      "scnls":["BABR.ENZ.UW.--","JEDS.ENZ.UW.--"]
    },
    "Hunger_Groups":{
      "default": 0,
      "scnls":["CORE.ENZ.UW.--","BROK.HNZ.UW.--"]
    },
    "A_Group_of_Unfortunate_Events":{
      "default": 0,
      "scnls":["TAHO.HNZ.UW.--","BROK.HNZ.UW.--"]
    },
    "The_Chronicles_of_Groupia":{
      "default": 0,
      "scnls": ["BILS.HNZ.UW.--","LWCK.HNZ.UW.--","CHZZ.HNZ.UW.--","YACH.HNZ.UW.--","BROK.HNZ.UW.--"]
    }
  };
};


module.exports = Conf;