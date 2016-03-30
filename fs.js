"use strict";

var fuse = require('fuse-bindings');
var fs = require('fs');
var util = require('util');
var Noodle = require('./noodle');

// TODO: one is not enough! base path on actual module content name to have one for each
var tmpFilePath = '/tmp/thefile';

module.exports = {
  mount: function(auth, mountpoint){
    new Noodle(auth).init().then(function(noodle){
      function getAttr(path, callback){
        console.log('getattr(%s)', path);
        try{
          var node = noodle.getNode(path);
          callback(0, node.attrs);
        } catch (e){
          console.log(e);
          callback(0, fuse.ENOENT);
        }
      }

      function readdir(path, callback){
        console.log('readdir(%s)', path);
        try{
          var node = noodle.getNode(path);
          callback(0, node.list);
        } catch (e){
          console.log(e);
          callback(0, fuse.ENOENT);
        }
      }

      var fds = {};

      function open(path, flags, callback){
        console.log('open(%s, %d)', path, flags);
        try{
          var node = noodle.getNode(path);
          node.open(auth).then(function(fd){
            fds[fd] = node;
            callback(0, fd);
          });
        } catch (e){
          console.log(e);
          callback(0, fuse.ENOENT);
        }
      }

      // ops.read(path, fd, buffer, length, position, cb)
      // 
      // Called when contents of a file is being read. You should write the result of the read to the buffer and return the number of bytes written as the first argument in the callback. If no bytes were written (read is complete) return 0 in the callback.
      // 
      // var data = new Buffer('hello world')
      // 
      // ops.read = function (path, fd, buffer, length, position, cb) {
      //   if (position >= data.length) return cb(0) // done
      //   var part = data.slice(position, position + length)
      //   part.copy(buffer) // write the result of the read to the result buffer
      //   cb(part.length) // return the number of bytes read
      // }
      function read(path, fd, buf, len, pos, cb) {
        console.log('read(%s, %d, %d, %d)', path, fd, len, pos);
        console.log("typeof buf = " + typeof buf);

        if(pos > fds[fd].length){
          cb(0);
        } else {
          fs.read(fd, buf, 0, len, pos, function (err, bytesRead, buffer) {
            console.log("fs.read err=" + err + " bytesRead=" + bytesRead);
            cb(bytesRead);
          });
        }
      }

      function release(path, fd, cb) {
        console.log('release(%s, %d)', path, fd);
        fs.close(fd, function(err){
          if(err) { console.log(err); }
          cb(0);
        });
      }

      var ops = {
        readdir: readdir,
        getattr: getAttr,
        open: open,
        read: read,
        release: release
      };

      fuse.mount(mountpoint, ops);

      process.on('SIGINT', function () {
        fuse.unmount(mountpoint, function () {
          process.exit();
        });
      });
    });
  }
};

