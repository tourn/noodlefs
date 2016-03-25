"use strict";

var moodle_client = require("moodle-client");
var Promise = require('bluebird'); //jshint ignore:line
var Course = require('./course');

function Noodle(auth, mockClient) {
  var self = this;
  var client = mockClient || moodle_client;

  this.userId = -1;
  this.courses = { type: 'course-list' };
  this.root = null;

  self.init = function(){
    return client.init(auth).then(function(client) {
      return client.call({ // get user ID
        wsfunction: "core_webservice_get_site_info",
      }).then(function(data){
        self.userId = data.userid;
        return client.call({
          wsfunction: "core_enrol_get_users_courses",
          args: { userid: self.userId }
        });
      }).then(function(courses){
        return Promise.all(courses.map(function(course){
          return client.call({
            wsfunction: "core_course_get_contents",
            args: { courseid: 504 } // FIXME
          }).then(function(data){
            return {
              id: course.id,
              name: course.fullname,
              content: data
            };
          });
        }));
      }).then(function(fullCourses){
        fullCourses.forEach(function(course){
          self.courses[course.name] = course;
        });
        return self;
      });
    });
  };

  self.getNode = function(path){
    if(path === '/'){
      //TODO this is an array, which doesn't quite match with the output from getPath
      return self.getCourseNames();
    } else {
      var parts = path.split('/');
      if(parts[0] === '') { parts.shift(); }
      var course = self.courses[parts.shift()];
      if(!course) { throw "Course not found!"; }
      var c = new Course(course.content);
      return c.getPath(parts);
    }
  };

  function makeAttrs(){
    return {
      mtime: new Date(),
      atime: new Date(),
      ctime: new Date(),
      size: 100,
      mode: parseInt('040555', 8),
      uid: process.getuid(),
      gid: process.getgid()
    };
  }

  function makeDate(moodleTimestamp){
    if(!moodleTimestamp) { return new Date(); }
    return new Date(moodleTimestamp * 1000); //JS wants it in MS
  }

  self.getAttr = function(node){
    var attrs = makeAttrs();
    attrs.mtime = makeDate(node.timemodified);
    attrs.ctime = makeDate(node.timecreated);
    switch(node.type){
      case undefined: //folder
        return attrs;
      case 'url':
        //attrs.mode = 33188;
        attrs.mode = parseInt('000', 8); //for now: can't do anything with urls
        return attrs;
      case 'file':
        //attrs.mode = 33188;
        attrs.mode = parseInt('444', 8);
        attrs.size = node.filesize;
        return attrs;
      default:
        throw "Unknown filetype!";
    }
  };

  self.list = function(node){
    //this SUUUCKS
    if(node.forEach) { 
      if(node[0].name){
        return new Course(node).list();
      } else {
        //hacky: works for the getCourseNames for now
        return node; 
      }
    } 
    return new Course().list(node); //FIXME: extract the list function
  };

  self.getDownloadURL = function(node){
    var url = node.fileurl;
    if(!url) { throw "node doesn't have an URL!"; }
    return url + "&token=" + auth.token;
  };

  self.getCourseNames = function() {
      var names = [];
      for (var key in self.courses) {
          names.push(key);
      }
      return names;
  };

}

module.exports = Noodle;

