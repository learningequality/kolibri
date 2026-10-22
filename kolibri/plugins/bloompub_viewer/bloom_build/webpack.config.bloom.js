const path = require('node:path');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
  entry: path.resolve(__dirname, './bloomBundle.js'),
  output: {
    filename: 'bloomPlayer-[contenthash].js',
    path: path.resolve(__dirname, '../static/bloom'),
    clean: true,
  },
  mode: 'production',
  module: {
    rules: [
      {
        test: /\.js$/,
        loader: 'babel-loader',
        exclude: [
          // From: https://webpack.js.org/loaders/babel-loader/#exclude-libraries-that-should-not-be-transpiled
          /node_modules[\\/]core-js/,
        ],
        options: {
          // css-loader's runtime is CommonJS.
          sourceType: 'unambiguous',
        },
      },
      {
        test: /\.css$/,
        use: [
          MiniCssExtractPlugin.loader,
          {
            loader: 'css-loader',
            options: { sourceMap: false },
          },
        ],
      },
    ],
  },
  optimization: {
    moduleIds: 'deterministic',
    chunkIds: 'deterministic',
    minimizer: [
      new TerserPlugin({
        parallel: true,
        terserOptions: {
          mangle: false,
          safari10: true,
          output: {
            comments: false,
          },
        },
      }),
      new CssMinimizerPlugin({
        minimizerOptions: {
          preset: ['default', { reduceIdents: false, zindex: false }],
        },
      }),
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({
      filename: 'bloomplayer.htm',
      template: path.resolve(__dirname, './bloomplayer.htm'),
      inject: false,
      minify: false,
    }),
    new MiniCssExtractPlugin({
      filename: 'bloomPlayer-[contenthash].css',
    }),
  ],
};
