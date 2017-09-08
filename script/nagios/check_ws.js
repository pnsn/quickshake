#!/usr/bin/env node
var WebSocketClient = require('websocket').client;
 
var client = new WebSocketClient();
var response =[];
var code=3;
client.on('connectFailed', function(error) {
  console.log("connectionFailed");
    // console.log('Connect Error: ' + error.toString());
    exit(2, error.toString());
});

client.on('connect', function(connection) {
    connection.on('error', function(error) {
      console.log("connectionFailed");
      
      exit(2, error.toeString());
    });
    connection.on('close', function() {
        // console.log('Connection Closed');
        // console.log(response.length);
        if(response.length > 0){
          exit(0,"Success");
        }else{
          exit(1, "No Data");
        }
    });
    connection.on('message', function(message) {
      response.push(message);
    });
    setTimeout(function(){
      connection.close();      
    },1000);
});
// var test_url="ws://quickshake.pnsn.org/";
var url="ws://quickshake.pnsn.org/?scnls=FMW.EHZ.UW.--,SLF.EHZ.UW.--,HDW.EHZ.UW.--,BBO.EHZ.UW.--,HBO.EHZ.UW.--,ELK.EHZ.UW.--";
client.connect(url);

//not sure how to handle message part
//or if it is even used
function exit(code, message){
  console.log(message);
  process.exit(code);
}