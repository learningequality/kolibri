/*
 * This file defines the base webpack configuration that is shared across both
 * build and testing environments. If you need to add anything to the general
 * webpack config, like adding loaders for different asset types, different
 * preLoaders or Plugins - they should be done here. If you are looking to add
 * dev specific features, please do so in webpackdevserver.js - if you wish
 * to add test specific features.
 */

const path = require('node:path');
const webpack = require('webpack');
const { merge } = require('webpack-merge');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const BundleTracker = require('./webpackBundleTracker');
const baseConfig = require('./webpack.config.base');
const logging = require('./logging');
const { coreExternals } = require('./apiSpecExportTools');
const WebpackRTLPlugin = require('./webpackRtlPlugin');
const { kolibriName } = require('./kolibriName');
const WebpackMessages = require('./webpackMessages');
const MessageRegistrationPlugin = require('./webpackMessageRegistrationPlugin');

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
 * @param {Number} port - port that the dev server is served on
 * @param {string} address - address that the dev server is served on
 * @param {boolean} setDevServerPublicPath - whether to set the public path for the dev server
 * @returns {Object} bundle - An object defining the webpack config.
 */
module.exports = (
  data,
  {
    mode = 'development',
    hot = false,
    port = 3000,
    address = 'localhost',
    cache = false,
    transpile = false,
    devServer = false,
    kdsPath = '',
    setDevServerPublicPath = true,
  } = {},
) => {
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

  const isCoreBundle = webpackConfig.output && webpackConfig.output.library === kolibriName;

  // If this is not the core bundle, then we need to add the external library mappings.
  const externals = isCoreBundle ? {} : coreExternals;

  const alias = {};
  if (kdsPath) {
    alias['kolibri-design-system'] = path.resolve(kdsPath);
    cache = false;
  }
  let bundle = {
    externals,
    name: data.name,
    mode,
    output: {
      path: path.resolve(path.join(data.static_dir, data.name)),
      filename: '[name]-' + data.version + '.js',
      // Need to define this in order for chunks to be named
      // Without this chunks from different bundles will likely have colliding names
      chunkFilename: data.name + '-[name]-' + data.version + '.js',
      // c.f. https://webpack.js.org/configuration/output/#outputchunkloadingglobal
      // Without this namespacing, there is a possibility that chunks from different
      // plugins could conflict in the global chunk namespace.
      // Replace any '.' in the name as unclear from documentation whether
      // webpack properly handles that or not.
      chunkLoadingGlobal: 'webpackChunkwebpack__' + data.name.replace('.', ''),
      scriptType: 'text/javascript',
      pathinfo: false,
      publicPath: 'auto',
    },
    resolve: {
      alias,
      modules: [
        // Add local resolution paths
        path.join(data.plugin_path, 'node_modules'),
        path.join(process.cwd(), 'node_modules'),
      ],
    },
    resolveLoader: {
      modules: [
        // Add local resolution paths for loaders
        path.join(data.plugin_path, 'node_modules'),
        path.join(process.cwd(), 'node_modules'),
      ],
    },
    plugins: [
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
        filename: data.stats_file,
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
      // Inject code to register frontend messages
      new MessageRegistrationPlugin({
        // For the core plugin, because it sets up the i18n
        // machinery, we need to inject the registration code
        // afterwards to avoid a kerfuffle.
        injectAfterBundle: isCoreBundle,
        moduleName: data.name,
      }),
      // Add custom messages per bundle.
      new WebpackMessages({
        name: data.name,
        logger: str => logging.info(str),
      }),
    ],
  };

  if (isCoreBundle && mode === 'production') {
    bundle.plugins.push(
      // requires >= v3.0.0, which is specified in the kolibri package
      new webpack.NormalModuleReplacementPlugin(/^vue-intl$/, 'vue-intl/dist/vue-intl.prod.min.js'),
    );
  }

  if (isCoreBundle) {
    bundle.plugins.push(
      // I thought we would be able to stop doing this once we dropped @vue/composition-api
      // and upgraded to Vue 2.7 - but apparently this janky aliasing was _so_ good it was put
      // into Vue 2.7 too!
      // We need to do this to sidestep the janky vue main export dist/vue.runtime.common.js which
      // conditionally imports the prod or dev version of the package based on the NODE_ENV, but
      // only exposes the common JS builds, and reassigns them to the module.exports, thereby
      // preventing webpack from importing it consistently in both how we use it internally
      // in the core bundle, and also then access it via externals in the plugin bundles.
      new webpack.NormalModuleReplacementPlugin(
        /^vue$/,
        mode === 'production'
          ? 'vue/dist/vue.runtime.common.prod.js'
          : 'vue/dist/vue.runtime.common.dev.js',
      ),
    );
  }

  bundle = merge(bundle, baseConfig({ mode, hot, cache, transpile }), webpackConfig);

  if (devServer) {
    if (setDevServerPublicPath) {
      const publicPath = `http://${address}:${port}/${data.name}/`;
      bundle.output.publicPath = publicPath;
    }
    bundle.watch = true;
    bundle.watchOptions = {
      aggregateTimeout: 300,
    };
  }

  if (cache) {
    bundle.cache.buildDependencies.config.push(__filename, data.config_path);
  }

  return bundle;
};
