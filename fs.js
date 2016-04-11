"use strict";

var fuse = require('fuse-bindings');
var fs = require('fs');
var Noodle = require('./noodle');
var log = require('debug-logger')('noodlefs');

module.exports = {
  mount: function(auth, mountpoint){
    new Noodle(auth).init().then(function(noodle){
      function getAttr(path, callback){
        log.trace('getattr(%s)', path);
        try{
          var node = noodle.getNode(path);
          callback(0, node.attrs);
        } catch (e){
          log.warn(e);
          callback(0, fuse.ENOENT);
        }
      }

      function readdir(path, callback){
        log.trace('readdir(%s)', path);
        try{
          var node = noodle.getNode(path);
          callback(0, node.list);
        } catch (e){
          log.warn(e);
          callback(0, fuse.ENOENT);
        }
      }

      var fds = {};

      function open(path, flags, callback){
        log.trace('open(%s, %d)', path, flags);
        try{
          var node = noodle.getNode(path);
          node.open(auth).then(function(fd){
            fds[fd] = node;
            callback(0, fd);
          });
        } catch (e){
          log.warn(e);
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
        log.trace('read(%s, %d, %d, %d)', path, fd, len, pos);
        log.trace("typeof buf = " + typeof buf);

        if(pos > fds[fd].length){
          cb(0);
        } else {
          fs.read(fd, buf, 0, len, pos, function (err, bytesRead, buffer) {
            log.trace("fs.read err=" + err + " bytesRead=" + bytesRead);
            cb(bytesRead);
          });
        }
      }

      function release(path, fd, cb) {
        log.trace('release(%s, %d)', path, fd);
        fs.close(fd, function(err){
          if(err) { log.error(err); }
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

