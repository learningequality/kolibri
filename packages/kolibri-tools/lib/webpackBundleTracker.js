// The MIT License (MIT)

// Copyright (c) 2015 Owais Lone

// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:

// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.

// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.

const path = require('node:path');
const fs = require('node:fs');
const crypto = require('node:crypto');

const defaults = require('lodash/defaults');
const assign = require('lodash/assign');
const get = require('lodash/get');
const each = require('lodash/forEach');
const stripAnsi = require('strip-ansi');

function getAssetPath(compilation, name) {
  return path.join(compilation.getPath(compilation.compiler.outputPath), name.split('?')[0]);
}

function getSource(compilation, name) {
  const path = getAssetPath(compilation, name);
  return fs.readFileSync(path, { encoding: 'utf-8' });
}

class BundleTrackerPlugin {
  /**
   * Track assets file location per bundle
   * @param {Options} options
   */
  constructor(options) {
    /** @type {Options} */
    this.options = options;
    /** @type {Contents} */
    this.contents = {
      status: 'initialization',
      assets: {},
      chunks: {},
    };
    this.name = 'BundleTrackerPlugin';

    this.outputChunkDir = '';
    this.outputTrackerFile = '';
    this.outputTrackerDir = '';
  }
  /**
   * Setup parameter from compiler data
   * @param {Compiler} compiler
   * @returns this
   */
  _setParamsFromCompiler(compiler) {
    this.options = defaults({}, this.options, {
      path: get(compiler.options, 'output.path', process.cwd()),
      publicPath: get(compiler.options, 'output.publicPath', ''),
      filename: 'webpack-stats.json',
      logTime: false,
      relativePath: false,
      integrity: false,
      indent: 2,
      // https://www.w3.org/TR/SRI/#cryptographic-hash-functions
      integrityHashes: ['sha256', 'sha384', 'sha512'],
    });

    // Set output directories
    this.outputChunkDir = path.resolve(get(compiler.options, 'output.path', process.cwd()));
    this.outputTrackerFile = path.resolve(this.options.filename);
    this.outputTrackerDir = path.dirname(this.outputTrackerFile);

    return this;
  }
  /**
   * Write bundle tracker stats file
   *
   * @param {Compiler} compiler
   * @param {Partial<Contents>} contents
   */
  _writeOutput(compiler, contents) {
    assign(this.contents, contents, {
      chunks: assign(this.contents.chunks, contents.chunks),
    });

    if (this.options.publicPath) {
      this.contents.publicPath = this.options.publicPath;
    }

    fs.mkdirSync(this.outputTrackerDir, { recursive: true, mode: 0o755 });
    fs.writeFileSync(
      this.outputTrackerFile,
      JSON.stringify(this.contents, null, this.options.indent),
    );
  }
  /**
   * Compute hash for a content
   * @param {string} content
   */
  _computeIntegrity(content) {
    // @ts-ignore: TS2532 this.options.integrityHashes can't be undefined here because
    // we set a default value on _setParamsFromCompiler
    return this.options.integrityHashes
      .map(algorithm => {
        const hash = crypto.createHash(algorithm).update(content, 'utf8').digest('base64');

        return `${algorithm}-${hash}`;
      })
      .join(' ');
  }
  /**
   * Handle compile hook
   * @param {Compiler} compiler
   */
  _handleCompile(compiler) {
    this._writeOutput(compiler, { status: 'compile' });
  }
  /**
   * Handle compile hook
   * @param {Compiler} compiler
   * @param {Stats} stats
   */
  _handleDone(compiler, stats) {
    if (stats.hasErrors()) {
      const findError = compilation => {
        if (compilation.errors.length > 0) {
          return compilation.errors[0];
        }
        return compilation.children.find(child => findError(child));
      };
      const error = findError(stats.compilation);
      this._writeOutput(compiler, {
        status: 'error',
        error: get(error, 'name', 'unknown-error'),
        message: stripAnsi(error['message']),
      });

      return;
    }

    /** @type {Contents} */
    const output = { status: 'done', assets: {}, chunks: {} };
    each(stats.compilation.assets, (file, assetName) => {
      const fileInfo = {
        name: assetName,
        path: getAssetPath(stats.compilation, assetName),
      };

      if (this.options.integrity === true) {
        fileInfo.integrity = this._computeIntegrity(getSource(stats.compilation, assetName));
      }

      if (this.options.publicPath) {
        fileInfo.publicPath = this.options.publicPath + assetName;
      }

      if (this.options.relativePath === true) {
        fileInfo.path = path.relative(this.outputChunkDir, fileInfo.path);
      }

      output.assets[assetName] = fileInfo;
    });
    const cssFilesInChunks = {};

    each(stats.compilation.chunkGroups, chunkGroup => {
      if (!chunkGroup.isInitial()) return;

      output.chunks[chunkGroup.name] = chunkGroup.getFiles().map(f => output.assets[f]);
      cssFilesInChunks[chunkGroup.name] = output.chunks[chunkGroup.name]
        .map(f => f.name)
        .filter(f => f.endsWith('.css') && !f.endsWith('.rtl.css'));
    });

    if (this.options.logTime === true) {
      output.startTime = stats.startTime;
      output.endTime = stats.endTime;
    }

    // Hack to ensure that our RTL plugin assets also get added into the chunk group.
    // Should probably try to fix this within the context of the RTL plugin,
    // but the webpack API is a bit too opaque to understand how to add the RTL asset
    // to the chunk group as well as to the emitted assets.
    for (const chunkGroupName in cssFilesInChunks) {
      for (const cssFile of cssFilesInChunks[chunkGroupName]) {
        const rtlCssFile = cssFile.replace('.css', '.rtl.css');
        if (output.assets[rtlCssFile]) {
          output.chunks[chunkGroupName].push(output.assets[rtlCssFile]);
        }
      }
    }

    this._writeOutput(compiler, output);
  }
  /**
   * Method called by webpack to apply plugin hook
   * @param {Compiler} compiler
   */
  apply(compiler) {
    this._setParamsFromCompiler(compiler);

    compiler.hooks.compile.tap(this.name, this._handleCompile.bind(this, compiler));
    compiler.hooks.done.tap(this.name, this._handleDone.bind(this, compiler));
  }
}

module.exports = BundleTrackerPlugin;
