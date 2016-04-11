"use strict";

var moodle_client = require("moodle-client");
var Promise = require('bluebird'); //jshint ignore:line
var Node = require('./node');

function Noodle(auth, mockClient) {
  var self = this;
  var client = mockClient || moodle_client;

  this.userId = -1;
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
            args: { courseid: course.id }
          }).then(function(data){
            return {
              id: course.id,
              name: course.fullname,
              content: data
            };
          });
        }));
      }).then(function(fullCourses){
        var courseList = {
          type: 'course-list',
          courses: fullCourses
        };
        self.root = Node.fromCourseList(courseList);
        return self;
      });
    });
  };

  self.getNode = function(path){
    if(path === '/'){
      return self.root;
    } else {
      var parts = path.split('/');
      if(parts[0] === '') { parts.shift(); }
      return getNodeRec(self.root, parts);
    }
  };

  function getNodeRec(node, parts){
    if(parts.length === 0){
      return node;
    } else {
      var part = parts.shift();
      node = node.children.find(function(child){
        return child.name === part;
      });
      if(!node) { throw new Error('Node ' + part + ' not found'); } //or maybe return null?
      return getNodeRec(node, parts);
    }
  }

}

module.exports = Noodle;

