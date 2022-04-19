/*
 * This file defines additional webpack configuration for this plugin.
 * It will be bundled into the webpack configuration at build time.
 */
var path = require('path');
var webpack = require('webpack');

const submodules = path.resolve(__dirname, '..', 'submodules')

const perseus_node_modules = path.resolve(submodules, 'perseus', 'node_modules');

const node_modules = path.resolve(__dirname, './node_modules');

const base_node_modules = path.resolve(__dirname, '../../../node_modules');

module.exports = {
  entry: path.resolve(__dirname, './submodules/perseus/src/perseus.js'),
  output: {
    path: path.resolve(__dirname, './assets/dist'),
    filename: 'perseus.js',
    chunkFilename: 'perseus-extras.js',
    // c.f. https://webpack.js.org/configuration/output/#outputjsonpfunction
    // Without this namespacing, there is a possibility that chunks from different
    // plugins could conflict in the global chunk namespace.
    // Replace any '.' in the name as unclear from documentation whether
    // webpack properly handles that or not.
    jsonpFunction: 'webpackJsonp__perseus',
    library: 'Perseus',
    libraryTarget: 'umd',
  },
  resolve: {
    modules: [base_node_modules, node_modules, perseus_node_modules],
    alias: {
      // For some reason the jsx react component files are inside a folder call 'js'
      'react-components': 'react-components/js',
      'perseus': path.resolve(__dirname, "submodules/perseus/")
    },
  },
  resolveLoader: {
    modules: [base_node_modules, node_modules, perseus_node_modules]
  },
  module: {
    rules: [
      {
        test: /perseus\/[\w/\-_]*\.jsx?$/,
        loader: 'string-replace-loader',
        enforce: 'pre',
        options: {
          multiple: [
            // Replace ngettext style messages with ICU syntax
            {
              search: /%\(([\w_]+)\)s/,
              replace: '{ $1 }',
              flags: 'g'
            },
            // Replace this deletion of a local variable (illegal in strict mode)
            // With deletion of the variable from the window object
            {
              search: /delete Raphael;$/,
              replace: 'delete win.Raphael',
              flags: 'g'
            },
            // Remove an attempt to import jQuery from the window object, so that
            // it can be properly imported by the provide plugin
            {
              search: /jQuery = window\.jQuery,/,
              replace: '',
              flags: 'g'
            },
            // Remove an attempt to import MathQuill from the window object, so that
            // it can be properly imported by the provide plugin
            {
              search: /const MathQuill = window\.MathQuill;/,
              replace: '',
              flags: 'g'
            },
            // Remove an attempt to import i18n from the window object, so that
            // it can be properly imported by the provide plugin
            {
              search: /const i18n = window\.i18n;/,
              replace: '',
              flags: 'g'
            },
            // Remove an attempt to reference katex from the window object, so that
            // it can be properly imported by the provide plugin
            {
              search: /window\.katex/,
              replace: 'katex',
              flags: 'g'
            },
          ]
        }
      },
      {
        // Use the perseus modified version of jsx loader to load any jsx files
        // and any files inside perseus src and math-input as they use
        // object spread syntax and need to be passed through babel
        test: /(perseus\/(src|math-input)\/[\w/\-_]*\.jsx?$)|(\.jsx$)/,
        loader: path.join(__dirname, "./submodules/perseus/node/jsx-loader.js"),
      },
    ]
  },
  plugins: [
    new webpack.ProvidePlugin({
      // Use the provide plugin to inject modules into the scope of other modules
      // when those modules reference particular global variables
      // This allows us to make jQuery and other modules available
      // without polluting our global scope
      katex: 'perseus/lib/katex/katex',
      KAS: 'perseus/lib/kas',
      MathQuill: 'imports-loader?window=>{}!exports-loader?window.MathQuill!perseus/lib/mathquill/mathquill-basic',
      jQuery: 'jquery',
      $: 'jquery',
      _: 'underscore',
      underscore: 'underscore',
      React: 'react',
    }),
  ],
  mode: 'production',
  optimization: {
    minimize: false,
  },
};
