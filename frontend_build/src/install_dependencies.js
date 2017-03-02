var readWebpackJson = require('./read_webpack_json');
var path = require('path');
var fs = require('fs');
var shell = require('shelljs')

var plugins = readWebpackJson();
var cwd = path.resolve(process.cwd());

function yarnInstall (dir) {
  shell.cd(dir)
  console.log('Installing ' + dir + '/package.json...')
  var result = shell.exec('yarn install')
  console.log('')

  return {
    dirname: dir,
    exitCode: result.code
  }
}

plugins.map(function(plugin) {
  shell.cd(cwd); // make sure to reset current working directory
  var packageJson = path.join(plugin.plugin_path, 'package.json');
  try {
    fs.lstatSync(packageJson);
    return yarnInstall(plugin.plugin_path);
  } catch (e) {
    return {
      exitCode: 0
    };
  }
}).reduce(function (code, result) {
  return result.exitCode > code ? result.exitCode : code;
}, 0);
