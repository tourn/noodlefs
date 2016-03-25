"use strict";
var assert = require('assert');
var Promise = require('bluebird'); //jshint ignore:line
var userdata = require('../userdata');
var auth = userdata.get();
var Noodle = require('../noodle');
var sinon = require('sinon');
var JSON5 = require('json5');
var fs = require('fs');

var course_vss = JSON5.parse(fs.readFileSync('course_vss.json'));
var course_wi1 = JSON5.parse(fs.readFileSync('course_wi1.json'));




describe('Noodle', function(){
  var moodleStub = {};
  var auth = {"wwwroot":"https://moodle.hsr.ch/","token":"boo"};
  var noodle;

  beforeEach(function(done){
    var call = sinon.stub();
    call.onCall(0).returns(Promise.resolve({userid: 123})); // user info
    call.onCall(1).returns(Promise.resolve([
        {id: 1, fullname: 'VSS'},
        {id: 2, fullname: 'WI1'}
    ])); // courses
    call.onCall(2).returns(Promise.resolve(course_vss));
    call.onCall(3).returns(Promise.resolve(course_wi1));
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
      var root = noodle.getNode('/');
      assert.ok(root);
      //assertEqual('VSS', root.courses[0].name); //TODO: decide the format to get here
    });

    it('returns a valid course node', function(){
      var course = noodle.getNode('/VSS');
      assert.ok(course);
      //TODO: decide the format to get here as well
    });

    it('returns a valid section node', function(){
      var node = noodle.getNode('/VSS/Allgemeine Information');
      assert.ok(node);
      //TODO: again
    });

    it('returns a valid module node', function(){
      var node = noodle.getNode('/VSS/Allgemeine Information/Modulbeschreibung');
      assert.ok(node);
      console.log(node);
    });
  });
});

/*
new Noodle(auth).init().then(function(noodle){
  console.log("yay");

  var n1 = noodle.getNode('/');
  console.log(n1);
  console.log(noodle.getAttr(n1));
  console.log(noodle.list(n1));
  console.log("++++++1");

  var n2 = noodle.getNode('/Verteilte Software-Systeme FS2016');
  //console.log(n2);
  //console.log(noodle.getAttr(n2));
  console.log(noodle.list(n2));
  console.log("++++++2");

  var n3 = noodle.getNode('/Verteilte Software-Systeme FS2016/Allgemeine Information');
  console.log(n3);
  console.log(noodle.getAttr(n3));
  console.log(noodle.list(n3));
  console.log("++++++3");

  var n4 = noodle.getNode('/Verteilte Software-Systeme FS2016/Allgemeine Information/Modulbeschreibung');
  console.log(n4);
  console.log(noodle.getAttr(n4));
  console.log(noodle.list(n4));
  console.log("++++++4");

  var n5 = noodle.getNode('/Verteilte Software-Systeme FS2016/Allgemeine Information/Modulbeschreibung/Modulbeschreibung');
  console.log(n5);
  console.log(noodle.getAttr(n5));
  //console.log(noodle.list(n5));
  console.log("++++++5");
});
*/
