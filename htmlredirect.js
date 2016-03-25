"use strict";
var Promise = require('bluebird'); //jshint ignore:line
var fs = Promise.promisifyAll(require('fs'));

var source = '<!DOCTYPE HTML>' +
'<html lang="en-US">' +
    '<head>' +
        '<meta charset="UTF-8">' +
        '<meta http-equiv="refresh" content="1;url={}">' +
        '<script type="text/javascript">' +
            'window.location.href = "{}"' +
        '</script>' +
        '<title>Page Redirection</title>' +
    '</head>' +
    '<body>' +
        'If you are not redirected automatically, follow this <a href="{}">link</a>' +
    '</body>' +
'</html>';

var sourceLength = source.length - 6; // minus the placeholders


module.exports = {
  makeRedirectFile: function (path, url){
    var content = source.replace(/{}/g, url);
    return fs.writeFileAsync(path, content);
  },
  getSize: function(url){
    return sourceLength + 3*url.length;
  }
};
