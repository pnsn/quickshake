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
  
  //temporary till we create ui to manage groups
  this.groups={
    supergrouper: {
      "default": 1,
      scnls: ['TAHO.HNZ.UW.--', 'BABR.ENZ.UW.--', 'JEDS.ENZ.UW.--']
    },
    groupaloopa: {
      "default": 0,
      scnls: ['CORE.ENZ.UW.--', 'BABR.ENZ.UW.--', 'JEDS.ENZ.UW.--', 'BROK.HNZ.UW.--']
    },
    grouptastic: {
      "default": 0,
      scnls: ['TAHO.HNZ.UW.--', 'CORE.ENZ.UW.--', 'BROK.HNZ.UW.--']
    },
    groupy:{
      "default": 0,
      scnls:['BABR.ENZ.UW.--','JEDS.ENZ.UW.--']
    },
    grouper:{
      "default": 0,
      scnls:['CORE.ENZ.UW.--','BROK.HNZ.UW.--']
    },
    groupaloo:{
      "default": 0,
      scnls:['TAHO.HNZ.UW.--','BROK.HNZ.UW.--']
    },
    theincrediblegroup:{
      "default": 0,
      scnls: ['BILS.HNZ.UW.--','LWCK.HNZ.UW.--','CHZZ.HNZ.UW.--','YACH.HNZ.UW.--','BROK.HNZ.UW.--']
    }
  };
};


module.exports = Conf;