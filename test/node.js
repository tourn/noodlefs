"use strict";
var assert = require('assert');
var JSON5 = require('json5');
var fs = require('fs');
var course_vss = JSON5.parse(fs.readFileSync('course_vss.json'));
var Node = require('../node');
var nock = require('nock');

function isFolder(attr){
  var folderBit = parseInt('040000', 8);
  return attr.mode & folderBit === folderBit;
}

describe('Node', function(){

  describe('of a course list', function(){
    var node;
    before(function(){
     node = Node.fromCourseList({
      type: 'course-list',
      courses: [{ id:1, fullname: 'VSS', content: course_vss }]
      });
    });

    it('has the correct type', function(){
      assert.equal(node.type, 'course-list');
    });
    it('can be listed', function(){
      assert.equal(node.list[0], 'VSS');
    });
    it('has node children', function(){
      assert.equal(node.children[0].type, 'course');
    });
    it('is a folder', function(){
      assert(isFolder(node.attrs));
    });
  });

  describe('Of a course', function(){
    var node;
    before(function(){
      node = Node.fromCourse({id: 1, fullname: 'VSS', content:course_vss});
    });

    it('has the correct type', function(){
      assert.equal(node.type, 'course');
    });
    it('can be listed', function(){
      assert.equal(node.list[0], 'Allgemeine Information');
    });
    it('has node children', function(){
      assert.equal(node.children[0].type, 'section');
    });
    it('is a folder', function(){
      assert(isFolder(node.attrs));
    });
  });

  describe('Of a section', function(){
    var node;
    before(function(){
      node = Node.fromSection(course_vss[0]);
    });

    it('has the correct type', function(){
      assert.equal(node.type, 'section');
    });
    it('can be listed', function(){
      assert.equal(node.list[0], 'Modulbeschreibung.html');
    });
    it('has node children', function(){
      assert.equal(node.children[0].type, 'url');
    });
    it('is a folder', function(){
      assert(isFolder(node.attrs));
    });
  });

  describe('of a module of type', function(){
    describe('file', function(){
      var node;
      before(function(){
        node = Node.fromModule(course_vss[1].modules[1]);
      });
      it('is not a folder', function(){
        assert(!isFolder(node.attrs));
      });
      it('opens a file descriptor on the downloaded file', function(done){
        var content = "Friendly little demo text.\n";
        nock('https://moodle.hsr.ch').get(/.*/)
        .reply(200, content);
        node.open({token: 'FOO'}).then(function(fd){
          var buf = new Buffer(content.length, 'utf8');
          fs.read(fd, buf, 0, buf.length);
          assert.equal(buf, content);
          done();
        }).catch(done);
      });
      it('open throws if file can\'t be acquired', function(done){
        nock('https://moodle.hsr.ch').get(/.*/)
        .reply(200, {
          "error":"Ungültiges Token - Token wurde nicht gefunden",
          "stacktrace":null,
          "debuginfo":null,
          "reproductionlink":null
        });
        node.open({token: 'FOO'}).then(function(){
          done(new Error('Should have thrown!'));
        }).catch(function(){ done(); });
      });
    });

    describe('url', function(){
      var node;
      before(function(){
        node = Node.fromModule(course_vss[0].modules[0]);
      });
      it('has the correct type', function(){
        assert.equal(node.type, 'url');
      });
      it('is not a folder', function(){
        assert(!isFolder(node.attrs));
      });
      it('opens a file descriptor containing the correct url', function(done){
        node.open().then(function(fd){
          var buf = new Buffer(node.attrs.size);
          fs.readSync(fd, buf, 0, buf.length);
          assert(buf.indexOf("http://studien.hsr.ch/allModules/27164_M_Vss.html") > -1);
          done();
        }).catch(done);
      });
    });

    describe('folder', function(){
      it('has the correct type', function(){
        assert.equal(node.type, 'folder');
      });
      it('can be listed', function(){
      });
      it('is a folder', function(){
      });
    });

    describe('unsupported', function(){
      var node;
      before(function(){
        node = Node.fromModule(course_vss[0].modules[2]);
      });
      it('has the correct type', function(){
        assert.equal(node.type, 'unsupported');
      });
      it('cannot be accessed', function(){
        assert.equal(0, node.attrs.mode);
      });
    });

  });
});
