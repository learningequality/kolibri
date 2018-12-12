const babelJest = require('babel-jest');
const babelConfig = require('../.babelrc.js');

module.exports = babelJest.createTransformer(babelConfig);
