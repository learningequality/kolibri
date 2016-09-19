var recursiveInstall = require('recursive-install');
var readWebpackJson = require('./read_webpack_json');
var path = require('path');
var fs = require('fs');
var shell = require('shelljs')

var plugins = readWebpackJson();
var cwd = path.resolve(process.cwd());

plugins.map(function(plugin) {
  shell.cd(cwd); // make sure to reset current working directory
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
