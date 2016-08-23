var app = require('express')()
    , http = require('http').Server(app)
    , url = require('url')
    , WebSocketServer = require('ws').Server
    , wss = new WebSocketServer({server: http})
    , Conf = require("./config.js")
    , MongoServer = require(__dirname + '/lib/mongoServer')
    , RingBuffer = require(__dirname + '/lib/ringBuffer');


var conf = new Conf();


//route for GET request to root
app.get('/', function (req, res) {
  res.sendFile(__dirname + '/public/index.html');
});


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

/*tail collection for new stuff this will 
 this will continue to pop off new documents as
  they are added to mongoDb
*/
mongo.tail();

//wrap this in fuction to be callable
// function wsconnect(){
var CLIENTS={}
var lastId=-1

wss.on('connection', function connection(ws) {
  client = {"socket": ws, "params":{}}
  var id = lastId ++;
  CLIENTS[id]=client
  client["params"]=parseParams(ws);
  // console.log(client);
  if(client['params'].hasOwnProperty("scnls")){
    sendRing(id,ws)
  }else{
    console.log("removing client");
    removeClient(id);
  }
  
  ws.on("close", function(){
    console.log("closing")
    removeClient(id);
  });
  
  ws.on("error", function(error){
    console.log(error);
    removeClient(id);
  });
  
  mongo.on('data', function(doc){
    sendMessage(id, doc)
  });
  
  mongo.on('close', function(doc){
    var msg = 'closing message: ' + doc.key;
  });
  

  // ws.on('message', function incoming(message) {
  //   console.log('received: %s', message);
  // });
  //
});




http.listen(conf.http.port, function(){
  console.log("listening on port: " + conf.http.port);
});

//take client id and doc and send to clients
function sendMessage(id, doc){
  for(id in CLIENTS){
    var socket = CLIENTS[id]["socket"]
    if(socket.readyState != socket.OPEN){
      removeClient(id);
    }else if(CLIENTS[id]["params"]["scnls"].indexOf(doc["key"]) != -1){
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
  var scnls= CLIENTS[id]["params"]["scnls"]
  for(var i=0; i < scnls.length; i++){
    if(RING_BUFF['ring'].hasOwnProperty(scnls[i])){
      var buf = RING_BUFF['ring'][scnls[i]];
      var index= buf.currentIndex + 1;
      while(index !== buf.currentIndex){
        if(index >= buf.traces.length)
          index=0;
          socket.send(JSON.stringify(buf.traces[index]));
          index ++;
      }
      console.log("yaaaa done");
    }
  }
}




function strToTime(unix_timestamp) {
  var date = new Date(unix_timestamp);
  var year =  date.getFullYear();
  var month = "0" + date.getMonth() + 1;
  var day =  "0" + date.getDate();
  var hours = "0" + date.getHours();// hours part from the timestamp
  var minutes = "0" + date.getMinutes(); // minutes part from the timestamp
  var seconds = "0" + date.getSeconds(); // seconds part from the timestamp
  var ms = "0" + date.getMilliseconds(); // milliseconds part from the timestamp
  // will display time in 1/18/2015 10:30:23.354 format
  return  "/" + month.substr(minutes.length-2) + "/ " + day.substr(minutes.length-2) + "/" + year + " " + 
          hours.substr(minutes.length-2) + ':' + minutes.substr(minutes.length-2) + ':' + 
          seconds.substr(seconds.length-2) + '.' + ms.substr(ms.length-3);
}