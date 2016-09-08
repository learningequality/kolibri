/*
 * This exports the API for the core Kolibri app.
 */

const apiSpec = require('./apiSpec').apiSpec;
const keys = require('./apiSpec').keys;


const constructorExport = () => {
  /*
   * Function for building the object that populates the kolibri global object API.
   */
  const exportObj = {};
  const recurseObjectKeysAndImport = (obj, path = []) => {
    Object.keys(obj).forEach((key) => {
      if (keys.indexOf(key) === -1) {
        recurseObjectKeysAndImport(obj[key], path.concat(key));
      }
    });
    // Don't allow privileged keys in the top namespace, as, logically, that would overwrite
    // the global object.
    // Only module matters for actually building the kolibri global object.
    if (path.length && obj.module) {
      // Ensure the path exists in our export object
      // Iterate through each key in 'path', except the last one (the key for our import)
      // to return the nested object that we want to set our key into.
      const subExportObj = path.slice(0, -1).reduce((subobj, key) => {
        // On each step ensure that there is an object at that key.
        subobj[key] = subobj[key] || {};
        // Return that object for the next iteration to allow nesting.
        return subobj[key];
      }, exportObj); // Use exportObj as the initial value
      subExportObj[path.slice(-1)] = obj.module;
    }
  };
  recurseObjectKeysAndImport(apiSpec);
  return exportObj;
};

module.exports = constructorExport;
