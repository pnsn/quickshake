//Connect to Earthworm waveserver to retrieve traceBuf2 packages for a
//given SCNL and time window
//node quakeShakePub.js waveHost=host wavePort=port# sta=RCM chan=EHZ net=UW redisPort=redisPort redisHost = port#
//or
//node server/quakeShakePub.js server=import02.ess.washington.edu  port=16022 sta=HWK1 chan=HNZ net=UW

//ALL EPOCH TIMES ARE MILLISECONDS!!!!

var Waveserver = require(__dirname + '/lib/waveserver');
var ScnlRequest = require(__dirname + '/lib/scnl_request');
var MongoClient  = require('mongodb').MongoClient;
var ServerConf = require("./config/serverConf.js");
var WaveServerConf= require(__dirname + "/config/waveserver.conf.js");

var waveConf = new WaveServerConf();
var serverConf = new ServerConf();
var logger = require('winston');

var env=process.env.NODE_ENV || "development"; //get this from env

var MONGO_URI = serverConf[env].mongo.uri;
var DB_NAME = serverConf[env].mongo.dbName;
var COLL_SIZE = serverConf[env].archiveCollSize;
logger.level="debug";
logger.add(logger.transports.File, { filename: 'log/waveserver.log' });
var ARGS={};
process.argv.forEach(function(val, index, array) {

  if(val.match(/=.*/i)){
    var keyVal = val.split("=");
    ARGS[keyVal[0]] = keyVal[1];
  }
});
if(ARGS['starttime']==null || (ARGS['sta']==null || ARGS['chan']==null ||
    ARGS['net']==null || ARGS['loc']==null)){
  var usage= `
            Usage:
              node readWaveServer.js starttime=123544545 [endtime=1232323212...]
              ...sta=RCM chan=HHZ net=UW loc=--
              You must include starttime but if endtime is missing default is
              starttime + 10 min

  `
  console.log(usage);
  process.exit(1)
}
if(ARGS['endtime']==null){
  ARGS['endtime'] = parseInt(ARGS['starttime']) + 10*60*1000
}




var waveHost = waveConf.waveHost;
var wavePort = parseInt(waveConf.wavePortStart);
var wavePortStop = parseInt(waveConf.wavePortStop);
var start = ARGS['starttime'];
var end =  ARGS['endtime'];
//assume the mongo collection doesn't exist
var collection_exists = false;
var buffsReceived=0;
var buffsProcessed=0;
MongoClient.connect(MONGO_URI, {connectTimeoutMS: 600000, socketTimeoutMS: 600000} ,function(err, client){
  if(err) throw err;
  var db = client.db(DB_NAME);
  var scnl_request= new ScnlRequest(ARGS['sta'], ARGS['chan'], ARGS['net'], ARGS['loc']);


  check_collection(db, scnl_request);

  function check_collection(db, scnl_request){
    db.listCollections().toArray(function(err, colls){
      if(err) throw err;
      for(var i=0; i< colls.length; i++){
        if(collection_name() == colls[i]['name']){
            logger.info("collection exists");
             collection_exists = true;
        }
      }
      getData(scnl_request);
    });

  }

  function getData(scnl){
    console.log('getData called');

    var responseHeader;
    var ws = new Waveserver(waveHost, wavePort, scnl);
    ws.connect(start, end);
    //parse getScnlRaw flag and decide whether to disconnect or continue
    ws.on('header', function(header){
      logger.info("Using Port " + wavePort);
      responseHeader=header.flag;
      logger.info("Received Response Flag=" + header.flag + " " + ws.returnFlagKey()[header.flag]);
      if(header.flag === 'FN'){
        var scnl_str = scnl.sta + ":" + scnl.chan + ":" + scnl.net + ":" + scnl.loc;
        logger.info("Scnl " + scnl_str +  " not found in tank on " + waveHost +":" +wavePort);
        logger.info("incrementing port and trying again")
        ws.disconnect();
        wavePort+=1;
        logger.info(wavePort);
        if(wavePort <= wavePortStop){
          logger.info("incrementing port by 1");
          getData(scnl);
        }else{
          logger.info("Nope! Tanks for nothing " + scnl_str + " on " + waveHost);
          ws.disconnect();
        }

      }else if(header.flag !="F"){
	       logger.info("Error Flag Returned");
         ws.disconnect();
      }



    });
    ws.on('data', function(message){
        buffsReceived+=1;
        updateCollection(message, collection_exists);
    });

    ws.on('error', function(error){
      // console.log("on the client error: ");// + error);
    });


    ws.on("close", function(){
      if(responseHeader=='F'){
        logger.info("in the close");
        logger.info("ws buffs = " + buffsReceived);
        logger.info("buffsProcessed = " + buffsProcessed);
        setInterval(function(){
          logger.info("ws buffs = " + buffsReceived);
          logger.info("buffsProcessed = " + buffsProcessed);
          if(buffsReceived == buffsProcessed){
            logger.info("closing time");
            process.exit(0);
          }
        },2000);
      }else{
	       process.exit(0);
     }
    });

  }


  function collection_name(){
    var s = scnl_request;
    return s.sta + "." + s.chan + "." + s.net + "." + s.loc + "CWAVE"
  }

  function updateCollection(doc){
    buffsProcessed +=1;
    if(!collection_exists){
      db.createCollection(collection_name(), { capped: true, size: COLL_SIZE},function(err, coll){
        if(err) throw err;
        collection_exists = true;
        logger.info("creating mongodb collection wavforms." + collection_name());
        coll.createIndex({starttime: 1},function(){
          coll.update({"key": doc.key}, doc, {upsert: true}, function(err, result){
            if(err) throw err;
          });
        });
      });
    }else{
      var coll = db.collection(collection_name());
      coll.update({"key": doc.key, "starttime": doc.starttime}, doc, {upsert: true}, function(err, result){
        if(err) throw err;
      });
    }
  }
});
