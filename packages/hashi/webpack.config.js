const path = require('path');

module.exports = {
  entry: path.resolve(__dirname, './src/iframe.js'),
  output: {
    filename: 'hashiframe.js',
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
};
