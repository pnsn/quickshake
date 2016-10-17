var express=require('express')
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
var conf = new Conf();
var env="production"; //get this from env

var MONGO_URI = conf[env].mongo.uri;

app.use(express.static('public'));
logger.level="debug";
logger.add(logger.transports.File, { filename: 'log/server.log' });

var _db;
var RING_BUFF = new RingBuffer(conf[env].ringBuffer.max);
var mongoRT = new MongoRealTime(conf[env].mongo.rtCollection, RING_BUFF, logger);
var mongoArchive = new MongoArchive(RING_BUFF, 5000, logger);

MongoClient.connect(MONGO_URI, function(err, db) {
  if(err) throw err;  
  _db = db;
  mongoRT.database(db);
  mongoArchive.database(db);
  // mongoRT.tail();
  // mongoArchive.start();
  http.listen(conf[env].http.port, function(){
    logger.info("listening on port: " + conf[env].http.port);
  });
});


//http routes
//GET available scnls
//GET scnls by timestamp
//GET scnls realtime  
//GET scnls by group (maintained by admin)

//First request
//HTML response
app.get('/', function (req, res) {
  res.sendFile(__dirname + '/public/index.html');
});


//GET: unique list of scnls
//JSON response
app.get('/scnls', function (req, res) {
  ms.getScnls(function(){
   res.send(res); 
  });
});


//oreturn document of groups with channels
// app.get('/groups', function (req, res) {

// });




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
  client["params"]=parseParams(ws);
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
    if(CLIENTS[id] && CLIENTS[id]["params"]["scnls"].indexOf(doc["key"]) != -1){
      socket.send(JSON.stringify(doc));
    }
  }

}

/*parse user params*/
function parseParams(socket){
  var params = url.parse(socket.upgradeReq.url, true).query;
  //turn scnls into array
  if(params.hasOwnProperty("scnls")){
    params['scnls']= params["scnls"].split(",");
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
    if(RING_BUFF['ring'].hasOwnProperty(scnls[i])){
      var buf = RING_BUFF['ring'][scnls[i]];
      var index= buf.currentIndex + 1;
      while(index !== buf.currentIndex){
        if(index >= buf.traces.length){
          index=0;
          }
        socket.send(JSON.stringify(buf.traces[index]));
        index ++;
      }
    }
  }
}