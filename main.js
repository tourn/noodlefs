"use strict";

var userdata = require('./userdata');
var nfs = require('./fs');

if(process.argv.length < 3){
  //FIXME binary name
  console.log("Usage: noodlefs <mountpoint>");
  return 1;
}

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
