var fs = require("fs");
var path = require("path");

/**
 * The following code is designed to read our apiSpec Javascript, but without having to resolve the
 * requires contained therein, which include references to files that are not amenable to a vanilla
 * node js require - however, they are properly handled by our webpack build process.
 */

// Find the API specification file relative to this file.
var specFilePath = path.resolve(path.join(__dirname, '../../kolibri/core/assets/src/core-app/apiSpec.js'))

// Read the spec file and do a regex replace to change all instances of 'require('...')'
// to just be the string of the require path.
// Our strict linting rules should ensure that this regex suffices.
var apiSpecFile = fs.readFileSync(specFilePath, 'utf-8').replace(/require\(('\S+')\)/g, '$1');

// Invoke the module constructor to compile a module from this altered representation.
var Module = module.constructor;
var m = new Module(specFilePath, module.parent);
m._compile(apiSpecFile, specFilePath);

// Tada! The apiSpec object is now exported without doing any of the internal requires.
var apiSpec = m.exports.apiSpec;
var keys = m.exports.keys;

function requireName(pathArray) {
  return ['kolibri'].concat(pathArray.slice(1)).join('/')
}

function coreExternals(kolibri_name) {
  /*
   * Function for creating a hash of externals for modules that are exposed on the core kolibri object.
   */
  var externalsObj = {
    kolibri: kolibri_name
  };
  function recurseObjectKeysAndExternalize(obj, pathArray) {
    Object.keys(obj).forEach(function (key) {
      if (keys.indexOf(key) === -1) {
        recurseObjectKeysAndExternalize(obj[key], pathArray.concat(key));
      }
    });
    // By checking path.length is greater than 1, we ignore 'module' in
    // the top namespace, as, logically, that would overwrite the global object.
    if (pathArray.length > 1 && obj.module) {
      externalsObj[obj.module.indexOf('.') === 0 ? requireName(pathArray) : obj.module] = pathArray.join('.');
    }
  };
  recurseObjectKeysAndExternalize(apiSpec, [kolibri_name]);
  return externalsObj;
}

function coreAliases() {
  /*
   * Function for creating a hash of aliases for modules that are exposed on the core kolibri object.
   */
  var aliasesObj = {};
  function recurseObjectKeysAndAlias (obj, pathArray) {
    Object.keys(obj).forEach(function (key) {
      if (keys.indexOf(key) === -1 && obj[key] && typeof obj[key] === 'object') {
        recurseObjectKeysAndAlias(obj[key], pathArray.concat(key));
      }
    });
    // By checking path.length is greater than 1, we ignore 'module' in
    // the top namespace, as, logically, that would overwrite the global object.
    // We only want to include modules that are using relative imports, so as to exclude
    // modules that are already in node_modules.
    if (pathArray.length > 1 && obj.module && obj.module.indexOf('.') === 0) {
      // Map from the requireName to a resolved path (relative to the apiSpecFile) to the module in question.
      aliasesObj[requireName(pathArray)] = path.resolve(path.join(path.dirname(specFilePath), obj.module));
    }
  };
  recurseObjectKeysAndAlias(apiSpec, ['kolibri']);
  return aliasesObj;
}

module.exports = {
  coreExternals: coreExternals,
  coreAliases: coreAliases
}
