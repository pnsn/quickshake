'use strict';
/*
base class for getting IRIS station data
and maintaing state in scnl mongo collection
*/
/*jslint node:true */
const request = require('request');


/*init with array
[net, sta, loc ,chan, lat, lon, elevation, depth, azimuth, dip, sensorDescription,
 scale, scaleFreq, scaleUnits, sampleRate, starttime, endtime ]
FIXME we are now using gain/gain units so we probably don't need scale, scalFreq, or scaleUnits
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
  this.gain = arr[17];
  this.gain_units = arr[18];
  this.active = false;
}

var collName='scnls';

var irisServiceBaseUrl="https://service.iris.edu/irisws/fedcatalog/1/query?format=text&includeoverlaps=false&nodata=404";
var pnsnServiceBaseUrl="https://aqmsapi.pnsn.org/simple_response?key=" + encodeURIComponent(process.env.AQMS_API_V2_KEY);
Scnl.prototype.makeKey=function(){
  return this.sta + "." + this.chan + "." + this.net + "." + this.loc;
};

Scnl.prototype.getLoc=function(loc){
  loc=loc.replace(/\s/g,'');
  return loc.length > 0 ? loc : "--";
};

//accepts array of networks, returns uri string
Scnl.getIrisServiceUri= function(net_array){
  var netString=net_array.join(",");
  return irisServiceBaseUrl+ "&net=" + netString;
};


//parse Iris Webservice for channel data
// used to update scnl collection and ran by cron
// from script /script/production/scnl_update.js
Scnl.parseIrisScnls= function(nets, callback){
  var uri=  this.getIrisServiceUri(nets);
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


//parse channel respose from simple_response endpoint in aqms_api
// used to update gains on scnls collection and called by script
// /script/production/gain_update.js via cron
Scnl.parseChannelResponse= function(callback){
  var uri =  pnsnServiceBaseUrl;
  request({
    url: uri,
    rejectUnauthorized: false,
    timeout: 8000
    },
    function (error, response, body){
      var collection = {};
      var json = JSON.parse(body);
      for(var i = 0; i < json.length; i++){
        var res = json[i];
        var loc = res.location;
        if (loc == " " || loc == "  "){
          loc = '--';
        }
        var key = res.sta + '.' +  res.channel + '.' + res.net + '.' + loc;
        collection[key] = {'gain': res.gain, 'gain_units': res.gain_units};
      }
      callback(error, collection, response);
  });
};

//find all collections that end in "CWAVE"
//return array of collection names without CWAVE at end
// used for hash lookup
Scnl.getCwaveCollections=function(db, callback){
  var scnls=[];
  db.listCollections().toArray(function(err, collections) {
    if(err) console.log(err);

    for(var i=0; i< collections.length; i++){
      var scnl=collections[i].name;
      if( scnl.match(/CWAVE$/)){
        scnls.push(scnl.split("CWAVE")[0]);
      }
    }
    callback(err, scnls);

  });
};
Scnl.getScnls=function(db, params, callback){
  var coll=db.collection(collName);
  coll.find(params).toArray(function(err, scnls){
    callback(err,scnls);
  });
};

Scnl.upsert=function(db, scnl, callback){
  var coll=db.collection(collName);
  coll.update({"key": scnl.key}, scnl, {upsert: true}, function(err, result){
    callback(err, result);
  });
};

//takes an array scnl objects and inserts
Scnl.insertScnls=function(db, scnls, callback){
  var coll=db.collection(collName);
  coll.createIndex({key:1, active:1}); //this is no-op if exists
  coll.insertMany(scnls,function(err, result){
    callback(err, result);
  });
};

//ave packet size in seconds
Scnl.avePacketSize=function(db, cname){
  var coll=db.collection(cname);
  coll.find().toArray(function(err, scnls){
    var sum=0;
    for(var i=0; i< scnls.length; i++){
      sum+=scnls[i].endtime-scnls[i].starttime;
    }
    var ave=(sum/i)/1000;
    // callback(err, ave);

  });
};


module.exports = Scnl;
