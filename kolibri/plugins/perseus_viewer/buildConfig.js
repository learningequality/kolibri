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
    resolve: {
      alias: {
        'KAGlobals': path.resolve(path.join(__dirname, 'assets', 'src', 'KAGlobals')),
        'dist': path.resolve(path.join(__dirname, 'assets', 'dist')),
      },
    },
    plugins: [
      new webpack.ProvidePlugin({
        // 'window.icu': 'KAGlobals/icu',
        Exercises: 'KAGlobals/Exercises',
        Khan: 'KAGlobals/Khan',
        KhanUtil: 'KAGlobals/KhanUtil',
        i18n: 'KAGlobals/i18n',
        $_: 'KAGlobals/$_',
      }),
    ],
  },
};
