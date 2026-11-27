/* eslint-disable import-x/no-commonjs, import-x/no-amd, import-x/no-import-module-exports */
const crypto = require('node:crypto');
const fs = require('node:fs');
const buildConfig = require('../../buildConfig');

function preLoaders(filename) {
  return buildConfig.webpack_config.module.rules
    .filter(rule => rule.enforce === 'pre' && rule.test.test(filename))
    .flatMap(rule => (rule.use ? [...rule.use].reverse() : [rule.loader]));
}

module.exports = {
  process(source, filename) {
    return {
      code: preLoaders(filename).reduce((code, loader) => require(loader)(code), source),
    };
  },
  getCacheKey(source, filename, { configString }) {
    const hash = crypto.createHash('sha1').update(source).update(filename).update(configString);
    for (const loader of preLoaders(filename)) {
      hash.update(loader).update(fs.readFileSync(loader));
    }
    return hash.digest('hex');
  },
};
