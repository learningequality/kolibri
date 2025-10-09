const path = require('node:path');
const enhancedResolve = require('enhanced-resolve');

const extensions = ['.js', '.vue'];

const baseResolver = enhancedResolve.create.sync({ extensions });

let resolver = baseResolver;

const addAliases = function (alias) {
  resolver = enhancedResolve.create.sync({ alias, extensions });
};

const resetAliases = function () {
  resolver = baseResolver;
};

const resolve = (filePath, importPath) => {
  return resolver(path.dirname(filePath), importPath);
};

module.exports = {
  resolve,
  addAliases,
  resetAliases,
};
