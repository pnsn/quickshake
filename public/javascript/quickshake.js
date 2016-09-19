//client side of quakeShake 
$(function(){  
  var quickshake = new QuickShake(); 
  function QuickShake(){
    this.pixPerSec      = 20;  //10 pix/sec = samples second i.e. the highest resolution we can display
    this.timeWindowSec  = 102.4;
    this.timeStep       = 1000/this.pixPerSec;
    this.channelHeight  = 90; //how many pix for each signal
    this.height         = null;
    this.width          = this.timeWindowSec*this.pixPerSec;
    this.buffer         = null;
    this.axisColor      = "#000";
  	this.lineWidth      = 1;
  	this.tickInterval   = 10*1000;
    this.starttime      = Date.now()*1000; //make these real big and real small so they will be immediately overwritten
    this.endtime        = 0;
    this.startPixOffset = this.width; //starttime pixelOffset
    this.lastTimeFrame  = null; // track the time of the last time frame(left side of canvas this will be incremented each interval)
    this.canvasElement  = document.getElementById("quick-shake-canvas");
    this.localTime      = true;
    this.stationScalar  =3.207930*Math.pow(10,5)*9.8; // count/scalar => %g
    //log values
    this.scale          = 4; //starting scale slide value 
    this.scaleSliderMin  = 2.5;
    this.scaleSliderMax  = 6;
    //end log values
    this.realtime       = true; //realtime will fast forward if tail of buffer gets too long.
    this.scroll         = null; //sets scrolling
    this.timeout        = 60; //Number of minutes to keep active
    this.lineColor      ="#000";
    this.host           ="ws://localdocker:8888?scnls=OCEN.HNZ.UW.--";
    this.tz             ="PST";
  }; 
  
  // incoming data are appended to buf
  // drawing is done from left to right (old to new)
  
  //buffer will be of form:
  
  //  {
  //    milliseconds: {
  //      chan1: val,
  //      chan2: val,
  //      ....
  //      chanN: val
  //  }
  //        ....
  //}
  
  //called when new data arrive. Functions independently from 
  // drawSignal method which is called on a sampRate interval
  QuickShake.prototype.updateBuffer = function(packet){
     //we want to be writting new data just inside of canvas left
    if(this.lastTimeFrame == null){
      this.lastTimeFrame = this.makeTimeKey(packet.starttime);
      console.log(packet.starttime);
    
      this.startPixOffset -=(this.pixPerSec*4);
    
      //400 for each channel + 20 pix for top and bottom time line plus 2px margin
      this.height = channels.length*this.channelHeight + 44; 
      this.canvasElement.height = this.height;
      this.canvasElement.width = this.width;
      // this.updateGs(this.scale);    
    }

    if(this.buffer == null)
      this.buffer = {};
    //update times to track oldest and youngest data points
    if(packet.starttime < this.starttime)
      this.starttime = this.makeTimeKey(packet.starttime);
    if(packet.endtime > this.endtime)
      this.endtime = this.makeTimeKey(packet.endtime);
    //decimate data
    this.updatePlaybackSlider();
    var _decimate = packet.samprate/this.pixPerSec;
    var _i = 0;
    var _t = packet.starttime;
    while(_i < packet.data.length){
      var _index = Math.round(_i+= _decimate);
      if(_index < packet.data.length){
        if(!this.buffer[this.makeTimeKey(_t)]){
          this.buffer[this.makeTimeKey(_t)] ={};
        }
        this.buffer[this.makeTimeKey(_t)][packet.key] = packet.data[_index]/this.stationScalar;
        _t+=this.timeStep; 
        
      }
    } 
  };
  
  QuickShake.prototype.drawSignal = function(){
    if(this.scroll){
      //OFFSET at start
      if(this.startPixOffset >  0){
        this.startPixOffset--;
      }else{
        this.lastTimeFrame += this.timeStep;
      }
      
      //ADJUST PLAYwe need to adjust play if data on end of buffer tails off canvas
      //ideally we want new data written on canvas at about 10 seconds in 
      if(this.realtime){
        var tail = parseInt(this.startPixOffset + ((this.endtime - this.lastTimeFrame)/1000 * this.pixPerSec) - this.width, 0);
        if(tail < -50)
          pad=0;
        else if(tail < 20)
          pad =2;
        else if(tail < 100)
          pad = 4;
        else if(tail < 1000)
          pad =9;
        else if(tail < 10000)
          pad=99;
        else
          pad=9999;
          //need to adjust these two values if we added padding
        if(this.startPixOffset ==0){
          this.lastTimeFrame += pad*this.timeStep;
        }
        this.startPixOffset = Math.max(0,   this.startPixOffset -pad);
      }
    
      //PRUNE the buffer at 6 canvas widths by three canvas widths
      if(((this.endtime - this.starttime)/1000)*this.pixPerSec > 6*this.width){
        var time= this.starttime;
        while(time < this.starttime + 3*this.timeWindowSec*1000){          
          delete this.buffer[time];
          time+=this.timeStep; 
        }
        this.starttime = time;
      }
    }
    
    // FIND MEAN AND Extreme vals
    var start = this.lastTimeFrame;
	  var stop = this.lastTimeFrame + this.timeWindowSec*1000;
	  if(start < stop){
	    var ctx = this.canvasElement.getContext("2d");
      ctx.clearRect(0, 0, this.width-0, this.height);
  		ctx.lineWidth = this.lineWidth;
      this.drawAxes(ctx);
  		
      ctx.beginPath();

      //iterate through all channels and draw
      for(var i=0; i< channels.length; i++){
        var channel = channels[i];
        start = this.lastTimeFrame;
      
        
        //find mean and max
        var sum=0;
        // var min = Number.MAX_VALUE;
        // var max = -Number.MAX_VALUE;
        //use full array for ave an max
        var starttime = this.lastTimeFrame;
        var count =0;
        console.log("startime=" + starttime);
        while(starttime <= this.endtime){
          if(this.buffer[starttime] && this.buffer[starttime][channel]){
            var val = this.buffer[starttime][channel];
            sum+=val;
            // max = val > max ? val : max;
            // min = val < min ? val :min;
            count++;
            
          }
          starttime+=this.timeStep;
        }
        var mean = sum/count;
        
        // //switch vals if min is further from center
        // if(Math.abs(max - mean) < Math.abs(min - mean)){
        //   max = min;
        // };
        //
        // this.scale is default 1 and adjusted by scale slider
        // max = parseInt(Math.abs(max-mean)*this.scale,0);
        
        // //FIXME Debugging
        // $("#status").text("Pad by " + pad + ", tail:" + tail + ", bufferLength: " + count );
        // var s = channel.sta.toLowerCase();
        // $("#status-" + s).text(s+ ":" +  " mean: " + mean + ", max: " + max + ", min:" + min + ", sum: " + sum  );        
      
        
        // ctx.strokeStyle = channel.lineColor;
        ctx.strokeStyle = this.lineColor;
    
    		//Draw!! from left to write
    		//if startPixOffset > 0 , this is offset, start drawing there
    		//this is only the case while plot first renders till it reaches left side of canvas
    	  var canvasIndex = this.startPixOffset;
    	  //boolean to use moveTo or lineTo
    	  // first time through we want to use moveTo
    	  var gap = true;
    	  // draw Always start from lastTimeFrame and go one canvas width
    	  count = 0;
        
        while(start <= stop){
          if(this.buffer[start] && this.buffer[start][channel]){
            var val = this.buffer[start][channel];
            var norm = ((val - mean) *Math.pow(10,this.scale)); 
            
            if(norm < -1)
              norm = -1;
            if(norm > 1)
              norm = 1;
            
            var chanAxis = 22 + (this.channelHeight/2) + this.channelHeight*i; //22 is offset for header timeline.
            var yval= Math.round( (this.channelHeight) / 2 * norm + chanAxis);
            
            if(gap){
              ctx.moveTo( canvasIndex, yval);
              gap =false;
            }else{
              ctx.lineTo(canvasIndex, yval);            
            }
          }else{
            gap = true;
          }
          canvasIndex++;
          start+= this.timeStep;
        
        }//while
        ctx.stroke();
      
      }
    }
  };
  
  //make a key based on new samprate that zeros out the insignificant digits. 
  QuickShake.prototype.makeTimeKey = function(t){
    return parseInt(t/this.timeStep,0)*this.timeStep;
  };

   
  QuickShake.prototype.drawAxes = function(ctx){
    //actual edge of display (axes labels are outside of this frame)
    //shift dimensions to straddle pixels (fixes blurry canvas appearance)
    
    var shift = 0.5;
    var edge = {
      left:  0+shift,
      top:  20+shift,
      right: this.width-0.5,
      bottom: this.height-20-0.5
    };
  
    //some axis lines
    ctx.beginPath();
    //x-axes
    ctx.moveTo(edge.left, edge.top); //top
    ctx.lineTo(edge.right, edge.top);
    ctx.moveTo(edge.left,  edge.bottom); //bottom
    ctx.lineTo(edge.right, edge.bottom);

    //y-axes
    ctx.moveTo(edge.left, edge.top);// left
    ctx.lineTo(edge.left, edge.bottom);
    ctx.moveTo(edge.right, edge.top);//right
    ctx.lineTo(edge.right, edge.bottom);
    
    //scnl label
    ctx.font = "15px Helvetica, Arial, sans-serif";
    ctx.strokeStyle = "#119247"; // axis color    
    ctx.stroke();
    
    ctx.beginPath();
    //channel center lines and labels:
    for(var i=0; i< channels.length; i++){
      var channel = channels[i];
      var cName = channel.split(".")[0];
      var yOffset= i*this.channelHeight; 
      ctx.fillText(cName, edge.left + 10.5, 40.5 + yOffset);
      var chanCenter = 22 + this.channelHeight/2 +yOffset;      
      ctx.moveTo(edge.left,  chanCenter);
      ctx.lineTo(edge.right, chanCenter);
    }
    ctx.strokeStyle = "#CCCCCC"; //middle line
    ctx.stroke();
    //end axis
    
    
    //plot a tick and time at all tickIntervals
    ctx.beginPath();
    ctx.font = "13px Helvetica, Arial, sans-serif";
    
    //centerline
    
    var offset = this.lastTimeFrame%this.tickInterval;  //should be number between 0 & 9999 for 10 second ticks
    //what is time of first tick to left  of startPixOffset
    var tickTime = this.lastTimeFrame - offset;
    
    var canvasIndex = this.startPixOffset - offset/this.timeStep;
    var pixInterval = this.tickInterval/this.timeStep;
    while(canvasIndex < edge.right + 20){ //allow times to be drawn off of canvas
      // ctx.moveTo(canvasIndex, this.height -19);
      ctx.moveTo(canvasIndex, 20);
      ctx.lineTo(canvasIndex, this.height - 15);
      
      ctx.fillText(this.dateFormat(tickTime), canvasIndex - 23, 12); //top
      ctx.fillText(this.dateFormat(tickTime), canvasIndex - 23, this.height -1); //bottom
      canvasIndex+= pixInterval;
      tickTime+=this.tickInterval;
    }
    ctx.strokeStyle = "#CCCCCC"; //vertical time lines
    ctx.stroke();
  };
  
  //accept milliseconds and return data string of format HH:MM:SS in UTC or local
  QuickShake.prototype.dateFormat = function(milliseconds){
    var d = new Date(milliseconds);
    if(this.localTime){
      var hours =  d.getHours();
      var minutes = d.getMinutes();
      var seconds = d.getSeconds();
    }else{
      var hours =  d.getUTCHours();
      var minutes = d.getUTCMinutes();
      var seconds = d.getUTCSeconds();
    }
    var time;
    if(hours < 10)
     hours = "0" + hours;
    if(minutes < 10)
      minutes = "0" + minutes;
    if(seconds < 10)
      seconds = "0" + seconds;
    time = hours + ":" + minutes + ":" + seconds;
    if(seconds == "00")
      time += " PST";
    return time;
  };
  
  //playback slider
  QuickShake.prototype.updatePlaybackSlider=function(){
    $("#playback-slider" ).slider( "option", "max", this.endtime);
    $("#playback-slider").slider( "option", "min", this.starttime);
    if(this.scroll){
      $("#playback-slider").slider( "option", "value", this.lastTimeFrame);
    }
  };
  
  QuickShake.prototype.pauseScroll = function(){
    clearInterval(this.scroll);
    this.scroll = null;
    //take things out of realtime mode once scroll is stopped
    this.realtime = false;
  };
    
  QuickShake.prototype.playScroll = function(){
      _this = this;
      this.scroll = setInterval(function(){
        if(_this.buffer !== null && _this.lastTimeFrame!==null){
          console.log("boom");
          _this.drawSignal();
        }
      }, 1000/this.pixPerSec);
  };
  
  QuickShake.prototype.selectPlayback=function(e,ui){
    if(this.startPixOffset == 0){
      if(this.scroll){
        this.pauseScroll();
      }
      var val = ui.value;
      if(val > this.endtime){
        $("#playback-slider").slider( "option", "value", this.lastTimeFrame);
      
      }else{
        this.lastTimeFrame= this.makeTimeKey(val);
        this.drawSignal();
      }
    }
  };
  
  //Handles the connection timeout 
  QuickShake.prototype.setTimeout = function(){
    if($.urlParam('timeout')==true||$.urlParam('timeout')==null){ //for some reason I have to put == true...
      //Initial interval for checking state  

      var idleTime = 0;

      var maxTime = this.timeout+5; //minute (time to )
      var minTime = this.timeout; //minute
      var timeAlert = $("#quick-shake-timeout");     
      function timerIncrement() {
        if (maxTime-idleTime>1){
          $("#timer").html("Stream will stop in "+(maxTime-idleTime)+" minutes.");
        }else if(maxTime-idleTime ==1){
          $("#timer").html("Stream will stop in "+(maxTime-idleTime)+" minute.");
        }else{
          $("#timer").html("Stream has ended.");
        }

        if (idleTime == minTime){
          timeAlert.modal("show");
        } else if (idleTime == maxTime){
          socket.close();
        }
        timeAlert.click(resume);
        idleTime++;
      }
      var idleInterval = setInterval(timerIncrement, 60000); // 60000 = 1 minute
      // Hide the information and 
      function resume(){
        if (idleTime >= maxTime){
          initializeSocket();
        }
        idleTime = 0;
      }
      $(window).keypress(resume);
      $(window).click(resume);
    }
  };
  
  QuickShake.prototype.selectScale=function(e,value){
    this.scale = value;
    if(!this.scroll){
      this.drawSignal();
    }
    this.updateScale();
  };
  
  QuickShake.prototype.updateScale=function(){
    $("#quick-shake-scale").css("height", this.channelHeight/2);
    var scale = Math.pow(10,-this.scale);//3 sig. digits
    if (scale < 0.000099){
      scale = scale.toExponential(2);
    } else {
      scale = scale.toPrecision(2);
    }
    $("#top").html(scale);
  };
  
  // Handles sizing of the canvas for different screens
  QuickShake.prototype.fullWidth=function(){
    var height, width, offset;
    offSet=10; //Default for mobile and if there is no scale
    
    $(".loading").hide();
    
    $("#quick-shake-scale, #quick-shake-canvas, #quick-shake-controls").css("visibility", "visible");

      height = $("#quickshake").height()-45; //banner height && controls height 
      width = $("#quickshake").width();
  
    this.channelHeight = height/channels.length;
    this.height = this.channelHeight*channels.length + 44;//44 for top & bottom time stamps
    this.width = width;

    this.canvasElement.height=this.height;
    this.canvasElement.width=this.width;

    this.timeWindowSec  = this.width/this.pixPerSec;
    // this.startPixOffset = 0;
    this.updateScale();

    //Resizing when paused erased the canvas
    // if(!this.scroll){
   //    this.drawSignal();
   //  }
  };
  
  var timeout;
  // Create a delay to simulate end of resizing
  $( window ).resize(function(){
    clearTimeout(timeout);
    timeout = setTimeout(quickshake.fullWidth(), 500);
  });
  
  var lastScale = quickshake.scale;
  $("#quick-shake-canvas").swipe( {
      pinchStatus:function(event, phase, direction, distance , duration , fingerCount, pinchScale) {
        // Make sure it is actually a two finger scale and not a tap
        if(distance > 0 && fingerCount >1 ){
          quickshake.selectScale(event, lastScale + parseFloat(pinchScale) - 1);
        } 
        //Save value of scale at the end to use as baseline
        if (phase === $.fn.swipe.phases.PHASE_END || phase === $.fn.swipe.phases.PHASE_CANCEL){
          lastScale = quickshake.scale;
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
  
  
  
  //returns param value (from stack overflow)
  $.urlParam = function(name){      
      var results = new RegExp('[\?&]' + name + '=([^&#]*)').exec(window.location.href);
      if (results==null){
         return null;
      }
      else{
         return results[1] || 0;
      }
  };

 //UI Elements
  
  //TODO: get this from Mongo or whatever 
  var stationGroups = {
    "group1":{
      name:"Groupy",
      scnls:['OCP.HNZ.UW.--','TAHO.HNZ.UW.--','BABR.ENZ.UW.--','JEDS.ENZ.UW.--']
    },
    "group2":{
      name:"Grouper",
      scnls:['CORE.ENZ.UW.--','BABR.ENZ.UW.--','JEDS.ENZ.UW.--','BROK.HNZ.UW.--']
    },
    "group3":{
      name:"Groupaloo",
      scnls:['OCP.HNZ.UW.--','TAHO.HNZ.UW.--','CORE.ENZ.UW.--','BROK.HNZ.UW.--']
    }
  };
  
  //can't set it to channels or else it constantly updates 
  var chans = [];
  $("#starttime").datetimepicker({format: 'yyyy-mm-dd hh:ii:ss', useCurrent:true});
  
  //TODO: Edit stations in the edit station modal (add&delete)
  //Populate group selector
  var selector = $('select#group-dropdown.station-select');
  selector.attr({
    'data-live-search':true //add data-tokens to make stations visible --> maybe have keywords in the future?
  }).append($("<option data-hidden='true' data-tokens='false'>").text("Select a group"));
  $.each(stationGroups, function(i, group){
    selector.append($('<option value='+group.scnls+' data-tokens='+group.scnls+ ','+ group.name+' id=group-'+group.name+' data-subtext='+group.scnls+'>').text(group.name));
  });
  selector.change(function(){
    chans = selector.children(":selected").attr('data-tokens').split(",");
    //remove the group name --> unnecessary if searchability gets removed
    var g = selector.children(":selected").text();
    chans = $.grep(chans, function(n){
      return n != g;
    });
  });
  selector.selectpicker();
  
  $("ul#station-sorter.station-select").sortable({
      placeholder:"ui-state-highlight"
  }).disableSelection();
  
  
  function getTimeRange(start){ //they can enter their own time if later than evid time
    var urlS = $.urlParam("start"); //start time from URL
    var evidS = start; //start time from Evid
    var startTime; //default: take starttime from evid
    
    if(urlS && evidS && (evidS < urlS) && (urlS - evidS < 5)){ //evid from url and event
      startTime = urlS;
    } else if(evidS){
      startTime = evidS;
    } else if(!evidS && urlS){ //check if its in url
      startTime = urlS;
    }
    if (startTime){
      var s = new Date(startTime*1000);
      $("#starttime").val(s.getFullYear()+"-"+(s.getMonth() + 1)+"-"+s.getDate()+" " + s.getHours()+":"+s.getMinutes()+":"+s.getSeconds());
    }
    return startTime;
  }  
  
  function getEvent(){ //improve error message
    var evidS = $("#select-evid");
    var evid;
    
    if(evidS.val()>1){ //check if there's an evid entered
      evid = evidS.val();
    }else if ($.urlParam("evid")){ //if not, look in URL
      evid = $.urlParam("evid");
      evidS.val(evid);
    } 
    if(evid && evid.length == 8 && (evid.charAt(0) == 6 || evid.charAt(0)==1)){
      return evid;
    } else if (evid){
      $(".evid-warning").append(evid);
      $(".quickshake-invalid-event-warning").show();
      return false;
    } else {
      return false;
    }
    
    eSelect.change(function(){
      evid = evidS.val(); //is this a good idea?
    });
  }
  
  function getDuration(){
    if($.urlParam("duration") && $.urlParam("duration") <= 10){ //forcing it to be less than 10
      $("#duration").val($.urlParam("duration"));
    } else if(!$.urlParam("duration")){
      $("#duration").append("<option selected='selected'></option>");
    }
    return $("#duration").val();
  }
  
  // handle stations in url
  function getStations(){
    var groupName = $.urlParam("group");
    var groupScnls;
    var urlScnls = $.urlParam("scnls");
    if (groupName){
      groupScnls = $('select#group-dropdown option#group-' + groupName).val();
      $('select#group-dropdown').selectpicker('val', groupScnls);
      channels = groupScnls.split(",");
    }
    //by default, scnls in url will override the group scnls
    if(urlScnls){//BABR.HNZ.UW.--, ...
      channels = urlScnls.split(",", 6); 
    }
    if(channels.length == 0){
      $(".quickshake-warning").show();
    } else {
      chans = channels;
    }
    
  }

  // Make the update button change color when stuff is changed
  $(".station-select").change(function(){
    
    if(channels.length >= 0){
      $(".quickshake-warning").hide();
    } else {
      $(".quickshake-warning").show();
    }
    
    $(".update.station-select").addClass("btn-primary");
  });
  
  // Add only selected stations to the rearrange thingy
  $("button.reorder.station-select").click(function(){
    $("ul#station-sorter.station-select li").remove();
    $.each(chans, function(i, scnl){
      $("ul#station-sorter.station-select").append("<li class='list-group-item "+scnl+"'>"+ scnl +"<i class='fa fa-sort pull-right'></i></li>");
    });

    $("#station-sorter").show();
    $("#station-rearrange").modal("show");
  });
  
  // Reorder the channels when you leave the modal
 $('#station-rearrange').on('hidden.bs.modal', function(){
   chans = [];
   $("ul#station-sorter li").each(function(){
     chans.push($(this).text().trim());
   });
    if($("ul#station-sorter li").css('position') == "relative"){
      $(".update.station-select").addClass("btn-primary");
    }
  });
  
  // Update URL with correct station order and whatnot
  $("button.update.station-select").click(function(){
    //there must always be a channel array in winterfell
    if(chans.length > 0){
      url = quickshake.host +"?"; //TODO: not just coastal in future
      if($.urlParam('timeout')=='false'){
        url += "timeout=false&";
      }
    
      //Is there a group?
      if(!$('select#group-dropdown option:selected').attr("data-hidden")){
        url += "group=" + $('select#group-dropdown option:selected').first().text() + "&";
      }

      url += "scnls=" + chans;
      
      var evid = $("#select-evid").val();
      var start = $("#starttime").val();
      var duration = $("#duration").val();
    
      if (evid){ //make sure everything is where it should be
        url += "&evid="+evid;
        if(duration){
          url += "&duration=" + duration;
        } else {
          url += "&duration=" + 5;
        }
      } else if (duration){
        url += "&duration="+ duration;
      }
      
      if(start){
        start = new Date(start);
        url += "&start="+(start.getTime()/1000);
      }
    
      // console.log(url);
      location.href= url;
    } else {
      $(".quickshake-warning").show();
    }

  });

// End station select stuff

// Controls stuff
  $("#playback-slider").slider({
    slide: function(e, ui){
     if (!quickshake.realtime){
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
   slide: function(e, ui){
     quickshake.selectScale(e, ui.value);
   }
  });

  $("#play-button").click(function(){
    if(!$("#play-button").hasClass("disabled")){
      quickshake.playScroll();
      $("#realtime-button, #stop-button").removeClass("disabled");
      $("#play-button").addClass("disabled");
    }
    return false;
  });

  $("#stop-button").click(function(){
    if(!$("#stop-button").hasClass("disabled")){
      quickshake.pauseScroll();
      $("#play-button").removeClass("disabled");
      $("#stop-button, #realtime-button").addClass("disabled");
    }
    return false;
  });

  $("#realtime-button").click(function(){
      //hide when done
    if(!$("#realtime-button").hasClass("disabled") && !quickshake.realtime){
      $("#realtime-button").addClass("disabled");
      quickshake.realtime=true;
    }
    return false;
  });
  
  
  //end UI elements
  
  
  //begin
  var socket;
  //stupid hack since this code is being hosted in a billion places. Fix after games.
  
 //Magic 3 variables 
  var channels = []; //array of scnls ['OCP.HNZ.UW.--','TAHO.HNZ.UW.--','BABR.ENZ.UW.--','JEDS.ENZ.UW.--']
  var startTime;
  var endTime; 

//Station selection UI stuff
   
   
  initialize();
   
  
  function initialize(){
    var evid = getEvent();
    var duration = getDuration();
    if(evid && !duration){
      duration = 3;
      $("#duration").val(duration);
    }
    getStations();
    if (evid) {
      //only have a duration if there is an evid it may not be needed otherwise
      $.ajax("/events/event_time?evid="+evid
      ).done(function(response){
        startTime=getTimeRange(response);
        initializeSocket();
      }).fail(function(message){
        $(".evid-warning").append(evid);
        $(".quickshake-event-warning").show();
      });
    } else {
      startTime=getTimeRange();
      initializeSocket();
    }
    
    if (startTime){
      endTime = parseFloat(startTime) + duration*60; //minutes to seconds
    }
    
    quickshake.setTimeout();
    quickshake.fullWidth();
    
    //Endtime and startTime go to mongo
    //no getting sockety until everything is done
  }
  
 
    
  // handle starttime and endtime from url
  // Note: jquery uses ms
  //$("#starttime").datetimepicker({format: 'yyyy-mm-dd hh:ii:ss', useCurrent:true});
  

// End controls stuff
// Websocket stuff
 

  function initializeSocket(){
    if(window.WebSocket){
      socket = new WebSocket(quickshake.host);
      };

      socket.onmessage = function(message, flags) {
        var packet= JSON.parse(message.data);
        quickshake.updateBuffer(packet);
      };

  }
  
//end socket stuff
  
  
  quickshake.playScroll(); //get these wheels moving!

});