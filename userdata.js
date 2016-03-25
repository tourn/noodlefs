"use strict";

var storage = process.env.APPDATA? process.env.APPDATA + '/noodlefs.json' : process.env.HOME + '/.noodlefs.json';
var fs = require('fs');
var read = require('read');
var async = require('async');
var Promise = require('bluebird');
var login_hsr = require('./login_hsr');

function get(){
  try{
    return JSON.parse(fs.readFileSync(storage, 'utf8'));
  } catch (e) {
    return {};
  }
}

function set(data){
  fs.writeFileSync(storage, JSON.stringify(data), 'utf8');
}

function prompt(){
  var data = get();
  return new Promise(function(resolve, reject){
    async.series([
      function(callback){
        read({
          prompt: 'Your moodle url: ',
          default: data.wwwroot || 'https://moodle.hsr.ch/'
        }, function(error, result){
          data.wwwroot = result;
          set(data);
          callback();
        });
      },
      function(callback){
        if(data.wwwroot === 'https://moodle.hsr.ch/'){
          login_hsr.authenticateInteractively().then(function(token){
            data.token = token;
            set(data);
            callback();
          }).error(function(error){
            callback(new Error(error));
          });
        } else {
          //TODO implement normal moodle token acquirement
          callback(new Error('Your moodle is currently not supported'));
        }
      },
      function(callback){
        read({
          prompt: 'Folder for temporary files: ',
          default: data.tmpdir || '/tmp/noodletmp'
        }, function(error, result){
          data.tmpdir = result + '/';
          set(data);
          fs.mkdir(data.tmpdir, function(err){
            if(!err || err.code === 'EEXIST'){
              callback();
            } else {
              callback(err);
            }
          });
        });
      }
    ], function(err){
      if(err){
        reject(err);
      } else {
        resolve(data);
      }
    });
  });
}

function isComplete(){
  var data = get();
  return data.wwwroot && data.token && data.tmpdir;
}

function makeTempFilePath(){
  //TODO wipe this folder sometime?
  var data = get();
  return data.tmpdir + Math.random().toString().substr(2);
}

module.exports = {
  get: get,
  set: set,
  prompt: prompt,
  isComplete: isComplete,
  makeTempFilePath: makeTempFilePath
};
