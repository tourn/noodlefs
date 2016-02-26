"use strict";

var fuse = require('fuse-bindings')
var util = require('util');
var Noodle = require('./noodle')
var auth = require('./config');

// TODO: move to config, refactor to { auth: X, fuse: Y }
var mountpoint = '/tmp/noodle';

var noodle = new Noodle(auth);

fuse.mount(mountpoint, {
  readdir: function (path, cb) {
    console.log('readdir(%s)', path);
    var parts = path.split('/');
    if (path === '/') { // root
        var courses = noodle.getCourseNames();

        cb(0, courses);

    } else if (parts.length === 2) { // course
        var courseName = parts[1];
        noodle.getCourseContentNames(courseName).then(function (contents) {
          cb(0, contents);
        });


    } else if (parts.length === 3) { // course content
        var courseName = parts[1];
        var contentName = parts[2];
        noodle.getCourseContentModules(courseName, contentName).then(function (modules) {
          cb(0, modules.map(function (module) { return module.name; }));
        });

    } else {
        console.log("WARNING: readdir fail");
        cb(0);
    }
  },

  getattr: function (path, cb) {
    console.log('getattr(%s)', path)
    var parts = path.split('/');
    if (path === '/') { // root
      cb(0, {
        mtime: new Date(),
        atime: new Date(),
        ctime: new Date(),
        size: 100,
        mode: 16749,
        uid: process.getuid(),
        gid: process.getgid()
      })

    } else if (parts.length === 2) { // course
      cb(0, {
          mtime: new Date(),
          atime: new Date(),
          ctime: new Date(),
          size: 100,
          mode: 16749,
          uid: process.getuid(),
          gid: process.getgid()
      });

    } else if (parts.length === 3) { // course content
      cb(0, {
          mtime: new Date(),
          atime: new Date(),
          ctime: new Date(),
          size: 100,
          mode: 16749,
          uid: process.getuid(),
          gid: process.getgid()
      });

    } else if (parts.length == 4) { // course content module
        var courseName = parts[1];
        var contentName = parts[2];
        var moduleName = parts[3];
        noodle.getCourseContentModule(courseName, contentName, moduleName).then(function (module) {
          cb(0, {
              mtime: module.mtime,
              atime: new Date(),
              ctime: module.ctime,
              size: module.size,
  //            mode: 16877,
  //            mode: 16749,
              mode: 365, // TODO
              uid: process.getuid(),
              gid: process.getgid()
          });
        }); // TODO: catch error

    } else {
        cb(fuse.ENOENT)
    }
  },

  open: function (path, flags, cb) {
    console.log('open(%s, %d)', path, flags)
    cb(0, 42) // 42 is an fd
  },

  read: function (path, fd, buf, len, pos, cb) {
    console.log('read(%s, %d, %d, %d)', path, fd, len, pos)
    var str = 'hello world\n'.slice(pos)
    if (!str) return cb(0)
    buf.write(str)
    return cb(str.length)
  }
});

process.on('SIGINT', function () {
  fuse.unmount(mountpoint, function () {
    process.exit()
  })
});

