"use strict";

var fuse = require('fuse-bindings');
var fs = require('fs');
var request = require('request');
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
          callback(0, noodle.getAttr(node));
        } catch (e){
          console.log(e);
          callback(0, fuse.ENOENT);
        }
      }

      function readdir(path, callback){
        try{
          var node = noodle.getNode(path);
          callback(0, noodle.list(node));
        } catch (e){
          console.log(e);
          callback(0, fuse.ENOENT);
        }
      }

      var ops = {
        readdir: readdir,
        getattr: getAttr,

        open: function (path, flags, cb) {
          console.log('open(%s, %d)', path, flags);

          var parts = path.split('/');
          if (parts.length == 4) { // course content module, aka. file
            var courseName = parts[1];
            var contentName = parts[2];
            var moduleName = parts[3];
            noodle.getCourseContentModuleUrl(courseName, contentName, moduleName).then(function (fileUrl) {
              console.log("> open(): got file url = " + fileUrl);

              request.get(fileUrl, function (error, response, body) {
                if (!error && response.statusCode == 200) {
                  fs.writeFileSync(tmpFilePath, body);
                  var fd = fs.openSync(tmpFilePath, 'r');
                  cb(0, fd);
                } else {
                  console.log("WARNING: failed to fetch course content module for (" + courseName + ", " + contentName + ", " + moduleName + ")");
                  cb(fuse.ENOENT);
                }
              }); 

            }).catch(function (err) {
              console.log("WARNING: received no course content module for (" + courseName + ", " + contentName + ", " + moduleName + ")");
              cb(fuse.ENOENT)
            });
          }
        },

        read: function (path, fd, buf, len, pos, cb) {
          console.log('read(%s, %d, %d, %d)', path, fd, len, pos)

          // fs.read(fd, buffer, offset, length, position, callback)
          // 
          // Read data from the file specified by fd.
          // 
          // buffer is the buffer that the data will be written to.
          // offset is the offset in the buffer to start writing at.
          // length is an integer specifying the number of bytes to read.
          // position is an integer specifying where to begin reading from in the file. If position is null, data will be read from the current file position.
          // 
          // The callback is given the three arguments, (err, bytesRead, buffer). 

          // --------------------------------------------------------------------------

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

          console.log("typeof buf = " + typeof buf);

          fs.read(fd, buf, 0, len, pos, function (err, bytesRead, buffer) {
            console.log("fs.read err=" + err + " bytesRead=" + bytesRead);
            cb(bytesRead);
          });
        },

        release: function(path, fd, cb) {
          console.log('release(%s, %d)', path, fd);

          fs.closeSync(fd);
          fs.unlinkSync(tmpFilePath);

          // TODO: hangs/blocks, file probably still in use somewhere
        }
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

