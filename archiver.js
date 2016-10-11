
var  Conf = require("./config.js")
    ,MongoClient  = require('mongodb').MongoClient
    ,MongoArchive = require(__dirname + '/lib/mongoArchive');
    

var conf = new Conf();
var mongoUrl=this.url = "mongodb://" + conf.mongo.user + ":" + conf.mongo.passwd + "@" 
        + conf.mongo.host + ":" + conf.mongo.port + "/" + conf.mongo.dbname 
        + "?authMechanism=" + conf.mongo.authMech + "&authSource=" + conf.mongo.authSource;


var RING_BUFF = new RingBuffer(conf.ringBuffer.max);
var mongoArchive = new MongoArchive(MongoClient, mongoUrl, conf.mongo.rtCollection, RING_BUFF);

mongoArchive.tail();

mongoArchive.on('message', sendMessage);

mongoArchive.on('close', function(doc){
  
  var msg = 'closing message:';
});



function sendMessage(doc){
  // mongoArchive.updateCollection(doc);
}