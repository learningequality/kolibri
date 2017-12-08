var path = require('path');

module.exports = {
  env: {
    es6: true,
    browser: true,
    node: true,
  },
  parserOptions: {
    sourceType: 'module',
    ecmaVersion: 7,
    ecmaFeatures: {
      impliedStrict: true,
      experimentalObjectRestSpread: true,
    },
  },
  globals: {
    __version: true,
    __coreAPISpec: true,
    __filename: true,
    __publicPath: true,
  },
  extends: [
    'eslint:recommended',
    'prettier',
    'plugin:vue/recommended',
    'plugin:import/errors',
    'plugin:import/warnings',
  ],
  plugins: ['import', 'vue'],
  settings: {
    'import/resolver': {
      [path.resolve(
        path.join(path.dirname(__filename), './frontend_build/src/alias_import_resolver.js')
      )]: {
        extensions: ['.js', '.vue'],
      },
    },
  },
  rules: {
    'comma-style': 2,

    'vue/attribute-hyphenation': [2, 'never'],
    'vue/name-property-casing': [0],
    'vue/require-default-prop': 0,
    'vue/html-self-closing': [0],
    'vue/max-attributes-per-line': [
      2,
      {
        singleline: 10,
        multiline: {
          max: 1,
          allowFirstLine: false,
        },
      },
    ],
  },
};
