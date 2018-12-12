var path = require('path');
var fs = require('fs');
var logging = require('./logging');

var deleteRecursive = function(p) {
  logging.info('Scanning ' + p);
  if (fs.existsSync(p)) {
    if (fs.lstatSync(p).isDirectory()) {
      fs.readdirSync(p).forEach(function(name) {
        deleteRecursive(path.join(p, name));
      });
      logging.info('Removing ' + p);
      fs.rmdirSync(p);
    } else {
      logging.info('Removing ' + p);
      fs.unlinkSync(p);
    }
  }
};

module.exports = function clean(plugins) {
  plugins.forEach(function(plugin) {
    deleteRecursive(path.resolve(plugin.static_dir, plugin.name));
    deleteRecursive(path.resolve(plugin.stats_file));
  });
};
