const vuedoc = require('@vuedoc/parser');
const path = require('path');
const mkdirp = require('mkdirp');

module.exports = function(content) {

  var callback = this.async();

  console.error(content);
  
  const options = {
    filecontent: content
  }

  var json;
  vuedoc.parse(options)
    .then((component) => { 
      json = JSON.stringify(component);
      console.log(json);
      callback(null, `module.exports = ${json}; `);
    })
    .catch((err) => { 
      callback(err);
     });
};
