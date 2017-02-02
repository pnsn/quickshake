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
  this.net = arr.shift;
  this.sta = arr.shift;
  this.loc = arr.shift;
  this.chan= arr.shift;
  this.lat = arr.shift;
  this.lon=  arr.shift;
  this.elevation=arr.shift;
  this.depth = arr.shift;
  this.azimuth= arr.shift;
  this.dip = arr.shift;
  this.sensorDescription= arr.shift;
  this.scale= arr.shift;
  this.scaleFreq= arr.shift;
  this.scaleUnits= arr.shift;
  this.sampleRate= arr.shift;
  this.starttime= arr.shift;
  this.endtime = arr.shift;
}

var collName='scnls';

var serviceBaseUrl="https://service.iris.edu/irisws/fedcatalog/1/query?format=text&includeoverlaps=false&nodata=404";

//accepts array of networks, returns uri string
Scnl.prototype.getServiceUri= function(net_array){
  var netString=net_array.join(",");
  return serviceBaseUrl+ "&net=" + netString;
};



// Scnl.prototype.getMongoCollections=function()
Scnl.prototype.parseIrisScnls= function(nets, callback){
  var uri=  this.getServiceUri(nets);
  console.log(uri);
  request({
    url: uri,
    rejectUnauthorized: false,
    timeout: 8000
    },
    function (error, response, body){
    var scnls = response.body.split("\n");
    for(var i=0; i< scnls.length; i++){
      scnls[i] = scnls[i].split("|");
    }
    callback(error, scnls.slice(3), response);
  });
};

//find all collections that end in "CWAVE"
Scnl.prototype.getCollections=function(db, callback){
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

Scnl.prototype.getScnls=function(db, params, callback){
  coll=db.collection(collName);
  coll.find(params).toArray(function(err, scnls){
    callback(err,scnls);
  });
};

//takes an array scnl objects and inserts
Scnl.prototype.insertScnls=function(db, scnls, callback){
  coll=db.collection(collName);
  coll.insertMany(scnls,function(err, result){
    if(err) throw err;
    callback(err, result);
  });
};

module.exports = Scnl;
