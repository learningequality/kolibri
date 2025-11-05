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
const path = require('node:path');
const rtlcss = require('rtlcss');
const webpack = require('webpack');

const pluginName = 'WebpackRTLPlugin';

class WebpackRTLPlugin {
  constructor(options) {
    this.options = {
      filename: false,
      options: {},
      plugins: [],
      ...options,
    };
  }

  apply(compiler) {
    compiler.hooks.compilation.tap(pluginName, compilation => {
      compilation.hooks.processAssets.tap(
        {
          name: pluginName,
          stage: compilation.PROCESS_ASSETS_STAGE_DERIVED,
          additionalAssets: true,
        },
        assets => {
          for (const asset in assets) {
            if (asset.endsWith('.css') && !asset.endsWith('.rtl.css')) {
              const baseSource = assets[asset].source();
              const rtlSource = rtlcss.process(
                baseSource,
                this.options.options,
                this.options.plugins,
              );

              const newFilename = `${path.basename(asset, '.css')}.rtl`;
              const filename = asset.replace(path.basename(asset, '.css'), newFilename);

              compilation.emitAsset(filename, new webpack.sources.RawSource(rtlSource));
            }
          }
        },
      );
    });
  }
}

module.exports = WebpackRTLPlugin;
