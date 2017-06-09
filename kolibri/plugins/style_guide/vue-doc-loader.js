const vuedoc = require('@vuedoc/parser');
const path = require('path');
const mkdirp = require('mkdirp');

module.exports = function(content) {

  var callback = this.async();
  
  const options = {
    filecontent: content
  }

  var json;
  vuedoc.parse(options)
    .then((component) => { 
      json = JSON.stringify(component);
      callback(null, `module.exports = ${json}; `);
    })
    .catch((err) => { 
      callback(err);
     });
};
