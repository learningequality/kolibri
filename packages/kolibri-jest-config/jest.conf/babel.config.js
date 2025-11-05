const babelConfig = require('kolibri-build/babel.config');

babelConfig.plugins.push('@babel/plugin-transform-runtime');

module.exports = babelConfig;
