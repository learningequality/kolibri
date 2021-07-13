const babelConfig = require('../babel.config');

babelConfig.plugins.push('@babel/plugin-transform-runtime');

module.exports = babelConfig;
