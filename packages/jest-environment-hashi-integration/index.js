const { join } = require('path');
const MemoryFileSystem = require('memory-fs');
const webpack = require('webpack');
const JSDOMEnvironment = require('jest-environment-jsdom');
const webpackConfig = require('../hashi/webpack.config');

async function generateClientCode() {
  // Modified from https://github.com/knpwrs/webpack-to-memory/blob/master/src/index.js
  return new Promise((resolve, reject) => {
    const compiler = webpack(webpackConfig);
    // Compile hashi iframe client to in-memory file system.
    const fs = new MemoryFileSystem();
    compiler.outputFileSystem = fs;
    compiler.run((err, stats) => {
      if (err) {
        reject(err);
        return;
      }
      if (stats.hasErrors()) {
        const errors = stats.compilation ? stats.compilation.errors : null;
        reject(errors);
        return;
      }
      const { outputPath } = compiler;
      // Read each file and compile module
      const path = join(outputPath, webpackConfig.output.filename);
      resolve(fs.readFileSync(path, 'utf8'));
    });
  });
}

class JSDOMHashiIntegrationEnvironment extends JSDOMEnvironment {
  constructor(config) {
    config = Object.assign({}, config, {
      testEnvironmentOptions: {
        resources: 'usable',
      },
      testURL: 'http://127.0.0.1:6543/index.html',
    });
    super(config);
  }

  async setup() {
    await super.setup();
    this.global.hashiIframeClient = await generateClientCode();
  }

  async teardown() {
    await super.teardown();
  }

  runScript(script) {
    return super.runScript(script);
  }
}

module.exports = JSDOMHashiIntegrationEnvironment;
