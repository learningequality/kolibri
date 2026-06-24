// MIT License
// Copyright (c) 2016 Romain Berger
// Permission is hereby granted, free of charge, to any person obtaining a copy of this software
// and associated documentation files (the "Software"), to deal in the Software without
// restriction, including without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the
// Software is furnished to do so, subject to the following conditions:
// The above copyright notice and this permission notice shall be included in all copies or
// substantial portions of the Software.
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING
// BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
// NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
// Vendored and simplified from https://github.com/romainberger/webpack-rtl-plugin/blob/master/src/index.js

const rtlcss = require('rtlcss');
const webpack = require('webpack');
const { kolibriName } = require('./kolibriName');

const pluginName = 'WebpackRTLPlugin';
const RuntimeModule = webpack.RuntimeModule;
const STAGE_ATTACH = 10;

/**
 * Generate the runtime code for RTL CSS dynamic loading.
 * @param {string} bundleId - The webpack bundle identifier
 * @param {string} rtlManagerAccess - JS expression that evaluates to the rtlcss module
 * @returns {string} The runtime JavaScript code
 */
function generateRuntimeCode(bundleId, rtlManagerAccess) {
  // Lazy initialization is required because runtime code executes before modules.
  // By the time miniCssF is called (during dynamic CSS loading), modules are ready.
  return `
var bundleAPI;
var originalMiniCssF = __webpack_require__.miniCssF;
__webpack_require__.miniCssF = function(chunkId) {
  if (!bundleAPI) {
    bundleAPI = ${rtlManagerAccess}.rtlManager.registerBundle(${JSON.stringify(bundleId)});
  }
  return bundleAPI.miniCssF(originalMiniCssF(chunkId));
};
`.trim();
}

/**
 * Runtime module that injects RTL CSS loading support into webpack bundles.
 */
class RTLCSSRuntimeModule extends RuntimeModule {
  constructor(bundleId, isCoreBundle) {
    // Use STAGE_ATTACH (10) to ensure this runs AFTER GetChunkFilenameRuntimeModule
    // which defines miniCssF at STAGE_NORMAL (0). Runtime modules are sorted by
    // stage first, then by identifier. Without this, "RTL CSS Loading" sorts before
    // "get mini-css chunk filename" alphabetically and the miniCssF intercept fails.
    super('RTL CSS Loading', STAGE_ATTACH);
    this.bundleId = bundleId;
    this.isCoreBundle = isCoreBundle;
  }

  generate() {
    let rtlManagerAccess;
    if (this.isCoreBundle) {
      // Core bundle uses __webpack_require__ directly with the real module ID.
      // We resolve it here (during code generation, after IDs are assigned) because
      // webpack's module IDs are based on resolved paths, not import specifiers.
      const moduleId = this._findRtlModuleId();
      rtlManagerAccess = `__webpack_require__(${JSON.stringify(moduleId)})`;
    } else {
      // Plugin bundles access rtlcss via the core bundle's window global (externals).
      rtlManagerAccess = `window.${kolibriName}["kolibri/rtlcss"]`;
    }
    return generateRuntimeCode(this.bundleId, rtlManagerAccess);
  }

  /**
   * Find the webpack-assigned module ID for kolibri/rtlcss.
   * Called during generate(), which runs after module ID optimization.
   * @returns {number|string|null} The webpack module ID, or null when the
   * `kolibri/rtlcss` module cannot be found in the compilation.
   */
  _findRtlModuleId() {
    for (const module of this.compilation.modules) {
      if (module.rawRequest === 'kolibri/rtlcss') {
        return this.compilation.chunkGraph.getModuleId(module);
      }
    }
    const msg =
      `${pluginName}: could not find 'kolibri/rtlcss' module in compilation '${this.compilation.name}'. ` +
      'Ensure the core bundle imports kolibri/rtlcss (it should be listed in apiSpec.js).';
    this.compilation.warnings.push(new webpack.WebpackError(msg));
    return null;
  }
}

/**
 * Webpack plugin that:
 * 1. Generates RTL variants of all CSS files using rtlcss
 * 2. Injects runtime code to dynamically load RTL CSS based on language direction
 */
class WebpackRTLPlugin {
  constructor(options = {}) {
    this.options = {
      rtlcssOptions: {},
      rtlcssPlugins: [],
      isCoreBundle: false,
      ...options,
    };
  }

  apply(compiler) {
    compiler.hooks.compilation.tap(pluginName, compilation => {
      this._setupRTLCSSGeneration(compilation);
      this._setupRuntimeModule(compilation);
    });
  }

  /**
   * Generate .rtl.css files for all CSS assets.
   * @param {import('webpack').Compilation} compilation - The active webpack compilation.
   */
  _setupRTLCSSGeneration(compilation) {
    compilation.hooks.processAssets.tap(
      {
        name: pluginName,
        stage: compilation.PROCESS_ASSETS_STAGE_DERIVED,
        additionalAssets: true,
      },
      assets => {
        for (const assetName in assets) {
          if (assetName.endsWith('.css') && !assetName.endsWith('.rtl.css')) {
            const rtlAssetName = assetName.replace(/\.css$/, '.rtl.css');
            const originalCSS = assets[assetName].source();
            const rtlCSS = rtlcss.process(
              originalCSS,
              this.options.rtlcssOptions,
              this.options.rtlcssPlugins,
            );
            compilation.emitAsset(rtlAssetName, new webpack.sources.RawSource(rtlCSS));
          }
        }
      },
    );
  }

  /**
   * Inject runtime module for dynamic RTL CSS loading.
   * @param {import('webpack').Compilation} compilation - The active webpack compilation.
   */
  _setupRuntimeModule(compilation) {
    const { isCoreBundle } = this.options;

    // Only add to chunks that need dynamic chunk loading (same hook as MiniCssExtractPlugin).
    // This guarantees miniCssF will be defined when our code runs.
    compilation.hooks.runtimeRequirementInTree
      .for(webpack.RuntimeGlobals.ensureChunkHandlers)
      .tap(pluginName, chunk => {
        const bundleId = compilation.name || 'unknown';
        compilation.addRuntimeModule(chunk, new RTLCSSRuntimeModule(bundleId, isCoreBundle));
      });
  }
}

module.exports = WebpackRTLPlugin;
