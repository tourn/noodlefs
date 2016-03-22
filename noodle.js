"use strict";

var assert = require('assert');
var moodle_client = require("moodle-client");
var Promise = require('bluebird');

function Noodle(auth) {
  var self = this;

  this.userId = -1;
  this.courses = {};
  this.root = null;

  self.init = function(){
    return new Promise(function(resolve, reject){
      moodle_client.init(auth).then(function(client) {
        client.call({ // get user ID
          wsfunction: "core_webservice_get_site_info",
        }).then(function(data){
          self.userId = data.userid;
          client.call({
            wsfunction: "core_enrol_get_users_courses",
            args: { userid: self.userId }
          }).then(function(courses){
            courses.forEach(function(course){
              self.courses[course.fullname] = {
                id: course.id,
                name: course.fullname,
                content: null
              };
            });
            resolve(self);
          });
        });
      }).catch(function(err) {
            console.log("Unable to initialize the client: " + err);
      });
    });
  };
  self.init();

  self.getCourseContentNames = function(courseName){
    console.log("> getCourseContentNames " + courseName + " id=" + self.courses[courseName].id);
    return new Promise(function(resolve,reject){
      moodle_client.init(auth).then(function(client) {
        client.call({
          wsfunction: "core_course_get_contents",
          args: { courseid: self.courses[courseName].id },
        }).then(function(courseContents){
          var contentNames = courseContents.map(function(entry) {
            return entry.name;
          });
          resolve(contentNames);
        });

      }).catch(function(err) {
            console.log("Unable to initialize the client: " + err);
      });
    });
  };

  self.getCourseNames = function() {
      var names = [];
      for (var key in self.courses) {
          names.push(key);
      }
      return names;
  };

  self.getCourseContentModules = function(courseName, contentName) {
    var course = self.courses[courseName];
    console.log("getCourseContentModules " + courseName);
    return new Promise(function(resolve,reject){
      if(!course) { reject(); }
      moodle_client.init(auth).then(function(client) {
        client.call({
          wsfunction: "core_course_get_contents",
          args: { courseid: self.courses[courseName].id },
        }).then(function(courseContents){
          var modules = [];

          // find all modules in course content that have at least one file as their content, and return all those files, if any
          courseContents.forEach(function (content) {
            console.log(content);
            if (content.name === contentName && content.modules.length >= 1) {
              modules = [];
              content.modules.forEach(function (module) {
                if (module.contents !== undefined && module.contents.length >= 1 && module.contents[0].type === 'file') {
                  modules.push({
                    name: module.name,
                    ctime: module.contents[0].timecreated,
                    mtime: module.contents[0].timemodified,
                    size: module.contents[0].filesize,
                    type: module.modname
                  });
                }
              });
            }
          });

          resolve(modules);
        });

      }).catch(function(err) {
            console.log("Unable to initialize the client: " + err);
      });
    });
  };

  // TODO: DRY these two functions (above and below)
  
  // TODO: rename these to include "file" (limitation for now)
  self.getCourseContentModule = function(courseName, contentName, moduleName) {
    console.log("> getCourseContentModule " + courseName);
    console.log(">   id=" + self.courses[courseName].id);
    return new Promise(function(resolve,reject){
      moodle_client.init(auth).then(function(client) {
        client.call({
          wsfunction: "core_course_get_contents",
          args: { courseid: self.courses[courseName].id },
        }).then(function(courseContents){
          var requestedModule = {};

          courseContents.forEach(function (content) {
            if (content.name === contentName && content.modules.length >= 1) {
            console.log("> found content");
              content.modules.forEach(function (module) {
                  console.log("> check module " + module.name + " for match with req " + moduleName);
                if (module.name === moduleName) {
                  console.log(">> found module = " + JSON.stringify(module));

                  // >> found module = {"id":17964,"url":"https://moodle.hsr.ch/mod/resource/view.php?id=17964","name":"Zusatzmaterial zu U1 - Dokumentation ...","instance":8381,"visible":1,"modicon":"https://moodle.hsr.ch/theme/image.php/_s/more/core/1455119128/f/archive-24","modname":"resource","modplural":"Dateien","indent":0,
                  // "contents":[
                  //    {"type":"file","filename":"uebung-dokumentation.zip","filepath":"/","filesize":2464250,"fileurl":"https://moodle.hsr.ch/webservice/pluginfile.php/35098/mod_resource/content/1/uebung-dokumentation.zip?forcedownload=1","timecreated":1456155628,"timemodified":1456155652,"sortorder":1,"userid":3256,"author":"Daniel Keller","license":"allrightsreserved"}
                  // ]}
                  
                  if (module.contents === undefined || module.contents.length == 0 || module.contents[0].type !== 'file') {
                    reject("Not a file");
                  }

                  // TODO: DRY, write a function `parseModule`
                  // only works for files (i'm assuming)
                  var modContent = {
                    type: module.contents[0].type,
                    size: module.contents[0].filesize,
                    ctime: module.contents[0].timecreated,
                    mtime: module.contents[0].timemodified
                  }
                  requestedModule = {
                    name: module.name,
                    type: module.modname,
                    content: modContent
                  }
                }
              });
            }
          });

          resolve(requestedModule);
        });

      }).catch(function(err) {
            console.log("Unable to initialize the client: " + err);
      });
    });
  };

  self.getCourseContentModuleUrl = function(courseName, contentName, moduleName) {
    console.log("> getCourseContentModule " + courseName);
    console.log(">   id=" + self.courses[courseName].id);
    return new Promise(function(resolve,reject){
      moodle_client.init(auth).then(function(client) {
        client.call({
          wsfunction: "core_course_get_contents",
          args: { courseid: self.courses[courseName].id },
        }).then(function(courseContents){
          var fileUrl = '';

          courseContents.forEach(function (content) {
            if (content.name === contentName && content.modules.length >= 1) {
            console.log("> found content");
              content.modules.forEach(function (module) {
                  console.log("> check module " + module.name + " for match with req " + moduleName);
                if (module.name === moduleName) {
                  console.log(">> found module = " + JSON.stringify(module));

                  // >> found module = {"id":17964,"url":"https://moodle.hsr.ch/mod/resource/view.php?id=17964","name":"Zusatzmaterial zu U1 - Dokumentation ...","instance":8381,"visible":1,"modicon":"https://moodle.hsr.ch/theme/image.php/_s/more/core/1455119128/f/archive-24","modname":"resource","modplural":"Dateien","indent":0,
                  // "contents":[
                  //    {"type":"file","filename":"uebung-dokumentation.zip","filepath":"/","filesize":2464250,"fileurl":"https://moodle.hsr.ch/webservice/pluginfile.php/35098/mod_resource/content/1/uebung-dokumentation.zip?forcedownload=1","timecreated":1456155628,"timemodified":1456155652,"sortorder":1,"userid":3256,"author":"Daniel Keller","license":"allrightsreserved"}
                  // ]}
                  
                  if (module.contents === undefined || module.contents.length == 0 || module.contents[0].type !== 'file') {
                    reject("Not a file");
                  }

                  fileUrl = module.contents[0].fileurl + "&token=" + auth.token;
                }
              });
            }
          });

          if (fileUrl === '') {
              reject("No URL for file found!");
          }

          resolve(fileUrl);
        });

      }).catch(function(err) {
            console.log("Unable to initialize the client: " + err);
      });
    });
  };
};

module.exports = Noodle;

