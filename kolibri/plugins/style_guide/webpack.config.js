var path = require('path');

module.exports = {
  unique_slug: 'style_guide_module',
  entry: './assets/src/app.js',
  resolveLoader: {
    alias: {
      'vue-doc': path.join(__dirname, './vue-doc-loader'),
    },
  },
};
