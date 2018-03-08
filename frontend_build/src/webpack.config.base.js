/*
 * This file defines the base webpack configuration that is shared across both
 * build and testing environments. If you need to add anything to the general
 * webpack config, like adding loaders for different asset types, different
 * preLoaders or Plugins - they should be done here. If you are looking to add
 * dev specific features, please do so in webpack.config.dev.js - if you wish
 * to add test specific features, these can be done in the karma.conf.js.
 *
 * Note:
 *  This file is not called directly by webpack.
 *  It copied once for each plugin by parse_bundle_plugin.js
 *  and used as a template, with additional plugin-specific
 *  modifications made on top. Any entries that require plugin specific
 *  information are added in parse_bundle_plugin.js - such as access to
 *  plugin name, plugin file paths, and version information.
 */

var path = require('path');
var mkdirp = require('mkdirp');
var PrettierFrontendPlugin = require('./prettier-frontend-webpack-plugin');
var ExtractTextPlugin = require('extract-text-webpack-plugin');
// adds custom rules
require('./htmlhint_custom');
var prettierOptions = require('../../.prettier');

var production = process.env.NODE_ENV === 'production';

var base_dir = path.join(__dirname, '..', '..');

var locale_dir = path.join(base_dir, 'kolibri', 'locale');

mkdirp.sync(locale_dir);

var postCSSLoader = {
  loader: 'postcss-loader',
  options: {
    config: { path: path.resolve(__dirname, '../../postcss.config.js') },
    sourceMap: !production,
  },
};

var cssLoader = {
  loader: 'css-loader',
  options: { minimize: production, sourceMap: !production },
};

// for stylus blocks in vue files.
var vueStylusLoaders = [cssLoader, postCSSLoader, 'stylus-loader', 'stylint-loader'];

// for scss blocks in vue files (e.g. Keen-UI files)
var vueSassLoaders = [
  cssLoader,
  postCSSLoader,
  {
    loader: 'sass-loader',
    // prepends these variable override values to every parsed vue SASS block
    options: { data: '@import "~kolibri.styles.keenVars";' },
  },
];

// primary webpack config
module.exports = {
  context: base_dir,
  module: {
    rules: [
      // Linting rules
      {
        test: /\.(vue|js)$/,
        enforce: 'pre',
        use: {
          loader: 'eslint-loader',
          options: {
            failOnError: production,
            emitError: production,
            emitWarning: !production,
            fix: !production,
            configFile: path.resolve(path.join(base_dir, '.eslintrc.js')),
          },
        },
        exclude: /node_modules/,
      },
      {
        test: /\.(vue|html)/,
        enforce: 'pre',
        use: {
          loader: 'htmlhint-loader',
          options: { failOnError: production, emitAs: production ? 'error' : 'warning' },
        },
        exclude: /node_modules/,
      },
      {
        test: /\.styl$/,
        enforce: 'pre',
        loader: 'stylint-loader',
      },
      // Transpilation and code loading rules
      {
        test: /\.vue$/,
        loader: 'vue-loader',
        options: {
          preserveWhitespace: false,
          loaders: {
            stylus: ExtractTextPlugin.extract({
              allChunks: true,
              use: vueStylusLoaders,
            }),
            scss: ExtractTextPlugin.extract({
              allChunks: true,
              use: vueSassLoaders,
            }),
          },
          buble: {
            objectAssign: 'Object.assign',
          },
          // handles <mat-svg/>, <ion-svg/>, <iconic-svg/>, and <file-svg/> svg inlining
          preLoaders: { html: 'svg-icon-inline-loader' },
        },
      },
      {
        test: /\.js$/,
        loader: 'buble-loader',
        exclude: /node_modules\/(?!(keen-ui)\/).*/,
        query: {
          objectAssign: 'Object.assign',
        },
      },
      {
        test: /\.css$/,
        use: ExtractTextPlugin.extract({
          allChunks: true,
          use: [cssLoader, postCSSLoader],
        }),
      },
      {
        test: /\.styl$/,
        use: ExtractTextPlugin.extract({
          allChunks: true,
          use: [cssLoader, postCSSLoader, 'stylus-loader'],
        }),
      },
      {
        test: /\.s[a|c]ss$/,
        use: ExtractTextPlugin.extract({
          allChunks: true,
          use: [cssLoader, postCSSLoader, 'sass-loader'],
        }),
      },
      {
        test: /\.(png|jpe?g|gif|svg)$/,
        use: {
          loader: 'url-loader',
          options: { limit: 10000, name: '[name].[ext]?[hash]' },
        },
      },
      // Use file loader to load font files.
      {
        test: /\.(eot|woff|ttf|woff2)$/,
        use: {
          loader: 'file-loader',
          options: { name: '[name].[ext]?[hash]' },
        },
      },
      // Hack to make the onloadCSS node module properly export-able.
      // Not currently used - we may be able to delete this if we
      // deprecate our custom KolibriModule async css loading functionality.
      {
        test: /fg-loadcss\/src\/onloadCSS/,
        use: 'exports-loader?onloadCSS',
      },
    ],
  },
  plugins: [
    new PrettierFrontendPlugin({
      extensions: ['.js', '.vue'],
      logLevel: 'warn',
      prettierOptions,
    }),
  ],
  resolve: {
    extensions: ['.js', '.vue', '.styl'],
    alias: {},
    modules: [
      // Add resolution paths for modules to allow any plugin to
      // access kolibri/node_modules modules during bundling.
      base_dir,
      path.join(base_dir, 'node_modules'),
    ],
  },
  resolveLoader: {
    // Add resolution paths for loaders to allow any plugin to
    // access kolibri/node_modules loaders during bundling.
    modules: [base_dir, path.join(base_dir, 'node_modules')],
  },
  node: {
    __filename: true,
  },
  stats: 'minimal',
};
