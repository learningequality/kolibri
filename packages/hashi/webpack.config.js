const path = require('path')

module.exports = {
  entry: './src/storage.js',
  output: {
    filename: 'hashi.js',
    path: path.resolve(__dirname, 'dist'),
    library: 'hashi'
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        loader: 'buble-loader',
        include: path.join(__dirname, 'src'),
        options: {
          objectAssign: 'Object.assign'
        }
      }
    ]
  }
}
