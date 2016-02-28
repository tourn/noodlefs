"use strict";

var userdata = require('./userdata');

console.log(userdata.get());

if(!userdata.isComplete()){
  //var conf = userdata.get();
  userdata.prompt().then(function(data){
    console.log(data);
  }).catch(function(err){
    console.log(err);
  });
} else {
  console.log(userdata.get());
}
