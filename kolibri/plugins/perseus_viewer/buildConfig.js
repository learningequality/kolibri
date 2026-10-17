/*
 * This file defines additional webpack configuration for this plugin.
 * It will be bundled into the webpack configuration at build time.
 */
var path = require('path');
var webpack = require('webpack');

var mathjaxFontsSource = path.join(
  path.dirname(require.resolve('mathjax-full/package.json')),
  'ts/output/chtml/fonts/tex-woff-v2',
);

module.exports = {
  bundle_id: 'main',
  webpack_config: {
    entry: 'frontend/module.js',
    resolve: {
      alias: {
        // Alias for MathJax fonts so the Perseus CDN URL rewriter can
        // reference them via ~mathjax-fonts/... in CSS.
        'mathjax-fonts': mathjaxFontsSource,
      },
      fallback: {
        stream: require.resolve('web-streams-polyfill/es5'),
      },
    },
    module: {
      rules: [
        {
          // Rewrite the KA CDN font URL in Perseus CSS to our local copy.
          // Runs as a pre-loader before css-loader processes url() refs.
          test: /@khanacademy[/\\]perseus[/\\]dist[/\\]index\.css$/,
          enforce: 'pre',
          use: [
            path.resolve(__dirname, 'rewritePerseusUrls.js'),
            path.resolve(__dirname, 'rewritePerseusRem.js'),
          ],
        },
        {
          // Rewrite the KA CDN protractor image URL in Perseus JS to a
          // bundled local copy so it works offline.
          test: /@khanacademy[/\\]perseus[/\\]dist[/\\](?:es[/\\])?index\.js$/,
          enforce: 'pre',
          loader: path.resolve(__dirname, 'rewritePerseusProtractor.js'),
        },
        {
          // Convert rem→px in Wonder Blocks design tokens CSS.
          // These tokens assume 1rem = 10px (KA's root font-size convention).
          test: /@khanacademy[/\\]wonder-blocks-tokens[/\\].*\.css$/,
          enforce: 'pre',
          loader: path.resolve(__dirname, 'rewritePerseusRem.js'),
        },
        {
          // Convert rem→px in math-input CSS (same KA rem convention).
          test: /@khanacademy[/\\]math-input[/\\].*\.css$/,
          enforce: 'pre',
          loader: path.resolve(__dirname, 'rewritePerseusRem.js'),
        },
      ],
    },
    plugins: [
      new webpack.NormalModuleReplacementPlugin(
        /react\/jsx-runtime/,
        require.resolve('react/jsx-runtime'),
      ),
      // Wonder Blocks components import from react-router-dom-v5-compat,
      // which re-exports from react-router@6. The Perseus plugin only has
      // react-router@5, so the v6 APIs (useInRouterContext, useNavigate)
      // are undefined. Replace with a shim that returns "no router" so
      // Wonder Blocks falls back to plain <a> tags.
      new webpack.NormalModuleReplacementPlugin(
        /react-router-dom-v5-compat/,
        path.resolve(__dirname, 'frontend', 'reactRouterShim.js'),
      ),
    ],
  },
};
