const prettierFrontend = require('./prettier-frontend');
const path = require('path');

class PrettierFrontendPlugin {
  constructor({ encoding = 'utf-8', extensions = ['vue', 'js'], prettierOptions }) {
    // Encoding to use when reading / writing files
    this.encoding = encoding;
    this.extensions = extensions;
    this.prettierOptions = prettierOptions;
    this.startTime = Date.now();
    // Keep track of the previous timestamps of files, to only lint modified files.
    this.prevTimestamps = {};
    // Keep track of the files that have just been changed by this plugin to prevent
    // a repeating loop.
    this.rewrittenFiles = [];
  }

  apply(compiler) {
    compiler.plugin('emit', (compilation, callback) => {
      const changedFiles = Object.keys(compilation.fileTimestamps)
        .filter(
          watchfile =>
            (this.prevTimestamps[watchfile] || this.startTime) <
            (compilation.fileTimestamps[watchfile] || Infinity)
        )
        .filter(file => this.rewrittenFiles.indexOf(file) === -1);

      // Update our timestamps to latest
      this.prevTimestamps = compilation.fileTimestamps;
      // Clear the currently rewritten files
      this.rewrittenFiles = [];
      Promise.all(
        changedFiles.map(file => {
          // match extensions and exclude node modules
          if (
            this.extensions.indexOf(path.extname(file)) !== -1 &&
            file.indexOf('node_modules') === -1
          ) {
            return prettierVue({
              file,
              encoding: this.encoding,
              write: true,
              prettierOptions: this.prettierOptions,
            })
              .then(result => {
                if (result.code === 1) {
                  // Not an error and file has changed
                  this.rewrittenFiles.push(file);
                }
                return result;
              })
              .catch(err => {
                console.error(err.message);
                return err;
              });
          } else {
            return Promise.resolve();
          }
        })
      ).then(() => {
        callback();
      });
    });
  }
}

module.exports = PrettierFrontendPlugin;
