"use strict";

function Course(course){
  var root = course;

  this.getPath = function(path){
    return getNode(root, path.split("/"));
  };

  this.list = function(node){
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
    console.log(">>get node " + name);
    var node = parent.find(function(e){
      return getNodeName(e) === name;
    });
    if(!node){
      throw new Error("not found!");
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

