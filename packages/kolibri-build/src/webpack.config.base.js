const path = require('node:path');
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
    loader: require.resolve('postcss-loader'),
    options: {
      postcssOptions: {
        plugins: [
          // Flatten Perseus/math-input @layer rules (unsupported across our
          // browserslist) to specificity-equivalent selectors. Must run before
          // autoprefixer. onImportLayerRule is off: the plugin warns on any
          // @import whose URL contains "layer" (e.g. pdf.js's
          // text_layer_builder.css), which is a false positive we can't act on
          // (css-loader resolves @import, not postcss-import).
          [require.resolve('@csstools/postcss-cascade-layers'), { onImportLayerRule: false }],
          [require.resolve('autoprefixer')],
        ],
      },
      sourceMap: !production,
    },
  };

  const cssLoader = {
    loader: require.resolve('css-loader'),
    options: { sourceMap: !production },
  };

  // for scss blocks
  const sassLoaders = [
    cssInsertionLoader,
    cssLoader,
    postCSSLoader,
    require.resolve('sass-loader'),
  ];

  const rules = [
    // Transpilation and code loading rules
    {
      test: /\.vue$/,
      loader: require.resolve('vue-loader'),
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
      test: /\.(js|mjs)$/,
      loader: require.resolve('swc-loader'),
      exclude: [
        // From: https://webpack.js.org/loaders/babel-loader/#exclude-libraries-that-should-not-be-transpiled
        // \\ for Windows, / for macOS and Linux
        /node_modules[\\/]core-js/,
        /node_modules[\\/]webpack[\\/]buildin/,
      ],
      options: {
        env: {
          targets: require('browserslist-config-kolibri'),
        },
        jsc: {
          parser: {
            syntax: 'ecmascript',
            importAssertions: true,
          },
        },
      },
    });
  }

  return {
    target: 'browserslist',
    mode,
    cache: cache && {
      type: 'filesystem',
      version: `1.0.0-${hot ? 'hot' : 'nothot'}-${transpile ? 'transpiled' : 'source'}`,
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
          minify: TerserPlugin.swcMinify,
          terserOptions: {
            compress: true,
            mangle: true,
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
        // Default node_modules resolution (searches up directory tree from entry)
        'node_modules',
        // Add resolution paths for modules to allow any plugin to
        // access kolibri-build/node_modules modules during bundling.
        base_dir,
        path.join(base_dir, 'node_modules'),
      ],
    },
    resolveLoader: {
      modules: [
        // Default node_modules resolution (searches up directory tree from entry)
        'node_modules',
        // Add resolution paths for loaders to allow any plugin to
        // access kolibri-build/node_modules loaders during bundling.
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
        process: require.resolve('process/browser'),
      }),
    ],
    devtool: production ? 'source-map' : 'cheap-module-source-map',
    stats: production ? 'normal' : 'none',
  };
};
