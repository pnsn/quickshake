/* 
eventArchiver  archives on discreet start stop times for event
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
  // console.log(scnl);
  coll.update({"key": scnl.key}, scnl, {upsert: true}, function(err, result){
    callback(err, result);
  });
};

//takes an array scnl objects and inserts
Scnl.insertScnls=function(db, scnls, callback){
  coll=db.collection(collName);
  coll.createIndex({key:1, active:1}); //this is no-op if exists
  coll.insertMany(scnls,function(err, result){
    if(err) throw err;
    callback(err, result);
  });
};


module.exports = Scnl;
