"use strict";

var moodle_client = require("moodle-client");
var Promise = require('bluebird'); //jshint ignore:line
var Course = require('./course');

function Noodle(auth) {
  var self = this;

  this.userId = -1;
  this.courses = {};
  this.root = null;

  self.init = function(){
    return moodle_client.init(auth).then(function(client) {
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
            args: { courseid: 504 }
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

