"use strict";

var userdata = require('./userdata');
var nfs = require('./fs');
var log = require('debug-logger')('noodlefs');

if(process.argv.length < 3){
  //FIXME binary name
  console.log("Usage: noodlefs <mountpoint>");
  return 1;
}

log.info('HI!');
var mountpoint = process.argv[2];

if(!userdata.isComplete()){
  //var conf = userdata.get();
  userdata.prompt().then(function(data){
    nfs.mount(data, mountpoint);
  }).catch(function(err){
    console.log(err);
  });
} else {
  nfs.mount(userdata.get(), mountpoint);
}
