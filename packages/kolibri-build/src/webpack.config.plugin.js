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
const logging = require('kolibri-logging');
const BundleTracker = require('./webpackBundleTracker');
const baseConfig = require('./webpack.config.base');
const { getCoreExternals } = require('./apiSpecExportTools');
const WebpackRTLPlugin = require('./webpackRtlPlugin');
const { kolibriName } = require('./kolibriName');
const WebpackMessages = require('./webpackMessages');
const MessageRegistrationPlugin = require('./webpackMessageRegistrationPlugin');
const { createCssInsert } = require('./createCssInsert');

/**
 * Turn an object containing the vital information for a frontend plugin and return a bundle
 * configuration for webpack.
 * @param {object} data - An object that contains the data for configuring the bundle.
 * @param {string} data.config - Injected webpack configuration for this bundle.
 * @param {string} data.name - The name that the plugin is referred to by.
 * @param {string} data.static_dir - Directory path to the module in which the plugin is defined.
 * @param {string} data.stats_file - The name of the webpack bundle stats file that the plugin data.
 * @param {boolean} data.sandbox_handler - Whether this is a sandbox handler bundle.
 * @param {object} [options] - Build options.
 * @param {string} [options.mode] - The webpack mode to set for the configuration.
 * @param {boolean} [options.hot] - Activate hot module reloading.
 * @param {number} [options.port] - Port that the dev server is served on.
 * @param {string} [options.address] - Address that the dev server is served on.
 * @param {boolean} [options.cache] - Whether to enable webpack persistent caching.
 * @param {boolean} [options.transpile] - Whether to transpile sources via Babel.
 * @param {boolean} [options.devServer] - Whether the bundle is being built for the dev server.
 * @param {string} [options.kdsPath] - Path to a local Kolibri Design System checkout to alias.
 * @param {boolean} [options.setDevServerPublicPath] - Whether to set the public path for
 * the dev server.
 * @returns {object|undefined} The webpack bundle configuration, or undefined when `data`
 * is missing required parameters.
 * @throws {Error} When a sandbox handler bundle has no JS transpilation rule to inject
 * polyfills through, or its plugin does not depend on core-js.
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
  const isSandboxHandler = Boolean(data.sandbox_handler);

  // Validate required parameters - locale_data_folder not required for sandbox handlers
  const requiredParams = [
    'name',
    'bundle_id',
    'config_path',
    'static_dir',
    'stats_file',
    'plugin_path',
    'version',
  ];
  if (!isSandboxHandler) {
    requiredParams.push('locale_data_folder');
  }

  const missingParams = requiredParams.filter(param => typeof data[param] === 'undefined');
  if (missingParams.length > 0) {
    const bundleType = isSandboxHandler ? 'sandbox handler' : 'plugin';
    logging.error(
      `${data.name} ${bundleType} is misconfigured, missing parameter(s): ${missingParams.join(', ')}`,
    );
    return;
  }
  const configData = require(data.config_path);
  // The bundle's own buildConfig.js entry, alongside its webpack_config, may set
  // `skipMessageRegistration` to opt out of the frontend message registration bootstrap below.
  const configEntry = data.index !== null ? configData[data.index] : configData;
  let webpackConfig = configEntry.webpack_config;
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

  // Sandbox handlers are self-contained with no externals.
  // Core bundle also has no externals.
  // Other plugins use core externals.
  const externals = isSandboxHandler || isCoreBundle ? {} : getCoreExternals();

  const alias = {};
  if (kdsPath) {
    alias['kolibri-design-system'] = path.resolve(kdsPath);
    cache = false;
  }
  const output = {
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
  };

  // Sandbox handlers use IIFE format for script tag injection
  if (isSandboxHandler) {
    output.iife = true;
  }

  let bundle = {
    externals,
    name: data.name,
    mode,
    output,
    resolve: {
      // Add the plugin's node_modules first so pnpm can resolve plugin-specific dependencies
      modules: [path.join(data.plugin_path, 'node_modules')],
      alias,
    },
    resolveLoader: {
      // Add the plugin's node_modules for loader resolution
      modules: [path.join(data.plugin_path, 'node_modules')],
    },
    plugins: [
      new MiniCssExtractPlugin({
        filename: '[name]' + data.version + '.css',
        chunkFilename: '[name]' + data.version + '[id].css',
        insert: createCssInsert(data.name),
      }),
      // Sandbox handlers get no RTL support - they have no i18n machinery.
      ...(isSandboxHandler ? [] : [new WebpackRTLPlugin({ minify: false, isCoreBundle })]),
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
      // Add custom messages per bundle.
      new WebpackMessages({
        name: data.name + (isSandboxHandler ? ' (sandbox)' : ''),
        logger: str => logging.info(str),
      }),
    ],
  };

  // Sandbox handlers get no message registration.
  if (!isSandboxHandler && !configEntry.skipMessageRegistration) {
    bundle.plugins.push(
      // Inject code to register frontend messages
      new MessageRegistrationPlugin({
        // For the core plugin, because it sets up the i18n
        // machinery, we need to inject the registration code
        // afterwards to avoid a kerfuffle.
        injectAfterBundle: isCoreBundle,
        moduleName: data.name,
      }),
    );
  }

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

  // Sandbox handlers run in the sandbox iframe with no core bundle, so they cannot rely
  // on its polyfills - inject the ones they actually use into each handler bundle.
  if (isSandboxHandler && transpile) {
    const jsRule = bundle.module.rules.find(
      rule => rule.loader && rule.loader.includes('swc-loader'),
    );
    if (!jsRule) {
      throw new Error(
        `${data.name} sandbox handler bundle has no JS transpilation rule to inject polyfills through`,
      );
    }
    // core-js must be a dependency of the handler's plugin so the injected imports resolve,
    // and is the single source of truth for the version we tell swc to target.
    let coreJsPackage;
    try {
      coreJsPackage = require.resolve('core-js/package.json', { paths: [data.plugin_path] });
    } catch {
      throw new Error(
        `${data.name} sandbox handler bundle requires core-js as a dependency of ${data.plugin_path} so the injected polyfill imports resolve`,
      );
    }
    jsRule.options = {
      ...jsRule.options,
      // swc's equivalent of babel's sourceType: 'unambiguous' - CommonJS modules in the
      // graph get require() polyfill imports rather than ESM ones, which would otherwise
      // make webpack treat them as ES modules and drop their module.exports.
      isModule: 'unknown',
      env: {
        ...jsRule.options.env,
        mode: 'usage',
        coreJs: require(coreJsPackage).version,
      },
    };
  }

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
