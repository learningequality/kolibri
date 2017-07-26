var path = require('path');

module.exports = {
  resolveLoader: {
    alias: {
      'vue-doc': path.join(__dirname, './vue-doc-loader')
    }
  }
};
