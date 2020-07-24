/*
  config for different environments
*/

function ServerConf(){
  this.production= {
    mongo:{
      uri: "mongodb://" + process.env.MONGO_USER + ":" + encodeURIComponent(process.env.MONGO_PASSWD) + "@"
              + process.env.MONGO_HOST + ":" + process.env.MONGO_PORT + "/"
              + "?authMechanism=DEFAULT" + "&authSource=admin",
      dbName: "waveforms",
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
      uri: "mongodb://" + process.env.MONGO_USER + ":" + encodeURIComponent(process.env.MONGO_PASSWD) + "@"
              + process.env.MONGO_HOST + ":" + process.env.MONGO_PORT + "/"
              + "?authMechanism=DEFAULT" + "&authSource=admin",
      dbName: "waveforms",
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
      uri: "mongodb://" + process.env.MONGO_USER + ":" + encodeURIComponent(process.env.MONGO_PASSWD) + "@"
              + process.env.MONGO_HOST + ":" + process.env.MONGO_PORT + "/"
              + "?authMechanism=DEFAULT" + "&authSource=admin",
      dbName: "waveforms",
      rtCollection: "ring"
    },

    http:{
      port: 8888
    },
  //the number of tracebuffs to keep in the buffer for each scnl
    ringBuffer: {
      max: 1024
    },
    archiveCollSize: (((3*86400* 1500)/256) * 256)

  };


  //temporary till we create ui to manage groups
  this.groups={
    "Mount_Saint_Helens":{
      "default":0,
      "scnls": ["ELK.EHZ.UW.--","SHW.EHZ.UW.--", "TDL.EHZ.UW.--", "HSR.EHZ.UW.--"]
    },
    "Short_Period":{
      "default":0,
      "scnls": ["JCW.EHZ.UW.--", "SLF.EHZ.UW.--", "RER.EHZ.UW.--", "TDH.EHZ.UW.--", "HBO.EHZ.UW.--"]
    },
    "Olympic_Peninsula":{
      "default":0,
      "scnls": ["MKAH.HNZ.UW.--","OSD.EHZ.UW.--", "HDW.EHZ.UW.--", "GMW.EHZ.UW.--", "BILS.HNZ.UW.--"]
    },
    "Inland_Washington":{
      "default":1,
<<<<<<< HEAD
      "scnls":["JCW.EHZ.UW.--", "GMW.EHZ.UW.--","SLF.EHZ.UW.--","RER.EHZ.UW.--","ELK.EHZ.UW.--"]
=======
      "scnls":["JCW.EHZ.UW.--", "SLF.EHZ.UW.--","RER.EHZ.UW.--","ELK.EHZ.UW.--", "GMW.EHZ.UW.--"]
>>>>>>> 88417b8a374a1d16f3301ac3ae7c4ab5694e8c85
    },
    "Inland_Oregon":{
      "default":0,
      "scnls":["MORO.ENZ.UW.--", "TDH.EHZ.UW.--","BRO.HHZ.UW.--","HBO.EHZ.UW.--","BBO.HHZ.UW.--"]
    },
    "Coastal":{
      "default":0,
      "scnls":["OOW2.HNZ.UW.--","CORE.HNZ.UW.--","RSLG.HNZ.UW.--","FLRE.HNZ.UW.--","CABL.HNZ.UW.--","BROK.HNZ.UW.--"]
    },
    "Coastal_Washington":{
      "default":0,
      "scnls":["MKAH.HNZ.UW.--","BILS.HNZ.UW.--","OCEN.HNZ.UW.--","LWCK.HNZ.UW.--"]
    },
    "Coastal_Oregon":{
      "default":0,
      "scnls":["CNNB.HNZ.UW.--","CHZZ.HNZ.UW.--","ONAB.HNZ.UW.--","FLRE.HNZ.UW.--","COOS.HNZ.UW.--","WEDR.HNZ.UW.--"]
    }
  };
};


module.exports = ServerConf;
