//run readwave server to  update all CWAVE collections for a given start/stop time
const MongoClient  = require('mongodb').MongoClient;
const ServerConf = require("../..//config/serverConf.js");
var serverConf = new ServerConf();

var env=process.env.NODE_ENV || "development"; //get this from env

var MONGO_URI = serverConf[env].mongo.uri;
var DB_NAME = serverConf[env].mongo.dbName;

var ARGS={};
process.argv.forEach(function(val, index, array) {

  if(val.match(/=.*/i)){
    var keyVal = val.split("=");
    ARGS[keyVal[0]] = keyVal[1];
  }
});


if(ARGS['starttime']==null){
  var usage= `
            Usage:
              node update_all_collections starttime=123544545 [endtime=1232323212]
              You must include starttime but if endtime is missing default is
              starttime + 10 min

  `
  console.log(usage);
  process.exit(1)
}


var childProcess = require('child_process');
//args are the script args in array
function runScript(scriptPath, starttime, endtime, collections, callback) {

    // keep track of whether callback has been invoked to prevent multiple invocations
    var invoked = false;
    var coll= collections.pop();
    var args=[];
    console.log(coll);
    args.push("sta=" + coll.sta);
    args.push("chan=" + coll.chan);
    args.push("net=" + coll.net);
    args.push("loc=" + coll.loc);
    args.push("starttime=" + starttime);
    if(endtime){
      args.push("endtime=" + endtime);
    }
    console.log("fork this");
    var process = childProcess.fork(scriptPath, args);

    // listen for errors as they may prevent the exit event from firing
    process.on('error', function (err) {
        if (invoked) return;
        invoked = true;
        callback(err);
    });

    // execute the callback once the process has finished running
    //then call recursively
    process.on('exit', function (code) {
        console.log(collections.length + " collections pending");
        if (invoked) return;
        invoked = true;
        var err = code === 0 ? null : new Error('exit code ' + code);
        // callback(err);
        if(collections.length > 0){
          runScript('./readWaveServer.js', ARGS['starttime'], ARGS['endtime'], collections, function (err) {
              console.log("running inside function")
              if (err) throw err;
          });
        }

    });

}

MongoClient.connect(MONGO_URI, function(err, client){
  if(err) throw err;
  var db = client.db(DB_NAME);

  //create an array of scnls
  // pop of on each fork
  // recursively call till all out
  var collections=[];
  // var coll_names=["BRO.EHZ.UW.--CWAVE", "TDH.EHZ.UW.--CWAVE"];
  // for(var i=0; i< coll_names.length; i++){
  //   if(coll_names[i].search(/CWAVE/) > 0){
  //     var col={};
  //     var coll_arr = coll_names[i].split(".");
  //     col['sta'] =coll_arr[0];
  //     col['chan'] = coll_arr[1];
  //     col['net'] = coll_arr[2];
  //     col['loc'] = coll_arr[3].substring(0,2);
  //     collections.push(col);
  //   }
  // }
  db.listCollections().toArray(function(err, colls){
    if(err) throw err;
    for(var i=0; i< colls.length; i++){
      //get only collections with CWAVE in name
      var coll_name = colls[i]['name'];
      if(coll_name.search(/CWAVE/) > 0){
        var col={};
        var coll_arr = coll_name.split(".");
        col['sta'] =coll_arr[0];
        col['chan'] = coll_arr[1];
        col['net'] = coll_arr[2];
        col['loc'] = coll_arr[3].substring(0,2);
        collections.push(col);
      }
    }
    db.close
    console.log("closed!");
    //start here, then run this recursively in the exit callback till collection is all used up
    runScript('./readWaveServer.js', ARGS['starttime'], ARGS['endtime'], collections, function (err) {
        console.log("running inside mother function")
        if (err) throw err;
    });
  });
});
