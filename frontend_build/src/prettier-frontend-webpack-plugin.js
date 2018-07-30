const path = require('path');
const prettierFrontend = require('./prettier-frontend');

class PrettierFrontendPlugin {
  constructor({ encoding = 'utf-8', extensions = ['vue', 'js', 'scss'], prettierOptions }) {
    // Encoding to use when reading / writing files
    this.encoding = encoding;
    this.extensions = extensions;
    this.prettierOptions = prettierOptions;
    this.startTime = Date.now();
    // Keep track of the previous timestamps of files, to only lint modified files.
    this.prevTimestamps = new Map();
    // Keep track of the files that have just been changed by this plugin to prevent
    // a repeating loop.
    this.rewrittenFiles = [];
  }

  apply(compiler) {
    compiler.plugin('emit', (compilation, callback) => {
      // fileTimestamps is a map of ['filename', timestamp]
      const fileTimestamps = compilation.fileTimestamps;
      let changedFiles = [];
      fileTimestamps.forEach((timestamp, filename) => {
        if (
          (this.prevTimestamps.get(filename) || this.startTime) <
          (fileTimestamps.get(filename) || Infinity)
        ) {
          changedFiles.push(filename);
        }
      });

      changedFiles = changedFiles.filter(
        file =>
          this.rewrittenFiles.indexOf(file) === -1 &&
          // match extensions and exclude node modules
          this.extensions.indexOf(path.extname(file)) !== -1 &&
          file.indexOf('node_modules') === -1
      );

      // Update our timestamps to latest
      this.prevTimestamps = fileTimestamps;
      // Clear the currently rewritten files
      this.rewrittenFiles = [];
      Promise.all(
        changedFiles.map(file => {
          return prettierFrontend({
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
        })
      ).then(() => {
        callback();
      });
    });
  }
}

module.exports = PrettierFrontendPlugin;
