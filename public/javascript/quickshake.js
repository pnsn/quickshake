//client side of quakeShake 
$(function() {
  //initial params that should be consistent across all channels on page
  function QuickShake(viewerWidthSec, channels) {
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
    this.stationScalar = 3.207930 * Math.pow(10, 5) * 9.8; // count/scalar => %g
    //log values
    this.scale = 4; //starting scale slide value 
    this.scaleSliderMin = 1;
    this.scaleSliderMax = 5;
    //end log values
    this.realtime = true; //realtime will fast forward if tail of buffer gets too long.
    this.scroll = null; //sets scrolling
    this.timeout = 60; //Number of minutes to keep active
    this.lineColor = "#000";
    this.tz = "PST";
    this.channels = channels;
    this.eventStart = null;
    this.archive = false;
    this.pad = 0;
    this.archiveOffset = 0; //offset for line labels in archive
    this.annotations = [];
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
        this.buffer[_t][packet.key] = packet.data[_i] / this.stationScalar;
        _t += this.refreshRate;
        _i += _decimate;
      }
    }
  
  };

  // Takes in array of packets from the archive and the starttime of the packets or event.
  QuickShake.prototype.playArchive = function(data, eventStart, dataStart) {

    this.realtime = false;
    this.archive = true;

    this.starttime = dataStart;
    this.eventStart = dataStart - eventStart != 0 ? this.makeTimeKey(eventStart) : this.makeTimeKey(dataStart);
    this.pad = 0;

    var _this = this;
    $.each(data, function(i, packet) {
      _this.updateBuffer(packet);
    });
  };

  QuickShake.prototype.drawSignal = function() {
    // console.log(new Date(this.viewerLeftTime))
    if (this.scroll) {
      //OFFSET at start
      if (this.startPixOffset > 0) {
        this.startPixOffset--;
      } else {
        this.viewerLeftTime += this.refreshRate;
      }

      if (this.realtime) {
        this.adjustPlay();
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
        // console.log("cursor: " + cursor, "cursorStop: " + cursorStop)

        while (cursor <= cursorStop) {
          if (this.buffer[cursor] && this.buffer[cursor][channel]) {
            var val = this.buffer[cursor][channel];
            var norm = ((val - mean) * Math.pow(10, this.scale));

            if (norm < -1)
              norm = -1;
            if (norm > 1)
              norm = 1;
            // console.log(canvasIndex)
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
      var cName = channel.split(".")[0];
      var yOffset = i * this.channelHeight;
      
      ctx.fillText(cName, edge.left + this.timeOffset, edge.top + this.archiveOffset + yOffset + this.timeOffset);

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
    var tz = date.match(/\b(\w)/).length > 2 ? date.match(/\b(\w)/).join('') : date.match(/\w{3}/)[0];
    
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
      // console.log("archive?")
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
      // if (this.eventStart) {
      //   ctx.beginPath();
      //   var eventPosition = (this.eventStart - this.viewerLeftTime) / this.refreshRate + this.startPixOffset;
      //   var text = this.width < 570 || (eventPosition - startPosition) < 135 ? "ETA" : "Estimated Arrival Time";
      //   var eventOffset = this.width < 570 || (eventPosition - startPosition) < 135 ? 25 : 135;
      //   ctx.fillText(text, eventPosition - eventOffset, edge.top + this.archiveOffset / 2 + 3);
      //   ctx.moveTo(eventPosition, edge.bottom);
      //   ctx.lineTo(eventPosition, edge.top);
      //   ctx.strokeStyle = "#000";
      //   ctx.stroke();
      // }
    }
    
    //for live: grab events within "length of buffer" to live
    //for archive: grab events within start to end
    //plot for archive and live, if possible
    if(this.annotations.length > 0) {
      // console.log(this.annotations)
      // console.log(this.annotations)
      ctx.beginPath();
      var _this = this;
      $.each(this.annotations, function(i, annotation){
        var position = (annotation.starttime - _this.viewerLeftTime) / _this.refreshRate + _this.startPixOffset;
        ctx.fillText("<--" + annotation.description, position + 2, edge.top + _this.archiveOffset / 2 + 3); //75 is offset for width of text
        ctx.moveTo(position, edge.bottom);
        ctx.lineTo(position, edge.top);
      });
      ctx.strokeStyle = "#107a10";
      ctx.stroke();
    }
    
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
    console.log(pad)
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
    $(".loading").hide();

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

  var timeout;
  QuickShake.prototype.resizeViewer = function(width){
    var _this = this;
    var oldLeftTime = _this.viewerLeftTime;
    clearTimeout(timeout);
    timeout = setTimeout(function() {
      _this.configViewer();
      // console.log(new Date(oldLeftTime), new Date(_this.viewerLeftTime))
      // this.viewerLeftTime = (width - _this.width)/_this.sampPerSec * 1000
      // console.log(new Date(oldLeftTime), new Date(_this.viewerLeftTime))
    }, 500);
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
   *
   ***/

  //Globals  
  var quickshake;
  var socket;
  var path = "web4.ess.washington.edu:8888/";
  // var path = window.location.hostname + "/";
  var usgsPath = "http://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&";
  //set the area restrictions for local earthquakes
  var bounds = {
    bottom: 40.5,
    top: 52,
    left: -130,
    right: -115,
    mag: 2.5
  };
  
  var channels = [];

  // Initialize UI
  $("#start-select").datetimepicker({
    format: 'yyyy-mm-dd hh:ii:ss',
    useCurrent: true
  });

  var eventSelector = $('select#event-select.station-select');
  eventSelector.attr({
    'data-live-search': true,
    disabled: 'disabled',
    title: "No events found.",
    'data-size': 10
  });

  //Populate group groupSelector
  var groupSelector = $('select#group-select.station-select');
  groupSelector.attr({
    'data-live-search': true,
    title: 'Select a group.',
    'data-size': 10
  });

  var scnlSelector = $('select#scnl-select.station-select');
  scnlSelector.selectpicker({
    'data-live-search': true,
    title: 'Select a scnl.',
    maxOptionsText: 'No more than 6 stations.',
    maxOptions: 6,
    'size': 10
  });

  $(".selectpicker").selectpicker();

  groupSelector.change(function() {
    channels = groupSelector.children(":selected").val().split(",");
    $('.quickshake-warning').hide();
    $("ul#station-sorter.station-select li").remove();
    $.each(channels, function(i, scnl) {
      updateList(scnl);
    });
  });

  eventSelector.change(function() {
    $("#evid-select").val("");
    $("#start-select").val("");
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
    // console.log(values)
    return values[0] + "/" + values[1] + " " + values[2] + ":" + values[3];
  }

  function getGroups(_callback) {
    $.ajax({
      type: "GET",
      dataType: "jsonp",
      url: "http://" + path + "groups"
    }).done(function(data) {

      var defaultGroup = {
        name: "",
        scnls: []
      };

      groupSelector.append($("<option data-hidden='true' data-tokens='false' title='Select a group' value='false' >"));
      $.each(data, function(key, group) {
        groupSelector.append($('<option value=' + group.scnls + ' id=' + key + ' data-subtext=' + group.scnls + '>').text(key.replace("_", " ")));
        if (group["default"] == 1 && defaultGroup.scnls.length == 0) {
          defaultGroup.name = key;
          defaultGroup.scnls = group.scnls;
        }
      });
      
      if (!getUrlParam("group") && channels.length == 0) {
        channels = defaultGroup.scnls;
        $("select#group-select option[id=" + defaultGroup.name + "]").attr("selected", "selected");
        $("#group-header span").text(defaultGroup.name.replace("_", " ") + " (default)");
        $("#group-header").show();
      } else if (getUrlParam("group")) {
        $("#group-header span").text(getUrlParam("group").replace("_", " "));
        $("#group-header").show();
        $("select#group-select option[id=" + getUrlParam("group") + "]").attr("selected", "selected");
        if (channels.length == 0) {
          channels = data[getUrlParam("group")] ? data[getUrlParam("group")].scnls : [];
        }
      }

      groupSelector.selectpicker('refresh');

      _callback();
    }).fail(function(response) {
      console.log("Group select failed");
      console.log(response);
    });
  }

  $("[data-hide]").on("click", function() {
    $(this).closest("." + $(this).attr("data-hide")).hide();
  });
  
  // pnsn.org/annotations?start= &end=
  // if live: send in length of buffer & current time
  // if archive: send in data start and end
  var annotations = [];
  function getAnnotations(start, end){
    var annotStart, annotEnd;
    
    if(quickshake.starttime && quickshake.endtime) {
      annotStart = quickshake.starttime;
      annotEnd = quickshake.endtime;
    } else if(quickshake.starttime && quickshake.starttime < Date.now()){
      annotStart = quickshake.starttime;
      annotEnd = (new Date()).getTime();
    } else {
      annotStart = start;
      annotEnd = end;
    }

    var evid = getUrlParam("evid");

    $.ajax({
      type: "GET",
      dataType: "jsonp",
      url: "http://www.pnsn.org/annotations?starttime=" + annotStart + "&endtime="+ annotEnd + "&category=Seahawk"
    }).success(function(data) { //sometimes doesn't get called?
      var annot = quickshake.annotations;
      eventSelector.append($("<option data-hidden='true' data-tokens='false' title='Select an event.' value='false' selected>"));
      $.each(data, function(i, annotation){
        if (eventSelector.find('#HAWK' + annotation.id).length <= 0) {

          var d = new Date(annotation.datetime);
          d = d.getTime() + annotation.seconds_offset * 1000;
 
          annotations.push({
            id:"HAWK" + annotation.id,
            description: annotation.name,
            starttime: d
          });
        
          var text = annotation.comment.replace(/(&nbsp;)?<{1}\/?[^>]+>{1}/g,""); //strip out funky characters
          var append = $("<option value=" + d/1000 + " data id=HAWK" + annotation.id + " title='" + text + "'>").text(text);

          console.log("HAWK" + annotation.id, evid)

          if("HAWK" + annotation.id === evid){
            append.attr("selected", "selected");
            $("#event-header span").text(text);
            $("#event-header ").show();
          }
          eventSelector.append(append);
        } 
      });
      
      quickshake.annotations = annotations;
      
      
      eventSelector.attr({
        disabled: false,
        title: "Select an event"
      });
      
      eventSelector.selectpicker('refresh');
      
      // quickshake.annotations = annotations;
    }).complete(function(xhr, data) {
      if (xhr.status != 200) { //In case it fails
        console.log("oh no")
      } else {
        // console.log(xhr)
      }
    });
    
  }

  //Get start time for event
  function getStart(evid, start, _callback) {
    var stime = start;
    var text;

    if(evid.indexOf("HAWK") > -1 ) {
      _callback(stime);
    } else if (!evid) {
      _callback(stime);
    } else if (events[evid]) {
      stime = stime ? stime : events[evid].starttime;
      text = events[evid].description;

      $("#event-header span").text(text);
      $("#event-header").show();

      _callback(stime);

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

        _callback(stime);

      }).fail(function(response) {
        console.log("I failed");
        console.log(response);
      });
    }
  }

  //TODO: make a leaflet map
  function getScnls() {
    $.ajax({
      type: "GET",
      dataType: "jsonp",
      url: "http://" + path + "scnls"
    }).done(function(data) {
      $.each(data, function(key, scnl) {
        // var sta = scnl.split(".");
        scnlSelector.append($('<option value=' + scnl + ' id=' + scnl + '>').text(scnl));
      });
      scnlSelector.selectpicker('refresh');
    }).fail(function(response) {
      console.log("I failed");
      console.log(response);
      scnlSelector.append($("<option data-hidden='true' data-tokens='false' title='No stations found.' value='false' selected>"));
      scnlSelector.selectpicker('refresh');
    });

  }

  //TODO: test if evid is somewhat valid (has network code)
  $("#evid-select").change(function() {
    $("#evid-warning").toggle($("#evid-select").val().length != 10);
    //add test for ww########
  });

  // Returns the channels
  function getChannels() {
    if (channels.length > 0) {
      return channels;
    } else if ($('select#group-select option:selected').length > 0 && $('select#group-select option:selected')[0].value) {
      channels = $('select#group-select option:selected').first().val().split(",");
      return channels;
    } else {
      // $(".quickshake-warning").show();
      return false;
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
    "<i class='fa fa-sort pull-left'></i>" + "<i class='fa fa-trash pull-right delete' ></i>" + 
    "</li>"); 
  }

  $("#station-sorter").on('click', '.delete', function() {
    removeStation($(this).parent());
    updateScnls();
  });

  function removeStation(li) {
    var scnl = li.attr("id");

    li.remove();

    updateChannels();

    if (channels.length < 6) {
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

  scnlSelector.on('shown.bs.select', function(e) {
    updateScnls();
  });
  scnlSelector.on('hidden.bs.select', function(e) {
    updateScnls();
  });
  scnlSelector.on('changed.bs.select', function(e) {
    $("button.add-station").removeClass("disabled");
  });

  function updateScnls() {
    var length = 6 - $("ul#station-sorter li").length;
    if (length == 0) {
      scnlSelector.selectpicker({
        maxOptions: 0
      });
      scnlSelector.attr("disabled", true);
      $("button.add-station").addClass("disabled");
    } else {
      scnlSelector.selectpicker({
        maxOptions: length
      });
      scnlSelector.attr("disabled", false);
    }

    scnlSelector.selectpicker('refresh');

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
    if (getUrlParam("width")) { //right now only the selected options are allowed
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
    quickshake.configViewer();
    
  }

  function initialize() {
    populateForm();
    getScnls();
    getGroups(function() {
      var width = getValue("width") * 60;
      quickshake = new QuickShake(width, channels);

      $("#toggle-controls").click(function(){
        toggleControls(quickshake);
      });

      var tm = window.setTimeout(function(){
        toggleControls(quickshake);
      }, 5000);
      
      $("#controls-container").click(function(){
        clearTimeout(tm);
        tm = null;
      });

      if (channels.length > 0 && channels.length < 7) {
        $('.quickshake-warning').hide();
        $('.loading').hide();
        $('#header-left').show();
        // var evid = getValue("evid");

        var duration = getValue("duration") ? getValue("duration") : 10;

        // var start = getValue("start");
        
        var t = new Date();
        getAnnotations(t.getTime() - 7*24*60*60*1000, t.getTime());
        var interval = setInterval(function(){
          getAnnotations(t.getTime() - 7*24*60*60*1000, t.getTime());
        }, 60000);
        
        var start = getUrlParam("start");
        var evid = getUrlParam("evid");

        var stations = "scnls=" + getChannels();
 
        if (start || evid) {
          getStart(evid, start, function(eventStart) {
            $("#start-header span").text(new Date(eventStart));
            $("#start-header").show();

            var dataStart = eventStart - 20 * 1000; //grab 30 seconds before event
            endtime = dataStart + 5 * 60 * 1000; //grab 5 minutes of data

            $.ajax({
              type: "GET",
              dataType: "jsonp",
              url: "http://" + path + "archive?starttime=" + dataStart + "&" + stations + "&endtime=" + endtime,
              timeout: 4000 //gives it time to think before giving up
              //Drawing speed is varying with amountof data
            }).success(function(data) { //sometimes doesn't get called?
              // console.log("success!");
              $("#fastforward-button").show();
              // $(".helpful-label").show();
              quickshake.configViewer();
              quickshake.playArchive(data, eventStart, dataStart);
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
          initializeSocket(stations);
        }

        controlsInit();

      } else {
        $('.quickshake-warning').show();
      }
    });

  }

  function showControlPanel() {
    $("#controls").modal("show");
    $("ul#station-sorter.station-select li").remove();
    $.each(channels, function(i, scnl) {
      updateList(scnl);
    });
    $("#station-sorter").show();
    updateScnls();
  }

  //Give date in milliseconds
  initialize();

  // Can't load these until the quickshake is made
  function controlsInit() {
    var oldWidth = quickshake.width;
    $(window).resize(function(){
      quickshake.resizeViewer(oldWidth);
      oldWidth = quickshake.width;
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

  function initializeSocket(stations) {
    // console.log(stations)
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