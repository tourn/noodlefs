"use strict";
var redirect = require('./htmlredirect');
var Promise = require('bluebird'); //jshint ignore:line
var fs = Promise.promisifyAll(require('fs'));
var http = require('https');
var userdata = require('./userdata');
var log = require('debug-logger')('noodlefs');

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

function left_pad(string, width, sign){
  sign = sign || '0';
  string = String(string);

  for(var i = string.length; i<width; i++){
    string = sign + string;
  }
  return string;
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
    name: course.name,
    type: 'course',
    attrs: makeDirAttrs(),
    children: course.content.map(function(section, index){
      return fromSection(section, index);
    })
  };
  node.list = list(node);
  return node;
}

function fromSection(section, index){
  var node = {
    name: left_pad(index, 2) + '_' + section.name,
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
    case 'folder':
      return fromFolder(module);
    case 'resource':
      return fromFile(module);
    default:
      return fromUnsupported(module);
  }
}

function fromUrl(module){
  var content = module.contents[0];
  if(!content) { throw new Error("Url doesn't seem to have any content"); }
  var filepath = userdata.makeTempFilePath();
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

function fromFolder(module){
  var node = {
    name: module.name,
    type: 'folder',
    attrs: makeDirAttrs(),
    children: module.contents.map(function(file){
      return fromFileContent(file); //HERHE
    })
  };
  node.list = list(node);
  return node;
}

function fromFile(module){
  var content = module.contents[0];
  if(!content) { throw new Error("file doesn't seem to have any content"); }
  return fromFileContent(content);
}

function fromFileContent(content){
  var filepath = userdata.makeTempFilePath();
  var node = {
    name: content.filename,
    type: 'file',
    attrs: makeFileAttrs(content.filesize, content.timecreated, content.timemodified),
    open: function(auth, mockClient){
      var client = mockClient || http;
      var file = fs.createWriteStream(filepath);
      var url = content.fileurl + "&token=" + auth.token;
      log.debug("downloading: " + url);
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
  attrs.mode = parseInt('100000', 8);
  return {
    name: module.name + " [" + module.modname + "]",
    type: 'unsupported',
    attrs: attrs
  };
}

function makeFileAttrs(size, ctime, atime){
  var attrs = makeDirAttrs();
  attrs.size = size;
  attrs.mode = parseInt('100444', 8);
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

module.exports = {
  makeNode: makeNode,
  fromCourseList: fromCourseList,
  fromCourse: fromCourse,
  fromSection: fromSection,
  fromModule: fromModule,
};
