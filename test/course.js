"use strict";
var assert = require('assert');
var Promise = require('bluebird'); //jshint ignore:line
var fs = require('fs');
var JSON5 = require('json5'); //handle the invalid JSON returned by moodle
var Course = require('../course');

var buf = fs.readFileSync('./course_vss.json', 'utf8');
var json = JSON5.parse(buf);

describe('Course', function(){
  var course;
  beforeEach(function(){
    course = new Course(json);
  });

  describe('list()', function(){
    it('lists the children of a course', function(){
      var list = course.list();
      assert.equal(16, list.length);
      assert.equal('Allgemeine Information', list[0]);
    });

    it('lists the modules of a TOP node', function(){
      var node = course.getPath('Allgemeine Information');
      var list = course.list(node);
      assert.equal(7, list.length);
      assert.equal('Modulbeschreibung', list[0]);
    });

    it('lists the contents of a module', function(){
      var node = course.getPath('Allgemeine Information/Modulbeschreibung');
      var list = course.list(node);
      assert.equal(1, list.length);
      assert.equal('Modulbeschreibung', list[0]);

    });
  });

  it('can find a TOP node', function(){
    assert.ok(course.getPath('Allgemeine Information'));
  });

  it('can find a module node', function(){
    assert.ok(course.getPath('Allgemeine Information/Modulbeschreibung'));
  });

  it('can find a file node', function(){
    assert.ok(course.getPath('Allgemeine Information/Modulbeschreibung/Modulbeschreibung'));
  });

  it('throws when a node isn\'t found', function(){
    assert.throws(function(){
      course.getPath('Allgemeine Information/Hans');
    });
    assert.throws(function(){
      course.getPath('Franz');
    });
  });
});
