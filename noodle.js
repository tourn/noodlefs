"use strict";

var assert = require('assert');
var moodle_client = require("moodle-client");
var Promise = require('bluebird');
var auth = require('./config');

var moodle = function(callback){
  console.log("Initialize moodle client");
  moodle_client.init(auth).then(function(client) {
        callback(client);

  }).catch(function(err) {
        console.log("Unable to initialize the client: " + err);
  });
}

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
    console.log("getCourseContentNames " + courseName + " id=" + self.courses[courseName].id);
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
    console.log("getCourseContentModules " + courseName + " id=" + self.courses[courseName].id);
    return new Promise(function(resolve,reject){
      moodle_client.init(auth).then(function(client) {
        client.call({
          wsfunction: "core_course_get_contents",
          args: { courseid: self.courses[courseName].id },
        }).then(function(courseContents){
          var modules = [];
          courseContents.forEach(function (content) {
            console.log(content);
            if (content.name === contentName && content.modules.length >= 1) {
              modules = content.modules.map(function (module) {
                return {
                  name: module.name,
                  ctime: module.timecreated,
                  mtime: module.timemodified,
                  size: 42,
                  type: module.modname
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

  // TODO: DRY these two functions
  
  self.getCourseContentModule = function(courseName, contentName, moduleName) {
    console.log("getCourseContentModule " + courseName);
    console.log("   id=" + self.courses[courseName].id);
    return new Promise(function(resolve,reject){
      moodle_client.init(auth).then(function(client) {
        client.call({
          wsfunction: "core_course_get_contents",
          args: { courseid: self.courses[courseName].id },
        }).then(function(courseContents){
          var requestedModule = {};
          courseContents.forEach(function (content) {
            if (content.name === contentName && content.modules.length >= 1) {
              for (var module in content.modules) {
                if (module.name === moduleName) {
                  requestedModule = { // TODO: DRY, write a function `parseModule`
                    name: module.name,
                    ctime: module.timecreated,
                    mtime: module.timemodified,
                    size: 42,
                    type: module.modname
                  }
                }
              }
            }
          });
          resolve(requestedModule);
        });

      }).catch(function(err) {
            console.log("Unable to initialize the client: " + err);
      });
    });
  };
};

module.exports = Noodle;

