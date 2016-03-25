"use strict";
var assert = require('assert');
var redirect = require('../htmlredirect');
var fs = require('fs');

describe("Html redirect", function(){
  var path = '/tmp/redirtest';
  var url = 'http://example.com';

  it('creates a file with the correct url', function(done){
    redirect.makeRedirectFile(path, url).then(function(){
      var content = fs.readFileSync(path, 'utf8');
      assert.ok(content);
      assert(content.indexOf(url) > -1);
      done();
    });
  });

  it('calculates the correct output file size', function(done){
    redirect.makeRedirectFile(path, url).then(function(){
      var size = fs.statSync(path).size;
      assert.equal(size, redirect.getSize(url));
      done();
    });
  });

  afterEach(function(){
    try {
      //fs.unlinkSync(path);
    } catch(e) {
      //works for me
    }
  });

});
