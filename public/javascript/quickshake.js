//client side of quakeShake

  //initial params that should be consistent across all channels on page
  function QuickShake(canvasElement, viewerWidthSec, chans) {
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
    this.canvasElement = canvasElement[0];
    this.localTime = true;
    // this.stationScalar = 3.207930 * Math.pow(10, 5) * 9.8; // count/scalar => %g
    this.stationScalars = {};
    //log values
    this.scale = 5.6; //starting scale slide value
    this.scaleSliderMin = 0.1;
    this.scaleSliderMax = 10;
    //end log values
    this.realtime = true; //realtime will fast forward if tail of buffer gets too long.
    this.scroll = null; //sets scrolling
 
    this.lineColor = "#000";
    this.tz = "PST";
    this.channels = chans;
    this.archive = false;
    this.pad = 0;
    this.archiveOffset = 0; //offset for line labels in archivex
    this.annotations = [];
    this.arrivals = [];
    this.eventtime = null;

    this.brandLogo = new Image();
    this.brandLogo.src = 'images/brand_icon.png';
    
  }

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

    if (this.stationScalars[packet.key]) {
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

      //End of archive data -> stop playing and open controls
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

        var top = this.archiveOffset + this.timeOffset + (this.channelHeight / 2) + this.channelHeight * i;
        $("#" + channel).css('top', top + "px");

        cursor = this.viewerLeftTime; //start back at left on each iteration through this.channels
        //find mean
        var sum = 0;
        //use full array for ave an max
        var time = this.viewerLeftTime;
        var count = 0;
        while (time <= this.endtime) {
          if (this.buffer[time] && this.buffer[time][channel]) {
            var value = this.buffer[time][channel];
            sum += value;
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

        var chanAxis = this.archiveOffset + this.timeOffset + (this.channelHeight / 2) + this.channelHeight * i; //22 is offset for header timeline.
        if (this.stationScalars[channel] && count != 0) {
          count = 0;
         

          while (cursor <= cursorStop) {
            if (this.buffer[cursor] && this.buffer[cursor][channel]) {
              var val = this.buffer[cursor][channel];

              var norm = ((val - mean) * Math.pow(10, this.scale));

              if (norm < -1)
                norm = -1;
              if (norm > 1)
                norm = 1;

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
        } else {
          ctx.font = "15px Helvetica, Arial, sans-serif";
          ctx.fillText("No data. ", this.width / 2, chanAxis + this.channelHeight + 7);

        }
        ctx.stroke();

      }



      this.drawAnnotations(ctx);
    }
  };

  QuickShake.prototype.drawAxes = function(ctx) {


    ctx.drawImage(this.brandLogo, this.width - 110, this.height - 55);


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
    ctx.strokeStyle = "#107a10"; // axis color
    ctx.stroke();


    //channel center lines and labels:
    for (var i = 0; i < this.channels.length; i++) {

      ctx.beginPath();
      ctx.font = "15px Helvetica, Arial, sans-serif";
      var channel = this.channels[i];



      var cName = channel.split(".")[0].toUpperCase();
      var yOffset = i * this.channelHeight;

      ctx.fillText(channel, edge.left + this.timeOffset, edge.top + this.archiveOffset + yOffset + 14);

      var chanCenter = edge.top + this.archiveOffset + this.channelHeight / 2 + yOffset;

      ctx.moveTo(edge.left, chanCenter);
      ctx.lineTo(edge.right, chanCenter);

      ctx.strokeStyle = "#CCCCCC"; //middle line
      ctx.stroke();

      ctx.beginPath();
      ctx.font = "13px Helvetica, Arial, sans-serif";

      // Add the scale
      if (this.stationScalars[channel]) {
        var unitPerPix = this.channelHeight / (2 * Math.pow(10, this.scale));
        var xPos = edge.right - 78;
        var yPos = edge.top + this.archiveOffset + yOffset + this.timeOffset - 2;
        ctx.fillText(unitPerPix.toExponential(1) + " (" + this.stationScalars[channel].unit + ")", xPos, yPos);
      }


      ctx.moveTo(edge.right - 5, edge.top + this.archiveOffset + yOffset);
      ctx.lineTo(edge.right, edge.top + this.archiveOffset + yOffset);

      ctx.strokeStyle = "#000";
      ctx.stroke();

    }

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
    while (canvasIndex < edge.right) { //allow times to be drawn off of canvas
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
  QuickShake.prototype.drawAnnotations = function(ctx) {
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

      if (this.arrivals.length > 0) {
        ctx.beginPath();
        var _this = this;
        $.each(this.arrivals, function(i, arrival) {
          if (arrival) {
            var arrivalPosition = (arrival - _this.viewerLeftTime) / _this.refreshRate + _this.startPixOffset;
            if (i == 0) {
              var text = _this.width < 570 || (arrivalPosition - startPosition) < 135 ? "ETA" : "Estimated arrival times";
              var eventOffset = _this.width < 570 || (arrivalPosition - startPosition) < 135 ? 25 : 135;
              ctx.fillText(text, arrivalPosition - eventOffset, edge.top + _this.archiveOffset / 2 + 3);
              ctx.moveTo(arrivalPosition, edge.top + _this.archiveOffset);
              ctx.lineTo(arrivalPosition, edge.top);
            } else {
              ctx.moveTo(arrivalPosition, edge.top + _this.archiveOffset + _this.channelHeight * i);
              ctx.lineTo(arrivalPosition, edge.top + _this.archiveOffset + _this.channelHeight * (i - 1));
            }
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
        pad --;
      } else if (tail > -cursorOffset / 2) {
        pad = parseInt(Math.abs(tail / 10), 0);
      }
    }
    if (this.startPixOffset == 0) {

      if (pad >= 0) {
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
    var hours, minutes, seconds;
    if (position === "top") {
      hours = d.getHours();
      minutes = d.getMinutes();
      seconds = d.getSeconds();
    } else {
      hours = d.getUTCHours();
      minutes = d.getUTCMinutes();
      seconds = d.getUTCSeconds();
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
    if (!this.scroll) {
      this.scroll = setInterval(function() {
        if (!$.isEmptyObject(_this.buffer) && _this.scroll) {
          _this.drawSignal();
        }
      }, this.refreshRate);
    }
  };

  QuickShake.prototype.selectPlayback = function(slider, value) {
    if (this.scroll) {
      this.pauseScroll();
    }
    var val = value;
    // prevent scrolling back before the data?
    if (val > this.endtime) {
      
      slider.slider("option", "value", this.viewerLeftTime);

    } else {
      this.viewerLeftTime = this.makeTimeKey(val);
      this.drawSignal();
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
    var scale = Math.pow(10, -this.scale); //3 sig. digits
    if (scale < 0.000099) {
      scale = scale.toExponential(2);
    } else {
      scale = scale.toPrecision(2);
    }

  };

  // Handles sizing of the canvas for different screens
  QuickShake.prototype.configViewer = function(height, width) {
    this.height = height;
    this.width = width;

    this.sampPerSec = Math.round(this.width / this.viewerWidthSec);
    this.viewerWidthSec = this.width / this.sampPerSec; //actual width in Sec due to rounding
    this.refreshRate = Math.round(1000 / this.sampPerSec); //refresh rate in milliseconds

    this.tickInterval = 1000 * (this.viewerWidthSec / (this.width / 100 < 10 ? parseInt(this.width / 100, 10) : 10));

    this.canvasElement.height = this.height;
    this.canvasElement.width = this.width;

    this.updateScale();
  };

  /*****End QuickShake prototype
   *
   *
   *
   *
   ***/