//client side of quakeShake 
$(function() {
  //initial params that should be consistent across all channels on page
  function QuickShake(viewerWidthSec, chans) {
    this.viewerWidthSec = viewerWidthSec; //width of viewer in seconds
    //these vals are set dynamically on load and on window resize
    this.height = null;
    this.width = null;
    this.sampPerSec = null; // number of samples to use  i.e. the highest resolution we can display 1 samp/pix
    this.refreshRate = null; //refresh rate in milliseconds
    this.channelHeight = null; //how many pix for each signal
    //end dynamic vals
    this.buffer = {};
    this.axisColor = "#000";
    this.lineWidth = 1;
    this.tickInterval = null;
    this.starttime = Date.now() * 1000; //make these real big and real small so they will be immediately overwritten
    this.endtime = 0;
    this.startPixOffset = this.width; //starttime pixelOffset
    this.viewerLeftTime = null; // track the time of the last time frame(left side of canvas this will be incremented each interval)
    this.canvasElement = document.getElementById("quickshake-canvas");
    this.localTime = true;
    // this.stationScalar = 3.207930 * Math.pow(10, 5) * 9.8; // count/scalar => %g
    this.stationScalars = {};
    //log values
    this.scale = 3; //starting scale slide value 
    this.scaleSliderMin = 1;
    this.scaleSliderMax = 6;
    //end log values
    this.realtime = true; //realtime will fast forward if tail of buffer gets too long.
    this.scroll = null; //sets scrolling
    this.timeout = 60; //Number of minutes to keep active
    this.lineColor = "#000";
    this.tz = "PST";
    this.channels = chans;
    this.archive = false;
    this.pad = 0;
    this.archiveOffset = 0; //offset for line labels in archive
    this.annotations = [];
    this.arrivals = [];
    this.eventtime = null;
  };

  // incoming data are appended to buf
  // drawing is done from left to right (old to new)

  //buffer will be of form:

  //  
  //    milliseconds: {
  //      chan1: val,
  //      chan2: val,
  //      ....
  //      chanN: val
  //    }
  //        ....
  //  
  //called when new data arrive. Functions independently from 
  // drawSignal method which is called on a sampRate interval
  QuickShake.prototype.updateBuffer = function(packet) {
    if (this.viewerLeftTime === null) {
      if (this.archive) {
        this.viewerLeftTime = this.makeTimeKey(this.starttime - this.viewerWidthSec * 1000 * 0.9);
      } else {
        this.viewerLeftTime = this.makeTimeKey(packet.starttime);
      }
      this.startPixOffset -= (this.sampPerSec * 4);
      this.playScroll();
    }
    this.updatePlaybackSlider();

    //update times to track oldest and youngest data points
    if (packet.starttime < this.starttime)
      this.starttime = this.makeTimeKey(packet.starttime);
    if (packet.endtime > this.endtime)
      this.endtime = this.makeTimeKey(packet.endtime);
    //decimate data
    var _decimate = parseInt(packet.samprate / this.sampPerSec, 0);

    var _t = this.makeTimeKey(packet.starttime);

    //move index to correct for time offset
    var _i = parseInt(((_t - packet.starttime) * this.sampPerSec / 1000), 0);
    while (_i < packet.data.length) {
      if (_i < packet.data.length) {
        if (!this.buffer[_t]) {
          this.buffer[_t] = {};
        }
        this.buffer[_t][packet.key] = packet.data[_i] / this.stationScalars[packet.key].scale;
        _t += this.refreshRate;
        _i += _decimate;
      }
    }
  
  };

  // Takes in array of packets from the archive and the starttime of the packets or event.
  QuickShake.prototype.playArchive = function(data, eventtime, starttime) {

    this.realtime = false;
    this.archive = true;

    this.starttime = starttime;
    this.eventtime = eventtime;
    this.pad = 0;

    var _this = this;
    $.each(data, function(i, packet) {
      _this.updateBuffer(packet);
      
    });
  };

  QuickShake.prototype.drawSignal = function() {
    $('.loading').hide();
    if (this.scroll) {
      //OFFSET at start
      if (this.startPixOffset > 0) {
        this.startPixOffset--;
      } else {
        this.viewerLeftTime += this.refreshRate;
      }

      this.adjustPlay();
      
      if (this.realtime) {
        
        this.truncateBuffer();
      } 

      //End of data -> stop playing and open controls
      if (this.archive && this.endtime < this.viewerLeftTime) {
        clearInterval(this.scroll);
        this.pauseScroll();
        showControlPanel();
        $("#data-end-warning").show();
      }
    }

    // FIND MEAN AND Extreme vals
    //only consider part of buffer in viewer
    var cursor, cursorStop;
    if (this.archive && this.scroll) {
      this.updatePlaybackSlider();
      cursor = this.viewerLeftTime;
      cursorStop = cursor + this.viewerWidthSec * 1000 * 0.9;
    } else {
      cursor = this.viewerLeftTime;
      cursorStop = cursor + this.viewerWidthSec * 1000;
    }

    //Thickness of time axis labels 
    this.timeOffset = 13;
    //Thickness of line labels
    this.archiveOffset = this.annotations.length > 0 || this.archive ? 20 : 1;

    this.channelHeight = (this.height - this.timeOffset * 2 - this.archiveOffset) / this.channels.length;

    if (cursor < cursorStop) {
      
      var ctx = this.canvasElement.getContext("2d");
      ctx.clearRect(0, 0, this.width, this.height);
      ctx.lineWidth = this.lineWidth;
      this.drawAxes(ctx);
      
      ctx.beginPath();
      
      //iterate through all this.channels and draw
      for (var i = 0; i < this.channels.length; i++) {
        var channel = this.channels[i];
        cursor = this.viewerLeftTime; //start back at left on each iteration through this.channels
        //find mean
        var sum = 0;
        //use full array for ave an max
        var time = this.viewerLeftTime;
        var count = 0;
        while (time <= this.endtime) {
          if (this.buffer[time] && this.buffer[time][channel]) {
            var val = this.buffer[time][channel];
            sum += val;
            count++;

          }
          time += this.refreshRate;
        }
        var mean = sum / count;
        
        ctx.strokeStyle = this.lineColor;

        //Draw!! from left to write
        //if startPixOffset > 0 , this is offset, start drawing there
        //this is only the case while plot first renders till it reaches left side of canvas
        var canvasIndex = this.startPixOffset;
        //boolean to use moveTo or lineTo
        // first time through we want to use moveTo
        var gap = true;
        // draw Always start from viewerLeftTime and go one canvas width
        count = 0;

        while (cursor <= cursorStop) {
          if (this.buffer[cursor] && this.buffer[cursor][channel]) {
            var val = this.buffer[cursor][channel];
            var norm = ((val - mean) * Math.pow(10, this.stationScalars[channel].unit == "m/s" ? this.scale + 4 : this.scale));

            if (norm < -1)
              norm = -1;
            if (norm > 1)
              norm = 1;

            var chanAxis = this.archiveOffset + this.timeOffset + (this.channelHeight / 2) + this.channelHeight * i; //22 is offset for header timeline.
            
            var yval = Math.round((this.channelHeight) / 2 * norm + chanAxis);

            if (gap) {
              ctx.moveTo(canvasIndex, yval);
              gap = false;
            } else {
              ctx.lineTo(canvasIndex, yval);
            }
          } else {
            gap = true;
          }
          canvasIndex++;
          cursor += this.refreshRate;

        } //while
        ctx.stroke();

      }
    
      this.drawAnnotations(ctx);
    }
  };

  QuickShake.prototype.drawAxes = function(ctx) {
    var edge = {
      left: 0,
      top: this.timeOffset,
      right: this.width,
      bottom: this.height - this.timeOffset
    };

    //some axis lines
    ctx.beginPath();
    //x-axes
    ctx.moveTo(edge.left, edge.top); //top
    ctx.lineTo(edge.right, edge.top);
    ctx.moveTo(edge.left, edge.bottom); //bottom
    ctx.lineTo(edge.right, edge.bottom);

    //y-axes
    ctx.moveTo(edge.left, edge.top); // left
    ctx.lineTo(edge.left, edge.bottom);
    ctx.moveTo(edge.right, edge.top); //right
    ctx.lineTo(edge.right, edge.bottom);

    //scnl label
    ctx.font = "15px Helvetica, Arial, sans-serif";
    ctx.strokeStyle = "#119247"; // axis color    
    ctx.stroke();

    ctx.beginPath();
    //channel center lines and labels:
    for (var i = 0; i < this.channels.length; i++) {
      var channel = this.channels[i];
      var cName = channel.split(".")[0].toUpperCase();
      var yOffset = i * this.channelHeight;
      
      ctx.fillText(cName + " (" + this.stationScalars[channel].unit + ")", edge.left + this.timeOffset, edge.top + this.archiveOffset + yOffset + this.timeOffset);

      var chanCenter = edge.top + this.archiveOffset + this.channelHeight / 2 + yOffset;

      ctx.moveTo(edge.left, chanCenter);
      ctx.lineTo(edge.right, chanCenter);
    }
    ctx.strokeStyle = "#CCCCCC"; //middle line
    ctx.stroke();
    //end axis

    //plot a tick and time at all tickIntervals
    ctx.beginPath();
    ctx.font = "13px Helvetica, Arial, sans-serif";

    //centerline

    var offset = this.viewerLeftTime % this.tickInterval;
    //what is time of first tick to left  of startPixOffset
    var tickTime = this.viewerLeftTime - offset;

    var canvasIndex = this.startPixOffset - offset / this.refreshRate;
    var pixInterval = this.tickInterval / this.refreshRate;

    var date = String(new Date() + "").match(/\(.+\)/)[0];
    var tz = date.match(/\b(\w)/g).length > 2 ? date.match(/\b(\w)/g).join('') : date.match(/\w{3}/)[0];
    
    ctx.fillText(tz, 1, edge.top - 3);
    ctx.fillText("UTC", 1, edge.bottom + this.timeOffset);
    ctx.fillText(tz, edge.right - 30, edge.top - 3);
    ctx.fillText("UTC", edge.right - 30, edge.bottom + this.timeOffset);

    var index = 0;
    while (canvasIndex < edge.right + 20) { //allow times to be drawn off of canvas
      // ctx.moveTo(canvasIndex, this.height -19);
      ctx.moveTo(canvasIndex, edge.top);
      ctx.lineTo(canvasIndex, edge.bottom);

      if (canvasIndex - 23 >= 30 && canvasIndex <= this.width - 65) {
        ctx.fillText(this.dateFormat(tickTime, "top"), canvasIndex - 23, edge.top - 3); //top
        ctx.fillText(this.dateFormat(tickTime, "bottom"), canvasIndex - 23, edge.bottom + this.timeOffset); //bottom
      }

      canvasIndex += pixInterval;
      tickTime += this.tickInterval;
      index++;
    }

    ctx.strokeStyle = "#CCCCCC"; //vertical time lines
    ctx.stroke();
  };
  
  //Plot any annotations
  QuickShake.prototype.drawAnnotations = function(ctx){
    var edge = {
      left: 0,
      top: this.timeOffset,
      right: this.width,
      bottom: this.height - this.timeOffset
    };

    //Draws a vertical line to mark start of event.
    if (this.archive) {

      ctx.beginPath();

      var startPosition = (this.starttime - this.viewerLeftTime) / this.refreshRate + this.startPixOffset;
      ctx.fillText("Start of Data", startPosition - 75, edge.top + this.archiveOffset / 2 + 3); //75 is offset for width of text
      ctx.moveTo(startPosition, edge.bottom);
      ctx.lineTo(startPosition, edge.top);

      var endPosition = (this.endtime - this.viewerLeftTime) / this.refreshRate + this.startPixOffset;
      ctx.fillText("End of Data", endPosition + 5, edge.top + this.archiveOffset / 2 + 3);
      ctx.moveTo(endPosition, edge.bottom);
      ctx.lineTo(endPosition, edge.top);

      ctx.strokeStyle = "#ff0000"; // axis color    
      ctx.stroke();

      // // Start line
      // if (this.eventtime) {
      //   ctx.beginPath();
      //   var eventPosition = (this.eventtime - this.viewerLeftTime) / this.refreshRate + this.startPixOffset;
      //   var text = this.width < 570 || (eventPosition - startPosition) < 135 ? "OT" : "Origin Time";
      //   var eventOffset = this.width < 570 || (eventPosition - startPosition) < 135 ? 25 : 135;
      //   ctx.fillText(text, eventPosition - eventOffset, edge.top + this.archiveOffset / 2 + 3);
      //   ctx.moveTo(eventPosition, edge.bottom);
      //   ctx.lineTo(eventPosition, edge.top);
      //   ctx.strokeStyle = "#000";
      //   ctx.stroke();
      // }
      
      if(this.arrivals.length > 0) {
        ctx.beginPath();
        var _this = this;
        $.each(this.arrivals, function(i, arrival){
          var arrivalPosition = (arrival - _this.viewerLeftTime) / _this.refreshRate + _this.startPixOffset;
          if(i == 0) {
            var text = _this.width < 570 || (arrivalPosition - startPosition) < 135 ? "ETA" : "Estimated arrival times";
            var eventOffset = _this.width < 570 || (arrivalPosition - startPosition) < 135 ? 25 : 135;
            ctx.fillText(text, arrivalPosition - eventOffset, edge.top + _this.archiveOffset / 2 + 3);
            ctx.moveTo(arrivalPosition, edge.top + _this.archiveOffset);
            ctx.lineTo(arrivalPosition, edge.top);
          } else {
            ctx.moveTo(arrivalPosition, edge.top + _this.archiveOffset + _this.channelHeight * i);
            ctx.lineTo(arrivalPosition, edge.top + _this.archiveOffset + _this.channelHeight * (i - 1));
          }
        });
        ctx.strokeStyle = "#107a10";
        ctx.stroke();
      }
      
    }
    
    //for live: grab events within "length of buffer" to live
    //for archive: grab events within start to end
    //plot for archive and live, if possible
    // if(this.annotations.length > 0) {
    //
    //   ctx.beginPath();
    //   var _this = this;
    //   $.each(this.annotations, function(i, annotation){
    //     var position = (annotation.starttime - _this.viewerLeftTime) / _this.refreshRate + _this.startPixOffset;
    //     ctx.fillText("<--" + annotation.description, position + 2, edge.top + _this.archiveOffset / 2 + 3); //75 is offset for width of text
    //     ctx.moveTo(position, edge.bottom);
    //     ctx.lineTo(position, edge.top);
    //   });
    //   ctx.strokeStyle = "#107a10";
    //   ctx.stroke();
    // }
  };

  //make a key based on new samprate that zeros out the insignificant digits. 
  //if the timestamp is less than starttime, increment by the refresh rate
  QuickShake.prototype.makeTimeKey = function(t) {
    var _t = parseInt(t / this.refreshRate, 0) * this.refreshRate;
    if (_t < t) {
      _t += this.refreshRate;
    }

    return _t;
  };

  //In realtime, we need to adjust play if data on end of buffer tails off canvas
  //ideally we want new data written on canvas a few sampPerSec in
  //We want to avoid player constantly trying to catch up.
  QuickShake.prototype.adjustPlay = function() {
    var pad = this.pad;

    var cursorOffset = (this.viewerWidthSec / 10) * this.sampPerSec;
    //i.e. how much buffer in pixels is hanging off the right side of the viewer
    //tail in px    
    var tail = this.startPixOffset + cursorOffset + (this.endtime - this.viewerLeftTime - this.viewerWidthSec * 1000) / 1000 * this.sampPerSec;
    //when we're close to cursorOffset just pad by one to avoid jerky behavior
    if (!this.archive) {
      if (tail > -cursorOffset && tail < cursorOffset / 2) {
        pad = -1;
      } else if (tail < -cursorOffset) {
        pad - 1;
      } else if (tail > -cursorOffset / 2) {
        pad = parseInt(Math.abs(tail / 10), 0);
      }
    }
     if (this.startPixOffset == 0) {
       
       if(pad >= 0){
         this.viewerLeftTime += pad * this.refreshRate;
       } else {
         this.viewerLeftTime += this.refreshRate;
       }
       
     } 
     
     this.startPixOffset = Math.max(0, this.startPixOffset - pad);
  };

  //trim buff when it gets wild
  QuickShake.prototype.truncateBuffer = function() {

    if ((this.endtime - this.starttime) > 15 * this.viewerWidthSec * 1000) {
      var time = this.starttime;
      while (time < this.starttime + 10 * this.viewerWidthSec * 1000) {
        delete this.buffer[time];
        time += this.refreshRate;
      }
      this.starttime = time;
    }

  };

  //accept milliseconds and return data string of format HH:MM:SS in UTC or local
  QuickShake.prototype.dateFormat = function(milliseconds, position) {
    var d = new Date(milliseconds);
    if (position === "top") {
      var hours = d.getHours();
      var minutes = d.getMinutes();
      var seconds = d.getSeconds();
    } else {
      var hours = d.getUTCHours();
      var minutes = d.getUTCMinutes();
      var seconds = d.getUTCSeconds();
    }

    var time;
    if (hours < 10)
      hours = "0" + hours;
    if (minutes < 10)
      minutes = "0" + minutes;
    if (seconds < 10)
      seconds = "0" + seconds;
    time = hours + ":" + minutes + ":" + seconds;

    return time;
  };

  //playback slider
  QuickShake.prototype.updatePlaybackSlider = function() {
    if (this.archive) {
      $("#playback-slider").slider("option", "max", this.endtime + this.viewerWidthSec * 1000);
      $("#playback-slider").slider("option", "min", this.starttime - this.viewerWidthSec * 1000);
    } else {
      $("#playback-slider").slider("option", "max", this.endtime);
      $("#playback-slider").slider("option", "min", this.starttime);
    }
    
    if (this.scroll && this.archive) {
      $("#playback-slider").slider("option", "value", this.viewerLeftTime + this.viewerWidthSec * 1000);
    } else if (this.scroll && !this.archive) {
      $("#playback-slider").slider("option", "value", this.viewerLeftTime);
    }

  };

  QuickShake.prototype.pauseScroll = function() {
    clearInterval(this.scroll);
    this.scroll = null;
    //take things out of realtime mode once scroll is stopped
    this.realtime = false;
  };

  QuickShake.prototype.playScroll = function() {
    _this = this;
    var d;
    if(!this.scroll){
      this.scroll = setInterval(function() {
        if (!$.isEmptyObject(_this.buffer) && _this.scroll) {
          _this.drawSignal();
        }
      }, this.refreshRate);
    }

  };

  QuickShake.prototype.selectPlayback = function(e, ui) {
    if (this.scroll) {
      this.pauseScroll();
    }
    var val = ui.value;
    if (val > this.endtime) {

      $("#playback-slider").slider("option", "value", this.viewerLeftTime);

    } else {
      this.viewerLeftTime = this.makeTimeKey(val);
      this.drawSignal();
    }
  };

  //Handles the connection timeout 
  QuickShake.prototype.setTimeout = function() {
    if (getUrlParam('timeout') == true || getUrlParam('timeout') == null) { //for some reason I have to put == true...
      //Initial interval for checking state  

      var idleTime = 0;

      var maxTime = this.timeout + 5; //minute (time to )
      var minTime = this.timeout; //minute
      var timeAlert = $("#quickshake-timeout");

      function timerIncrement() {
        if (maxTime - idleTime > 1) {
          $("#timer").html("Stream will stop in " + (maxTime - idleTime) + " minutes.");
        } else if (maxTime - idleTime == 1) {
          $("#timer").html("Stream will stop in " + (maxTime - idleTime) + " minute.");
        } else {
          $("#timer").html("Stream has ended.");
        }

        if (idleTime == minTime) {
          timeAlert.modal("show");
        } else if (idleTime == maxTime) {
          socket.close();
        }
        timeAlert.click(resume);
        idleTime++;
      }
      var idleInterval = setInterval(timerIncrement, 60000); // 60000 = 1 minute
      // Hide the information and 
      function resume() {
        if (idleTime >= maxTime) {
          initializeSocket();
        }
        idleTime = 0;
      }
      $(window).keypress(resume);
      $(window).click(resume);
    }
  };

  QuickShake.prototype.selectScale = function(e, value) {
    this.scale = value;
    if (!this.scroll) {
      this.drawSignal();
    }
    this.updateScale();
  };

  QuickShake.prototype.updateScale = function() {
    $("#quickshake-scale").css("height", this.channelHeight / 2);
    var scale = Math.pow(10, -this.scale); //3 sig. digits
    if (scale < 0.000099) {
      scale = scale.toExponential(2);
    } else {
      scale = scale.toPrecision(2);
    }
    $("#top").html(scale);
  };

  // Handles sizing of the canvas for different screens
  QuickShake.prototype.configViewer = function() {
    var offSet = 10; //Default for mobile and if there is no scale    
    $("#quickshake-canvas").show();
    $("#quickshake").height(window.innerHeight - $("#header").height() - 10 - $("#controls-container").height());

    this.height = $("#quickshake").height();
    this.width = $("#quickshake").width();

    this.sampPerSec = Math.round(this.width / this.viewerWidthSec);
    this.viewerWidthSec = this.width / this.sampPerSec; //actual width in Sec due to rounding
    this.refreshRate = Math.round(1000 / this.sampPerSec); //refresh rate in milliseconds

    this.tickInterval = 1000 * (this.viewerWidthSec / (this.width / 100 < 10 ? parseInt(this.width / 100, 10) : 10));

    this.canvasElement.height = this.height;
    this.canvasElement.width = this.width;

    this.updateScale();
  };

  // var _this = this;
  // var lastScale = _this.scale;
  // $("#quickshake-canvas").swipe({
  //   pinchStatus: function(event, phase, direction, distance, duration, fingerCount, pinchScale) {
  //     // Make sure it is actually a two finger scale and not a tap
  //     if (distance > 0 && fingerCount > 1) {
  //       quickshake.selectScale(event, lastScale + parseFloat(pinchScale) - 1);
  //     }
  //     //Save value of scale at the end to use as baseline
  //     if (phase === $.fn.swipe.phases.PHASE_END || phase === $.fn.swipe.phases.PHASE_CANCEL) {
  //       lastScale = quickshake.scale;
  //     }
  //   }
  // });

  /*****End QuickShake prototype 
   *
   *
   *
   *
   ***/

  //Globals  
  var socket;
  var channels = [];
  
  //map stuff
  var map = new L.Map('map'),
	    osmUrl='http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
	    osmAttrib='Map data © <a href="http://openstreetmap.org">OpenStreetMap</a> contributors',
	    osm = new L.TileLayer(osmUrl, {attribution: osmAttrib});		
  
  //Set some configs
  var maxChannels = 6; //maximum number of channels that can be shown
  //set the area restrictions for local earthquakes
  var bounds = {
    bottom: 40.5,
    top: 52,
    left: -130,
    right: -115,
    mag: 2
  };
  var path = "quickshake.pnsn.org/";
  // var path = window.location.host + "/";
  var usgsPath = "https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&";

  // Initialize UI
  $("#start-select").datetimepicker({
    format: 'yyyy-mm-dd hh:ii:ss',
    useCurrent: true
  });

  var eventSelector = $('select#event-select.station-select');
  eventSelector
    .attr({
      'data-live-search': true,
      disabled: 'disabled',
      title: "Select an event.",
      'data-size': 10
    })
    .append($("<optgroup label='Local Earthquakes' id='earthquakes-group'></optgroup>"))
    .append($("<optgroup label='Significant Global Events' id='significant-group'></optgroup>"))
    .append($("<optgroup label='Other events' id='others-group'></optgroup>"))
    .change(function() {
      $("#evid-select").val("");
      $("#start-select").val("");
    });

  //Populate group groupSelector
  var groupSelector = $('select#group-select.station-select');
  groupSelector
    .attr({
      'data-live-search': true,
      title: 'Select a group.',
      'data-size': 10
    })
    .change(function() {
      channels = groupSelector.children(":selected").val().split(",");
      $('.quickshake-warning').hide();
      $("ul#station-sorter.station-select li").remove();
      $(".selected").removeClass("selected");
      $.each(channels, function(i, scnl) {
        updateList(scnl);
        $(".marker_" + scnl.replace("_","").replace(/\./g, "_")).addClass("selected");
      });
    });

  $(".selectpicker").selectpicker();
  
  $("#start-select").change(function(){
    $("#evid-select").val("");
    eventSelector.val(false);
    eventSelector.selectpicker('refresh');
  });
  
  $("#evid-select").change(function() {
    $("#start-select").val("");
    eventSelector.val("");
  });

  $(".loading").addClass("center-block").append('<i class="fa fa-spinner fa-pulse fa-3x">');
  //End UI Initializing

  //helper functions
  function getUrlParam(param) {
    var pageUrl = window.location.search.substring(1);
    var params = pageUrl.split('&');
    for (var i = 0; i < params.length; i++) {
      var p = params[i].split('=');
      if (p[0] == param) {
        return p[1];
      }
    }
  }

  //Produces a date string for the eventselector name 
  function makeDate(date) {
    var values = [date.getMonth() + 1, date.getDate(), date.getHours(), date.getMinutes(), date.getSeconds()];

    $.each(values, function(i, value) {
      if (value < 10) {
        values[i] = "0" + value;
      }
    });

    return values[0] + "/" + values[1] + " " + values[2] + ":" + values[3];
  }
  
//this will get condensed when we get events from mongo
  function processEvents(localEventData, significantEventData) {
    var events = {};
    var significant = $("#significant-group");
    var earthquakes = $("#earthquakes-group");
    var other = $("#others-group");
    
    $.each(localEventData.features, function(i, feature) {
      var titleTokens = feature.properties.title.split(" ");
      var tokens = feature.id;
      $.each(titleTokens, function(i, token) {
        tokens += token;
      });
      var dateString = makeDate(new Date(feature.properties.time));
      var title = dateString + " M " + feature.properties.mag;
      var append = $("<option value=" + (parseInt(feature.properties.time, 10) / 1000) + " data id=" + feature.id + " data-subtext=" + feature.id + " title='" + title + "'>").text(dateString + " " + feature.properties.title);

      if (feature.properties.type == "earthquake") {
        earthquakes.append(append);
      } else if(feature.properties.mag) {
        console.log(feature.properties.mag)
        other.append(append);
      }

      var coords = feature.geometry.coordinates;
      events[feature.id] = {
        evid: feature.id,
        description: feature.properties.title,
        starttime: parseFloat(feature.properties.time),
        geometry: feature.geometry
      };

    });

    $.each(significantEventData.features, function(i, feature) {
      var titleTokens = feature.properties.title.split(" ");
      var tokens = feature.id;
      $.each(titleTokens, function(i, token) {
        tokens += token;
      });
      var dateString = makeDate(new Date(feature.properties.time));
      var title = dateString + " M " + feature.properties.mag;
      var append = $("<option class='significant' value=" + (parseInt(feature.properties.time, 10) / 1000) + " data id=" + feature.id + " data-subtext=" + feature.id + " title='" + title + "'>").text(dateString + " " + feature.properties.title);

      if (feature.properties.type == "earthquake") {
        significant.append(append);
      }

      events[feature.id] = {
        evid: feature.id,
        description: feature.properties.title,
        starttime: parseFloat(feature.properties.time),
        geometry: feature.geometry
      };
      // console.log(events[feature.id].starttime)
    });

    if (localEventData.features.length > 0 || significantEventData.features.length > 0) {
      eventSelector.removeAttr('disabled');
      eventSelector.append($("<option data-hidden='true' data-tokens='false' selected value='false'>").text("Select an event."));
    } else {
      console.log("events failure");
    }

    if (getUrlParam("evid")) {
      evid = getUrlParam("evid");
      if ($("select#event-select option[id=" + evid + "]")) {
        $("select#event-select option[id=" + evid + "]").attr("selected", "selected");
        $('select#event-select').selectpicker('refresh');
      }
      
      plotEvent(events[evid]);
    }

    $('select#event-select').selectpicker('refresh');
    
    return events;
  }

  function processGroups(groupData) {
    var defaultGroup = { //keep track of default group
      name: "",
      scnls: []
    };

    groupSelector.append($("<option data-hidden='true' data-tokens='false' title='Select a group' value='false' >"));
    $.each(groupData, function(key, group) {
      groupSelector.append($('<option value=' + group.scnls + ' id=' + key + '>').text(key.replace(/_/g, " ")));
      if (group["default"] == 1 && defaultGroup.scnls.length == 0) {
        defaultGroup.name = key;
        defaultGroup.scnls = group.scnls;
      }
    });
    
    if (!getUrlParam("group") && channels.length == 0) {
      channels = defaultGroup.scnls;
      $("select#group-select option[id=" + defaultGroup.name + "]").attr("selected", "selected");
      $("#group-header span").text(defaultGroup.name.replace(/_/g, " ") + " (default)");
      $("#group-header").show();
    } else if (getUrlParam("group")) {
      $("#group-header span").text(getUrlParam("group").replace(/_/g, " "));
      $("#group-header").show();
      $("select#group-select option[id=" + getUrlParam("group") + "]").attr("selected", "selected");
      if (channels.length == 0) {
        channels = groupData[getUrlParam("group")] ? groupData[getUrlParam("group")].scnls : [];
      }
    }

    groupSelector.selectpicker('refresh');
  }

  $("[data-hide]").on("click", function() {
    $(this).closest("." + $(this).attr("data-hide")).hide();
  });

  //Get start time for event
  function getStart(events, stations, channels, evid, start, _callback) {
    var stime = start;
    var text;
    var arrivals = [];
    var earliestArrival = Number.MAX_SAFE_INTEGER;
    // console.log(stations, channels, events, evid, start)

    if(!evid || (evid && evid.indexOf("HAWK") > -1)) {
      _callback(stime, false, arrivals);
    } else if (events[evid]) {
      stime = stime ? stime : events[evid].starttime;
      text = events[evid].description;

      $("#event-header span").text(text);
      $("#event-header").show();
      
      $.each(channels, function(i, channel){
        var arrival = getStartOffset(events[evid], stime, stations[channel.split(".")[0]]);
        arrivals.push(arrival);
        earliestArrival = Math.min(arrival, earliestArrival);
      });
      
      _callback(stime, earliestArrival, arrivals);
    } else {
      $.ajax({
        type: "GET",
        dataType: "json",
        url: usgsPath + "eventid=" + evid
      }).done(function(data) {
        stime = stime ? stime : data.properties.time;
        text = data.properties.title;
        $("#event-header span").text(text);
        $("#event-header").show();

        event = {
          evid: data.id,
          description: data.properties.title,
          starttime: parseFloat(data.properties.time),
          geometry: data.geometry
        };

        $.each(channels, function(i, channel){
          var arrival = getStartOffset(events[evid], stime, stations[channel.split(".")[0]]);
          arrivals.push(arrival);
          earliestArrival = Math.min(arrival, earliestArrival);
        });
        
        _callback(stime, earliestArrival, arrivals);

      }).fail(function(response) {
        // console.log("I failed");
      });
    }
  }
  
  //Do the math, the monster math
  function getStartOffset(event, start, station) {
    var lat1 = station.coords.lat; //center of bounding box
    var lon1 = station.coords.lon;

    var lat2 = event.geometry.coordinates[1];
    var lon2 = event.geometry.coordinates[0];

    // Lets hope this works
    var R = 6371; // Radius of the earth in km
    var dLat = (lat2 - lat1) * Math.PI / 180; // deg2rad below
    var dLon = (lon2 - lon1) * Math.PI / 180;
    var a =
      0.5 - Math.cos(dLat) / 2 +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      (1 - Math.cos(dLon)) / 2;

    var d = 2 * Math.asin(Math.sqrt(a)) * 180 / Math.PI; //angular distance in degrees

    distances = Object.keys(traveltimes).sort(function compare(a, b) {
      return parseFloat(a) - parseFloat(b);
    });

    var i = 0;
    var distance = distances[i];

    while (distance < d) {
      i++;
      distance = parseFloat(distances[i]);
    }
    
    if (distances[i - 1]) {
      var distance2 = distances[i - 1];
      var linDif = (traveltimes[distance] - traveltimes[distance2]) / (distance - parseFloat(distance2));
      return start + (linDif * d + traveltimes[distance2] * 1000);

      $("#offset-header").show();
      $("#start-header").hide();

    } else {
      return start;
    }

  }

  //TODO: make a leaflet map
  function processStations(stations, stationData) {
    var latlngs = [];
    var stationData = stationData.split("#");

    headers = stationData[1].split(" | ");
    for(var i = 2; i < stationData.length; i++){
      var nStations = stationData[i].split("\n");
    
      for(var j = 1; j < nStations.length; j++){
        var station = nStations[j].split("|");
        if(station.length > 1){
          var sta = station[1],
              net = station[0],
              lat = station[4],
              lon = station[5],
              scale = station[11],
              unit = station[13];
                  
          if(stations[sta] && !stations[sta].coords){
            stations[sta].coords = {
              lat: lat,
              lon: lon
            };
            if(unit == "M/S**2") {
              stations[sta].scale = scale ;
              stations[sta].unit = "m/s^2";
            } else{
              stations[sta].scale = scale ;
              stations[sta].unit = "m/s";
            }
            latlngs.push([lat, lon]);
          } 
        }
      }
    }

    $('#controls').on('shown.bs.modal', function() {
      var bounds = new L.LatLngBounds(latlngs);
      map.fitBounds(bounds);
    });
  
    return stations;
  }

  function makeMap(stations){
    map.addLayer(osm);
    // map.doubleClickZoom.disable(); 
    $.each(stations, function(i, station){
      var icon;
      var container = $('<div />');
      container.append($("<div>"+station.sta.toUpperCase()+"</div>"));
      var list = $('<ul />');
      var iconClass = "station-icon";
      $.each(station.scnls, function(j, scnl){
        var _scnl = scnl.replace("_","").replace(/\./g, "_");
        var button = $("<li><a class='selected-station' type='button' id='marker_" + _scnl + "'>" + station.chans[j] + "</a></li>");
        list.append(button);
        if(channels.indexOf(scnl.replace("_","")) > -1){
          iconClass += " selected";
        } 
        iconClass += " marker_" + _scnl;
      });
      container.append(list);
      if(station.coords && station.coords.lat && station.coords.lon){
        var marker = L.marker([station.coords.lat, station.coords.lon], {icon:L.divIcon({className: iconClass})});
      
        container.on('click', '.selected-station', function() {
          var thisChannel = $(this)[0].id.replace("marker_", "").replace(/_/g, ".");
          
          var index = channels.indexOf(thisChannel);
          
          if(index > -1){//is in the channels array already
            $("#length-warning").hide();
            channels.splice(index, 1);
            if($(marker._icon).hasClass('selected')){
              $(marker._icon).removeClass('selected');
            } 
            $("#selected-stations span").text(channels);
            $(".update.station-select").addClass("btn-primary");
          }else if(index == -1 && channels.length < maxChannels) {//not in channel array, space to add 
            $("#length-warning").hide();
            channels.push(thisChannel);
            $(marker._icon).addClass('selected');
            $("#selected-stations span").text(channels);
            $(".update.station-select").addClass("btn-primary");
            
          } else if(channels.length == maxChannels){
            $("#length-warning").show();
          }

          $("ul#station-sorter.station-select li").remove();
          $.each(channels, function(i, scnl) {
            updateList(scnl);
          });
          groupSelector.val(false);
          groupSelector.selectpicker('refresh');
        });
      
        marker.addTo(map);
      
        marker.bindPopup(container[0]);
      }
    });
    
  }
  
  var eventMarker;
  function plotEvent(event){
    if (eventMarker) {
      map.removeLayer(eventMarker);
    }
    if(event.geometry && event.geometry.coordinates){
      
      var eventIcon = L.icon({
          iconUrl: '/images/star.svg',
          iconSize:     [20, 20], // size of the icon
          iconAnchor:   [10, 10], // point of the icon which will correspond to marker's location
          shadowAnchor: [4, 62],  // the same for the shadow
          popupAnchor:  [0, 0] // point from which the popup should open relative to the iconAnchor
      });
      
      
      eventMarker = L.marker([event.geometry.coordinates[1], event.geometry.coordinates[0]], {icon:eventIcon, zIndexOffset:1000});
      eventMarker.bindPopup("Selected Event");
      eventMarker.on('mouseover', function (e) {
          this.openPopup();
      });
      eventMarker.on('mouseout', function (e) {
          this.closePopup();
      });
      
      
      eventMarker.addTo(map);
    }
  }

  $("ul#station-sorter.station-select").sortable({
    placeholder: "ui-state-highlight",
    forcePlaceholderSize: true,
    stop: updateChannels
  }).disableSelection();

  // Make the update button change color when stuff is changed
  $(".station-select").change(function() {
    $(".update.station-select").addClass("btn-primary");
  });

  $("button.open-controls").click(function() {
    showControlPanel();
  });
  
  $("button.help").click(function(){
    $("#help").modal("show");
  });
  
  $("button.clear-all").click(function(e) {
    
    var inputs = ["event", "evid", "start", "duration"];
    $.each(inputs, function(i, val) {
      if (val == "group" || val == "event" || val == "scnl") {
        $("#" + val + "-select").selectpicker('val', 'false');
      } else {
        $("#" + val + "-select").val("");
      }
      $(".update.station-select").addClass("btn-primary");
    });
  });

  function updateList(scnl) {
    $("ul#station-sorter.station-select").append("<li class='list-group-item' id= '" + scnl + "'>" + scnl +
    "<i class='fa fa-trash pull-right delete' ></i>" + 
    "</li>"); 
  }
  
  $("#station-sorter").on('click', '.delete', function() {
    var klass = ".marker_" + $(this).parent()[0].id.replace(/\./g, "_");
    $(".selected" + klass).removeClass("selected");
    removeStation($(this).parent());
  });

  function removeStation(li) {
    var scnl = li.attr("id");
    li.remove();
    updateChannels();

    if (channels.length < maxChannels) {
      $("#scnl-warning").hide();
    }
  }

  function updateChannels() {
    channels = [];
    var ids = $("ul#station-sorter").sortable("toArray");
    $.each(ids, function(i, id) {
      channels.push(id);
    });
    if ($("ul#station-sorter li").css('position') == "relative") {
      $(".update.station-select").addClass("btn-primary");
    }
  }

  // Update URL with correct station order and whatnot
  $("button.update.station-select").click(function() {
    //there must always be a channel array in winterfell
    if (channels.length > 0) {
      url = "?";

      var evid = getValue("evid");
      var start = getValue("start") ? new Date(getValue("start")).getTime() : getValue("start");
      var width = getValue("width");
      var duration = getValue("duration");

      if (getUrlParam('timeout') == 'false') {
        url += "timeout=false&";
      }

      //Is there a group?
      if ($('select#group-select option:selected').length > 0 && $('select#group-select option:selected')[0].id.length > 0) {
        url += "group=" + $('select#group-select option:selected')[0].id + "&";
      }

      //Is there an event?
      if ($('select#event-select option:selected').length > 0 && $('select#event-select option:selected')[0].value > 0) {
        var option = $('select#event-select option:selected')[0];
        url += "evid=" + option.id + "&";
        if (!start) {
          url += "start=" + option.value * 1000 + "&"; //Should be in UTC
        } else {
          url += "start=" + start + "&";
        }

      } else {
        if (evid) {
          url += "evid=" + evid + "&";
        }
        if (start) {
          url += "start=" + start + "&";
        }
      }

      //Is there a width?
      if ($('select#width-select option:selected').length > 0) {
        url += "width=" + $('select#width-select option:selected')[0].value + "&";
      }

      if (duration) {
        if (width) {
          url += "duration=" + duration + "&";
        }
      }

      url += "scnls=" + channels;
      location.search = url;
    } else {
      $("#station-warning").show();
    }

  });

  // End station select stuff

  //Populate form with URL values, doesn't handle lack of value
  function populateForm() {
    if (getUrlParam("width") && getUrlParam("width") % 1 == 0) { //right now only the selected options are allowed
      $("#width-select option[value=" + getUrlParam("width") + "]").attr("selected", "selected");
      $("#width-select").selectpicker('refresh');
    }

    if (getUrlParam("evid")) {
      evid = getUrlParam("evid");
      $("#evid-select").val(evid);
    }

    if (getUrlParam("start")) {
      var s = new Date(parseFloat(getUrlParam("start")));
      $("#start-select").val(s.getFullYear() + "-" + (s.getMonth() + 1) + "-" + s.getDate() + " " + s.getHours() + ":" + s.getMinutes() + ":" + s.getSeconds());
    }

    if (getUrlParam("group")) {
      $("#group-header span").text(getUrlParam("group"));
    }

    if (getUrlParam("scnls")) {
      channels = getUrlParam("scnls").split(",");
      $('.quickshake-warning').hide();
    }

    if (getUrlParam("duration")) {
      $("#duration-select option[value='" + getUrlParam("duration") + "']").attr("selected", "selected");
      $("#duration-select").selectpicker('refresh');
    }

  }

  function getValue(variable) {
    if (variable === "start") {
      var start = new Date($("#" + variable + "-select").val());
      return start && start.getTime() ? start.getTime() : false;
    } else {
      return $("#" + variable + "-select").val() ? $("#" + variable + "-select").val() : false;
    }

  }

  function toggleControls(quickshake){
    $("#hide-controls, #show-controls, #toggle-controls, #quickshake-controls").toggleClass("closed");

    window.setTimeout(function(){
      quickshake.configViewer();
      
      if(!quickshake.scroll){ //FIXME: goes blank if not scrolling
        quickshake.drawSignal();
      }
    }, 100);
    
  }
  
  function initialize() {
    var getGroups = function(){ return $.ajax({dataType: "jsonp", url: "http://" + path + "groups"});};
    var getLocalEvents = function(){return $.ajax({dataType: "json", url: usgsPath + "minlatitude=" + bounds.bottom + "&maxlatitude=" + bounds.top + "&minlongitude=" + bounds.left + "&maxlongitude=" + bounds.right + "&minmagnitude=" + bounds.mag});};
    var getSignificantEvents = function(){return $.ajax({dataType: "json",url: "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/significant_month.geojson"});};
    var getStations = function(){return $.ajax({dataType: "text",url: "https://service.iris.edu/irisws/fedcatalog/1/query?net=UW&format=text&includeoverlaps=false&nodata=404"});};
    
    populateForm();
    
    var stations = {},
        events,
        controlsTimeout,
        duration = getValue("duration") ? getValue("duration") : 10,
        start = getValue("start"),
        evid = getValue("evid");

    $.ajax({
      type: "GET",
      dataType: "jsonp",
      url: "http://web4.ess.washington.edu:8888/scnls"
    }).done(function(data){
      
      $.each(data, function(key, scnl) {
        
        var station = scnl.split(/\./g);
        if(station.length <= 4 && station.length > 2) {
          var sta = station[0],
              cha = station[1],
              net = station[2];
          if(stations[sta] && $.inArray(cha, stations[sta].chans) === -1){
            stations[sta].chans.push(cha);
            stations[sta].scnls.push(scnl);
          } else {
            stations[sta] = {
              sta: sta,
              net : net,
              chans : [cha],
              scnls: [scnl]    
            };
          }
        }
      });
      
      //Patiently waits until all the requests are done before proceeding,
      $.when(getGroups(),getLocalEvents(), getSignificantEvents(), getStations(), stations).done(function(groupData, localEventData, significantEventData, stationData, stations){
        
        processGroups(groupData[0]);
        events = processEvents(localEventData[0], significantEventData[0]);
        
        stations = processStations(stations, stationData[0]);
        

        
        makeMap(stations);
        
        eventSelector.change(function() {
          plotEvent(events[ $(this).find("option:selected")[0].id ]);
        });
        
        quickshake = new QuickShake(getValue("width") ? getValue("width") * 60 : 2 * 60, channels.slice());
        
        $("#toggle-controls").click(function(){
          toggleControls(quickshake);
        });

        $.each(channels, function(i, channel){
          quickshake.stationScalars[channel] = {
            scale: stations[channel.split(".")[0]].scale,
            unit:stations[channel.split(".")[0]].unit
          };
        });
        
        if (channels.length > 0 && channels.length <= maxChannels) {
          
          $('.quickshake-warning').hide();
          $('#header-left').show();

          if (start || evid) {

            getStart(events, stations, channels, evid, start, function(eventtime, earliestArrival, arrivals) {
              
              // console.log(eventtime, earliestArrival, arrivals)
              $("#start-header span").text(new Date(start));

              $("#start-header").show();

              var starttime;
              
              if (evid && earliestArrival &&  earliestArrival - eventtime > 20 * 1000 && earliestArrival - eventtime < 60 * 1000) {
                starttime = eventtime;
              } else if (evid && earliestArrival){
                starttime = earliestArrival - 20 * 1000;
              } else {
                starttime = eventtime;
              }
              
              arrivals.unshift(earliestArrival);
              
              var endtime = starttime + duration * 60 * 1000;

              $.ajax({
                type: "GET",
                dataType: "jsonp",
                url: "http://" + path + "archive?starttime=" + starttime + "&scnls=" + channels + "&endtime=" + endtime,
                timeout: 4000 //gives it time to think before giving up
              }).success(function(data) { //sometimes doesn't get called?
                $("#fastforward-button").show();
                quickshake.configViewer();
                quickshake.playArchive(data, eventtime, starttime);
                quickshake.arrivals = arrivals.slice();
                controlsTimeout = window.setTimeout(function(){
                  toggleControls(quickshake);
                }, 10000);

              }).complete(function(xhr, data) {
                if (xhr.status != 200) { //In case it fails
                  showControlPanel();
                  $("#station-sorter").show();
                  $("#data-error").show();
                }
              });
            });

          } else {
            $("#realtime-button").show();
            quickshake.configViewer();
            initializeSocket("scnls=" + channels, quickshake);
            controlsTimeout = window.setTimeout(function(){
              toggleControls(quickshake);
            }, 10000);
          }

          controlsInit(quickshake);
        } else {
          $('.quickshake-warning').show();
        }

    });
    
  }).fail(function(){
    console.log("Oops something went wrong. ");
    alert("JON WEB4 IS DOWN!!!");
  });
  
  $("#controls-container").click(function(){
    clearTimeout(controlsTimeout);
    controlsTimeout = null;
  });

  }

  function showControlPanel() {
    $("#controls").modal("show");
    $("ul#station-sorter.station-select li").remove();
    $.each(channels, function(i, scnl) {
      updateList(scnl);
    });
    $("#station-sorter").show();
  }

  //Give date in milliseconds
  initialize();

  // Can't load these until the quickshake is made
  function controlsInit(quickshake) {
    // $(window).resize(function(){
    //    var timeout = setTimeout(function(){
    //      quickshake.configViewer();
    //      quickshake.drawSignal();
    //    }, 1000);
    // });
    
    
    $(".open-image").click(function(){
        window.open(quickshake.canvasElement.toDataURL('png'), "");
    });
    // Controls stuff
    $("#playback-slider").slider({
      slide: function(e, ui) {
        if (!quickshake.realtime) {
          $("#play-button").removeClass("disabled");
          $("#stop-button, #realtime-button").addClass("disabled");
        }
        quickshake.selectPlayback(e, ui);
      }
    });

    $("#scale-slider").slider({
      min: quickshake.scaleSliderMin, //logs
      max: quickshake.scaleSliderMax,
      value: quickshake.scale,
      step: .05,
      slide: function(e, ui) {
        quickshake.selectScale(e, ui.value);
      }
    });

    $("#play-button").click(function() {
      if (!$("#play-button").hasClass("disabled")) {
        quickshake.playScroll();
        $("#realtime-button, #stop-button, #fastforward-button").removeClass("disabled");
        $("#play-button").addClass("disabled");
      }
      if (quickshake.archive) {
        quickshake.pad = 0;
      }
      return false;
    });

    $("#stop-button").click(function() {
      if (!$("#stop-button").hasClass("disabled")) {
        quickshake.pauseScroll();
        $("#play-button").removeClass("disabled");
        $("#stop-button, #realtime-button, #fastforward-button").addClass("disabled");
      }
      if (quickshake.archive) {
        quickshake.pad = 0;
      }
      return false;
    });

    var pad = quickshake.pad;
    $("#fastforward-button").click(function() {
      pad = pad < 4 ? pad + 1 : 0;
      quickshake.pad = pad * 10;
      quickshake.adjustPlay();
      $("#play-button").removeClass("disabled");
      return false;

    });

    $("#realtime-button").click(function() {
      //hide when done
      if (!$("#realtime-button").hasClass("disabled") && !quickshake.realtime) {
        $("#realtime-button").addClass("disabled");
        quickshake.realtime = true;
      }
      return false;
    });

  }

  // Websocket stuff

  function initializeSocket(stations, quickshake) {
    if (window.WebSocket) {
      socket = new WebSocket("ws://" + path + "?" + stations);
      quickshake.setTimeout();
    };

    socket.onmessage = function(message, flags) {
      var packet = JSON.parse(message.data);
      quickshake.updateBuffer(packet);
    };

  }

  //end socket stuff
});