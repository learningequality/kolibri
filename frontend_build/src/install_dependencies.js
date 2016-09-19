var recursiveInstall = require('recursive-install');
var readWebpackJson = require('./read_webpack_json');
var path = require('path');
var fs = require('fs');

var plugins = readWebpackJson();

plugins.map(function(plugin) {
  var packageJson = path.join(plugin.plugin_path, 'package.json');
  try {
    fs.lstatSync(packageJson);
    return recursiveInstall.npmInstall(plugin.plugin_path);
  } catch (e) {
    return {
      exitCode: 0
    };
  }
}).reduce(function (code, result) {
  return result.exitCode > code ? result.exitCode : code;
}, 0);
