"use strict";
var assert = require('assert');
var Promise = require('bluebird'); //jshint ignore:line
var userdata = require('../userdata');
var auth = userdata.get();
var Noodle = require('../noodle');
var sinon = require('sinon');
var fs = require('fs');
var course = require('./course_data');

describe('Noodle', function(){
  var moodleStub = {};
  var auth = {"wwwroot":"https://moodle.example.com/","token":"boo"};
  var noodle;

  beforeEach(function(done){
    var call = sinon.stub();
    call.onCall(0).returns(Promise.resolve({userid: 123})); // user info
    call.onCall(1).returns(Promise.resolve([
        {id: 1, fullname: 'Test Course'},
        {id: 2, fullname: 'Crash Course'}
    ])); // courses
    call.onCall(2).returns(Promise.resolve(course));
    call.onCall(3).returns(Promise.resolve(course));
    moodleStub.call = call;

    var init = sinon.stub();
    init.returns(Promise.resolve(moodleStub));
    moodleStub.init = init;

    new Noodle(auth, moodleStub).init().then(function(n){ 
      noodle = n;
      done();
    });
  });

  it('initializes fine', function(){
    assert.ok(noodle);
  });

  describe('getNode', function(){
    it('returns a valid root node', function(){
      var node = noodle.getNode('/');
      assert.equal(node.type, 'course-list');
    });

    it('returns a valid course node', function(){
      var node = noodle.getNode('/Test Course');
      assert.equal(node.type, 'course');
    });

    it('returns a valid section node', function(){
      var node = noodle.getNode('/Test Course/Section 1');
      assert.equal(node.type, 'section');
    });

    it('returns a valid module node', function(){
      var node = noodle.getNode('/Test Course/Section 1/Link Module.html');
      assert.equal(node.type, 'url');
    });
  });
});
