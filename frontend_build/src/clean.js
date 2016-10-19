var readWebpackJson = require('./read_webpack_json');
var path = require('path');
var fs = require('fs');
var logging = require('./logging');


var deleteRecursive = function(p) {
  if (fs.existsSync(p)) {
    if (fs.lstatSync(p).isDirectory()) {
      fs.readdirSync(p).forEach(function(name) {
        deleteRecursive(path.join(p, name));
      });
      logging.info("Removing " + p);
      fs.rmdirSync(p);
    } else {
      logging.info("Removing " + p);
      fs.unlinkSync(p);
    }
  }
}

var plugins = readWebpackJson();
var cwd = path.resolve(process.cwd());

plugins.forEach(function(plugin) {
  deleteRecursive(path.join(cwd, plugin.static_dir, plugin.name));
  deleteRecursive(path.join(cwd, plugin.stats_file));
})
