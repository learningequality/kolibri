/* eslint-disable import-x/no-commonjs, import-x/no-amd, import-x/no-import-module-exports */
const path = require('node:path');
const fs = require('node:fs');
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');

function Plugin() {}

Plugin.prototype.apply = function (compiler) {
  if (compiler.hooks) {
    compiler.hooks.compilation.tap('SandboxHashWriterPlugin', function (compilation) {
      if (compilation.errors.length > 0) {
        return;
      }

      HtmlWebpackPlugin.getHooks(compilation).afterEmit.tapAsync(
        'SandboxWritePlugin',
        (data, cb) => {
          var outputFilename = path.resolve(
            __dirname,
            '../../kolibri/core/content/build/sandbox_filename',
          );
          fs.mkdirSync(path.dirname(outputFilename), { recursive: true });

          fs.writeFileSync(outputFilename, data.outputName);
          // Tell webpack to move on
          cb(null, data);
        },
      );
    });
  }
};

module.exports = (env, argv) => {
  const mode = argv.mode || 'production';
  // Sandbox handlers are served by the webpack dev server in development, so the
  // alternate origin has to be allowed to reach it - including over ws: for hot
  // reload, as http: sources do not match the websocket scheme. Scheme-less host-source,
  // to stay identical to the CSP_DEFAULT_SRC additions in
  // kolibri/deployment/default/settings/dev.py.
  const devServerHost = process.env.WEBPACK_DEV_SERVER_HOST || 'localhost';
  const devServerPort = process.env.WEBPACK_DEV_SERVER_PORT || '3000';
  const devCSP = mode === 'development' ? ` ${devServerHost}:${devServerPort} ws:` : '';

  return {
    entry: path.resolve(__dirname, './src/iframe.js'),
    output: {
      filename: 'sandbox-[contenthash].js',
      chunkFilename: 'sandbox-[name]-[contenthash].bundle.js',
      path: path.resolve(__dirname, '../../kolibri/core/content/static/sandbox'),
    },
    mode,
    module: {
      rules: [
        {
          test: /\.(js|mjs)$/,
          loader: 'babel-loader',
          exclude: [
            // From: https://webpack.js.org/loaders/babel-loader/#exclude-libraries-that-should-not-be-transpiled
            // \\ for Windows, / for macOS and Linux
            /node_modules[\\/]core-js/,
            /node_modules[\\/]webpack[\\/]buildin/,
          ],
          options: {
            // Let babel auto-detect ES vs CommonJS
            sourceType: 'unambiguous',
          },
        },
      ],
    },
    optimization: {
      splitChunks: {
        minChunks: 2,
      },
      minimizer: [
        new TerserPlugin({
          parallel: true,
          terserOptions: {
            mangle: {
              safari10: true,
            },
            safari10: true,
            output: {
              comments: false,
            },
          },
        }),
        new CssMinimizerPlugin({
          minimizerOptions: {
            preset: ['default', { reduceIdents: false, zindex: false }],
          },
        }),
      ],
    },
    plugins: [
      new Plugin(),
      new HtmlWebpackPlugin({
        filename: 'sandbox-[fullhash].html',
        template: 'src/iframe.html',
        templateParameters: {
          devCSP,
        },
      }),
    ],
  };
};
