/* 
eventArchiver  archives on discreet start stop times for event
*/
/*jslint node:true */

'use strict';
var request = require('request');

// var  EventEmitter = require('events').EventEmitter;
function Event(interval, logger) {
    this.interval = interval;
    this.logger = logger;
}


// methods
var usgsAllBaseUrl = "https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&";
var usgsSigBaseUrl = "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/significant_month.geojson";


//return query url 
Event.prototype.getLocalUrl = function(params) {
  return usgsAllBaseUrl+ "minlatitude=" +params.lat_min+ "&maxlatitude=" + params.lat_max + 
        "&minlongitude=" + params.lon_min + "&maxlongitude=" + params.lon_max + "&minmagnitude=" + params.mag_min;
};

//return significant url
Event.prototype.getSigUrl= function(){
  return usgsSigBaseUrl;
};

module.exports = Event;
