/* 
eventArchiver  archives on discreet start stop times for event
collection naming scheme 
sta_chan_net_loc_event where loc="__" if null
example
hwk1_hnz_uw__event
*/
/*jslint node:true */
'use strict';

// var  EventEmitter = require('events').EventEmitter;
function EventArchiver(interval, logger) {
    this.interval = interval;
    this.logger = logger;
}


// methods



//accept db and scnl name
// for each collection find time range and move to the event collection

//db.full_set.aggregate([ { $match: { date: "20120105" } }, { $out: "subset" } ]);

module.exports = EventArchiver;
