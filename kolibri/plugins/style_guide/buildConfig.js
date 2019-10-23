var path = require('path');

module.exports = {
  bundle_id: 'app',
  webpack_config: {
    entry: './assets/src/app.js',
    resolveLoader: {
      alias: {
        'vue-doc': path.join(__dirname, './vue-doc-loader'),
      },
    },
  },
};
