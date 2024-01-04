/*
 * This file defines additional webpack configuration for this plugin.
 * It will be bundled into the webpack configuration at build time.
 */
var path = require('path');
var webpack = require('webpack');

module.exports = {
  bundle_id: 'main',
  webpack_config: {
    entry: 'assets/src/module.js',
    plugins: [
      new webpack.NormalModuleReplacementPlugin(
        /@khanacademy\/wonder-blocks-i18n/,
        path.resolve(path.join(__dirname, 'assets', 'src', 'i18n.js'))
      ),
    ],
  },
};
