"use strict";

function Course(course){
  var root = course;
  this.type = 'course';

  this.getPath = function(path){
    if(path.length === 0) {
      return root;
    } else {
      if(!(path instanceof Array)){
        path = path.split("/");
      }
      return getNode(root, path);
    }
  };

  this.list = function(node){
    console.log("calling list with: " + node);
    if(node===undefined){
      return root.map(function(child){
        return getNodeName(child);
      });
    } else {
      return getNodeChildren(node).map(function(child){
        return getNodeName(child);
      });
    }
  };

  function getNode(parent, path){
    var name = path.shift();
    console.log(">>get node _" + name + "_");
    var node = parent.find(function(e){
      return getNodeName(e) === name;
    });
    if(!node){
      throw new Error("not found! had:" + parent.map(function(e){ return getNodeName(e); }));
    }
    if(path.length > 0){
      return getNode(getNodeChildren(node), path);
    } else {
      return node;
    }
  }

}

function getNodeName(node){
  return node.name || node.filename;
}

function getNodeChildren(node){
  return node.modules || node.contents;
}

module.exports = Course;

