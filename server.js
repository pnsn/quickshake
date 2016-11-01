var express = require('express')
    ,app = express()
    ,http = require('http').Server(app)
    ,url = require('url')
    ,WebSocketServer = require('ws').Server
    ,wss = new WebSocketServer({server: http})
    ,logger = require('winston')
    ,Conf = require("./config.js")
    ,MongoClient  = require('mongodb').MongoClient
    ,RingBuffer = require(__dirname + '/lib/ringBuffer')
    ,MongoArchive = require(__dirname + '/lib/mongoArchive') 
    ,MongoRealTime = require(__dirname + '/lib/mongoRealTime');
    
const debug = require('debug')('quickshake');
var archive=false;
process.argv.forEach(function (val, index, array) {
  archive = val==="archive";
});
var conf = new Conf();
var env="production"; //get this from env

var MONGO_URI = conf[env].mongo.uri;

app.use(express['static']('public'));
logger.level="debug";
logger.add(logger.transports.File, { filename: 'log/server.log' });

var _db;
var ringBuff = new RingBuffer(conf[env].ringBuffer.max);
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
  _db.listCollections().toArray((err, collections)=>{
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


app.get("/archive", function(req, res) {
  var scnls = req.query.scnls.split(",");
 
  results=[];
  // var key=ringBuff.ewKey2Mongo(scnls[0]); //temp for testing

  var starttime=req.query.starttime;
  //+10 mins
  var endtime= starttime + (10*60*1000);
  
  if(req.query.scnls && req.query.starttime){
    sendArchive(scnls, res, starttime, endtime, results);
  }else{
    res.status(400);
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
  client = {"socket": ws, "params":{}};
  lastId++;
  var id = lastId;
  client["params"]=parseWsParams(ws);
  // client['mongo-listener']
  CLIENTS[id]=client;
  sendRing(id,ws);
  
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
  for(id in CLIENTS){
    var socket = CLIENTS[id]["socket"];
    if(socket.readyState != socket.OPEN){
      logger.info("Socket closed, removing client" + id);
      removeClient(id);
    }
    if(CLIENTS[id] && CLIENTS[id]["params"]["scnls"].indexOf(ringBuff.ewKey2Mongo(doc["key"])) != -1){
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

//recursive function to create dynamic callback hell
function sendArchive(scnls,res,starttime, endtime, results) {
  if(scnls.length < 1){
    res.jsonp(results);
  }else{
    var key = scnls.shift();
    key = ringBuff.ewKey2Mongo(key);
    var coll= _db.collection(key);
    coll.find({"starttime": {$gt: starttime, $lt: endtime}}).toArray((err, traceBuffs)=>{
        if (err) return console.log(err)
        results=results.concat(traceBuffs);
        sendArchive(scnls,res,starttime,endtime,results);
    });
    }
}