const vuedoc = require('@vuedoc/parser');
var path = require('path');
var mkdirp = require('mkdirp');

module.exports = function(content) {

  var callback = this.async();
  //if(!callback) return someSyncOperation(content);

  const options = {
    filename: path.resolve(path.join(__dirname, '..', '..', 'core', 'assets', 'src', 
      'views', 'textbox', 'index.vue')),
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
