/* 
base class for getting IRIS station data
and maintaing state in scnl mongo collection
*/
/*jslint node:true */
const request = require('request');

'use strict';
/*init with array
[net, sta, loc ,chan, lat, lon, elevation, depth, azimuth, dip, sensorDescription, 
 scale, scaleFreq, scaleUnits, sampleRate, starttime, endtime ]

*/
function Scnl(arr){
  this.net = arr[0];
  this.sta = arr[1];
  this.loc = this.getLoc(arr[2]);
  this.chan= arr[3];
  this.key=this.makeKey();
  this.lat = arr[4];
  this.lon=  arr[5];
  this.elevation=arr[6];
  this.depth = arr[7];
  this.azimuth= arr[8];
  this.dip = arr[9];
  this.sensorDescription= arr[10];
  this.scale= arr[11];
  this.scaleFreq= arr[12];
  this.scaleUnits= arr[13];
  this.sampleRate= arr[14];
  this.starttime= arr[15];
  this.endtime = arr[16];
  this.active = false;
}

var collName='scnls';

var serviceBaseUrl="https://service.iris.edu/irisws/fedcatalog/1/query?format=text&includeoverlaps=false&nodata=404";

Scnl.prototype.makeKey=function(){
  return this.sta + "." + this.chan + "." + this.net + "." + this.loc;
};

Scnl.prototype.getLoc=function(loc){
  loc=loc.replace(/\s/g,'');
  return loc.length > 0 ? loc : "--";
};

//accepts array of networks, returns uri string
Scnl.getServiceUri= function(net_array){
  var netString=net_array.join(",");
  return serviceBaseUrl+ "&net=" + netString;
};



// Scnl.prototype.getMongoCollections=function()
Scnl.parseIrisScnls= function(nets, callback){
  var uri=  this.getServiceUri(nets);
  request({
    url: uri,
    rejectUnauthorized: false,
    timeout: 8000
    },
    function (error, response, body){
      var scnls = response.body.split("\n"); 
      var collection={};
      for(var i=3; i< scnls.length; i++){
        var arr = scnls[i].split("|");
        if(arr.length ===17){
          var scnl = new Scnl(arr);
          collection[scnl.key]=scnl;
        }
        
      }
      callback(error, collection, response);
  });
};

//find all collections that end in "CWAVE"
Scnl.getCollections=function(db, callback){
  var scnls=[];
  db.listCollections().toArray(function(err, collections){
    for(var i=0; i< collections.length; i++){
      var scnl=collections[i]['name'];
      // console.log(scnl);
      if( scnl.match(/CWAVE$/)){
        scnls.push(scnl.split("CWAVE")[0]);
      }
    }
    callback(err, scnls);
    
  });
};
Scnl.getScnls=function(db, params, callback){
  coll=db.collection(collName);
  coll.find(params).toArray(function(err, scnls){
    callback(err,scnls);
  });
};

Scnl.upsert=function(db, scnl, callback){
  coll=db.collection(collName);
  coll.update({"key": scnl.key}, scnl, {upsert: true}, function(err, result){
    callback(err, result);
  });
};

//takes an array scnl objects and inserts
Scnl.insertScnls=function(db, scnls, callback){
  coll=db.collection(collName);
  coll.createIndex({key:1, active:1}); //this is no-op if exists
  coll.insertMany(scnls,function(err, result){
    callback(err, result);
  });
};

//ave packet size in seconds
Scnl.avePacketSize=function(db, cname){
  console.log(cname);
  var coll=db.collection(cname);
  coll.find().toArray(function(err, scnls){
    var sum=0;
    for(var i=0; i< scnls.length; i++){
      sum+=scnls[i].endtime-scnls[i].starttime;
    }
    var ave=(sum/i)/1000;
    console.log("collection " + cname + ": " + ave);
    // callback(err, ave);
    
  });
};


module.exports = Scnl;
