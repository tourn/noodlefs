"use strict";
var redirect = require('./htmlredirect');
var Promise = require('bluebird'); //jshint ignore:line
var fs = Promise.promisifyAll(require('fs'));
var http = require('https');


function makeNode(moodleObject){
  if(moodleObject.type === 'course-list'){
    return fromCourseList(moodleObject);
  }
  if(moodleObject.type === 'course'){
    return fromCourse(moodleObject);
  }
  return null;
  //throw new Error("Cannot make node!");
}

function list(node){
  return node.children.map(function(child){
    return child.name;
  });
}

function fromCourseList(moodleObject){
  var node = {
    name: null,
    type: 'course-list',
    attrs: makeDirAttrs(),
    children: moodleObject.courses.map(function(course){
      return fromCourse(course);
    }),
  };
  node.list = list(node);
  return node;
}

function fromCourse(course){
  var node = {
    name: course.fullname,
    type: 'course',
    attrs: makeDirAttrs(),
    children: course.content.map(function(section){
      return fromSection(section);
    })
  };
  node.list = list(node);
  return node;
}

function fromSection(section){
  var node = {
    name: section.name,
    type: 'section',
    attrs: makeDirAttrs(),
    children: section.modules.map(function(module){
      return fromModule(module);
    })
  };
  node.list = list(node);
  return node;
}

function fromModule(module){
  switch(module.modname){
    case 'url':
      return fromUrl(module);
    //case 'folder':
    //  return fromFolder(module);
    case 'resource':
      return fromFile(module);
    default:
      return fromUnsupported(module);
  }
}

function fromUrl(module){
  var content = module.contents[0];
  if(!content) { throw new Error("Url doesn't seem to have any content"); }
  var filepath = makeTempFilePath();
  var node =  {
    name: module.name + ".html",
    type: 'url',
    attrs: makeFileAttrs(redirect.getSize(content.fileurl), content.timecreated, content.timemodified),
    open: function(){
			return redirect.makeRedirectFile(filepath, content.fileurl).then(function(){
				return fs.openAsync(filepath, 'r');
			});
    }
  };
  return node;
}

function fromFile(module){
  var content = module.contents[0];
  if(!content) { throw new Error("file doesn't seem to have any content"); }
  var filepath = makeTempFilePath();
  var node = {
    name: content.filename,
    type: 'file',
    attrs: makeFileAttrs(content.filesize, content.timecreated, content.timemodified),
    open: function(auth, mockClient){
      var client = mockClient || http;
      var file = fs.createWriteStream(filepath);
      var url = content.fileurl + "&token=" + auth.token;
      //console.log("downloading: " + url);
      return new Promise(function(resolve, reject){
        client.get(url, function(response){
          if(response.headers['content-type'] === 'application/json'){
            //if we get JSON back, it is most likely an error message
            //TODO: get the actual error message and use it for rejection message
            reject(new Error("Downloading file failed!"));
          } else {
            response.pipe(file);
            file.on('finish', function(){
              file.close(function(){
                resolve(fs.openAsync(filepath, 'r'));
              });
            });
          }
        }).on('error', reject);
      });
    }
  };
  return node;
}

function fromUnsupported(module){
  var attrs = makeDirAttrs();
  attrs.size = 0;
  attrs.mode = parseInt('000000', 8);
  return {
    name: module.name + " [" + module.modname + "]",
    type: 'unsupported',
    attrs: attrs
  };
}

function makeTempFilePath(){
  //TODO make folder configurable, make sure folder exists, make sure to wipe folder on start?
  //AND do this someplace else => probably userData?
  return '/tmp/noodletmp/' + Math.random().toString().substr(2);
}



function makeFileAttrs(size, ctime, atime){
  var attrs = makeDirAttrs();
  attrs.size = size;
  attrs.mode = parseInt('000444', 8);
  attrs.ctime = makeDate(ctime);
  attrs.atime = makeDate(atime);
  return attrs;
}

function makeDirAttrs(){
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

var getAttr = function(node){
  var attrs = makeDirAttrs();
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


module.exports = {
  makeNode: makeNode,
  fromCourseList: fromCourseList,
  fromCourse: fromCourse,
  fromSection: fromSection,
  fromModule: fromModule,
};
