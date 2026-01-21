const { kolibriName } = require('./kolibriName');

function generateApiKeys(apiSpec, exposes) {
  // Generate a list of all the module imports that we need to expose
  // Iterate over all the exports in the kolibri package
  return (
    Object.keys(apiSpec)
      // Filter out the export for the root package '.' as we don't need to expose that
      // nor the package.json export.
      .filter(key => key !== '.' && key !== './package.json')
      // Add the kolibri prefix and remove the leading '.' to make a full import path
      // e.g. './urls' -> 'kolibri/urls'
      .map(key => 'kolibri' + key.slice(1))
      // Add the list of modules that are exposed in the kolibri package.json
      // Unmodified, as they are already full import paths, e.g. 'vue'
      .concat(exposes)
  );
}

function getCoreExternals() {
  const kolibriPackageJson = require('kolibri/package.json');

  const apiSpec = kolibriPackageJson.exports || {};

  const apiKeys = generateApiKeys(apiSpec, kolibriPackageJson.exposes || []);

  const coreExternals = {
    // The kolibri package itself is a special case, as it is the root of the package
    // and is not required to be imported in the core bundle, as it is the core bundle.
    kolibri: kolibriName,
  };

  for (const key of apiKeys) {
    coreExternals[key] = [kolibriName, key];
  }
  return coreExternals;
}

module.exports = {
  getCoreExternals,
  generateApiKeys,
};
