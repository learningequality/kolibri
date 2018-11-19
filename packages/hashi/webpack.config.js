const path = require('path');

module.exports = {
  entry: path.resolve(__dirname, './src/iframeClient.js'),
  mode: 'production',
  output: {
    filename: 'hashiframe.js',
    path: path.resolve(__dirname, '../../kolibri/core/content/static/content'),
    libraryExport: 'default',
    library: 'Hashi',
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
};
