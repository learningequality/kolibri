/*
 * This file defines additional webpack configuration for this plugin.
 * It will be bundled into the webpack configuration at build time.
 */
var fs = require('fs');
var path = require('path');
var webpack = require('webpack');

// mathjax-full is a transitive dependency of @khanacademy/mathjax-renderer
// and lives as a sibling in pnpm's virtual store.
var mathjaxRendererDir = path.dirname(
  require.resolve('@khanacademy/mathjax-renderer/package.json'),
);
var mathjaxFontsSource = path.join(
  mathjaxRendererDir,
  '../../mathjax-full/ts/output/chtml/fonts/tex-woff-v2',
);
var mathjaxFontsTarget = path.resolve(__dirname, 'static/assets/mathjax/fonts');

// Copy MathJax fonts into the plugin's static assets directory before each
// build. Django serves them at runtime via urls.static('assets/mathjax/fonts'),
// and MathJaxRenderer fetches them by bare filename, so they must keep their
// original names. The target directory is gitignored.
function copyMathJaxFonts() {
  fs.mkdirSync(mathjaxFontsTarget, { recursive: true });
  for (const file of fs.readdirSync(mathjaxFontsSource)) {
    if (!file.endsWith('.woff')) continue;
    fs.copyFileSync(
      path.join(mathjaxFontsSource, file),
      path.join(mathjaxFontsTarget, file),
    );
  }
}

class CopyMathJaxFontsPlugin {
  apply(compiler) {
    const run = (_, cb) => {
      try {
        copyMathJaxFonts();
        cb();
      } catch (err) {
        cb(err);
      }
    };
    compiler.hooks.beforeRun.tapAsync('CopyMathJaxFontsPlugin', run);
    compiler.hooks.watchRun.tapAsync('CopyMathJaxFontsPlugin', run);
  }
}

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
      new CopyMathJaxFontsPlugin(),
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
