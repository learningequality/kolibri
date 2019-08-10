var path = require('path');

module.exports = {
  bundle_id: 'style_guide_module',
  webpack_config: {
    entry: './assets/src/app.js',
    resolveLoader: {
      alias: {
        'vue-doc': path.join(__dirname, './vue-doc-loader'),
      },
    },
  },
};
