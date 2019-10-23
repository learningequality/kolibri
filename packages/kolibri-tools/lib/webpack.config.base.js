/*
 * This file defines the base webpack configuration that is shared across both
 * build and testing environments. If you need to add anything to the general
 * webpack config, like adding loaders for different asset types, different
 * preLoaders or Plugins - they should be done here. If you are looking to add
 * dev specific features, please do so in webpackdevserver.js - if you wish
 * to add test specific features.
 */

const path = require('path');
const BundleTracker = require('webpack-bundle-tracker');
const webpack = require('webpack');
const merge = require('webpack-merge');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const WebpackRTLPlugin = require('webpack-rtl-plugin');
const OptimizeCSSAssetsPlugin = require('optimize-css-assets-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const { VueLoaderPlugin } = require('vue-loader');
const ExtractStrings = require('./ExtractStrings');
const logging = require('./logging');
const coreExternals = require('./apiSpecExportTools').coreExternals();
const coreAliases = require('./apiSpecExportTools').coreAliases();
const { kolibriName } = require('./kolibriName');
const WebpackMessages = require('./webpackMessages');

/**
 * Turn an object containing the vital information for a frontend plugin and return a bundle
 * configuration for webpack.
 * @param {Object} data - An object that contains the data for configuring the bundle.
 * @param {string} data.config - Injected webpack configuration for this bundle.
 * @param {string} data.name - The name that the plugin is referred to by.
 * @param {string} data.static_dir - Directory path to the module in which the plugin is defined.
 * @param {string} data.stats_file - The name of the webpack bundle stats file that the plugin data
 * @param {string} mode - The webpack mode to set for the configuration
 * @param {boolean} hot - Activate hot module reloading
 * @returns {Object} bundle - An object defining the webpack config.
 */
module.exports = (data, { mode = 'development', hot = false } = {}) => {
  if (
    typeof data.name === 'undefined' ||
    typeof data.bundle_id === 'undefined' ||
    typeof data.config_path === 'undefined' ||
    typeof data.static_dir === 'undefined' ||
    typeof data.stats_file === 'undefined' ||
    typeof data.locale_data_folder === 'undefined' ||
    typeof data.plugin_path === 'undefined' ||
    typeof data.version === 'undefined'
  ) {
    logging.error(data.name + ' plugin is misconfigured, missing parameter(s)');
    return;
  }
  const configData = require(data.config_path);
  let webpackConfig;
  if (data.index !== null) {
    webpackConfig = configData[data.index].webpack_config;
  } else {
    webpackConfig = configData.webpack_config;
  }
  if (typeof webpackConfig.entry === 'string') {
    webpackConfig.entry = {
      [data.name]: path.join(data.plugin_path, webpackConfig.entry),
    };
  } else {
    Object.keys(webpackConfig.entry).forEach(key => {
      function makePathAbsolute(entryPath) {
        if (entryPath.startsWith('./') || entryPath.startsWith('../')) {
          return path.join(data.plugin_path, entryPath);
        }
        return entryPath;
      }
      if (Array.isArray(webpackConfig.entry[key])) {
        webpackConfig.entry[key] = webpackConfig.entry[key].map(makePathAbsolute);
      } else {
        webpackConfig.entry[key] = makePathAbsolute(webpackConfig.entry[key]);
      }
      if (key === data.bundle_id) {
        webpackConfig.entry[data.name] = webpackConfig.entry[key];
        delete webpackConfig.entry[key];
      }
    });
  }
  const production = mode === 'production';

  const cssInsertionLoader = hot ? 'style-loader' : MiniCssExtractPlugin.loader;

  const base_dir = path.join(__dirname, '..');

  const postCSSLoader = {
    loader: 'postcss-loader',
    options: {
      config: { path: path.resolve(__dirname, '../postcss.config.js') },
      sourceMap: !production,
    },
  };

  const cssLoader = {
    loader: 'css-loader',
    options: { minimize: production, sourceMap: !production },
  };

  // for scss blocks
  const sassLoaders = [
    cssInsertionLoader,
    cssLoader,
    postCSSLoader,
    {
      loader: 'sass-loader',
      // prepends these variable override values to every parsed vue SASS block
      options: { data: '@import "~kolibri.styles.keenVars";' },
    },
  ];

  let externals;

  if (!webpackConfig.output || webpackConfig.output.library !== kolibriName) {
    // If this is not the core bundle, then we need to add the external library mappings.
    externals = coreExternals;
  } else {
    externals = { kolibri: kolibriName };
  }

  let bundle = {
    externals,
    name: data.name,
    mode,
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
          exclude: /node_modules\/vue/,
        },
        {
          test: /\.css$/,
          use: [cssInsertionLoader, cssLoader, postCSSLoader],
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
      ],
    },
    node: {
      __filename: true,
    },
    optimization: {
      minimizer: [
        new TerserPlugin({
          cache: true,
          parallel: true,
          sourceMap: true,
          terserOptions: {
            mangle: false,
            safari10: true,
            output: {
              comments: false,
            },
          },
        }),
        new OptimizeCSSAssetsPlugin({
          cssProcessorPluginOptions: {
            preset: ['default', { reduceIdents: false, zindex: false }],
          },
        }),
      ],
    },
    output: {
      path: path.resolve(path.join(data.static_dir, data.name)),
      filename: '[name]-' + data.version + '.js',
      // Need to define this in order for chunks to be named
      // Without this chunks from different bundles will likely have colliding names
      chunkFilename: data.name + '-[name]-' + data.version + '.js',
      // c.f. https://webpack.js.org/configuration/output/#outputjsonpfunction
      // Without this namespacing, there is a possibility that chunks from different
      // plugins could conflict in the global chunk namespace.
      // Replace any '.' in the name as unclear from documentation whether
      // webpack properly handles that or not.
      jsonpFunction: 'webpackJsonp__' + data.name.replace('.', ''),
    },
    resolve: {
      extensions: ['.js', '.vue', '.scss'],
      alias: coreAliases,
      modules: [
        // Add local resolution paths
        path.join(data.plugin_path, 'node_modules'),
        path.join(process.cwd(), 'node_modules'),
        // Add resolution paths for modules to allow any plugin to
        // access kolibri-tools/node_modules modules during bundling.
        base_dir,
        path.join(base_dir, 'node_modules'),
      ],
    },
    resolveLoader: {
      modules: [
        // Add local resolution paths for loaders
        path.join(data.plugin_path, 'node_modules'),
        path.join(process.cwd(), 'node_modules'),
        // Add resolution paths for loaders to allow any plugin to
        // access kolibri-tools/node_modules loaders during bundling.
        base_dir,
        path.join(base_dir, 'node_modules'),
      ],
    },
    plugins: [
      new VueLoaderPlugin(),
      new MiniCssExtractPlugin({
        filename: '[name]' + data.version + '.css',
        chunkFilename: '[name]' + data.version + '[id].css',
      }),
      new WebpackRTLPlugin({
        minify: false,
      }),
      // BundleTracker creates stats about our built files which we can then pass to Django to
      // allow our template tags to load the correct frontend files.
      new BundleTracker({
        path: path.dirname(data.stats_file),
        filename: path.basename(data.stats_file),
      }),
      // Plugins know their own name, by having a variable that we define here, based on the name
      // they are given in kolibri_plugins.py inside their relevant module.
      // Also define the current plugin version (for kolibri plugins bundled with kolibri, this is
      // the kolibri version).
      // Also add the copyright year for auto updated copyright footers.
      new webpack.DefinePlugin({
        __kolibriModuleName: JSON.stringify(data.name),
        __version: JSON.stringify(data.version),
        __copyrightYear: new Date().getFullYear(),
      }),
      new ExtractStrings(data.locale_data_folder, data.name),
      // Add custom messages per bundle.
      new WebpackMessages({
        name: data.name,
        logger: str => logging.info(str),
      }),
    ],
    stats: 'minimal',
  };

  bundle = merge.smart(bundle, webpackConfig);

  return bundle;
};
