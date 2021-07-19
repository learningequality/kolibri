const path = require('path');
const fs = require('fs');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const OptimizeCSSAssetsPlugin = require('optimize-css-assets-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');

function Plugin() {}

Plugin.prototype.apply = function(compiler) {
  if (compiler.hooks) {
    compiler.hooks.compilation.tap('H5PHashWriterPlugin', function(compilation) {
      if (compilation.errors.length > 0) {
        return;
      }

      HtmlWebpackPlugin.getHooks(compilation).afterEmit.tapAsync('H5PWritePlugin', (data, cb) => {
        var outputFilename = path.resolve(__dirname, './h5p_build.json');

        fs.writeFileSync(outputFilename, JSON.stringify({ filename: data.outputName }));
        // Tell webpack to move on
        cb(null, data);
      });
    });
  }
};

module.exports = {
  entry: path.resolve(__dirname, './src/h5pBundle.js'),
  output: {
    filename: 'h5p-[contenthash].js',
    path: path.resolve(__dirname, '../../kolibri/core/content/static/h5p'),
  },
  mode: 'none',
  module: {
    rules: [
      {
        test: /\.js$/,
        loader: 'babel-loader',
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
      {
        test: /\.(png|jpe?g|gif|svg)$/,
        use: {
          loader: 'url-loader',
          options: { limit: 10000, name: '[name]-[contenthash].[ext]' },
        },
      },
      // Use url loader to load font files.
      {
        test: /\.(eot|woff|ttf|woff2)$/,
        use: {
          loader: 'url-loader',
          options: { name: '[name]-[contenthash].[ext]', limit: 10000 },
        },
      },
    ],
  },
  optimization: {
    minimizer: [
      new TerserPlugin({
        cache: true,
        parallel: true,
        sourceMap: true,
        terserOptions: {
          mangle: false,
          safari10: true,
          output: {
            comments: false,
          },
        },
      }),
      new OptimizeCSSAssetsPlugin({
        cssProcessorPluginOptions: {
          preset: ['default', { reduceIdents: false, zindex: false }],
        },
      }),
    ],
  },
  plugins: [
    new Plugin(),
    new HtmlWebpackPlugin({
      filename: 'h5p-[contenthash].html',
      template: 'src/h5p.html',
      minify: {
        collapseWhitespace: true,
        keepClosingSlash: true,
        removeComments: true,
        removeRedundantAttributes: true,
        removeScriptTypeAttributes: true,
        removeStyleLinkTypeAttributes: true,
        useShortDoctype: true,
        minifyJS: true,
        minifyCSS: true,
      },
    }),
    new MiniCssExtractPlugin({
      filename: 'h5p-[contenthash].css',
      chunkFilename: 'h5p-[contenthash]-[id].css',
    }),
  ],
};
