var express=require('express')
    ,app = express()
    , http = require('http').Server(app)
    , url = require('url')
    , WebSocketServer = require('ws').Server
    , wss = new WebSocketServer({server: http})
    , Conf = require("./config.js")
    , MongoServer = require(__dirname + '/lib/mongoServer')
    , RingBuffer = require(__dirname + '/lib/ringBuffer');


var conf = new Conf();

app.use(express.static('public'));
//route for GET request to root
// app.get('/', function (req, res) {
//   res.sendFile(__dirname + '/public/index.html');
// });


//TODO: 
//GET: unique list of scnls
app.get('/scnls', function (req, res) {
  ms.getScnls(function(){
   res.send(res); 
  });
});

//return document of groups with channels
// app.get('/groups', function (req, res) {

// });
var RING_BUFF = new RingBuffer(conf.ringBuffer.max);
var mongo = new MongoServer(RING_BUFF);

var CLIENTS={};
var lastId=-1;
/*mongo listeners
*Only one per app not client connection
*/
mongo.tail();

mongo.on('message', sendMessage);

mongo.on('close', function(doc){
  var msg = 'closing message:';
  CLIENTS={};
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
    console.log("closing");
    removeClient(id);
  });
  
  ws.on("error", function(error){
    console.log(error);
    removeClient(id);
  });
  
  
});

http.listen(conf.http.port, function(){
  console.log("listening on port: " + conf.http.port);
});

//take client id and doc and send to clients

function sendMessage(doc){
  for(id in CLIENTS){
    var socket = CLIENTS[id]["socket"];
    if(socket.readyState != socket.OPEN){
      console.log("removing client..........................................................");
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