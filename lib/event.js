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




      // var dateString = makeDate(new Date(feature.properties.time));
      // var title = dateString + " M " + feature.properties.mag;
      // var append = $("<option value=" + (parseInt(feature.properties.time, 10) / 1000) + " data id=" + feature.id + " data-subtext=" + feature.id + " title='" + title + "'>").text(dateString + " " + feature.properties.title);

      // if (feature.properties.type == "earthquake") {
      //   earthquakes.append(append);
      // } else {
      //   other.append(append);
      // }

      // var coords = feature.geometry.coordinates;
      // events[feature.id] = {
      //   evid: feature.id,
      //   description: feature.properties.title,
      //   starttime: parseFloat(feature.properties.time),
      //   geometry: feature.geometry
      // };
      // console.log(events[feature.id].starttime)
    // });

  //   if (data.features.length > 0) {
  //     eventSelector.removeAttr('disabled');
  //     eventSelector.append($("<option data-hidden='true' data-tokens='false' selected value='false'>").text("Select an event"));
  //   } else {
  //     console.log("wtf");
  //   }
  //
  //   if (getUrlParam("evid")) {
  //     evid = getUrlParam("evid");
  //     if ($("select#event-select option[id=" + evid + "]")) {
  //       $("select#event-select option[id=" + evid + "]").attr("selected", "selected");
  //       $('select#event-select').selectpicker('refresh');
  //     }
  //   }
  //   $('select#event-select').selectpicker('refresh');
  // }).fail(function(response) {
  //
  // });

 
   
 

 
      // // console.log(i)
      // var titleTokens = feature.properties.title.split(" ");
      // var tokens = feature.id;
      // $.each(titleTokens, function(i, token) {
      //   tokens += token;
      // });
      // var dateString = makeDate(new Date(feature.properties.time));
      // var title = dateString + " M " + feature.properties.mag;
      // var append = $("<option class='significant' value=" + (parseInt(feature.properties.time, 10) / 1000) + " data id=" + feature.id + " data-subtext=" + feature.id + " title='" + title + "'>").text(dateString + " " + feature.properties.title);
      //
      // if (feature.properties.type == "earthquake") {
      //   significant.append(append);
      // }

    //   events[feature.id] = {
    //     evid: feature.id,
    //     description: feature.properties.title,
    //     starttime: parseFloat(feature.properties.time),
    //     geometry: feature.geometry
    //   };
    //   // console.log(events[feature.id].starttime)
    // });

  //   if (getUrlParam("evid")) {
  //     evid = getUrlParam("evid");
  //     if ($("select#event-select option[id=" + evid + "]")) {
  //       $("select#event-select option[id=" + evid + "]").attr("selected", "selected");
  //       $('select#event-select').selectpicker('refresh');
  //     }
  //   }
  // });




//accept db and scnl name
// for each collection find time range and move to the event collection

//db.full_set.aggregate([ { $match: { date: "20120105" } }, { $out: "subset" } ]);

module.exports = Event;
