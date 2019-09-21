var path = require('path');

module.exports = {
  pages: {
    index: {
      entry: 'src/main.js',
      template: 'public/index.html',
      title: 'Index',
    },
    subpage2: {
      entry: 'src/main.js',
      template: 'public/index.html',
      title: 'Sub-page',
    },
  },
  configureWebpack: {
    resolveLoader: {
      alias: {
        'vue-doc': path.join(__dirname, './vue-doc-loader'),
      },
    },
  },
};
