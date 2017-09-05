var vuedoc = require('@vuedoc/parser');
var path = require('path');
var mkdirp = require('mkdirp');

/**
 * Loader that extracts the props, events, slots and methods from a Vue component
 * file.
 * Uses a Kolibri fork of @vuedoc/parser.
 */
module.exports = function(content) {

  var callback = this.async();

  var options = {
    filecontent: content,
    defaultMethodVisibility: 'private'
  }

  var json;
  vuedoc.parse(options)
    .then((component) => {
      json = JSON.stringify(component);
      callback(null, `export default ${json}; `);
    })
    .catch((err) => {
      callback(err);
     });
};
