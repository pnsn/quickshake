function ServerConf(){
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
    },
    //three days
    archiveCollSize:(((3*86400* 1500)/256) * 256)
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
    },
    //three days
    archiveCollSize: (((3*86400* 1500)/256) * 256)
    
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
    "Olympic_Peninsula":{
      "default":1,
      "scnls": ["OSD.EHZ.UW.--","DOSE.BHZ.UW.--", "HDW.EHZ.UW.--", "GMW.EHZ.UW.--", "GNW.BHZ.UW.--"]
    },
    "Inland_Washington":{
      "default":0,
      "scnls":["JCW.EHZ.UW.--", "CBS.EHZ.UW.--","SLF.EHZ.UW.--","FMW.EHZ.UW.--","RVC.EHZ.UW.--","ELK.EHZ.UW.--"]
    },
    "Inland_Oregon":{
      "default":0,
      "scnls":["TDH.EHZ.UW.--","HBO.EHZ.UW.--","BBO.EHZ.UW.--","BRO.EHZ.UW.--"]
    },
    "Coastal":{
      "default":0,
      "scnls":["OOW2.HNZ.UW.--","CORE.HNZ.UW.--","RSLG.HNZ.UW.--","YACH.HNZ.UW.--","CABL.HNZ.UW.--","BROK.HNZ.UW.--"]
    },
    "Coastal_Washington":{
      "default":0,
      "scnls":["MKAH.HNZ.UW.--","FORK.ENZ.UW.--","BILS.HNZ.UW.--","OCEN.HNZ.UW.--","RADR.HNZ.UW.--","LWCK.HNZ.UW.--"]
    },
    "Coastal_Oregon":{
      "default":0,
      "scnls":["CNNB.HNZ.UW.--","CHZZ.HNZ.UW.--","ONAB.HNZ.UW.--","FLRE.HNZ.UW.--","COOS.HNZ.UW.--","WEDR.HNZ.UW.--"]
    }

  };
};


module.exports = ServerConf;