// FIXME & TODO: 
// resizing is broken
// shake history broken sometimes for archive
// add map
// fix up code

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
    this.canvasElement = document.getElementById("quick-shake-canvas");
    this.localTime = true;
    this.stationScalar = 3.207930 * Math.pow(10, 5) * 9.8; // count/scalar => %g
    //log values
    this.scale = 4; //starting scale slide value 
    this.scaleSliderMin = 2.5;
    this.scaleSliderMax = 6;
    //end log values
    this.realtime = true; //realtime will fast forward if tail of buffer gets too long.
    this.scroll = null; //sets scrolling
    this.timeout = 60; //Number of minutes to keep active
    this.lineColor = "#000";
    this.tz = "PST";
    this.channels = channels;
    this.eventStart = null;
    this.pad = null;
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
  QuickShake.prototype.updateBuffer = function(packet, start) {
    // console.log(packet)
    if (this.viewerLeftTime == null) {
      if (start){ 
        this.viewerLeftTime = this.makeTimeKey(start - this.viewerWidthSec * 1000);
      } else {
        this.viewerLeftTime = this.makeTimeKey(packet.starttime);
      }
      this.startPixOffset -= (this.sampPerSec * 4);
      this.height = this.channels.length * this.channelHeight + 44;
      this.canvasElement.height = this.height;
      this.canvasElement.width = this.width;
      this.playScroll();

      // this.updateGs(this.scale);    
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
  QuickShake.prototype.updateArchive = function(data, eventStart, packetStart) {
    var _this = this;

    _this.realtime = false;
    _this.eventStart = eventStart;
    _this.pad = 0;
    $.each(data, function(i, packet){
      _this.updateBuffer(packet, packetStart);
    });


  };

  QuickShake.prototype.drawSignal = function() {
    if (this.scroll) {
      //OFFSET at start
      if (this.startPixOffset > 0) {
        this.startPixOffset--;
      } else {
        this.viewerLeftTime += this.refreshRate;
      }

      // if (this.realtime) {
        this.adjustPlay();
        if (this.realtime){
          this.truncateBuffer();
        }
        
      // }
    }

    // FIND MEAN AND Extreme vals
    //only consider part of buffer in viewer
    var cursor = this.viewerLeftTime;
    var cursorStop = cursor + this.viewerWidthSec * 1000;
    if (cursor < cursorStop) {
      var ctx = this.canvasElement.getContext("2d");
;
      ctx.clearRect(0, 0, this.width - 0, this.height);
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
            var norm = ((val - mean) * Math.pow(10, this.scale));

            if (norm < -1)
              norm = -1;
            if (norm > 1)
              norm = 1;

            var chanAxis = 22 + (this.channelHeight / 2) + this.channelHeight * i; //22 is offset for header timeline.
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

        }//while
        ctx.stroke();

      }
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


  QuickShake.prototype.drawAxes = function(ctx) {
    //actual edge of display (axes labels are outside of this frame)
    //shift dimensions to straddle pixels (fixes blurry canvas appearance)

    var shift = 0.5;
    var edge = {
      left: 0 + shift,
      top: 20 + shift,
      right: this.width - 0.5,
      bottom: this.height - 20 - 0.5
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
      ctx.fillText(cName, edge.left + 10.5, 40.5 + yOffset);
      var chanCenter = 22 + this.channelHeight / 2 + yOffset;
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
    
    var index = 0;
    while (canvasIndex < edge.right + 20) { //allow times to be drawn off of canvas
      // ctx.moveTo(canvasIndex, this.height -19);
      ctx.moveTo(canvasIndex, 20);
      ctx.lineTo(canvasIndex, this.height - 15);

        
      ctx.fillText(this.dateFormat(tickTime, "top"), canvasIndex - 23, 12); //top
      ctx.fillText(this.dateFormat(tickTime, "bottom"), canvasIndex - 23, this.height - 1); //bottom
      
      canvasIndex += pixInterval;
      tickTime += this.tickInterval;
      index++;
    }
    
    ctx.strokeStyle = "#CCCCCC"; //vertical time lines
    ctx.stroke();
    
    //Draws a vertical line to mark start of event.
    //TODO: decide if this should be over or under the wave
    if(this.eventStart){
      ctx.beginPath();
      ctx.font = "13px Helvetica, Arial, sans-serif";
      var t = (this.eventStart - this.viewerLeftTime) / this.refreshRate + this.startPixOffset;
      ctx.moveTo(t, edge.bottom);
      ctx.lineTo(t, edge.top);
      // ctx.fillText("start", t-15, 12); 
      ctx.strokeStyle = "#ff0000"; // axis color    
      ctx.stroke();
    }
    
    
  };


  //In realtime, we need to adjust play if data on end of buffer tails off canvas
  //ideally we want new data written on canvas a few sampPerSec in
  //We want to avoid player constantly trying to catch up.
  QuickShake.prototype.adjustPlay = function() {
    var pad = this.pad != null ? this.pad : 0;
    var cursorOffset = (this.viewerWidthSec / 10) * this.sampPerSec;
    //i.e. how much buffer in pixels is hanging off the right side of the viewer
    //tail in px    
    var tail = this.startPixOffset + cursorOffset + (this.endtime - this.viewerLeftTime - this.viewerWidthSec * 1000) / 1000 * this.sampPerSec;
    //when we're close to cursorOffset just pad by one to avoid jerky behavior
    if(this.pad === null){
      if (tail > -cursorOffset && tail < cursorOffset / 2) {
        pad = 1;
      } else if (tail < -cursorOffset) {
        pad - 1;
      } else if (tail > -cursorOffset / 2) {
        pad = parseInt(Math.abs(tail / 10), 0);
      }
    }

    if (this.startPixOffset == 0) {
      this.viewerLeftTime += pad * this.refreshRate;
    }
    // console.log(pad)
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
      //get client tz from string
      var tz = String(String(d)).match(/\(\w{3}\)/)[0].match(/\w{3}/)[0];
    } else {
      var hours = d.getUTCHours();
      var minutes = d.getUTCMinutes();
      var seconds = d.getUTCSeconds();
      var tz = "UTC";
    }

    var tzStamp;
    
    //I'm going to be honest, this sucks
    var viewerWidthMin = this.viewerWidthSec / 60;
    if (60 % viewerWidthMin == 0 || viewerWidthMin % 5 == 0) {
      var isOnTime = minutes % viewerWidthMin == 0 && seconds == 0;
      var isOnHalfTime = minutes % viewerWidthMin == viewerWidthMin / 2 && seconds == 0;
      var isBetweenTime = minutes % viewerWidthMin == viewerWidthMin / 2 - 0.5 && seconds == 30;

      tzStamp = isOnTime || isOnHalfTime || isBetweenTime;
    } else {
      tzStamp = seconds == 54 || seconds == 24;
    }


    var time;
    if (hours < 10)
      hours = "0" + hours;
    if (minutes < 10)
      minutes = "0" + minutes;
    if (seconds < 10)
      seconds = "0" + seconds;
    time = hours + ":" + minutes + ":" + seconds;
    if (tzStamp)
      time += " " + tz;
    return time;
  };

  //playback slider
  QuickShake.prototype.updatePlaybackSlider = function() {
    $("#playback-slider").slider("option", "max", this.endtime);
    $("#playback-slider").slider("option", "min", this.starttime);
    if (this.scroll) {
      $("#playback-slider").slider("option", "value", this.viewerLeftTime);
    }
  };

  QuickShake.prototype.pauseScroll = function() {
    clearInterval(this.scroll);
    this.scroll = null;
    //take things out of realtime mode once scroll is stopped
    this.realtime = false;
  };

  QuickShake.prototype.playScroll = function(archive) {
    _this = this;
    this.scroll = setInterval(function() {
      if (_this.buffer != null) {
        if(archive){
          _this.drawArchive();
        } else {
          _this.drawSignal();
        }
      }
    }, this.refreshRate);
  };

  QuickShake.prototype.selectPlayback = function(e, ui) {
    console.log(this.startPixOffset)
    if (this.startPixOffset == 0) {
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
    }
  };

  //Handles the connection timeout 
  QuickShake.prototype.setTimeout = function() {
    if (getUrlParam('timeout') == true || getUrlParam('timeout') == null) { //for some reason I have to put == true...
      //Initial interval for checking state  

      var idleTime = 0;

      var maxTime = this.timeout + 5; //minute (time to )
      var minTime = this.timeout; //minute
      var timeAlert = $("#quick-shake-timeout");

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
    $("#quick-shake-scale").css("height", this.channelHeight / 2);
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

    $("#quick-shake-canvas, #quick-shake-controls").show();
    $("#quickshake").height(window.innerHeight * .80);
    var height = $("#quickshake").height() - 60; //banner height && controls height 
    this.width = $("#quickshake").width();
    this.channelHeight = height / this.channels.length;
    this.height = this.channelHeight * this.channels.length + 44; //44 for top & bottom time stamps
    this.sampPerSec = Math.round(this.width / this.viewerWidthSec);
    this.refreshRate = Math.round(1000 / this.sampPerSec); //refresh rate in milliseconds

    this.tickInterval = 1000 * (this.viewerWidthSec / (this.width / 100 < 10 ? parseInt(this.width/100) : 10));

    this.canvasElement.height = this.height;
    this.canvasElement.width = this.width;
    this.updateScale();
  };

  var timeout;
  // Create a delay to simulate end of resizing
  $(window).resize(function() {
    clearTimeout(timeout);
    timeout = setTimeout(function(){
      quickshake.configViewer();
      quickshake.drawSignal();
      console.log("This wouldn't go blank if you hadn't broken it Jon.");
    }, 500);
  });
  var _this = this;
  var lastScale = _this.scale;
  $("#quick-shake-canvas").swipe({
    pinchStatus: function(event, phase, direction, distance, duration, fingerCount, pinchScale) {
      // Make sure it is actually a two finger scale and not a tap
      if (distance > 0 && fingerCount > 1) {
        _this.selectScale(event, lastScale + parseFloat(pinchScale) - 1);
      }
      //Save value of scale at the end to use as baseline
      if (phase === $.fn.swipe.phases.PHASE_END || phase === $.fn.swipe.phases.PHASE_CANCEL) {
        lastScale = _this.scale;
      }
    }
  });

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
  var usgsPath = "http://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&";

  // var channels = ["TAHO.HNZ.UW.--","BABR.ENZ.UW.--","JEDS.ENZ.UW.--"];
  var channels = [];
  
  // Initialize UI
  $("#start-select").datetimepicker({
    format: 'yyyy-mm-dd hh:ii:ss',
    useCurrent: true
  });
  
  var eventSelector = $('select#event-select.station-select');
  eventSelector.attr({
    'data-live-search': true,
    'disabled':'disabled',
    'title': "No events found."
  });
  

  //TODO: Edit stations in the edit station modal (add&delete)
  //Populate group groupSelector
  var groupSelector = $('select#group-select.station-select');
  groupSelector.attr({
    'data-live-search': true, 
    'title': 'No groups found.'
  });
  
  groupSelector.selectpicker();

  groupSelector.change(function() {
    channels = groupSelector.children(":selected").val().split(",");
    $('.quickshake-warning').hide();
    $("ul#station-sorter.station-select li").remove();
    $.each(channels, function(i, scnl) {
      updateList(scnl);
    });
  });

  eventSelector.change(function(){
    // console.log()
    console.log(eventSelector.children(":selected"));
    
    $("#evid-select").val("");
    $("#start-select").val("");
  
  });
  
  $("#evid-select").change(function(){
    $("#start-select").val("");
    eventSelector.val("");
  })
  
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
  
  var events = {};
  function getEvents() {
    $.ajax({
      dataType: "json",
      url: usgsPath + "minlatitude=41&maxlatitude=51&minlongitude=-129&maxlongitude=-116&minmagnitude=2"
    }).done(function(data) {
      
      eventSelector.append($("<optgroup label='Earthquakes' id='earthquakes-group'></optgroup>"));
      eventSelector.append($("<optgroup label='Other events' id='others-group'></optgroup>"));
      var earthquakes = $("#earthquakes-group");
      var other = $("#others-group");

      $.each(data.features, function(i, feature) {
        // console.log(i)
        var titleTokens = feature.properties.title.split(" ");
        var tokens = feature.id;
        $.each(titleTokens, function(i, token) {
          tokens += token;
        });
        var dateString = makeDate(new Date(feature.properties.time));
        var title = dateString + " M " + feature.properties.mag;
        var append = $("<option value=" + (parseInt(feature.properties.time, 10)/1000) + " data id=" + feature.id + " data-subtext=" + feature.id + " title='" + title + "'>").text(dateString + " " + feature.properties.title);
        
        if (feature.properties.type == "earthquake") {
          earthquakes.append(append);
        } else {
          other.append(append);
        }
        
        events[feature.id] = {
          evid: feature.id,
          description: feature.properties.title,
          starttime: parseFloat(feature.properties.time)
        };
        // console.log(events[feature.id].starttime)
      });
      
      if (data.features.length > 0 ){
        eventSelector.removeAttr('disabled');
        eventSelector.append($("<option data-hidden='true' data-tokens='false' selected value='false'>").text("Select an event"));
      } else {
        console.log("wtf");
      }
      
      if(getUrlParam("evid")){        
        evid = getUrlParam("evid");
        if($("select#event-select option[id="+ evid +"]") ){
          $("select#event-select option[id="+ evid +"]").attr("selected", "selected");
          $('select#event-select').selectpicker('refresh');
        }
      }
      $('select#event-select').selectpicker('refresh');
    }).fail(function(response){
      console.log("I failed");
      console.log(response);
    });

  }
  
  function getGroups(_callback) {
    $.ajax({
      type: "GET",
      dataType: "jsonp",
      url: "http://" + path + "groups"
    }).done(function(data) {
      // console.log(data);
      
      var defaultGroup = {
        name:"",
        scnls:[]
      };
      
      groupSelector.append($("<option data-hidden='true' data-tokens='false' title='Select a group' value='false' >"));
      $.each(data, function(key, group) {
        groupSelector.append($('<option value=' + group.scnls + ' id=' + key + ' data-subtext=' + group.scnls + '>').text(key));
        if(group["default"] == 1 && defaultGroup.scnls.length == 0) {
          defaultGroup.name = key;
          defaultGroup.scnls = group.scnls;
        }      
      });
      
      $("#group-header").show();
      
      if(!getUrlParam("group") && channels.length == 0){
        channels = defaultGroup.scnls;
        $("select#group-select option[id="+ defaultGroup.name +"]").attr("selected", "selected");
        $("#group-header span").text(defaultGroup.name + " (default)");
      } else if( getUrlParam("group")){
        $("#group-header span").text(getUrlParam("group"));
        $("select#group-select option[id="+ getUrlParam("group") +"]").attr("selected", "selected");
        if(channels.length == 0){
          channels = data[getUrlParam("group")] ? data[getUrlParam("group")].scnls : [];
        }
      }
      
      groupSelector.selectpicker('refresh');
      
      _callback();
    }).fail(function(response){
      alert("JON! WEB4 IS DOWN!");
      console.log("I failed");
      console.log(response);
    });
  }
  
  $("[data-hide]").on("click", function(){
      $(this).closest("." + $(this).attr("data-hide")).hide();
  });

  function getStart(evid, start, _callback){
    var stime = start;
    var text;
    
    if(!evid) {
      _callback(stime);
    } else if(events[evid]){
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
        
        _callback(stime);
        
      }).fail(function(response){
        console.log("I failed");
        console.log(response);
      });
    }
  }
  
  var scnlSelector = $('select#scnl-select.station-select');
  scnlSelector.attr({
    'data-live-search': true, 
    'title': 'No SCNLS found.',
    'multiple':true
  });
  
  scnlSelector.selectpicker();
  
  //TODO: make a leaflet map
  function getScnls(){
    $.ajax({
      type: "GET",
      dataType: "jsonp",
      url: "http://" + path + "scnls"
    }).done(function(data) {
      scnlSelector.append($("<option data-hidden='true' data-tokens='false' title='Select a scnl' value='false'>"));
      $.each(data, function(key, scnl) {
        // var sta = scnl.split(".");
        scnlSelector.append($('<option value=' + scnl + ' id=' + scnl + '>').text(scnl));
      });
      scnlSelector.selectpicker("val", 'false')
      scnlSelector.selectpicker('refresh');
    }).fail(function(response){
      console.log("I failed");
      console.log(response);
    });
    
  }
  
 //TODO: test if evid is somewhat valid (has network code)
  $("#evid-select").change(function(){
    $("#evid-warning").toggle($("#evid-select").val().length != 10);
  });

  // Returns the channels
  function getChannels() {
    if(channels.length > 0) {
      return channels;
    } else if ($('select#group-select option:selected').length > 0 && $('select#group-select option:selected')[0].value){
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
    // if (channels.length > 0) {
    //   $(".quickshake-warning").hide();
    // } else {
    //   $(".quickshake-warning").show();
    // }
    $(".update.station-select").addClass("btn-primary");
  });
  
  $("button.open-controls").click(function(){
    $("#controls").modal("show");
    $("ul#station-sorter.station-select li").remove();
    $.each(channels, function(i, scnl) {
      updateList(scnl);
    });
    $("#station-sorter").show();    
  });
  
  $("button.add-station").click(function(e){
    var newScnls = $("#scnl-select").val();
    $.each(newScnls, function(i, scnl){
      var testScnl = scnl.split(".");
      var valid = true;
      if(testScnl.length == 4){ //FIXME: change to 3 when jon fixes this should be ==4
        $.each(scnl.split("."), function(i, val){
          if (val.length == 0) {
            valid = false;
          } 
        });
      } else {
        valid = false;
      }
    
      if(valid && channels.length < 6){
        updateList(scnl);
        updateChannels();
        $("#length-warning").hide();
        $("#scnl-warning").hide();
      }else if(channels.length >= 6){
        $("#length-warning").show();
      }
      if(!valid){
        $("#scnl-warning").show();
      } 
    });
    e.preventDefault;
  });
  
  $("button.clear-all").click(function(e){
    var inputs = ["event", "evid", "group", "start", "scnl"];
    $.each(inputs, function(i, val){
      console.log(      $("#" + val + "-select").val());
      if(val == "group" || val == "event" || val == "scnl"){
        $("#" + val + "-select").selectpicker('val', 'false');
      } else {
        $("#" + val + "-select").val("");        
      }
    });
    
    $("ul#station-sorter").empty();
    channels = [];
    $("#station-warning").show();
  });
  
  
  function updateList(scnl){
    $("ul#station-sorter.station-select").append("<li class='list-group-item' id= '" + scnl + "'>" + scnl   
    + "<i class='fa fa-sort pull-left'></i>" + "<i class='fa fa-trash pull-right delete' ></i>"
    +"</li>");
  }
  
  $("#station-sorter").on('click', '.delete', function () {
    removeStation($(this).parent());
    // $(this).parent().remove(); 
  });
  
  function removeStation(li){
    var scnl = li.attr("id");
    
    li.remove();

    updateChannels();

    if(channels.length < 6) {
      $("#scnl-warning").hide();
    }
    
    
  }
  
  function updateChannels(){
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
      var start = getValue("start");
      var width = getValue("width");
      var duration = getValue("duration");
      
      if (getUrlParam('timeout') == 'false') {
        url += "timeout=false&";
      }
      
      //Is there a group?
      if ($('select#group-select option:selected').length > 0 && $('select#group-select option:selected')[0].id.length > 0) {
        url += "group=" + $('select#group-select option:selected')[0].id + "&";
      };
      
      //Is there an event?
      //TODO: decide on which evid overrides
      if ($('select#event-select option:selected').length > 0 && $('select#event-select option:selected')[0].value > 0) {
        url += "evid=" + $('select#event-select option:selected')[0].id + "&";
        if(!start) {
          url += "start=" + $('select#event-select option:selected')[0].value * 1000 + "&";
        } else {
          url += "start=" + start + "&";
        }
        console.log($('select#event-select option:selected')[0].value + "&");
      } else {
        if (evid) {
          url += "evid=" + evid + "&";
        }
        if (start) {
          url += "start=" + start + "&";
        }
      }
      
      if (width) {
        url += "width=" + width + "&";
      }

      url += "scnls=" + channels;
      location.search = url;
    } else {
      // $(".quickshake-warning").show();
    }

  });

  // End station select stuff

  //Populate form with URL values, doesn't handle lack of value
  function populateForm(){
    
    if(getUrlParam("width")){
      $("#width-select option[value="+ getUrlParam("width") +"]").attr("selected", "selected");
    }
    
    //TODO: this isn't populating
    if(getUrlParam("evid")){
      evid = getUrlParam("evid");
      $("#evid-select").val(evid);
    }
    
    if(getUrlParam("start")){
      var s = new Date(parseFloat(getUrlParam("start")));
      $("#start-select").val(s.getFullYear() + "-" + (s.getMonth() + 1) + "-" + s.getDate() + " " + s.getHours() + ":" + s.getMinutes() + ":" + s.getSeconds());
    }
    
    if(getUrlParam("group")){
      $("#group-header span").text(getUrlParam("group"));
    }
    
    if(getUrlParam("scnls")){
      channels=getUrlParam("scnls").split(",");
      $('.quickshake-warning').hide();
    }
    
    if(getUrlParam("duration")){
      $("#duration-select").val(getUrlParam("duration"));
    }

  }
  
  function getValue (variable){
    if(variable === "start") {
      var start = new Date($("#" + variable + "-select").val()); 
      return start && start.getTime() ? start.getTime() : false;
    } else {
      return $("#" + variable + "-select").val() ? $("#" + variable + "-select").val() : false;
    }
    
  }
  
  function initialize() {
    getEvents();
    populateForm();
    getScnls();
    getGroups(function(){
      var width = getValue("width") * 60;
      quickshake = new QuickShake(width, channels);

      // console.log(width)
      if (channels.length > 0 && channels.length < 7){
        $('.quickshake-warning').hide();
        $('.loading').hide();
        $('#header').show();
        var evid = getValue("evid");
        
        var duration = getUrlParam("duration") ? getUrlParam("duration") : 10;

        var start = getValue("start");
        
        var stations = "scnls=" + getChannels();

        if(start || evid){
          getStart(evid, start, function(s){
            $("#start-header span").text(new Date(s));
            $("#start-header").show();
            var starttime = s - 12000;
            $.ajax({
              type: "GET",
              dataType: "jsonp",
              url: "http://" + path + "archive?starttime=" + starttime + "&" + stations,
              timeout: 1000, 
            }).success(function(data) {
              // console.log(data[0])
              $("#fastforward-button").show();
              quickshake.configViewer();
              quickshake.updateArchive(data, s, starttime);
            }).error(function(data) {
              //fail not getting called
            }).complete(function(xhr, data){
              if(xhr.status == 0) {
                console.log("faillll");
                
                $("#controls").modal("show");
                $("ul#station-sorter.station-select li").remove();
                $.each(channels, function(i, scnl) {
                  updateList(scnl);
                });
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


  //Give date in milliseconds
  initialize();
  
  // Can't load these until the quickshake is made
  function controlsInit(){
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
      return false;
    });

    $("#stop-button").click(function() {
      if (!$("#stop-button").hasClass("disabled")) {
        quickshake.pauseScroll();
        $("#play-button").removeClass("disabled");
        $("#stop-button, #realtime-button, #fastforward-button").addClass("disabled");
      }
      return false;
    });
  
    var pad = quickshake.pad;
    $("#fastforward-button").click(function() {
      pad = pad < 4 ? pad + 1 : 0;
      quickshake.pad = pad * 10;
      quickshake.adjustPlay();
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
      socket = new WebSocket("ws://"+path+"?" + stations);
      quickshake.setTimeout();
    };

    socket.onmessage = function(message, flags) {
      var packet = JSON.parse(message.data);
      quickshake.updateBuffer(packet);
    };

  }

  //end socket stuff
});