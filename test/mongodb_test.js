//test cases for mongoserver prototype
// var assert = require('assert')
    var Conf = require("../config.js")
    ,expect  = require("chai").expect
    ,RingBuffer=require("../lib/ringBuffer.js")
    ,Archiver=require("../lib/mongoArchive");
//add some tests here
//should create collection when it doesn't exist
//should add pending buffs
//should get off your ass and actually write these tests