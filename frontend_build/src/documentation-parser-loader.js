
const fs = require('fs');
const vuedoc = require('@vuedoc/parser');
var path = require('path');
var mkdirp = require('mkdirp');

module.exports = function(content) {

	var callback = this.async();
	//if(!callback) return someSyncOperation(content);

	const options = {
	  filename: path.resolve(path.join(__dirname, '..', '..', 'kolibri', 'core', 'assets', 'src', 
	  	'views', 'textbox', 'index.vue')),
	  sourceType: 'script',
    }

  	var component = "textbox";
  	var dirToWriteTo = path.join(__dirname, '..', 'tmp');
    // Make sure the directory we are using exists.
    mkdirp.sync(dirToWriteTo);
    var fileToWriteTo = path.join(dirToWriteTo, component + '.json');

    var json;
    vuedoc.parse(options)
      .then((component) => { 
      	json = JSON.stringify(component);
      	fs.writeFileSync(fileToWriteTo, json);
      	callback(null, `module.exports = ${json}; `);
      })
      .catch((err) => { 
      	callback(err);
       });
};
