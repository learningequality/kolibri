var webpack = require('webpack');
var bundles = require('./webpack.config.js');

for (var i=0; i < bundles.length; i++) {
    bundles[i].devtools = '#inline-source-map';
}

module.exports = bundles;
