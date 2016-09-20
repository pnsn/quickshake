//client side of quakeShake 
$(function(){  
  //initial params that should be consistent across all channels on page
  function QuickShake(viewerWidthSec){
    this.viewerWidthSec = viewerWidthSec; //width of viewer in seconds
    //these vals are set dynamically on load and on window resize
    this.height         = null;
    this.width          = null; 
    this.sampPerSec     = null;  // number of samples to use  i.e. the highest resolution we can display 1 samp/pix
    this.refreshRate    = null;  //refresh rate in milliseconds
    this.channelHeight  = null; //how many pix for each signal
    //end dynamic vals
    this.buffer         = {};
    this.axisColor      = "#000";
  	this.lineWidth      = 1;
  	this.tickInterval   =  null;
    this.starttime      = Date.now()*1000; //make these real big and real small so they will be immediately overwritten
    this.endtime        = 0;
    this.startPixOffset = this.width; //starttime pixelOffset
    this.viewerLeftTime = null; // track the time of the last time frame(left side of canvas this will be incremented each interval)
    this.canvasElement  = document.getElementById("quick-shake-canvas");
    this.localTime      = true;
    this.stationScalar  =3.207930*Math.pow(10,5)*9.8; // count/scalar => %g
    //log values
    this.scale          = 4; //starting scale slide value 
    this.scaleSliderMin = 2.5;
    this.scaleSliderMax  =6;
    //end log values
    this.realtime       = true; //realtime will fast forward if tail of buffer gets too long.
    this.scroll         = null; //sets scrolling
    this.timeout        = 60; //Number of minutes to keep active
    this.lineColor      ="#000";
    this.host           ="ws://localdocker:8888?scnls=BROK.HNZ.UW.--,,";//,TAHO.HNZ.UW.--,BABR.ENZ.UW.--,JEDS.ENZ.UW.--";
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
    if(this.viewerLeftTime == null){
      this.viewerLeftTime = this.makeTimeKey(packet.starttime);
      this.startPixOffset -=(this.sampPerSec*4);
      this.height = channels.length*this.channelHeight + 44; 
      this.canvasElement.height = this.height;
      this.canvasElement.width = this.width;
      // this.updateGs(this.scale);    
    }
    this.updatePlaybackSlider();
    //update times to track oldest and youngest data points
    if(packet.starttime < this.starttime)
      this.starttime = this.makeTimeKey(packet.starttime);
    if(packet.endtime > this.endtime)
      this.endtime = this.makeTimeKey(packet.endtime);
    //decimate data
    var _decimate = parseInt(packet.samprate/this.sampPerSec,0);
    var _t = this.makeTimeKey(packet.starttime);
    //move index to correct for time offset
    var _i = parseInt(((_t - packet.starttime)*this.sampPerSec/1000),0);
    while(_i < packet.data.length){
      if(_i < packet.data.length){
        if(!this.buffer[_t]){
          this.buffer[_t] ={};
        }
        this.buffer[_t][packet.key] = packet.data[_i]/this.stationScalar;
        _t+=this.refreshRate; 
        _i+=_decimate;
        
      }
    } 
  };
  
  QuickShake.prototype.drawSignal = function(){
    if(this.scroll){
      //OFFSET at start
      if(this.startPixOffset >  0){
        this.startPixOffset--;
      }else{
        this.viewerLeftTime += this.refreshRate;
      }
      
      
      if(this.realtime){
        this.adjustPlay();
        this.truncateBuffer();
      }      
    }
    
    // FIND MEAN AND Extreme vals
    //only consider part of buffer in viewer
    var cursor = this.viewerLeftTime;
	  var cursorStop = cursor + this.viewerWidthSec*1000;
	  if(cursor < cursorStop){
	    var ctx = this.canvasElement.getContext("2d");
      ctx.clearRect(0, 0, this.width-0, this.height);
  		ctx.lineWidth = this.lineWidth;
      this.drawAxes(ctx);
  		
      ctx.beginPath();
      //iterate through all channels and draw
      for(var i=0; i< channels.length; i++){
        var channel = channels[i];
        cursor = this.viewerLeftTime; //start back at left on each iteration through channels
      
        
        //find mean
        var sum=0;
        //use full array for ave an max
        var time = this.viewerLeftTime;
        var count =0;
        while(time <= this.endtime){
          if(this.buffer[time] && this.buffer[time][channel]){
            var val = this.buffer[time][channel];
            sum+=val;
            count++;
            
          }
          time+=this.refreshRate;
        }
        var mean = sum/count;
        
 
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
        while(cursor <= cursorStop){
          if(this.buffer[cursor] && this.buffer[cursor][channel]){
            var val = this.buffer[cursor][channel];
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
          cursor+= this.refreshRate;
        
        }//while
        ctx.stroke();
      
      }
    }
  };
  
  //make a key based on new samprate that zeros out the insignificant digits. 
  //if the timestamp is less than starttime, increment by the refresh rate
  QuickShake.prototype.makeTimeKey = function(t){
    var _t =parseInt(t/this.refreshRate,0)*this.refreshRate;
    if(_t < t){
      _t+=this.refreshRate;
    }
    return _t;
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
    
    var offset = this.viewerLeftTime%this.tickInterval; 
    //what is time of first tick to left  of startPixOffset
    var tickTime = this.viewerLeftTime - offset;
    
    var canvasIndex = this.startPixOffset - offset/this.refreshRate;
    var pixInterval = this.tickInterval/this.refreshRate;
    var index =0;
    while(canvasIndex < edge.right + 20){ //allow times to be drawn off of canvas
      // ctx.moveTo(canvasIndex, this.height -19);
      ctx.moveTo(canvasIndex, 20);
      ctx.lineTo(canvasIndex, this.height - 15);
      var tzStamp= index %4==0;
      ctx.fillText(this.dateFormat(tickTime, tzStamp, "top"), canvasIndex - 23, 12); //top
      ctx.fillText(this.dateFormat(tickTime, tzStamp, "bottom"), canvasIndex - 23, this.height -1); //bottom
      canvasIndex+= pixInterval;
      tickTime+=this.tickInterval;
      index++;
    }
    ctx.strokeStyle = "#CCCCCC"; //vertical time lines
    ctx.stroke();
  };
  
  
  //In realtime, we need to adjust play if data on end of buffer tails off canvas
  //ideally we want new data written on canvas a few sampPerSec in
  //We want to avoid player constantly trying to catch up.
  QuickShake.prototype.adjustPlay = function(){
    var pad=0;
    var cursorOffset= (this.viewerWidthSec/10)*this.sampPerSec;
    //i.e. how much buffer in pixels is hanging off the right side of the viewer
    //tail in px    
    var tail =  cursorOffset+(this.endtime - this.startPixOffset - this.viewerLeftTime-this.viewerWidthSec*1000)/1000 * this.sampPerSec;    
    //when we're close to cursorOffset just pad by one to avoid jerky behavior
    if (tail >-cursorOffset && tail < cursorOffset/2){
      pad=1;
    }else if (tail > -cursorOffset/2){
      pad =parseInt(Math.abs(tail/10),0);
    }
    if(this.startPixOffset ==0){
      this.viewerLeftTime += pad*this.refreshRate;
    }
    this.startPixOffset = Math.max(0,   this.startPixOffset -pad);
    
  };
  
  //trim buff when it gets wild
  QuickShake.prototype.truncateBuffer=function(){
    if((this.endtime - this.starttime) > 15*this.viewerWidthSec*1000){
      var time= this.starttime;
      while(time < this.starttime + 10*this.viewerWidthSec*1000){
        delete this.buffer[time];
        time+=this.refreshRate;
      }
      this.starttime = time;
    }
  
  };
  
  
  //accept milliseconds and return data string of format HH:MM:SS in UTC or local
  QuickShake.prototype.dateFormat = function(milliseconds, tzStamp, position){
    var d = new Date(milliseconds);
    if(position==="top"){
      var hours =  d.getHours();
      var minutes = d.getMinutes();
      var seconds = d.getSeconds();
      //get client tz from string
      var tz= String(String(d)).match(/\(\w{3}\)/)[0].match(/\w{3}/)[0];
    }else{
      var hours =  d.getUTCHours();
      var minutes = d.getUTCMinutes();
      var seconds = d.getUTCSeconds();
      var tz = "UTC";
    }
    var time;
    if(hours < 10)
     hours = "0" + hours;
    if(minutes < 10)
      minutes = "0" + minutes;
    if(seconds < 10)
      seconds = "0" + seconds;
    time = hours + ":" + minutes + ":" + seconds;
    if(tzStamp)
      time += " " + tz;
    return time;
  };
  
  //playback slider
  QuickShake.prototype.updatePlaybackSlider=function(){
    $("#playback-slider" ).slider( "option", "max", this.endtime);
    $("#playback-slider").slider( "option", "min", this.starttime);
    if(this.scroll){
      $("#playback-slider").slider( "option", "value", this.viewerLeftTime);
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
        if(_this.buffer != null){
          _this.drawSignal();
        }
      }, this.refreshRate);
  };
  
  QuickShake.prototype.selectPlayback=function(e,ui){
    if(this.startPixOffset == 0){
      if(this.scroll){
        this.pauseScroll();
      }
      var val = ui.value;
      if(val > this.endtime){
        $("#playback-slider").slider( "option", "value", this.viewerLeftTime);
      
      }else{
        this.viewerLeftTime= this.makeTimeKey(val);
        this.drawSignal();
      }
    }
  };
  
  //Handles the connection timeout 
  QuickShake.prototype.setTimeout = function(){
    if(getUrlParam('timeout')==true||getUrlParam('timeout')==null){ //for some reason I have to put == true...
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
  QuickShake.prototype.configViewer=function(){
    var offSet=10; //Default for mobile and if there is no scale    
    $(".loading").hide();
    
    $("#quick-shake-scale, #quick-shake-canvas, #quick-shake-controls").css("visibility", "visible");
    var height = $("#quickshake").height()-45; //banner height && controls height 
    this.width = $("#quickshake").width();  
    this.channelHeight = height/channels.length;
    this.height = this.channelHeight*channels.length + 44;//44 for top & bottom time stamps
    this.sampPerSec = Math.round(this.width/this.viewerWidthSec);
    this.refreshRate    = Math.round(1000/this.sampPerSec); //refresh rate in milliseconds
    this.tickInterval=1000*(this.viewerWidthSec/10);

    this.canvasElement.height=this.height;
    this.canvasElement.width=this.width;
    this.updateScale();

    //Resizing when paused erased the canvas
    // if(!this.scroll){
    //   quickshake.drawSignal();
    // }
  };
  var timeout;
  // Create a delay to simulate end of resizing
  $( window ).resize(function(){
    clearTimeout(timeout);
    timeout = setTimeout(quickshake.configViewer(), 500);
  });
  var _this =this;
  var lastScale = _this.scale;
  $("#quick-shake-canvas").swipe( {
      pinchStatus:function(event, phase, direction, distance , duration , fingerCount, pinchScale) {
        // Make sure it is actually a two finger scale and not a tap
        if(distance > 0 && fingerCount >1 ){
          _this.selectScale(event, lastScale + parseFloat(pinchScale) - 1);
        } 
        //Save value of scale at the end to use as baseline
        if (phase === $.fn.swipe.phases.PHASE_END || phase === $.fn.swipe.phases.PHASE_CANCEL){
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
  var viewerWidthSec=300;
  var quickshake = new QuickShake(viewerWidthSec);
  var socket;
  
  //Magic 3 variables 
  var channels = []; //array of scnls ['OCP.HNZ.UW.--','TAHO.HNZ.UW.--','BABR.ENZ.UW.--','JEDS.ENZ.UW.--']
  var startTime;
  var endTime; 
  initialize();
  
  
  
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
  
  
  
  
  
  //helper functions
  
  
  function getUrlParam(param){
    var pageUrl = window.location.search.substring(1);
    var params = pageUrl.split('&');
    for (var i = 0; i < params.length; i++){
      var p = params[i].split('=');
      if (p[0] == param){
          return p[1];
      }
    }
  }
    
  // handle starttime and endtime from url
  // Note: jquery uses ms
  //$("#starttime").datetimepicker({format: 'yyyy-mm-dd hh:ii:ss', useCurrent:true});  
  function getTimeRange(start){ //they can enter their own time if later than evid time
    var urlS = getUrlParam("start"); //start time from URL
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
    }else if (getUrlParam("evid")){ //if not, look in URL
      evid = getUrlParam("evid");
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
    if(getUrlParam("duration") && getUrlParam("duration") <= 10){ //forcing it to be less than 10
      $("#duration").val(getUrlParam("duration"));
    } else if(!getUrlParam("duration")){
      $("#duration").append("<option selected='selected'></option>");
    }
    return $("#duration").val();
  }
  
  // handle stations in url
  function getStations(){
    var groupName = getUrlParam("group");
    var groupScnls;
    var urlScnls = getUrlParam("scnls");
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
  
  
  /*
  *  UI logic
  *  
  *
  *  
  */
  
  $("ul#station-sorter.station-select").sortable({
      placeholder:"ui-state-highlight"
  }).disableSelection();
  
  
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
      if(getUrlParam('timeout')=='false'){
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

// End UI stuff

  
  
  ///init stuff
  
  //TODO: is this the proper way?
  //yes, yes it is.
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
    }
    
    if (startTime){
      endTime = parseFloat(startTime) + duration*60; //minutes to seconds
    }
    //TODO: is this the proper way?
    //yes it is.
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
      }else{
        startTime=getTimeRange();
      }
    
      if (startTime){
        endTime = parseFloat(startTime) + duration*60; //minutes to seconds
      }    
    }
    initializeSocket();
    quickshake.configViewer();
    quickshake.playScroll(); 
    
  }
  
  
  
// Websocket stuff
 

  function initializeSocket(){
    if(window.WebSocket){
      socket = new WebSocket(quickshake.host);
      quickshake.setTimeout();
      };

      socket.onmessage = function(message, flags) {
        var packet= JSON.parse(message.data);
        quickshake.updateBuffer(packet);
      };

  }
  
//end socket stuff
});