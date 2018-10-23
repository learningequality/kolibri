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
var MiniCssExtractPlugin = require('mini-css-extract-plugin');
var UglifyJsPlugin = require('uglifyjs-webpack-plugin');
var OptimizeCSSAssetsPlugin = require('optimize-css-assets-webpack-plugin');

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

// for scss blocks
var sassLoaders = [
  MiniCssExtractPlugin.loader,
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
      // Preprocessing rules
      {
        test: /\.(html|vue)$/,
        enforce: 'pre',
        // handles <mat-svg/>, <ion-svg/>, <iconic-svg/>, and <file-svg/> svg inlining
        loader: 'svg-icon-inline-loader',
        exclude: /node_modules/,
      },
      // Transpilation and code loading rules
      {
        test: /\.vue$/,
        loader: 'vue-loader',
        options: {
          compilerOptions: {
            preserveWhitespace: false,
          },
        },
      },
      {
        test: /\.js$/,
        loader: 'buble-loader',
        options: {
          objectAssign: 'Object.assign',
        },
      },
      {
        test: /\.css$/,
        use: [MiniCssExtractPlugin.loader, cssLoader, postCSSLoader],
      },
      {
        test: /\.s[a|c]ss$/,
        use: sassLoaders,
      },
      {
        test: /\.(png|jpe?g|gif|svg)$/,
        use: {
          loader: 'url-loader',
          options: { limit: 10000, name: '[name].[ext]?[hash]' },
        },
      },
      // Use url loader to load font files.
      {
        test: /\.(eot|woff|ttf|woff2)$/,
        use: {
          loader: 'url-loader',
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
  optimization: {
    minimizer: [
      new UglifyJsPlugin({
        cache: true,
        parallel: true,
        sourceMap: false,
      }),
      new OptimizeCSSAssetsPlugin({}),
    ],
  },
  plugins: [],
  resolve: {
    extensions: ['.js', '.vue', '.scss'],
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
