  $(function(){
  //Globals
  var socket;
  var channels = [];
  var inactiveTimeout = 60; //Number of minutes to keep activeg
  var quickshake;
  //map stuff
  var map = new L.Map('map'),
    osmUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    osmAttrib = 'Map data © <a href="https://openstreetmap.org">OpenStreetMap</a> contributors',
    osm = new L.TileLayer(osmUrl, {
      attribution: osmAttrib
    });

  //Set some configs
  var maxChannels = 6; //maximum number of channels that can be shown
  //set the area restrictions for local earthquakes
  var bounds = {
    bottom: 40.5,
    top: 52,
    left: -130,
    right: -115,
    mag: 3
  };
  // var path = "quickshake.pnsn.org/";
  var path = window.location.host + "/";
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
        $(".marker_" + scnl.replace("_", "").replace(/\./g, "_")).addClass("selected");
      });
    });

  $(".selectpicker").selectpicker();

  $("#start-select").change(function() {
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

  var idleTimeoutInterval, idleTime;
  //Handles the connection timeout
  function setStreamTimeout(timeout) {
    if (getUrlParam('timeout') == true || getUrlParam('timeout') == null) { //for some reason I have to put == true...
      //Initial interval for checking state

      idleTime = 0;

      var maxTime = inactiveTimeout + 5; //minute (time to )
     
      startIdleInterval(maxTime);
     
      // Hide the information and

      $(window).keypress(function() {
        resumePlayback(maxTime);
      });
      $(window).click(function() {
        resumePlayback(maxTime);
      });
    }
  }

  function startIdleInterval(maxTime) {
    var timeAlert = $("#quickshake-timeout");
    var minTime = inactiveTimeout;

    idleTimeoutInterval = setInterval(function(){
      if (maxTime - idleTime > 1) {
        $("#timer").html("Stream will stop in " + (maxTime - idleTime) + " minutes.");
      } else if (maxTime - idleTime == 1) {
        $("#timer").html("Stream will stop in " + (maxTime - idleTime) + " minute.");
      } else {
        $("#timer").html("Stream has ended.");
        socket.close();
        clearInterval(idleTimeoutInterval);
      }

      if (idleTime >= minTime) {

        timeAlert.modal("show");

      } 
      timeAlert.click(function() {
        resumePlayback(maxTime);
      });
      idleTime++;
    }, 60000); // 60000 = 1 minute
  }

  function resumePlayback(maxTime) {
    if (idleTime >= maxTime) {
      location.reload();
    }
    idleTime = 0;
  }


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
      } else if (feature.properties.mag) {
        // console.log(feature.properties.mag)
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
  function getEventStart(events, stations, channels, evid, start, _callback) {
    var stime = start;
    var text;
    var arrivals = [];
    var earliestArrival = Number.MAX_SAFE_INTEGER;
    // console.log(stations, channels, events, evid, start)
    if (!evid || (evid && evid.indexOf("HAWK") > -1)) {
      _callback(stime, false, arrivals);
    } else if (events[evid]) {
      stime = stime ? stime : events[evid].starttime;
      text = events[evid].description;

      $("#event-header span").text(text);
      $("#event-header").show();

      $.each(channels, function(i, channel) {
        var arrival = stations[channel.split(".")[0]] ? getStartOffset(events[evid], stime, stations[channel.split(".")[0]]) : null;
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

        var event = {
          evid: data.id,
          description: data.properties.title,
          starttime: parseFloat(data.properties.time),
          geometry: data.geometry
        };

        $.each(channels, function(i, channel) {
          var arrival = stations[channel.split(".")[0]] ? getStartOffset(events[evid], stime, stations[channel.split(".")[0]]) : null;
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
    var lat1 = station.lat; //center of bounding box
    var lon1 = station.lon;

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
      $("#offset-header").show();
      $("#start-header").hide();
      return start + (linDif * d + traveltimes[distance2] * 1000);
    } else {
      return start;
    }

  }

  function makeMap(stations) {
    map.addLayer(osm);

    $.each(stations, function(i, station) {
      var icon;
      var container = $('<div />');
      container.append($("<div> Station: " + station.sta.toUpperCase() + "</div>"));

      container.append($("<div>" + station.scnls.length + " available channel(s)</div>"));
      var list = $('<ul class="available-channels"> </ul>');
      var iconClass = "station-icon";
      $.each(station.scnls, function(j, scnl) {
        var _scnl = scnl.replace("_", "").replace(/\./g, "_");
        var button = $("<li><a class='selected-station' type='button' id='marker_" + _scnl + "'>" + station.chans[j] + "</a></li>");
        list.append(button);
        if (channels.indexOf(scnl.replace("_", "")) > -1) {
          iconClass += " selected";
        }
        iconClass += " marker_" + _scnl;
      });
      container.append(list);
      if (station.lat && station.lon) {
        var marker = L.marker([station.lat, station.lon], {
          icon: L.divIcon({
            className: iconClass
          })
        });

        container.on('click', '.selected-station', function() {
          var thisChannel = $(this)[0].id.replace("marker_", "").replace(/_/g, ".");

          var index = channels.indexOf(thisChannel);

          if (index > -1) { //is in the channels array already
            $("#length-warning").hide();
            channels.splice(index, 1);
            if ($(marker._icon).hasClass('selected')) {
              $(marker._icon).removeClass('selected');
            }
            $("#selected-stations span").text(channels);
            $(".update.station-select").addClass("btn-primary");
          } else if (index == -1 && channels.length < maxChannels) { //not in channel array, space to add
            $("#length-warning").hide();
            channels.push(thisChannel);
            $(marker._icon).addClass('selected');
            $("#selected-stations span").text(channels);
            $(".update.station-select").addClass("btn-primary");

          } else if (channels.length == maxChannels) {
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

        marker.on('mouseover', function(e) {
          this.openPopup();
        });
        // marker.on('mouseout', function(e) {
        //   this.closePopup();
        // });
  
      }
    });

  }

  var eventMarker;

  function plotEvent(event) {
    if (eventMarker) {
      map.removeLayer(eventMarker);
    }
    if (event.geometry && event.geometry.coordinates) {

      var eventIcon = L.icon({
        iconUrl: '/images/star.svg',
        iconSize: [20, 20], // size of the icon
        iconAnchor: [10, 10], // point of the icon which will correspond to marker's location
        shadowAnchor: [4, 62], // the same for the shadow
        popupAnchor: [0, 0] // point from which the popup should open relative to the iconAnchor
      });


      eventMarker = L.marker([event.geometry.coordinates[1], event.geometry.coordinates[0]], {
        icon: eventIcon,
        zIndexOffset: 1000
      });
      eventMarker.bindPopup("Selected Event");
      eventMarker.on('mouseover', function(e) {
        this.openPopup();
      });
      eventMarker.on('mouseout', function(e) {
        this.closePopup();
      });



      eventMarker.addTo(map);
      $("button.clear-all").click(function(){
        eventMarker.remove();
      });
      // $(".sort-distance").removeClass("hidden");
      // $(".sort-distance").click(function(){
      //   sortStations([], event);
      // });
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

  $("button.help").click(function() {
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
    $(".sort-distance").addClass("hidden");
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

    $("#length-warning").hide();
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

  function toggleControls() {
    $("#hide-controls, #show-controls, #toggle-controls, #quickshake-controls").toggleClass("closed");

    window.setTimeout(function() {
      resizeWindow();

      if (!quickshake.scroll) { //FIXME: goes blank if not scrolling
        quickshake.drawSignal();
      }
    }, 100);

  }

  function initialize() {
    var getGroups = function() {
      return $.ajax({
        dataType: "jsonp",
        url: "https://" + path + "groups"
      });
    };
    var getLocalEvents = function() {
      return $.ajax({
        dataType: "json",
        url: usgsPath + "minlatitude=" + bounds.bottom + "&maxlatitude=" + bounds.top + "&minlongitude=" + bounds.left + "&maxlongitude=" + bounds.right + "&minmagnitude=" + bounds.mag
      });
    };
    var getSignificantEvents = function() {
      return $.ajax({
        dataType: "json",
        url: "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/significant_month.geojson"
      });
    };

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
      url: "https://" + path + "scnls"
    }).done(function(data) {
      var latlngs = [];
      $.each(data, function(i, station) {
        var sta = station.sta,
          net = station.net,
          chan = station.chan,
          lat = station.lat,
          lng = station.lon,
          scnl = station.key;

        if (stations[sta] && $.inArray(chan, stations[sta].chans) === -1) {
          stations[sta].chans.push(chan);
          stations[sta].scnls.push(scnl);
        } else if (station.net != "TE") {
          stations[sta] = station;
          stations[sta].chans = [chan];
          stations[sta].scnls = [scnl];
        
          latlngs.push([lat, lng]);
        }
      });

      $('#controls').on('shown.bs.modal', function() {
        var bounds = new L.LatLngBounds(latlngs);
        map.fitBounds(bounds);
      });

      //Patiently waits until all the requests are done before proceeding,
      $.when(getGroups(), getLocalEvents(), getSignificantEvents(), stations).done(function(groupData, localEventData, significantEventData, stations) {
        processGroups(groupData[0]);
        events = processEvents(localEventData[0], significantEventData[0]);

        makeMap(stations);

        eventSelector.change(function() {
          plotEvent(events[$(this).find("option:selected")[0].id]);
        });


        quickshake = new QuickShake($("#quickshake-canvas"), getValue("width") ? getValue("width") * 60 : 2 * 60, channels.slice());

        $("#toggle-controls").click(function() {
          toggleControls();
        });

        $.each(channels, function(i, channel) {
          var channelData = stations[channel.split(".")[0]];
          var scaleVal, unit;
          if (channelData) {

            if (channelData.scaleUnits == "M/S**2" || channelData.scaleUnits == "m/s**2") {
              scaleVal = channelData.gain * 32 * 100;
              unit = "m/s^2";
            } else {
              scaleVal = channelData.gain;
              unit = "m/s";
            }

          }

          if(!scaleVal) {
            scaleVal = 204000.0 * 32 * 100;
          }

          if(!unit) {
            unit = "?";
          }
          quickshake.stationScalars[channel] = {
           scale: scaleVal, 
           unit: unit
          };
        });
        if (channels.length > 0 && channels.length <= maxChannels) {

          $('.quickshake-warning').hide();
          $('#header-left').show();

          if (start || evid) {

            getEventStart(events, stations, channels, evid, start, function(eventtime, earliestArrival, arrivals) {

              // console.log(eventtime, earliestArrival, arrivals)
              $("#start-header span").text(new Date(start));

              $("#start-header").show();

              var starttime;

              if (evid && earliestArrival && earliestArrival - eventtime > 20 * 1000 && earliestArrival - eventtime < 60 * 1000) {
                starttime = eventtime;
              } else if (evid && earliestArrival) {
                starttime = earliestArrival - 20 * 1000;
              } else {
                starttime = eventtime;
              }

              arrivals.unshift(earliestArrival);

              var endtime = starttime + duration * 60 * 1000;

              $.ajax({
                type: "GET",
                dataType: "jsonp",
                url: "https://" + path + "archive?starttime=" + starttime + "&scnls=" + channels + "&endtime=" + endtime
              }).success(function(data) { //sometimes doesn't get called?
                $("#fastforward-button").show();
                resizeWindow();
                quickshake.playArchive(data, eventtime, starttime);
                quickshake.arrivals = arrivals.slice();
                // controlsTimeout = window.setTimeout(function() {
                //   toggleControls();
                // }, 10000);

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
            resizeWindow();
            initializeSocket();
            // controlsTimeout = window.setTimeout(function() {
            //   toggleControls();
            // }, 10000);
          }

          controlsInit();
        } else {
          $('.quickshake-warning').show();
        }

      });

    }).fail(function() {
      console.log("Oops something went wrong.");
    });

    $("#controls-container").click(function() {
      clearTimeout(controlsTimeout);
      controlsTimeout = null;
    });

  }

  function downloadCanvas(link, canvas, filename) {
    link.href = canvas.toDataURL();
    link.download = filename;
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

  function resizeWindow() {
    $("#quickshake-canvas").show();
    $("#quickshake").height(window.innerHeight - $("#header").height() - 10 - $("#controls-container").height());

    quickshake.configViewer($("#quickshake").height(), $("#quickshake").width());

  }

  // Can't load these until the quickshake is made
  function controlsInit() {
    // $(window).resize(function(){
    //    var timeout = setTimeout(function(){
    //      resizeWindow();
    //      quickshake.drawSignal();
    //    }, 1000);
    // });


    $(".open-image").click(function() {
      downloadCanvas(this, quickshake.canvasElement, "quickshake-" + quickshake.endtime + ".png");
    });
    // Controls stuff
    $("#playback-slider").slider({
      slide: function(e, ui) {
        if (!quickshake.realtime) {
          $("#play-button").removeClass("disabled");
          $("#stop-button, #realtime-button").addClass("disabled");
        }
        quickshake.selectPlayback( $("#playback-slider"), ui.value);
      }
    });

    $("#scale-slider").slider({
      min: quickshake.scaleSliderMin, //logs
      max: quickshake.scaleSliderMax,
      value: quickshake.scale,
      step: 0.05,
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

  function initializeSocket() {
    if (window.WebSocket) {
      socket = new WebSocket("ws://" + path + "?" + "scnls=" + channels.toString());
      setStreamTimeout();
    }

    $("#last-data-header").show();

    var lastEndtime = 0;
    socket.onmessage = function(message, flags) {
      var packet = JSON.parse(message.data);
      quickshake.updateBuffer(packet);
      if (packet.endtime > lastEndtime){
        lastEndtime = packet.endtime;
      }

      $("#last-data-header span").text(new Date(lastEndtime));
    };

  }

  //end socket stuff
});
