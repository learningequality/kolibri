const path = require('path');
const fs = require('fs');
const mkdirp = require('mkdirp');

function Plugin() {}

Plugin.prototype.apply = function(compiler) {
  var self = this;

  const done = function(stats) {
    if (stats.compilation.errors.length > 0) {
      return;
    }

    let hashiFilename;
    stats.compilation.chunks.map(function(chunk) {
      hashiFilename = chunk.files[0];
    });

    self.writeOutput(hashiFilename);
  };

  if (compiler.hooks) {
    const plugin = { name: 'HashiHashWriterPlugin' };
    compiler.hooks.done.tap(plugin, done);
  }
};

Plugin.prototype.writeOutput = function(filename) {
  var outputFilename = path.resolve(__dirname, '../../kolibri/core/content/build/hashi_filename');
  mkdirp.sync(path.dirname(outputFilename));

  fs.writeFileSync(outputFilename, filename);
};

// Note that the hashi iframe client doesn't currently support code splitting
// in the way that it is loaded, so don't do any code splitting just yet.

module.exports = {
  entry: path.resolve(__dirname, './src/iframe.js'),
  output: {
    filename: 'hashiframe-[hash].js',
    path: path.resolve(__dirname, '../../kolibri/core/content/static/content'),
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        loader: 'buble-loader',
        include: path.join(__dirname, 'src'),
        options: {
          objectAssign: 'Object.assign',
        },
      },
    ],
  },
  plugins: [new Plugin()],
};
