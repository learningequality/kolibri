/* eslint-disable import-x/no-commonjs, import-x/no-amd, import-x/no-import-module-exports */
const path = require('node:path');
const fs = require('node:fs');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');

function Plugin() {}

Plugin.prototype.apply = function (compiler) {
  if (compiler.hooks) {
    compiler.hooks.afterEmit.tap('H5PHashWriterPlugin', function (compilation) {
      if (compilation.errors.length > 0) {
        return;
      }
      // Find the actual emitted HTML file from compilation assets
      const htmlFile = Object.keys(compilation.assets).find(name => name.endsWith('.html'));
      if (htmlFile) {
        var outputFilename = path.resolve(__dirname, './h5p_build.json');
        fs.writeFileSync(outputFilename, JSON.stringify({ filename: htmlFile }));
      }
    });
  }
};

module.exports = {
  entry: path.resolve(__dirname, './src/h5pBundle.js'),
  output: {
    filename: 'h5p-[contenthash].js',
    path: path.resolve(__dirname, '../../kolibri/core/content/static/h5p'),
  },
  mode: 'production',
  module: {
    rules: [
      {
        test: /\.js$/,
        loader: 'babel-loader',
        exclude: [
          // From: https://webpack.js.org/loaders/babel-loader/#exclude-libraries-that-should-not-be-transpiled
          // \\ for Windows, / for macOS and Linux
          /node_modules[\\/]core-js/,
          /node_modules[\\/]webpack[\\/]buildin/,
        ],
      },
      {
        test: /\.css$/,
        use: [
          MiniCssExtractPlugin.loader,
          {
            loader: 'css-loader',
            options: { sourceMap: false },
          },
        ],
      },
      {
        test: /\.(png|jpe?g|gif|svg|eot|woff|ttf|woff2)$/,
        type: 'asset',
        generator: {
          filename: '[name]-[contenthash][ext]',
        },
        parser: {
          dataUrlCondition: {
            maxSize: 10000,
          },
        },
      },
    ],
  },
  optimization: {
    moduleIds: 'deterministic',
    chunkIds: 'deterministic',
    minimizer: [
      new TerserPlugin({
        parallel: true,
        terserOptions: {
          mangle: false,
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
      filename: 'h5p-[contenthash].html',
      template: 'src/h5p.html',
      minify: {
        collapseWhitespace: true,
        keepClosingSlash: true,
        removeComments: true,
        removeRedundantAttributes: true,
        removeScriptTypeAttributes: true,
        removeStyleLinkTypeAttributes: true,
        useShortDoctype: true,
        minifyJS: true,
        minifyCSS: true,
      },
    }),
    new MiniCssExtractPlugin({
      filename: 'h5p-[contenthash].css',
      chunkFilename: 'h5p-[contenthash]-[id].css',
    }),
  ],
};
