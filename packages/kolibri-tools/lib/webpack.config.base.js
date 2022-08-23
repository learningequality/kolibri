const path = require('path');
const { VueLoaderPlugin } = require('vue-loader');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const webpack = require('webpack');

module.exports = ({ mode = 'development', hot = false, cache = false, transpile = false } = {}) => {
  const production = mode === 'production';

  // Have to pass this option to prevent complaints about empty exports:
  // https://github.com/vuejs/vue-loader/issues/1742#issuecomment-715294278
  const cssInsertionLoader = hot
    ? 'style-loader'
    : { loader: MiniCssExtractPlugin.loader, options: { esModule: false } };

  const base_dir = path.join(__dirname, '..');

  const postCSSLoader = {
    loader: 'postcss-loader',
    options: {
      postcssOptions: {
        plugins: [['autoprefixer']],
      },
      sourceMap: !production,
    },
  };

  const cssLoader = {
    loader: 'css-loader',
    options: { sourceMap: !production },
  };

  // for scss blocks
  const sassLoaders = [cssInsertionLoader, cssLoader, postCSSLoader, 'sass-loader'];

  const rules = [
    // Transpilation and code loading rules
    {
      test: /\.vue$/,
      loader: 'vue-loader',
      options: {
        compilerOptions: {
          preserveWhitespace: false,
        },
      },
    },
    {
      test: /\.css$/,
      use: [cssInsertionLoader, cssLoader, postCSSLoader],
    },
    {
      test: /\.s[a|c]ss$/,
      use: sassLoaders,
    },
    {
      test: /\.(png|jpe?g|gif|svg|eot|woff|ttf|woff2)$/,
      type: 'asset',
      generator: {
        filename: '[name]-[contenthash][ext]',
      },
      parser: {
        dataUrlCondition: {
          maxSize: 10000,
        },
      },
    },
  ];

  if (transpile) {
    rules.push({
      test: /\.js$/,
      loader: 'babel-loader',
      exclude: { and: [/(node_modules\/vue|dist|core-js)/, { not: [/\.(esm\.js|mjs)$/] }] },
      options: {
        cacheDirectory: cache,
        cacheCompression: false,
      },
    });
  }

  return {
    target: 'browserslist',
    mode,
    cache: cache && {
      type: 'filesystem',
      version: '1.0.0',
      buildDependencies: {
        config: [__filename],
      },
    },
    module: {
      rules,
    },
    node: {
      __filename: true,
    },
    optimization: {
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
    resolve: {
      extensions: ['.js', '.vue', '.scss'],
      modules: [
        // Add resolution paths for modules to allow any plugin to
        // access kolibri-tools/node_modules modules during bundling.
        base_dir,
        path.join(base_dir, 'node_modules'),
      ],
    },
    resolveLoader: {
      modules: [
        // Add resolution paths for loaders to allow any plugin to
        // access kolibri-tools/node_modules loaders during bundling.
        base_dir,
        path.join(base_dir, 'node_modules'),
      ],
    },
    plugins: [
      new VueLoaderPlugin(),
      new webpack.DefinePlugin({
        'process.env.NODE_ENV': JSON.stringify(mode),
        'process.server': JSON.stringify(false),
      }),
      new webpack.ProvidePlugin({
        process: 'process/browser',
      }),
    ],
    devtool: production ? 'source-map' : 'cheap-module-source-map',
    stats: production ? 'normal' : 'none',
  };
};
