const prettierVue = require('./prettier-vue');
const path = require('path');

class PrettierVuePlugin {
  constructor(
    {
      encoding = 'utf-8',
      extensions = ['vue', 'js'],
      prettierOptions
    }
  ) {
    // Encoding to use when reading / writing files
    this.encoding = encoding;
    this.extensions = extensions;
    this.prettierOptions = prettierOptions;
  }

  apply(compiler) {
    compiler.plugin('emit', (compilation, callback) => {
      // Explore each chunk (build output):
      compilation.chunks.forEach(chunk => {
        // Explore each module within the chunk (built inputs):
        chunk.modules.forEach(module => {
          if (!module.fileDependencies) return;
          // Explore each source file path that was included into the module
          module.fileDependencies.forEach(file => {
            // match extensions and exclude node modules
            if (
              this.extensions.indexOf(path.extname(file)) !== -1 &&
              file.indexOf('node_modules') === -1
            ) {
              prettierVue({
                file,
                encoding: this.encoding,
                prettierOptions: this.prettierOptions,
              })
              .then(() => { console.log('succeed'); })
              .catch(err => { console.error(err); });
            }
          });
        });
      });
      callback();
    });
  }
}

module.exports = PrettierVuePlugin;
