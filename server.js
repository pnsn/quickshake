'use strict';
/*jslint node: true */

const express = require('express');
const app = express();
const http = require('http').Server(app);
const  url = require('url');
const WebSocketServer = require('ws').Server;
const wss = new WebSocketServer({server: http});
const logger = require('winston');
const Conf = require("./config.js");
const MongoClient  = require('mongodb').MongoClient;
const RingBuffer = require(__dirname + '/lib/ringBuffer');
const MongoArchive = require(__dirname + '/lib/mongoArchive');
const MongoRealTime = require(__dirname + '/lib/mongoRealTime');
    
const debug = require('debug')('quickshake');

var archive=false;
process.argv.forEach(function (val, index, array) {
  if(val==="archive"){
    archive=true;
  }
});
const conf = new Conf();
var env=process.env.NODE_ENV || "production"; //get this from env

var MONGO_URI = conf[env].mongo.uri;
exports.app=app; //for integration testing
app.use(express['static']('public'));
logger.level="debug";
logger.add(logger.transports.File, { filename: 'log/server.log' });

var _db;
var ringBuff = new RingBuffer(conf[env].ringBuffer.max, logger);
var mongoRT = new MongoRealTime(conf[env].mongo.rtCollection, ringBuff, logger);
var mongoArchive = new MongoArchive(ringBuff, 5000, logger);

//create a connection pool
MongoClient.connect(MONGO_URI, function(err, db) {
  if(err) throw err;  
  _db = db;
  mongoRT.database(db);
  mongoRT.tail();
  if(archive){
    mongoArchive.database(db);
    mongoArchive.start();
  }
  http.listen(conf[env].http.port, function(){
    logger.info("listening on port: " + conf[env].http.port);
  });
});


/* 
*****HTTP ROUTES******
GET scnls realtime  
 /realtime?scnls=...
GET scnls by timestamp
/archive?starttime=[time]&duration=[duration]&scnls=...
GET available scnls
 /scnls
GET scnls by group (maintained by config but will eventually have CRUD func 
  /groups
*/

//First request
//HTML response
app.get('/', function (req, res) {
  res.sendFile(__dirname + '/public/index.html');
});


//GET: unique list of scnls
//JSON response
app.get('/scnls', function (req, res) {
  _db.listCollections().toArray(function(err, collections){
    if(err) throw err;
    var scnls=[];
    for(var i=0;i<collections.length; i++){
      var col=collections[i]['name'];
      if(col != "ring"){
        col=ringBuff.mongoKey2Ew(collections[i]["name"]);
        scnls.push(col);
      }
    }
    res.jsonp(scnls);
  });
});




//return document of groups with channels
//FIXME: this should probably be managed in mongo and not a conf file but not now--not now!
app.get('/groups', function (req, res) {
  res.jsonp(conf.groups);
});

//with scnl(s) and startime return tracebufs
//return 400 if missing either param
//return 404 if no data
app.get("/archive", function(req, res) {
  logger.info("path: /archive, ?query=" + req.query);
  var starttime=parseInt(req.query.starttime,0);
  var scnls = req.query.scnls === undefined ? null : req.query.scnls.split(",");
  if(scnls===null || starttime===null){
    res.status(400)
        .send("missing params starttime and or scnls"); //send 400 if missing params
  }else{
    //remove any non scnl-y things
    var clean_scnls=[];
       for(var i=0; i< scnls.length; i++){
         if(scnls[i].match(/.{3,4}\..{3}\..{2}\..*/)){
           clean_scnls.push(scnls[i]);
         }
       }
       var duration;
       
       if(req.query.duration===undefined || 
           parseInt(req.query.duration,0) > (60*60*1000) || 
           parseInt(req.query.duration,0) < (1*60*1000)){
         endtime= starttime + (10*60*1000);
       }else{
         endtime=startime + req.query.duration;
       }
       var results=[];
       logger.info("starttime: " + starttime + " endtime: " + endtime + " scnls:" + clean_scnls);
       sendArchive(clean_scnls, res, starttime, endtime, results);
    }
});

var CLIENTS={};
var lastId=-1;

/*mongoRing listeners
*Only one per app not client connection
*/

mongoRT.on('message', sendMessage);

mongoRT.on('close', function(doc){
  logger.info('closing message');
});

mongoRT.on('error',function(err){
  logger.error(err);
});

/* end mongo listeners*/


/*ws for each  client connection*/
wss.on('connection', function connection(ws) {
  var client = {"socket": ws, "params":{}};
  lastId++;
  var id = lastId;
  client["params"]=parseWsParams(ws);
  // client['mongo-listener']
  CLIENTS[id]=client;
  if(CLIENTS[id]["params"]["scnls"]){
    sendRing(id,ws);
  }
  
  ws.on("close", function(){
    logger.info("removing client: " + id);
    removeClient(id);
  });
  
  ws.on("error", function(error){
    logger.error(error);
    removeClient(id);
  });
  
  
});


//take client id and doc and send to clients

function sendMessage(doc){
  for(var id in CLIENTS){
    var socket = CLIENTS[id]["socket"];
    if(socket.readyState != socket.OPEN){
      logger.info("Socket closed, removing client" + id);
      removeClient(id);
    }else if(CLIENTS[id] && CLIENTS[id]["params"] && 
            CLIENTS[id]['params']["scnls"] &&
            CLIENTS[id]['params']["scnls"].indexOf(ringBuff.ewKey2Mongo(doc["key"])) != -1){
      socket.send(JSON.stringify(doc));
    }
  }

}

/*parse user params from webocket connections*/
function parseWsParams(socket){
  var params = url.parse(socket.upgradeReq.url, true).query;
  //it was necessary to call it this way
  //since url parse does not create obj with Object.prototype as it's prototype
  if(Object.prototype.hasOwnProperty.call(params, 'scnls')){
    var temp= params["scnls"].split(",");
    params['scnls'] =[];
    for(var i=0;i< temp.length; i++){
      params['scnls'].push(ringBuff.ewKey2Mongo(temp[i]));
    }
  }
  return params;
}

//delete client from pool
function removeClient(id){
  delete CLIENTS[id];
}

//send ringbuff to client on connection
function sendRing(id,socket){
  var scnls= CLIENTS[id]["params"]["scnls"];
  if(scnls !==undefined){
    for(var i=0; i < scnls.length; i++){
      if(ringBuff['ring'].hasOwnProperty(scnls[i])){
        var buf = ringBuff['ring'][scnls[i]];
        var index= (buf.currentIndex+1)%buf.traces.length;
        while(index !== buf.currentIndex){
          socket.send(JSON.stringify(buf.traces[index]));
          index = (index +1)%buf.traces.length;
        }
      }
    }
  }
}

//recursive function to iterate through each scnl by creating dynamic callback hell
function sendArchive(scnls,res,starttime, endtime, results) {
  // base case  
  if(scnls.length < 1){
    if(results.length ===0){
      res.status(404)
          .send("Not found");
    }else{
      res.jsonp(results);
    }
    
  }else{
    var key = scnls.shift();
    key = ringBuff.ewKey2Mongo(key);
    var coll= _db.collection(key);
    coll.find( {"starttime": {$gte: starttime, $lte: endtime}} ).toArray(function(err, tracebuffs){
        if (err) return loggger.error(err);
        results=results.concat(tracebuffs);
        sendArchive(scnls,res,starttime,endtime,results);
    });
    }
}