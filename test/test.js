"use strict";
var assert = require('assert');
var moodle_client = require("moodle-client");
var Promise = require('bluebird');
var auth = require('../config');

function moodle(callback){
  moodle_client.init(auth).then(function(client) {
        callback(client);

  }).catch(function(err) {
        console.log("Unable to initialize the client: " + err);
  });
}

function initNoodle(){
}

function Noodle() {
  this.root = null;
  this.courses = {};
  var self = this;
  this.init = function(){
    return new Promise(function(resolve, reject){
      moodle_client.init(auth).then(function(client) {
        client.call({
          wsfunction: "core_webservice_get_site_info", // get userid from here
        }).then(function(data){
          self.userid = data.userid;
          client.call({
            wsfunction: "core_enrol_get_users_courses",
            args: { userid: self.userid }
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

  this.loadCourse = function(name){
    return new Promise(function(resolve,reject){
      moodle_client.init(auth).then(function(client) {
        client.call({
          wsfunction: "core_course_get_contents", args: { courseid: self.courses[name].id },
        }).then(function(data){
          var content = {}
          data.forEach(function(entry){
            content[entry.name] = {
              id: entry.id,
              name: entry.name
              //TODO contents from modules
            }
          });
          self.courses[name].content = content;
          resolve(content);
        });

      }).catch(function(err) {
            console.log("Unable to initialize the client: " + err);
      });
    });
  };
};


describe('Noodlefs', function(){
  it('can list courses', function(done){
    var noodle = new Noodle();
    noodle.init().then(function(n){
      console.log(n);
      done();
    });
  });

  it('can load a course', function(done){
    var noodle = new Noodle();
    noodle.courses = { 
      'Software Engineering 1 - HS15': { 
        id: 397, 
        name: 'Software Engineering 1 - HS15', 
        content: null 
      }
    };
    noodle.loadCourse('Software Engineering 1 - HS15').then(function(course){
      //console.log(course);
      console.log(noodle.courses);
      done();
    });
  });
});
