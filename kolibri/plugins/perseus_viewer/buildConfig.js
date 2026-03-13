/*
 * This file defines additional webpack configuration for this plugin.
 * It will be bundled into the webpack configuration at build time.
 */
var path = require('path');
var webpack = require('webpack');

module.exports = {
  bundle_id: 'main',
  webpack_config: {
    entry: 'frontend/module.js',
    resolve: {
      alias: {
        // Alias for MathJax fonts so the Perseus CDN URL rewriter can
        // reference them via ~mathjax-fonts/... in CSS.
        'mathjax-fonts': path.resolve(__dirname, 'static/assets/mathjax/fonts'),
      },
    },
    module: {
      rules: [
        {
          // Rewrite the KA CDN font URL in Perseus CSS to our local copy.
          // The font is copied from mathjax-full by buildPerseus.js.
          // Runs as a pre-loader before css-loader processes url() refs.
          test: /@khanacademy[/\\]perseus[/\\]dist[/\\]index\.css$/,
          enforce: 'pre',
          loader: path.resolve(__dirname, 'rewritePerseusUrls.js'),
        },
      ],
    },
    plugins: [
      new webpack.NormalModuleReplacementPlugin(
        /react\/jsx-runtime/,
        require.resolve('react/jsx-runtime'),
      ),
    ],
  },
};
