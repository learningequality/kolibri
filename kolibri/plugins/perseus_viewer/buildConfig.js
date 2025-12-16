/*
 * This file defines additional webpack configuration for this plugin.
 * It will be bundled into the webpack configuration at build time.
 */
var webpack = require('webpack');

module.exports = {
  bundle_id: 'main',
  webpack_config: {
    entry: 'frontend/module.js',
    plugins: [
      new webpack.NormalModuleReplacementPlugin(
        /react\/jsx-runtime/,
        require.resolve('react/jsx-runtime.js'),
      ),
    ],
  },
};
