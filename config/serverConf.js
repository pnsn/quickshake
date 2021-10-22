/*
  config for different environments
*/

function ServerConf(){
  this.production= {
    mongo:{
      uri: "mongodb://" + process.env.MONGO_USER + ":" + encodeURIComponent(process.env.MONGO_PASSWD) + 
            "@" + process.env.MONGO_HOST + ":" + process.env.MONGO_PORT + "/" +
            "?authMechanism=DEFAULT" + "&authSource=admin",
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
      uri: "mongodb://db:27017",
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
      uri: "mongodb://" + process.env.MONGO_USER + ":" + encodeURIComponent(process.env.MONGO_PASSWD) + 
            "@" + process.env.MONGO_HOST + ":" + process.env.MONGO_PORT + "/" +
            "?authMechanism=DEFAULT" + "&authSource=admin",
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
    "Central_Washington":{
      "default":1,
      "scnls":["JCW.EHZ.UW.--","GMW.EHZ.UW.--","STOR.HHZ.UW.--", "LCW2.EHZ.UW.--", "TDL.EHZ.UW.--"]
    },
    "Eastern_Washington": {
      "default":0,
      "scnls":["CBS.HHZ.UW.--", "OD2.EHZ.UW.--", "YA2.EHZ.UW.--", "ET4.EHZ.UW.--", "RED2.EHZ.UW.--", "TUCA.HHZ.UW.--"]
    },
    "Olympics" : {
      "default": 0, 
      "scnls": ["MKAH.HNZ.UW.--", "OSD.EHZ.UW.--", "GMW.EHZ.UW.--", "OLQN.HHZ.UW.--", "BILS.HNZ.UW.--"]
    },
    "Western_Oregon" : {
      "default": 0, 
      "scnls": ["FISH.HHZ.UW.--", "LCCR.HHZ.UW.--", "BABR.HHZ.UW.--", "BRO.HHZ.UW.--", "HBUG.HHZ.UO.--", "WOOD.HHZ.UO.--"]
    },
    "Eastern_Oregon" : {
      "default": 0, 
      "scnls": ["JESE.HHZ.UO.--", "WIFE.BHZ.CC.--", "NORM.BHZ.CC.--", "TREE.HHZ.UW.--", "JAZZ.HHZ.UO.--"]
    },
    "Mount_Rainier" : {
      "default": 0, 
      "scnls": ["STAR.EHZ.UW.01", "RCS.EHZ.UW.--", "RCM.HHZ.UW.--", "LON.HHZ.UW.--", "FMW.HHZ.UW.--"]
    },
    "Mount_St_Helens" : {
      "default": 0, 
      "scnls": ["SEP.BHZ.CC.--", "HSR.EHZ.UW.--", "SHW.EHZ.UW.--", "EDM.EHZ.UW.--", "ELK.EHZ.UW.--", "FL2.EHZ.UW.--"]
    },
    "Mount_Hood" : {
      "default": 0, 
      "scnls": ["TIMB.BHZ.CC.--", "HOOD.HHZ.UW.--", "TDH.EHZ.UW.--", "VFP.EHZ.UW.--", "VLL.EHZ.UW.--"]
    }
  };
}


module.exports = ServerConf;
